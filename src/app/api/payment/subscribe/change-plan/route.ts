import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLAN_CONFIG, getPlanName } from '@/lib/pricing/config'

/**
 * POST /api/payment/subscribe/change-plan
 *
 * 구독 플랜 변경 API
 *
 * 흐름:
 * 1. 인증 확인
 * 2. active 상태 확인
 * 3. 입력값 검증 (유효한 플랜, 현재와 다른 플랜)
 * 4. pending_plan_id 저장 → 다음 결제일에 자동 적용
 *
 * 정책:
 *   - 즉시 변경이 아닌 "다음 결제일부터 적용"
 *   - 일할 계산(proration) 없음 (MVP)
 *   - Webhook handlePaymentPaid에서 pending_plan_id가 있으면 새 플랜으로 전환
 *
 * @body { planId: string } 또는 { cancel: true }
 *
 * @see PLAN_payment-system-fix.md Phase 3
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
        const { planId, cancel } = body

        // ── 2-A. 예약 취소 요청 ──
        if (cancel === true) {
            const { error: cancelError } = await supabase
                .from('subscription_billing')
                .update({
                    pending_plan_id: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)

            if (cancelError) {
                return NextResponse.json(
                    { error: '예약 취소에 실패했습니다.', code: 'CANCEL_FAILED' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                message: '플랜 변경 예약이 취소되었습니다.',
            })
        }

        if (!planId || !PLAN_CONFIG[planId]) {
            return NextResponse.json(
                { error: '유효하지 않은 플랜입니다.', code: 'INVALID_PLAN' },
                { status: 400 }
            )
        }

        if (planId === 'free') {
            return NextResponse.json(
                { error: '무료 플랜으로 변경하려면 구독 해지를 이용해주세요.', code: 'USE_CANCEL_INSTEAD' },
                { status: 400 }
            )
        }

        // ── 3. 구독 정보 조회 ──
        const { data: billing, error: billingError } = await supabase
            .from('subscription_billing')
            .select('plan_id, next_billing_date, status, pending_plan_id')
            .eq('user_id', user.id)
            .single()

        if (billingError || !billing) {
            return NextResponse.json(
                { error: '구독 정보를 찾을 수 없습니다.', code: 'NO_SUBSCRIPTION' },
                { status: 404 }
            )
        }

        if (billing.status !== 'active') {
            return NextResponse.json(
                {
                    error: billing.status === 'cancel_scheduled'
                        ? '해지 예약 중에는 플랜을 변경할 수 없습니다. 먼저 해지를 철회해주세요.'
                        : '활성 구독에서만 플랜을 변경할 수 있습니다.',
                    code: 'INVALID_STATUS'
                },
                { status: 400 }
            )
        }

        if (billing.plan_id === planId) {
            return NextResponse.json(
                { error: '현재 구독 중인 플랜과 동일한 플랜입니다.', code: 'SAME_PLAN' },
                { status: 400 }
            )
        }

        // ── 4. pending_plan_id 저장 ──
        const { error: updateError } = await supabase
            .from('subscription_billing')
            .update({
                pending_plan_id: planId,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('[ChangePlan] DB 업데이트 실패:', updateError)
            return NextResponse.json(
                { error: '플랜 변경 처리 중 오류가 발생했습니다.', code: 'DB_ERROR' },
                { status: 500 }
            )
        }

        const newPlanName = getPlanName(planId)

        return NextResponse.json({
            success: true,
            message: `다음 결제일부터 ${newPlanName} 플랜으로 변경됩니다.`,
            newPlan: planId,
            newPlanName,
            nextBillingDate: billing.next_billing_date,
        })
    } catch (error) {
        console.error('[ChangePlan] 플랜 변경 처리 중 오류:', error)
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
