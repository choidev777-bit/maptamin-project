/**
 * @jest-environment node
 */
import { POST } from './route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn()
}))

// Mock Config
jest.mock('@/lib/pricing/config', () => ({
    PLAN_CONFIG: {
        starter: { gridSize: 3, price: 0, /* ... */ },
        pro: { gridSize: 5, price: 0, /* ... */ }
    }
}))

describe('Naver Search API', () => {
    let mockSupabase: any
    let mockRequest: any

    const createRequest = (body: any) => {
        return new Request('http://localhost:3000/api/naver/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }) as unknown as Request
    }

    const validPayload = {
        placeName: 'Test Place',
        placeAddress: 'Seoul',
        placeLat: 37.5,
        placeLng: 127.0,
        keywords: ['cafe'],
        gridPoints: [{ row: 0, col: 0, enabled: true }],
        distance: 1,
        distanceUnit: 'km',
        placeId: 'test-place-id'
    }

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks()

        // Setup common mock responses
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
            rpc: jest.fn()
        }

            ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)
    })

    it('should return 401 if user is not logged in', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
        const req = createRequest(validPayload)
        const res = await POST(req)
        expect(res.status).toBe(401)
    })

    it('should deduct ticket and create search on success', async () => {
        // Mock subscription with tickets
        mockSupabase.single.mockResolvedValueOnce({
            data: { plan_id: 'starter', remaining_tickets_naver: 5 }
        })
        // Mock deduct success
        mockSupabase.rpc.mockResolvedValueOnce({ error: null })
        // Mock insert success
        mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'new-search-id' },
            error: null
        })

        const req = createRequest(validPayload)
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data).toHaveProperty('searchId', 'new-search-id')

        // Verify deduct ticket called for Naver
        expect(mockSupabase.rpc).toHaveBeenCalledWith('deduct_ticket', { p_platform: 'naver' })
    })

    it('should return 402 if no tickets', async () => {
        // Mock subscription with NO tickets
        mockSupabase.single.mockResolvedValueOnce({
            data: { plan_id: 'starter', remaining_tickets_naver: 0 }
        })

        const req = createRequest(validPayload)
        const response = await POST(req)

        expect(response.status).toBe(402)
        expect(mockSupabase.rpc).not.toHaveBeenCalledWith('deduct_ticket', expect.anything())
    })

    it('should refund ticket if search creation fails', async () => {
        // Mock tickets available
        mockSupabase.single.mockResolvedValueOnce({
            data: { plan_id: 'starter', remaining_tickets_naver: 1 }
        })
        // Mock deduct success
        mockSupabase.rpc.mockResolvedValueOnce({ error: null })

        // Mock insert FAIL
        mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { message: 'DB Error' }
        })
        // Mock refund success
        mockSupabase.rpc.mockResolvedValueOnce({ error: null })

        const req = createRequest(validPayload)
        const response = await POST(req)

        expect(response.status).toBe(500)

        // Verify deduct AND refund sequence
        expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, 'deduct_ticket', { p_platform: 'naver' })
        expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, 'refund_ticket', { p_platform: 'naver' })
    })
})
