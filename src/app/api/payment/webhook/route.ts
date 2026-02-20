import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyPayment } from '@/lib/portone/server'
import { schedulePayment } from '@/lib/portone/billing'
import { PLAN_CONFIG } from '@/lib/pricing/config'

/**
 * POST /api/payment/webhook
 *
 * PortOne V2 Webhook 핸들러 (버전 2024-04-25)
 *
 * 처리하는 이벤트:
 * - Transaction.Paid   → 구독 결제 성공 → 티켓 충전 + 다음 달 예약
 * - Transaction.Failed → 구독 결제 실패 → 재시도 (최대 3회) or 구독 만료
 *
 * 처리하지 않는 이벤트:
 * - BillingKey.*        → 로깅만
 * - 기타 Transaction.*  → 무시
 *
 * ⚠️ Webhook은 항상 200을 반환해야 합니다.
 *    200이 아니면 PortOne이 최대 5회 재전송합니다.
 *
 * @see PLAN_subscription_payment.md  Phase 4-3
 * @see https://developers.portone.io/opi/ko/integration/webhook/readme-v2
 */

const MAX_RETRY_COUNT = 3;
const RETRY_INTERVAL_DAYS = 3;

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
        const body: WebhookPayload = await request.json();
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

        // ── Supabase 클라이언트 생성 (한 번만) ──
        const supabase = await createClient();

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
        .select('user_id, billing_key, plan_id, billing_cycle, retry_count')
        .eq('next_payment_id', paymentId)
        .single();

    if (!billing) {
        console.warn(`[Webhook] 매칭되는 구독 없음: ${paymentId}`);
        return NextResponse.json({ received: true, error: 'no_matching_subscription' });
    }

    const { user_id, billing_key, plan_id, billing_cycle } = billing;
    const isYearly = billing_cycle === 'yearly';

    // 4. 구독 활성화 + 티켓 충전 (RPC)
    const { data: activateResult, error: activateError } = await supabase.rpc(
        'activate_subscription',
        {
            p_user_id: user_id,
            p_plan_id: plan_id,
            p_billing_key: billing_key,
            p_billing_cycle: billing_cycle || 'monthly',
        }
    );

    if (activateError || !activateResult?.success) {
        console.error(`[Webhook] 구독 활성화 실패:`, activateError || activateResult);
    }

    // 5. 결제 이력 저장
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + (isYearly ? 365 : 30));

    await supabase
        .from('subscription_payment_history')
        .insert({
            user_id,
            payment_id: paymentId,
            plan_id,
            amount: paymentData.amount.total,
            status: 'paid',
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
        })
        .select()
        .single();

    // 6. 다음 달 자동 결제 예약
    const plan = PLAN_CONFIG[plan_id];
    const nextPaymentId = `sub_${plan_id}_${periodEnd.getTime()}_${Math.random().toString(36).substring(2, 8)}`;
    const planName = plan_id === 'premium' ? '프리미엄' :
        plan_id === 'pro' ? '프로' : '스타터';

    try {
        const nextAmount = isYearly ? (plan?.yearlyPrice || paymentData.amount.total) : (plan?.price || paymentData.amount.total);
        await schedulePayment({
            paymentId: nextPaymentId,
            billingKey: billing_key,
            orderName: `맵타민 ${planName} 플랜 정기구독`,
            amount: nextAmount,
            currency: 'KRW',
            timeToPay: periodEnd.toISOString(),
        });

        // subscription_billing 업데이트
        await supabase
            .from('subscription_billing')
            .update({
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

    console.log(`[Webhook] 결제 성공 처리 완료: paymentId=${paymentId}, userId=${user_id}`);
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
        .select('user_id, billing_key, plan_id, retry_count, next_payment_id')
        .eq('next_payment_id', paymentId)
        .single();

    if (!billing) {
        console.warn(`[Webhook] 매칭되는 구독 없음 (실패): ${paymentId}`);
        return NextResponse.json({ received: true, error: 'no_matching_subscription' });
    }

    const { user_id, billing_key, plan_id, retry_count } = billing;
    const plan = PLAN_CONFIG[plan_id];
    const planName = plan_id === 'premium' ? '프리미엄' :
        plan_id === 'pro' ? '프로' : '스타터';

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
                amount: plan?.price || 0,
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
        // 최대 재시도 초과 → 구독 만료
        await supabase
            .from('subscription_billing')
            .update({
                status: 'expired',
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user_id);

        console.log(`[Webhook] 최대 재시도 초과 → 구독 만료: userId=${user_id}`);
    }

    // 5. 실패 이력 저장
    await supabase
        .from('subscription_payment_history')
        .insert({
            user_id,
            payment_id: paymentId,
            plan_id,
            amount: plan?.price || 0,
            status: 'failed',
            failure_reason: paymentData?.orderName || '결제 실패',
        })
        .select()
        .single();

    return NextResponse.json({ received: true, failed: true, retry: retry_count < MAX_RETRY_COUNT });
}
