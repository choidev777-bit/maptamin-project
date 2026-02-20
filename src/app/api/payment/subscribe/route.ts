import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { payWithBillingKey, schedulePayment, getBillingKeyInfo } from '@/lib/portone/billing'
import { PLAN_CONFIG } from '@/lib/pricing/config'

/**
 * POST /api/payment/subscribe
 *
 * 정기 구독 시작 API
 *
 * 흐름:
 * 1. 사용자 인증 확인
 * 2. 입력값 검증 (billingKey, planId)
 * 3. 빌링키 유효성 검증 (PortOne API 조회)
 * 4. 첫 결제 실행 (payWithBillingKey)
 * 5. DB에 구독 정보 저장 (activate_subscription RPC)
 * 6. subscription_payment_history에 결제 이력 저장
 * 7. 다음 달 자동 결제 예약 (schedulePayment)
 *
 * @body { billingKey: string, planId: string }
 *
 * @see PLAN_subscription_payment.md  Phase 4-2
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // ── 1. 인증 확인 ──
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }

        // ── 2. 입력값 검증 ──
        const body = await request.json()
        const { billingKey, planId, billingCycle: rawBillingCycle } = body
        const billingCycle = rawBillingCycle === 'yearly' ? 'yearly' : 'monthly'

        if (!billingKey || typeof billingKey !== 'string') {
            return NextResponse.json(
                { error: 'billingKey는 필수입니다.', code: 'INVALID_BILLING_KEY' },
                { status: 400 }
            )
        }

        if (!planId || !PLAN_CONFIG[planId]) {
            return NextResponse.json(
                { error: '유효하지 않은 플랜입니다.', code: 'INVALID_PLAN' },
                { status: 400 }
            )
        }

        const plan = PLAN_CONFIG[planId]
        if (plan.price <= 0) {
            return NextResponse.json(
                { error: '무료 플랜은 구독이 필요하지 않습니다.', code: 'FREE_PLAN' },
                { status: 400 }
            )
        }

        // 결제 금액 계산 (연간이면 yearlyPrice, 월간이면 price)
        const paymentAmount = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price

        // ── 3. 빌링키 유효성 검증 ──
        try {
            await getBillingKeyInfo(billingKey)
        } catch (error) {
            console.error('빌링키 검증 실패:', error)
            return NextResponse.json(
                { error: '빌링키가 유효하지 않습니다. 다시 카드를 등록해주세요.', code: 'INVALID_BILLING_KEY' },
                { status: 400 }
            )
        }

        // ── 4. 첫 결제 실행 ──
        const paymentId = `sub_${planId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        const planName = planId === 'premium' ? '프리미엄' :
            planId === 'pro' ? '프로' : '스타터'
        const orderName = `맵타민 ${planName} 플랜 정기구독`

        let paymentResult
        try {
            paymentResult = await payWithBillingKey({
                paymentId,
                billingKey,
                orderName,
                amount: paymentAmount,
                currency: 'KRW',
            })
        } catch (error) {
            console.error('첫 결제 실패:', error)
            return NextResponse.json(
                { error: '결제에 실패했습니다. 카드 정보를 확인하고 다시 시도해주세요.', code: 'PAYMENT_FAILED' },
                { status: 502 }
            )
        }

        // ── 5. DB에 구독 정보 저장 (activate_subscription RPC) ──
        const { data: activateResult, error: activateError } = await supabase.rpc(
            'activate_subscription',
            {
                p_user_id: user.id,
                p_plan_id: planId,
                p_billing_key: billingKey,
                p_card_last4: null,
                p_card_brand: null,
                p_billing_cycle: billingCycle,
            }
        )

        if (activateError || !activateResult?.success) {
            console.error('구독 활성화 실패:', activateError || activateResult?.error)
            return NextResponse.json(
                { error: '구독 활성화에 실패했습니다. 고객센터에 문의해주세요.', code: 'ACTIVATION_FAILED' },
                { status: 500 }
            )
        }

        // ── 6. subscription_payment_history에 결제 이력 저장 ──
        const periodStart = new Date()
        const periodEnd = new Date()
        periodEnd.setDate(periodEnd.getDate() + (billingCycle === 'yearly' ? 365 : 30))

        const { error: historyError } = await supabase
            .from('subscription_payment_history')
            .insert({
                user_id: user.id,
                payment_id: paymentId,
                plan_id: planId,
                amount: paymentAmount,
                status: 'paid',
                period_start: periodStart.toISOString(),
                period_end: periodEnd.toISOString(),
            })

        if (historyError) {
            // 이력 저장 실패는 치명적이지 않음 (구독은 이미 활성화됨)
            console.error('결제 이력 저장 실패 (구독은 활성화됨):', historyError)
        }

        // ── 7. 다음 달 자동 결제 예약 ──
        const nextPaymentId = `sub_${planId}_${periodEnd.getTime()}_${Math.random().toString(36).substring(2, 8)}`

        try {
            await schedulePayment({
                paymentId: nextPaymentId,
                billingKey,
                orderName,
                amount: paymentAmount,
                currency: 'KRW',
                timeToPay: periodEnd.toISOString(),
            })

            // 다음 결제 ID를 subscription_billing에 저장
            await supabase
                .from('subscription_billing')
                .update({
                    next_payment_id: nextPaymentId,
                    next_billing_date: periodEnd.toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
        } catch (error) {
            // 예약 실패는 치명적이지 않음 (구독은 활성화됨, Webhook으로 재처리 가능)
            console.error('다음 달 결제 예약 실패 (구독은 활성화됨):', error)
        }

        return NextResponse.json({
            success: true,
            planId,
            planName,
            billingCycle,
            amount: paymentAmount,
            ticketsNaver: activateResult.tickets_naver,
            ticketsGoogle: activateResult.tickets_google,
            periodStart: activateResult.period_start,
            periodEnd: activateResult.period_end,
            message: `${planName} 플랜 구독이 시작되었습니다!`,
        })
    } catch (error) {
        console.error('구독 처리 중 오류:', error)
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
