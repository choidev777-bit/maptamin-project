import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Webhook } from '@portone/server-sdk'
import { verifyPayment } from '@/lib/portone/server'
import { schedulePayment } from '@/lib/portone/billing'
import { PLAN_CONFIG, getPlanPrice, getPlanName } from '@/lib/pricing/config'
import { calculateNextBillingDate } from '@/lib/utils/billing'
import { sendEmail } from '@/lib/email/client'
import { PaymentSuccessEmail } from '@/lib/email/templates/PaymentSuccessEmail'
import { PaymentFailedEmail } from '@/lib/email/templates/PaymentFailedEmail'

/**
 * POST /api/payment/webhook
 *
 * PortOne V2 Webhook 핸들러 (버전 2024-04-25)
 *
 * ⚠️ 보안:
 * - @portone/server-sdk Webhook.verify로 시그니처 검증
 * - Supabase 서비스 롤 클라이언트 사용 (세션 없는 서버-서버 호출, RLS 우회)
 *
 * 처리하는 이벤트:
 * - Transaction.Paid   → 구독 결제 성공 → 티켓 충전 + 다음 달 예약
 * - Transaction.Failed → 구독 결제 실패 → 재시도 (최대 3회) or 구독 만료
 *
 * ⚠️ Webhook은 항상 200을 반환해야 합니다.
 *    200이 아니면 PortOne이 최대 5회 재전송합니다.
 *    시그니처 검증 실패만 400 반환 (PortOne이 재전송 중단하도록)
 *
 * @see PLAN_payment-system-fix.md Phase 4
 * @see https://developers.portone.io/opi/ko/integration/webhook/readme-v2
 */

const MAX_RETRY_COUNT = 3;
const RETRY_INTERVAL_DAYS = 3;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/* ──────────────────────────────────────────────
 * Types (PortOne V2 Webhook 2024-04-25)
 * ────────────────────────────────────────────── */

