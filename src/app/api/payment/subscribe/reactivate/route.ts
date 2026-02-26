import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getBillingKeyInfo, schedulePayment } from '@/lib/portone/billing'
import { getPlanPrice, getPlanName } from '@/lib/pricing/config'

/**
 * POST /api/payment/subscribe/reactivate
 *
 * 구독 해지 철회 API
 *
 * 흐름:
 * 1. 인증 확인
 * 2. cancel_scheduled 상태 + 잔여 기간 확인
 * 3. 빌링키 유효성 확인 (카드 만료 등)
 * 4. 다음 결제 재예약 (schedulePayment)
 * 5. status → active, cancelled_at → null
 *
 * 정책: 추가 결제 없음! 기존 기간 유지 + 다음 결제일에 정상 갱신
 *
 * @see PLAN_payment-system-fix.md Phase 3
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

        // ── 2. 구독 정보 조회 ──
        const { data: billing, error: billingError } = await supabase
            .from('subscription_billing')
            .select('billing_key, next_billing_date, plan_id, status')
            .eq('user_id', user.id)
            .single()

        if (billingError || !billing) {
            return NextResponse.json(
                { error: '구독 정보를 찾을 수 없습니다.', code: 'NO_SUBSCRIPTION' },
                { status: 404 }
            )
        }

        // cancel_scheduled 상태만 해지 철회 가능
        if (billing.status !== 'cancel_scheduled') {
            return NextResponse.json(
                { error: '해지 예약된 구독만 해지를 철회할 수 있습니다.', code: 'INVALID_STATUS' },
                { status: 400 }
            )
        }

        // 잔여 기간 확인 (next_billing_date가 아직 지나지 않았는지)
        const nextBillingDate = new Date(billing.next_billing_date)
        if (nextBillingDate <= new Date()) {
            return NextResponse.json(
                { error: '구독 기간이 이미 만료되었습니다. 새로 구독해주세요.', code: 'PERIOD_EXPIRED' },
                { status: 400 }
            )
        }

        // ── 3. 빌링키 유효성 확인 ──
        try {
            await getBillingKeyInfo(billing.billing_key)
        } catch (error) {
            console.error('[Reactivate] 빌링키 검증 실패:', error)
            return NextResponse.json(
                { error: '등록된 카드 정보가 만료되었습니다. 새로운 카드를 등록하고 다시 구독해주세요.', code: 'BILLING_KEY_EXPIRED' },
                { status: 400 }
            )
        }

        // ── 4. 다음 결제 재예약 ──
        const planName = getPlanName(billing.plan_id)
        const amount = getPlanPrice(billing.plan_id)
        const nextPaymentId = `sub_${billing.plan_id}_${nextBillingDate.getTime()}_${Math.random().toString(36).substring(2, 8)}`

        try {
            await schedulePayment({
                paymentId: nextPaymentId,
                billingKey: billing.billing_key,
                orderName: `맵타민 ${planName} 플랜 정기구독`,
                amount,
                currency: 'KRW',
                timeToPay: nextBillingDate.toISOString(),
            })
        } catch (error) {
            console.error('[Reactivate] 결제 재예약 실패:', error)
            return NextResponse.json(
                { error: '결제 재예약에 실패했습니다. 잠시 후 다시 시도해주세요.', code: 'SCHEDULE_FAILED' },
                { status: 500 }
            )
        }

        // ── 5. DB 업데이트: active 복구 ──
        const { error: updateError } = await supabase
            .from('subscription_billing')
            .update({
                status: 'active',
                cancelled_at: null,
                next_payment_id: nextPaymentId,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('[Reactivate] DB 업데이트 실패:', updateError)
            return NextResponse.json(
                { error: '구독 복구 처리 중 오류가 발생했습니다.', code: 'DB_ERROR' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: '구독이 다시 활성화되었습니다.',
            nextBillingDate: billing.next_billing_date,
        })
    } catch (error) {
        console.error('[Reactivate] 구독 해지 철회 처리 중 오류:', error)
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
