
/**
 * @jest-environment node
 */
import { POST } from './route'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}))

describe('Naver Search API Integration Test', () => {
    let mockSupabase: any
    let mockUser = { id: 'test-user-id', email: 'test@example.com' }

    beforeEach(() => {
        jest.clearAllMocks()

        // Setup Mock Chain
        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }),
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            insert: jest.fn().mockReturnThis(),
            rpc: jest.fn(),
        }

            ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)
    })

    // Helper to create request
    const createRequest = (body: any) => {
        return new Request('http://localhost:3000/api/naver/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
    }

    // Default valid payload
    const validPayload = {
        placeName: 'Test Shop',
        placeAddress: 'Seoul',
        placeLat: 37.123,
        placeLng: 127.123,
        keywords: ['Keyword1', 'Keyword2'], // 2 Keywords
        gridPoints: Array(9).fill({ enabled: true, row: 0, col: 0 }), // 9 Points enabled
        distance: 500,
        distanceUnit: 'm',
        placeId: 'test-place-id'
    }

    it('should return 401 if user is not logged in', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(401)
    })

    it('should deduct credits and create search on success', async () => {
        // 1. Mock Daily Usage Check (First single() call)
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

        // 2. Mock Credit Check (Second single() call)
        mockSupabase.single.mockResolvedValueOnce({ data: { plan_id: 'pro' }, error: null })

        // Mock RPC Success (Deduct Credits)
        mockSupabase.rpc.mockResolvedValue({ data: { success: true }, error: null })

        // 3. Mock Search Creation (Third single() call)
        // Note: The code calls from().insert().select().single()
        // My mock chain for insert returns 'this', select returns 'this', then single returns value.
        // So the THIRD call to single() is for the search creation.
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'new-search-id' }, error: null })

        const req = createRequest(validPayload)
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.searchId).toBe('new-search-id')

        // Verify RPC call cost calculation
        // 9 points * 2 keywords = 18 credits
        expect(mockSupabase.rpc).toHaveBeenCalledWith('deduct_credits_and_track_usage', expect.objectContaining({
            p_cost: 18,
            p_platform: 'naver'
        }))
    })

    it('should return 402 if rpc returns insufficient balance', async () => {
        // 1. Mock Daily Usage Check
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

        // 2. Mock Credit Check
        mockSupabase.single.mockResolvedValueOnce({ data: { plan_id: 'pro' }, error: null })

        // Mock RPC Fail
        mockSupabase.rpc.mockResolvedValue({ data: { success: false }, error: { message: 'Insufficient balance' } })

        const req = createRequest(validPayload)
        const res = await POST(req)

        expect(res.status).toBe(402) // Payment Required
    })

    it('should return 403 if grid size exceeds plan limit', async () => {
        // 1. Mock Daily Usage Check
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

        // 2. Mock Credit Check (Light Plan - Limit 3x3)
        mockSupabase.single.mockResolvedValueOnce({
            data: {
                plan_id: 'light',
                price: 1000,
                limits: { gridSize: 3 }
            },
            error: null
        })
        // Note: The route imports PLAN_CONFIG. If we want to strictly test plan limits,
        // we assume 'light' plan in config has limit 3.

        // Payload with 5x5 grid (Max row 2 -> Size 5)
        const largeGridPayload = {
            ...validPayload,
            gridPoints: [{ row: 2, col: 2, enabled: true }]
        }

        const req = createRequest(largeGridPayload)
        const res = await POST(req)

        // Wait, logic says: const gridSize = Math.max(maxRow, maxCol) * 2 + 1
        // MaxRow 2 -> 2*2+1 = 5. Light plan limit is 3. Should fail.

        expect(res.status).toBe(403)
    })
})
