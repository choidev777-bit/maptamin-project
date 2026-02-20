/**
 * @jest-environment node
 */
import { POST } from './route'
import { createClient } from '@/lib/supabase/server'
import { verifyPayment, validatePaymentAmount } from '@/lib/portone/server'
import { calculateTicketPrice } from '@/lib/pricing/ticket-price'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}))

// Mock PortOne server utilities
jest.mock('@/lib/portone/server', () => ({
    verifyPayment: jest.fn(),
    validatePaymentAmount: jest.fn(),
}))

// Mock ticket-price (실제 값 사용)
jest.mock('@/lib/pricing/ticket-price', () => ({
    TICKET_PRICE: 1500,
    calculateTicketPrice: jest.fn((qty: number) => qty * 1500),
}))

describe('POST /api/payment/ticket', () => {
    let mockSupabase: any

    const createRequest = (body: any) => {
        return new Request('http://localhost:3000/api/payment/ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }) as unknown as Request
    }

    const validPayload = {
        paymentId: 'ticket_1234567890_abc12345',
        platform: 'naver',
        quantity: 4,
    }

    beforeEach(() => {
        jest.clearAllMocks()

        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'test-user-id', email: 'test@example.com' } }
                })
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            rpc: jest.fn(),
        }

            ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)
    })

    // ─── 인증 테스트 ───

    it('should return 401 if user is not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(401)
    })

    // ─── 입력 유효성 테스트 ───

    it('should return 400 if paymentId is missing', async () => {
        const req = createRequest({ platform: 'naver', quantity: 4 })
        const res = await POST(req)

        expect(res.status).toBe(400)
    })

    it('should return 400 if platform is invalid', async () => {
        const req = createRequest({ paymentId: 'ticket_123', platform: 'kakao', quantity: 4 })
        const res = await POST(req)

        expect(res.status).toBe(400)
    })

    it('should return 400 if quantity is zero or negative', async () => {
        const req = createRequest({ paymentId: 'ticket_123', platform: 'naver', quantity: 0 })
        const res = await POST(req)

        expect(res.status).toBe(400)
    })

    // ─── 중복 결제 방지 테스트 ───

    it('should return 409 if paymentId already processed', async () => {
        // payment_history에서 기존 결제 발견
        mockSupabase.single.mockResolvedValueOnce({
            data: { payment_id: 'ticket_123' },
            error: null,
        })

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(409)
    })

    // ─── 결제 검증 테스트 ───

    it('should return 400 if payment status is not PAID', async () => {
        // payment_history에서 중복 없음
        mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116' }, // not found
        })

            ; (verifyPayment as jest.Mock).mockResolvedValue({
                status: 'FAILED',
                amount: { total: 6000 },
                currency: 'KRW',
            })
            ; (validatePaymentAmount as jest.Mock).mockReturnValue(false)

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(400)
    })

    it('should return 400 if payment amount does not match', async () => {
        // payment_history에서 중복 없음
        mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116' },
        })

            ; (verifyPayment as jest.Mock).mockResolvedValue({
                status: 'PAID',
                amount: { total: 3000 }, // 조작된 금액
                currency: 'KRW',
            })
            ; (validatePaymentAmount as jest.Mock).mockReturnValue(false)

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(400)
    })

    // ─── 성공 시나리오 테스트 ───

    it('should return 200 and increase tickets on valid payment', async () => {
        // payment_history에서 중복 없음
        mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116' },
        })

            // PortOne 결제 검증 성공
            ; (verifyPayment as jest.Mock).mockResolvedValue({
                status: 'PAID',
                id: validPayload.paymentId,
                amount: { total: 6000 },
                currency: 'KRW',
                orderName: '네이버 실시간 진단 티켓 4장',
            })
            ; (validatePaymentAmount as jest.Mock).mockReturnValue(true)

        // DB 업데이트 성공 (remaining_tickets 증가)
        mockSupabase.rpc.mockResolvedValueOnce({ error: null })

        // payment_history insert 성공
        mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'history-id-1' },
            error: null,
        })

        const req = createRequest(validPayload)
        const res = await POST(req)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.addedTickets).toBe(4)

        // PortOne 검증이 호출되었는지
        expect(verifyPayment).toHaveBeenCalledWith(validPayload.paymentId)

        // 금액 검증이 호출되었는지 (4장 * 1500 = 6000)
        expect(validatePaymentAmount).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'PAID', amount: { total: 6000 } }),
            6000
        )
    })

    // ─── PortOne API 에러 테스트 ───

    it('should return 502 if PortOne API fails', async () => {
        // payment_history에서 중복 없음
        mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116' },
        })

            ; (verifyPayment as jest.Mock).mockRejectedValue(
                new Error('PortOne 결제 조회 실패 (500): Internal Server Error')
            )

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(502)
    })

    // ─── DB 업데이트 실패 테스트 ───

    it('should return 500 if DB ticket update fails', async () => {
        // payment_history에서 중복 없음
        mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116' },
        })

            // PortOne 결제 검증 성공
            ; (verifyPayment as jest.Mock).mockResolvedValue({
                status: 'PAID',
                amount: { total: 6000 },
                currency: 'KRW',
            })
            ; (validatePaymentAmount as jest.Mock).mockReturnValue(true)

        // DB 업데이트 실패
        mockSupabase.rpc.mockResolvedValueOnce({
            error: { message: 'DB Error' }
        })

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(500)
    })
})
