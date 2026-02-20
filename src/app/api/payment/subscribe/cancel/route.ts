import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cancelSchedule, deleteBillingKey } from '@/lib/portone/billing'

/**
 * POST /api/payment/subscribe/cancel
 *
 * 구독 해지 API
 *
 * 흐름:
 * 1. 사용자 인증 확인
 * 2. 활성 구독 조회
 * 3. PortOne: 다음 결제 예약 취소
 * 4. PortOne: 빌링키 삭제 (보안)
 * 5. DB: subscription_billing status → 'canceled'
 *
 * 정책: "즉시 환불" 아님.
 *   - 이미 결제한 기간(~next_billing_date)까지 혜택 유지
 *   - 다음 결제일에 갱신되지 않고 자연 만료
 *
 * @see PLAN_subscription_payment.md  Phase 4-4
 */
export async function POST() {
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

        // ── 2. 활성 구독 조회 ──
        const { data: billing, error: billingError } = await supabase
            .from('subscription_billing')
            .select('billing_key, next_payment_id, next_billing_date, plan_id, status')
            .eq('user_id', user.id)
            .single()

        if (billingError || !billing) {
            return NextResponse.json(
                { error: '구독 정보를 찾을 수 없습니다.', code: 'NO_SUBSCRIPTION' },
                { status: 404 }
            )
        }

        if (billing.status === 'canceled') {
            return NextResponse.json(
                { error: '이미 해지된 구독입니다.', code: 'ALREADY_CANCELED' },
                { status: 400 }
            )
        }

        if (billing.status !== 'active' && billing.status !== 'past_due') {
            return NextResponse.json(
                { error: '해지할 수 있는 상태가 아닙니다.', code: 'INVALID_STATUS' },
                { status: 400 }
            )
        }

        // ── 3. PortOne: 다음 결제 예약 취소 ──
        if (billing.next_payment_id) {
            try {
                await cancelSchedule([billing.next_payment_id])
            } catch (error) {
                // 예약이 이미 취소/만료된 경우 무시 (해지 자체는 실패시키지 않음)
                console.warn('[Cancel] 예약 결제 취소 중 오류 (무시됨):', error)
            }
        }

        // ── 4. PortOne: 빌링키 삭제 (보안) ──
        if (billing.billing_key) {
            try {
                await deleteBillingKey(billing.billing_key)
            } catch (error) {
                // 빌링키가 이미 삭제된 경우 무시
                console.warn('[Cancel] 빌링키 삭제 중 오류 (무시됨):', error)
            }
        }

        // ── 5. DB: 구독 상태 → canceled ──
        const { error: updateError } = await supabase
            .from('subscription_billing')
            .update({
                status: 'canceled',
                next_payment_id: null,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('[Cancel] DB 업데이트 실패:', updateError)
            return NextResponse.json(
                { error: '구독 해지 처리 중 오류가 발생했습니다.', code: 'DB_ERROR' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: '구독이 해지되었습니다.',
            effectiveUntil: billing.next_billing_date,
        })
    } catch (error) {
        console.error('[Cancel] 구독 해지 처리 중 오류:', error)
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