interface WebhookPayload {
    type: string;
    timestamp: string;
    data: {
        paymentId?: string;
        transactionId?: string;
        storeId?: string;
        billingKey?: string;
        cancellationId?: string;
    };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseClient = any;

/* ──────────────────────────────────────────────
 * Handler
 * ────────────────────────────────────────────── */

export async function POST(request: Request) {
    try {
        // ── 1. Raw body 읽기 (stream은 한 번만 읽기 가능!) ──
        const rawBody = await request.text();

        // ── 2. Webhook 시그니처 검증 ──
        const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
        if (webhookSecret) {
            try {
                const headers: Record<string, string> = {};
                request.headers.forEach((value, key) => {
                    headers[key] = value;
                });
                await Webhook.verify(webhookSecret, rawBody, headers);
            } catch (e) {
                console.error('[Webhook] 시그니처 검증 실패:', e);
                // 시그니처 실패는 400 반환 (PortOne이 재전송 중단)
                return NextResponse.json(
                    { error: 'Invalid webhook signature' },
                    { status: 400 }
                );
            }
        } else {
            console.warn('[Webhook] PORTONE_WEBHOOK_SECRET 미설정 — 시그니처 검증 건너뜀');
        }

        // ── 3. JSON 파싱 (request.json() 대신 수동 파싱) ──
        const body: WebhookPayload = JSON.parse(rawBody);
        const { type, data } = body;

        console.log(`[Webhook] Received: type=${type}, data=`, JSON.stringify(data));

        // ── 결제건이 아닌 이벤트 → 로깅 후 200 반환 ──
        if (!type?.startsWith('Transaction.')) {
            console.log(`[Webhook] Non-transaction event: ${type}, ignoring.`);
            return NextResponse.json({ received: true, type });
        }

        // ── paymentId 필수 확인 ──
        const { paymentId } = data;
        if (!paymentId) {
            console.warn('[Webhook] No paymentId in data, ignoring.');
            return NextResponse.json({ received: true, skipped: true });
        }

        // ── 구독 결제가 아닌 경우 무시 (sub_ 접두사 확인) ──
        if (!paymentId.startsWith('sub_')) {
            console.log(`[Webhook] Non-subscription payment: ${paymentId}, ignoring.`);
            return NextResponse.json({ received: true, skipped: true });
        }

        // ── Supabase 서비스 롤 클라이언트 (RLS 우회) ──
        const supabase = createClient(supabaseUrl, serviceKey);

        // ── Transaction.Paid 처리 ──
        if (type === 'Transaction.Paid') {
            return await handlePaymentPaid(supabase, paymentId);
        }

        // ── Transaction.Failed 처리 ──
        if (type === 'Transaction.Failed') {
            return await handlePaymentFailed(supabase, paymentId);
        }

        // ── 기타 Transaction 이벤트 → 무시 ──
        console.log(`[Webhook] Unhandled transaction event: ${type}`);
        return NextResponse.json({ received: true, type });
    } catch (error) {
        console.error('[Webhook] 처리 중 오류:', error);
        // Webhook은 항상 200을 반환 (5xx면 재전송됨)
        return NextResponse.json({ received: true, error: 'internal_error' });
    }
}

/* ──────────────────────────────────────────────
 * Transaction.Paid 핸들러
 * ────────────────────────────────────────────── */

async function handlePaymentPaid(supabase: SupabaseClient, paymentId: string) {
    // 1. PortOne API로 결제 상태 확인 (Webhook 내용을 신뢰하지 않고 검증)
    let paymentData;
    try {
        paymentData = await verifyPayment(paymentId);
    } catch (error) {
        console.error(`[Webhook] 결제 조회 실패: paymentId=${paymentId}`, error);
        return NextResponse.json({ received: true, error: 'verify_failed' });
    }

    if (paymentData.status !== 'PAID') {
        console.warn(`[Webhook] 결제 상태 불일치: expected=PAID, actual=${paymentData.status}`);
        return NextResponse.json({ received: true, error: 'status_mismatch' });
    }

    // 2. 멱등성: 이미 처리된 결제인지 확인
    const { data: existingPayment } = await supabase
        .from('subscription_payment_history')
        .select('payment_id')
        .eq('payment_id', paymentId)
        .single();

    if (existingPayment) {
        console.log(`[Webhook] 이미 처리된 결제: ${paymentId}`);
        return NextResponse.json({ received: true, duplicate: true });
    }

    // 3. subscription_billing에서 이 결제에 해당하는 구독 정보 조회
    const { data: billing } = await supabase
        .from('subscription_billing')
        .select('user_id, billing_key, plan_id, billing_cycle, retry_count, pending_plan_id')
        .eq('next_payment_id', paymentId)
        .single();

    if (!billing) {
        console.warn(`[Webhook] 매칭되는 구독 없음: ${paymentId}`);
        return NextResponse.json({ received: true, error: 'no_matching_subscription' });
    }

    const { user_id, billing_key, billing_cycle, pending_plan_id } = billing;

    // 4. pending_plan_id가 있으면 새 플랜으로 전환, 없으면 기존 플랜 유지
    const effectivePlanId = pending_plan_id || billing.plan_id;

    // 5. 구독 활성화 + 티켓 충전 (RPC) — 새 플랜 기준
    const { data: activateResult, error: activateError } = await supabase.rpc(
        'activate_subscription',
        {
            p_user_id: user_id,
            p_plan_id: effectivePlanId,
            p_billing_key: billing_key,
            p_billing_cycle: billing_cycle || 'monthly',
        }
    );

    if (activateError || !activateResult?.success) {
        console.error(`[Webhook] 구독 활성화 실패:`, activateError || activateResult);
    }

    if (pending_plan_id) {
        console.log(`[Webhook] 플랜 변경 적용: ${billing.plan_id} → ${effectivePlanId}`);
    }

    // 6. 결제 이력 저장 — calculateNextBillingDate 사용
    const periodStart = new Date();
    const periodEnd = calculateNextBillingDate(periodStart, billing_cycle || 'monthly');

    await supabase
        .from('subscription_payment_history')
        .insert({
            user_id,
            payment_id: paymentId,
            plan_id: effectivePlanId,
            amount: paymentData.amount.total,
            status: 'paid',
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            receipt_url: paymentData.receiptUrl || null,
        })
        .select()
        .single();

    // 7. 다음 자동 결제 예약
    const nextPaymentId = `sub_${effectivePlanId}_${periodEnd.getTime()}_${Math.random().toString(36).substring(2, 8)}`;
    const planName = getPlanName(effectivePlanId);
    const nextAmount = getPlanPrice(effectivePlanId, billing_cycle || 'monthly');

    try {
        await schedulePayment({
            paymentId: nextPaymentId,
            billingKey: billing_key,
            orderName: `맵타민 ${planName} 플랜 정기구독`,
            amount: nextAmount,
            currency: 'KRW',
            timeToPay: periodEnd.toISOString(),
        });

        // subscription_billing 업데이트 — pending_plan_id 초기화 포함
        await supabase
            .from('subscription_billing')
            .update({
                plan_id: effectivePlanId,
                pending_plan_id: null,
                next_payment_id: nextPaymentId,
                next_billing_date: periodEnd.toISOString(),
                retry_count: 0,
                status: 'active',
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user_id);
    } catch (error) {
        console.error(`[Webhook] 다음 결제 예약 실패:`, error);
    }

    console.log(`[Webhook] 결제 성공 처리 완료: paymentId=${paymentId}, userId=${user_id}, plan=${effectivePlanId}`);

    // 8. 결제 성공 이메일 발송 (비동기 — 실패해도 결제 처리에 영향 없음)
    try {
        const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('notification_email')
            .eq('user_id', user_id)
            .single();

        if (sub?.notification_email) {
            const formatDate = (d: Date) => d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
            await sendEmail({
                to: sub.notification_email,
                subject: `[맵타민] ${getPlanName(effectivePlanId)} 플랜 결제 완료`,
                react: PaymentSuccessEmail({
                    planName: getPlanName(effectivePlanId),
                    amount: paymentData.amount.total,
                    paidAt: formatDate(new Date()),
                    nextBillingDate: formatDate(periodEnd),
                    receiptUrl: paymentData.receiptUrl || undefined,
                    managementUrl: 'https://maptamin.com/dashboard/subscription',
                }),
            });
        }
    } catch (emailError) {
        console.error('[Webhook] 결제 성공 이메일 발송 실패 (무시):', emailError);
    }

    return NextResponse.json({ received: true, processed: true });
}

/* ──────────────────────────────────────────────
 * Transaction.Failed 핸들러
 * ────────────────────────────────────────────── */

async function handlePaymentFailed(supabase: SupabaseClient, paymentId: string) {
    // 1. PortOne API로 결제 상태 확인
    let paymentData;
    try {
        paymentData = await verifyPayment(paymentId);
    } catch (error) {
        console.error(`[Webhook] 결제 조회 실패: paymentId=${paymentId}`, error);
        return NextResponse.json({ received: true, error: 'verify_failed' });
    }

    // 2. 멱등성 체크
    const { data: existingPayment } = await supabase
        .from('subscription_payment_history')
        .select('payment_id')
        .eq('payment_id', paymentId)
        .single();

    if (existingPayment) {
        return NextResponse.json({ received: true, duplicate: true });
    }

    // 3. 구독 정보 조회
    const { data: billing } = await supabase
        .from('subscription_billing')
        .select('user_id, billing_key, plan_id, billing_cycle, retry_count, next_payment_id')
        .eq('next_payment_id', paymentId)
        .single();

    if (!billing) {
        console.warn(`[Webhook] 매칭되는 구독 없음 (실패): ${paymentId}`);
        return NextResponse.json({ received: true, error: 'no_matching_subscription' });
    }

    const { user_id, billing_key, plan_id, billing_cycle, retry_count } = billing;
    const planName = getPlanName(plan_id);
    // ⚠️ billing_cycle 기준으로 올바른 금액 사용 (M3 수정)
    const retryAmount = getPlanPrice(plan_id, billing_cycle || 'monthly');

    // 4. 재시도 가능 여부 판단
    if (retry_count < MAX_RETRY_COUNT) {
        // 3일 후 재시도 예약
        const retryDate = new Date();
        retryDate.setDate(retryDate.getDate() + RETRY_INTERVAL_DAYS);
        const retryPaymentId = `sub_retry_${plan_id}_${retryDate.getTime()}_${Math.random().toString(36).substring(2, 8)}`;

        try {
            await schedulePayment({
                paymentId: retryPaymentId,
                billingKey: billing_key,
                orderName: `맵타민 ${planName} 플랜 정기구독 (재시도 ${retry_count + 1}/${MAX_RETRY_COUNT})`,
                amount: retryAmount,
                currency: 'KRW',
                timeToPay: retryDate.toISOString(),
            });

            await supabase
                .from('subscription_billing')
                .update({
                    next_payment_id: retryPaymentId,
                    next_billing_date: retryDate.toISOString(),
                    retry_count: retry_count + 1,
                    status: 'past_due',
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user_id);

            console.log(`[Webhook] 결제 실패 → 재시도 예약: retry=${retry_count + 1}, nextDate=${retryDate.toISOString()}`);
        } catch (error) {
            console.error(`[Webhook] 재시도 예약 실패:`, error);
        }
    } else {
        // 최대 재시도 초과 → 구독 만료 (RPC로 원자적 처리)
        const { error: expireError } = await supabase.rpc(
            'expire_failed_subscription',
            { p_user_id: user_id }
        );

        if (expireError) {
            console.error(`[Webhook] expire_failed_subscription RPC 실패:`, expireError);
        }

        console.log(`[Webhook] 최대 재시도 초과 → 구독 만료: userId=${user_id}`);
    }

    // 5. 실패 이력 저장
    await supabase
        .from('subscription_payment_history')
        .insert({
            user_id,
            payment_id: paymentId,
            plan_id,
            amount: retryAmount,
            status: 'failed',
            failure_reason: paymentData?.orderName || '결제 실패',
        })
        .select()
        .single();

    // 6. 결제 실패 이메일 발송 (비동기 — 실패해도 webhook 응답에 영향 없음)
    try {
        const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('notification_email')
            .eq('user_id', user_id)
            .single();

        if (sub?.notification_email) {
            const isExpired = retry_count >= MAX_RETRY_COUNT;
            const formatDate = (d: Date) => d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
            await sendEmail({
                to: sub.notification_email,
                subject: isExpired
                    ? `[맵타민] 구독이 만료되었습니다`
                    : `[맵타민] 결제 실패 안내`,
                react: PaymentFailedEmail({
                    planName,
                    amount: retryAmount,
                    failedAt: formatDate(new Date()),
                    retryCount: retry_count + 1,
                    maxRetries: MAX_RETRY_COUNT,
                    isExpired,
                    managementUrl: 'https://maptamin.com/dashboard/subscription',
                }),
            });
        }
    } catch (emailError) {
        console.error('[Webhook] 결제 실패 이메일 발송 실패 (무시):', emailError);
    }

    return NextResponse.json({ received: true, failed: true, retry: retry_count < MAX_RETRY_COUNT });
}
