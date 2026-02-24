import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cancelPayment } from '@/lib/portone/server'
import { cancelSchedule, deleteBillingKey } from '@/lib/portone/billing'

/**
 * POST /api/payment/subscribe/refund
 *
 * 구독 환불 API (약관 제20조 1항 ① 기반)
 *
 * 환불 조건:
 * 1. 첫 구독 결제만 대상 (갱신 결제 제외)
 * 2. 결제일로부터 7일 이내
 * 3. 서비스 미이용 (웰컴리포트 = 성공한 검색 결과 없음)
 *
 * 흐름:
 * 1. 인증 확인
 * 2. 구독 정보 조회
 * 3. 첫 구독인지 확인 (payment_history 건수)
 * 4. 7일 이내인지 확인
 * 5. 웰컴리포트 이용 여부 확인 (searches + search_results JOIN)
 * 6. PortOne cancelPayment (전액 환불)
 * 7. 후처리: 예약 결제 취소, 빌링키 삭제, plan_id=free, status=expired
 *
 * @see Docs/terms_of_service_draft.md 제20조 1항 ①
 * @see PLAN_payment-system-fix.md Phase 3 (M6)
 */

const REFUND_PERIOD_DAYS = 7

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
            .select('billing_key, next_payment_id, plan_id, status, created_at')
            .eq('user_id', user.id)
            .single()

        if (billingError || !billing) {
            return NextResponse.json(
                { error: '구독 정보를 찾을 수 없습니다.', code: 'NO_SUBSCRIPTION' },
                { status: 404 }
            )
        }

        if (billing.status !== 'active' && billing.status !== 'cancel_scheduled') {
            return NextResponse.json(
                { error: '환불 가능한 구독 상태가 아닙니다.', code: 'INVALID_STATUS' },
                { status: 400 }
            )
        }

        // ── 3. 첫 구독인지 확인 (갱신 결제는 환불 대상 아님) ──
        const { data: paymentHistory, error: historyError } = await supabase
            .from('subscription_payment_history')
            .select('id, payment_id, created_at, amount')
            .eq('user_id', user.id)
            .eq('status', 'paid')
            .order('created_at', { ascending: true })

        if (historyError || !paymentHistory || paymentHistory.length === 0) {
            return NextResponse.json(
                { error: '결제 내역이 없습니다.', code: 'NO_PAYMENT_HISTORY' },
                { status: 404 }
            )
        }

        if (paymentHistory.length > 1) {
            return NextResponse.json(
                { error: '자동 갱신 결제는 환불 대상이 아닙니다. 구독 해지를 이용해주세요.', code: 'RENEWAL_NOT_REFUNDABLE' },
                { status: 400 }
            )
        }

        // 첫 번째(유일한) 결제
        const firstPayment = paymentHistory[0]

        // ── 4. 결제일로부터 7일 이내인지 확인 ──
        const paymentDate = new Date(firstPayment.created_at)
        const now = new Date()
        const daysDiff = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff >= REFUND_PERIOD_DAYS) {
            return NextResponse.json(
                { error: `결제일로부터 ${REFUND_PERIOD_DAYS}일이 경과하여 환불이 불가합니다.`, code: 'REFUND_PERIOD_EXPIRED' },
                { status: 400 }
            )
        }

        // ── 5. 서비스 이용 여부 확인 (웰컴리포트 기준) ──
        // 성공한 검색 결과가 있는 검색만 "이용"으로 판단
        // 검색 시도했지만 실패(search_results 없음)는 "미이용"으로 판단
        const { count: usedCount, error: usageError } = await supabase
            .from('searches')
            .select('id, search_results!inner(id)', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', paymentDate.toISOString())
            .is('deleted_at', null)

        if (usageError) {
            console.error('[Refund] 이용 내역 조회 실패:', usageError)
            return NextResponse.json(
                { error: '이용 내역 확인 중 오류가 발생했습니다.', code: 'USAGE_CHECK_ERROR' },
                { status: 500 }
            )
        }

        if (usedCount && usedCount > 0) {
            return NextResponse.json(
                { error: '서비스를 이용하셨으므로 환불이 불가합니다. (웰컴리포트 이용 내역 확인됨)', code: 'SERVICE_ALREADY_USED' },
                { status: 400 }
            )
        }

        // ── 6. PortOne 결제 취소 (전액 환불) ──
        try {
            await cancelPayment(
                firstPayment.payment_id,
                '구독 7일 이내 미이용 전액 환불 (약관 제20조 1항 ①)'
            )
        } catch (error) {
            console.error('[Refund] PortOne 결제 취소 실패:', error)
            return NextResponse.json(
                { error: '환불 처리에 실패했습니다. 고객센터에 문의해주세요.', code: 'PORTONE_CANCEL_FAILED' },
                { status: 500 }
            )
        }

        // ── 7. 후처리 — 예약 결제 취소 + 빌링키 삭제 + DB 업데이트 ──

        // 7-1. 예약 결제 취소
        if (billing.next_payment_id) {
            try {
                await cancelSchedule([billing.next_payment_id])
            } catch (error) {
                console.warn('[Refund] 예약 결제 취소 중 오류 (무시됨):', error)
            }
        }

        // 7-2. 빌링키 삭제
        if (billing.billing_key) {
            try {
                await deleteBillingKey(billing.billing_key)
            } catch (error) {
                console.warn('[Refund] 빌링키 삭제 중 오류 (무시됨):', error)
            }
        }

        // 7-3. 구독 billing 상태 → expired
        await supabase
            .from('subscription_billing')
            .update({
                status: 'expired',
                next_payment_id: null,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)

        // 7-4. 결제 이력 상태 → refunded
        await supabase
            .from('subscription_payment_history')
            .update({ status: 'refunded' })
            .eq('id', firstPayment.id)

        // 7-5. 사용자 구독 → free + 티켓 리셋
        await supabase
            .from('user_subscriptions')
            .update({
                plan_id: 'free',
                remaining_tickets_naver: 0,
                remaining_tickets_google: 0,
                current_period_end: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)

        console.log(`[Refund] 구독 환불 완료: userId=${user.id}, paymentId=${firstPayment.payment_id}, amount=${firstPayment.amount}`)

        return NextResponse.json({
            success: true,
            message: '구독이 환불되었습니다.',
            refundedAmount: firstPayment.amount,
            refundedPaymentId: firstPayment.payment_id,
        })
    } catch (error) {
        console.error('[Refund] 구독 환불 처리 중 오류:', error)
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
