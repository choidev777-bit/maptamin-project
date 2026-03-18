import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cancelPayment } from '@/lib/portone/server'

/** 환불 가능 기간 (일) — 이용약관 제20조 기준 */
const REFUND_DEADLINE_DAYS = 7

/**
 * POST /api/payment/refund
 *
 * 결제 환불 처리 API
 *
 * 흐름:
 * 1. 사용자 인증 확인
 * 2. 입력값 검증 (paymentId, reason)
 * 3. payment_history에서 결제 내역 조회
 * 4. 본인 결제인지 확인
 * 5. 이미 환불되었는지 확인
 * 6. 구매 후 7일 이내인지 확인 (이용약관 제20조)
 * 7. PortOne REST API로 결제 취소
 * 8. DB에서 remaining_tickets_{platform} 차감
 * 9. payment_history 상태를 'refunded'로 변경
 *
 * @body { paymentId: string, reason: string }
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
        const { paymentId, reason } = body

        if (!paymentId || typeof paymentId !== 'string') {
            return NextResponse.json(
                { error: 'paymentId는 필수입니다.', code: 'INVALID_PAYMENT_ID' },
                { status: 400 }
            )
        }

        if (!reason || typeof reason !== 'string') {
            return NextResponse.json(
                { error: '환불 사유는 필수입니다.', code: 'INVALID_REASON' },
                { status: 400 }
            )
        }

        // ── 3. 결제 내역 조회 ──
        const { data: paymentHistory, error: historyError } = await supabase
            .from('payment_history')
            .select('*')
            .eq('payment_id', paymentId)
            .single()

        if (historyError || !paymentHistory) {
            return NextResponse.json(
                { error: '결제 내역을 찾을 수 없습니다.', code: 'PAYMENT_NOT_FOUND' },
                { status: 404 }
            )
        }

        // ── 4. 본인 결제 확인 ──
        if (paymentHistory.user_id !== user.id) {
            return NextResponse.json(
                { error: '본인의 결제만 환불할 수 있습니다.', code: 'FORBIDDEN' },
                { status: 403 }
            )
        }

        // ── 5. 이미 환불된 결제 확인 ──
        if (paymentHistory.status === 'refunded') {
            return NextResponse.json(
                { error: '이미 환불된 결제입니다.', code: 'ALREADY_REFUNDED' },
                { status: 409 }
            )
        }

        // ── 6. 구매 후 7일 이내인지 확인 ──
        const purchaseDate = new Date(paymentHistory.created_at)
        const now = new Date()
        const daysSincePurchase = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)

        if (daysSincePurchase > REFUND_DEADLINE_DAYS) {
            return NextResponse.json(
                {
                    error: `구매 후 ${REFUND_DEADLINE_DAYS}일이 경과하여 환불이 불가합니다.`,
                    code: 'REFUND_DEADLINE_EXCEEDED',
                },
                { status: 400 }
            )
        }

        // ── 6-b. 잔여 티켓 조회 ──
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select('remaining_tickets_naver, remaining_tickets_google')
            .eq('user_id', user.id)
            .single()

        if (subError || !subscription) {
            return NextResponse.json(
                { error: '구독 정보를 확인할 수 없습니다.', code: 'SUBSCRIPTION_NOT_FOUND' },
                { status: 500 }
            )
        }

        const remainingTickets = paymentHistory.platform === 'naver'
            ? subscription.remaining_tickets_naver
            : subscription.remaining_tickets_google

        // ── 6-c. 이 결제보다 나중에 구매한 같은 플랫폼 티켓 합계 (FIFO) ──
        const { data: laterPurchases } = await supabase
            .from('payment_history')
            .select('quantity')
            .eq('user_id', user.id)
            .eq('platform', paymentHistory.platform)
            .eq('status', 'paid')
            .gt('created_at', paymentHistory.created_at)

        const laterPurchasedTotal = (laterPurchases || [])
            .reduce((sum: number, p: { quantity: number }) => sum + p.quantity, 0)

        // ── 6-d. FIFO 기반 사용 여부 판단 ──
        const availableFromThisPurchase = remainingTickets - laterPurchasedTotal

        if (availableFromThisPurchase < paymentHistory.quantity) {
            return NextResponse.json(
                {
                    error: '티켓을 이미 사용하여 환불이 불가합니다.',
                    code: 'INSUFFICIENT_TICKETS_FOR_REFUND',
                },
                { status: 409 }
            )
        }

        // ── 7. PortOne 결제 취소 ──
        try {
            await cancelPayment(paymentId, reason)
        } catch (error) {
            console.error('PortOne 결제 취소 실패:', error)
            return NextResponse.json(
                { error: '환불 처리에 실패했습니다. 잠시 후 다시 시도해주세요.', code: 'PORTONE_CANCEL_ERROR' },
                { status: 502 }
            )
        }

        // ── 8. DB 티켓 차감 ──
        const { error: rpcError } = await supabase.rpc('deduct_tickets_for_refund', {
            p_user_id: user.id,
            p_platform: paymentHistory.platform,
            p_quantity: paymentHistory.quantity,
        })

        if (rpcError) {
            // 포트원에서는 이미 환불됨 → 심각한 상태 불일치
            console.error('환불 후 티켓 차감 실패 (수동 처리 필요):', rpcError)
        }

        // ── 9. payment_history 상태 업데이트 ──
        const { error: updateError } = await supabase
            .from('payment_history')
            .update({
                status: 'refunded',
                refunded_at: new Date().toISOString(),
                refund_reason: reason,
            })
            .eq('payment_id', paymentId)
            .select()
            .single()

        if (updateError) {
            console.error('환불 내역 업데이트 실패:', updateError)
        }

        return NextResponse.json({
            success: true,
            refundedAmount: paymentHistory.amount,
            message: `${paymentHistory.amount.toLocaleString('ko-KR')}원이 환불되었습니다.`,
        })
    } catch (error) {
        console.error('환불 처리 중 오류:', error)
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
