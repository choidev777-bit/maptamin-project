import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { verifyPayment, validatePaymentAmount } from '@/lib/portone/server'
import { calculateTicketPrice } from '@/lib/pricing/ticket-price'

/**
 * POST /api/payment/ticket
 *
 * 티켓 결제 검증 및 지급 API
 *
 * 흐름:
 * 1. 사용자 인증 확인
 * 2. 입력값 검증 (paymentId, platform, quantity)
 * 3. 중복 결제 방지 (payment_history 조회)
 * 4. PortOne REST API로 결제 검증 (status === PAID, 금액 일치)
 * 5. DB에서 remaining_tickets_{platform} 증가
 * 6. payment_history에 결제 내역 저장
 *
 * @body { paymentId: string, platform: 'naver' | 'google', quantity: number }
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
        const { paymentId, platform, quantity } = body

        if (!paymentId || typeof paymentId !== 'string') {
            return NextResponse.json(
                { error: 'paymentId는 필수입니다.', code: 'INVALID_PAYMENT_ID' },
                { status: 400 }
            )
        }

        if (platform !== 'naver' && platform !== 'google') {
            return NextResponse.json(
                { error: '플랫폼은 naver 또는 google이어야 합니다.', code: 'INVALID_PLATFORM' },
                { status: 400 }
            )
        }

        if (!quantity || typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity)) {
            return NextResponse.json(
                { error: '수량은 1 이상의 정수여야 합니다.', code: 'INVALID_QUANTITY' },
                { status: 400 }
            )
        }

        // ── 3. 중복 결제 방지 ──
        const { data: existingPayment } = await supabase
            .from('payment_history')
            .select('payment_id')
            .eq('payment_id', paymentId)
            .single()

        if (existingPayment) {
            return NextResponse.json(
                { error: '이미 처리된 결제입니다.', code: 'DUPLICATE_PAYMENT' },
                { status: 409 }
            )
        }

        // ── 4. PortOne 결제 검증 ──
        let paymentData
        try {
            paymentData = await verifyPayment(paymentId)
        } catch (error) {
            console.error('PortOne 결제 조회 실패:', error)
            return NextResponse.json(
                { error: '결제 검증에 실패했습니다. 잠시 후 다시 시도해주세요.', code: 'PORTONE_ERROR' },
                { status: 502 }
            )
        }

        // 결제 상태 및 금액 검증
        const expectedAmount = calculateTicketPrice(quantity)
        const isValid = validatePaymentAmount(paymentData, expectedAmount)

        if (!isValid) {
            console.error('결제 검증 실패:', {
                paymentId,
                expectedAmount,
                actualStatus: paymentData.status,
                actualAmount: paymentData.amount?.total,
            })
            return NextResponse.json(
                {
                    error: '결제 정보가 올바르지 않습니다.',
                    code: 'PAYMENT_VERIFICATION_FAILED',
                },
                { status: 400 }
            )
        }

        // ── 5. DB 티켓 증가 ──
        const ticketColumn =
            platform === 'naver' ? 'remaining_tickets_naver' : 'remaining_tickets_google'

        const { error: rpcError } = await supabase.rpc('add_tickets', {
            p_user_id: user.id,
            p_platform: platform,
            p_quantity: quantity,
        })

        if (rpcError) {
            console.error('티켓 지급 실패:', rpcError)
            return NextResponse.json(
                { error: '티켓 지급에 실패했습니다. 고객센터에 문의해주세요.', code: 'TICKET_UPDATE_FAILED' },
                { status: 500 }
            )
        }

        // ── 6. 결제 내역 저장 ──
        const { error: historyError } = await supabase
            .from('payment_history')
            .insert({
                user_id: user.id,
                payment_id: paymentId,
                platform,
                quantity,
                amount: expectedAmount,
                status: 'paid',
                order_name: paymentData.orderName || `${platform} 티켓 ${quantity}장`,
            })
            .select()
            .single()

        if (historyError) {
            // 결제 내역 저장 실패는 치명적이지 않음 (티켓은 이미 지급됨)
            console.error('결제 내역 저장 실패 (티켓은 지급됨):', historyError)
        }

        return NextResponse.json({
            success: true,
            addedTickets: quantity,
            platform,
            message: `${platform === 'naver' ? '네이버' : '구글'} 진단 티켓 ${quantity}장이 지급되었습니다.`,
        })
    } catch (error) {
        console.error('결제 처리 중 오류:', error)
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
