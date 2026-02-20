/**
 * @jest-environment node
 */
import { POST } from './route'
import { createClient } from '@/lib/supabase/server'
import { cancelPayment } from '@/lib/portone/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}))

// Mock PortOne server utilities
jest.mock('@/lib/portone/server', () => ({
    cancelPayment: jest.fn(),
}))

describe('POST /api/payment/refund', () => {
    let mockSupabase: any

    const createRequest = (body: any) => {
        return new Request('http://localhost:3000/api/payment/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }) as unknown as Request
    }

    const validPayload = {
        paymentId: 'ticket_1234567890_abc12345',
        reason: '단순 변심',
    }

    // 7일 이내 결제 내역
    const recentPaymentHistory = {
        id: 'history-1',
        user_id: 'test-user-id',
        payment_id: 'ticket_1234567890_abc12345',
        platform: 'naver',
        quantity: 4,
        amount: 6000,
        status: 'paid',
        created_at: new Date().toISOString(), // 방금 결제
    }

    // 7일 초과 결제 내역
    const oldPaymentHistory = {
        ...recentPaymentHistory,
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8일 전
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
        const req = createRequest({ reason: '환불 사유' })
        const res = await POST(req)

        expect(res.status).toBe(400)
    })

    it('should return 400 if reason is missing', async () => {
        const req = createRequest({ paymentId: 'ticket_123' })
        const res = await POST(req)

        expect(res.status).toBe(400)
    })

    // ─── 결제 내역 존재 확인 ───

    it('should return 404 if payment history not found', async () => {
        mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { code: 'PGRST116' },
        })

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(404)
    })

    // ─── 본인 결제 확인 ───

    it('should return 403 if payment belongs to another user', async () => {
        mockSupabase.single.mockResolvedValueOnce({
            data: { ...recentPaymentHistory, user_id: 'other-user-id' },
            error: null,
        })

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(403)
    })

    // ─── 이미 환불된 결제 ───

    it('should return 409 if payment already refunded', async () => {
        mockSupabase.single.mockResolvedValueOnce({
            data: { ...recentPaymentHistory, status: 'refunded' },
            error: null,
        })

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(409)
    })

    // ─── 7일 초과 ───

    it('should return 400 if payment is older than 7 days', async () => {
        mockSupabase.single.mockResolvedValueOnce({
            data: oldPaymentHistory,
            error: null,
        })

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(400)
    })

    // ─── 성공 시나리오 ───

    it('should return 200 and process refund on valid request', async () => {
        // 결제 내역 조회 성공
        mockSupabase.single.mockResolvedValueOnce({
            data: recentPaymentHistory,
            error: null,
        })

            // PortOne 취소 성공
            ; (cancelPayment as jest.Mock).mockResolvedValue({
                cancellation: {
                    status: 'SUCCEEDED',
                    id: 'cancel-xyz789',
                    totalAmount: 6000,
                },
            })

        // DB 티켓 차감 성공
        mockSupabase.rpc.mockResolvedValueOnce({ error: null })

        // payment_history 상태 업데이트 성공
        mockSupabase.single.mockResolvedValueOnce({ data: {}, error: null })

        const req = createRequest(validPayload)
        const res = await POST(req)
        const data = await res.json()

        expect(res.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.refundedAmount).toBe(6000)

        // PortOne 취소 API 호출 확인
        expect(cancelPayment).toHaveBeenCalledWith(
            validPayload.paymentId,
            validPayload.reason
        )
    })

    // ─── PortOne 취소 실패 ───

    it('should return 502 if PortOne cancel API fails', async () => {
        mockSupabase.single.mockResolvedValueOnce({
            data: recentPaymentHistory,
            error: null,
        })

            ; (cancelPayment as jest.Mock).mockRejectedValue(
                new Error('PortOne 결제 취소 실패 (500): Internal Server Error')
            )

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(502)
    })
})
