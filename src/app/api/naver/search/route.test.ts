import { createClient } from '@/lib/supabase/server'
import { POST } from './route'
import { NextResponse } from 'next/server'
import { mock } from 'jest-mock-extended'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}))

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body, init) => ({ body, init })),
    },
}))

describe('POST /api/naver/search', () => {
    const mockSupabase = {
        auth: {
            getUser: jest.fn(),
        },
        from: jest.fn(),
        rpc: jest.fn(),
    }

    beforeEach(() => {
        jest.clearAllMocks()
            ; (createClient as jest.Mock).mockResolvedValue(mockSupabase)
    })

    test('should return 401 if not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

        const req = mock<Request>()
        const res = await POST(req)

        expect(res).toEqual({
            body: { error: 'Unauthorized' },
            init: { status: 401 }
        })
    })

    test('should return 429 if daily limit exceeded', async () => {
        const mockUser = { id: 'user-123', email: 'user@example.com' }
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

        // Mock request body
        const req = mock<Request>()
        req.json.mockResolvedValue({})

        // Mock daily usage check (limit exceeded)
        const mockSelect = jest.fn().mockReturnThis()
        const mockEq = jest.fn().mockReturnThis()
        const mockSingle = jest.fn().mockResolvedValue({
            data: { search_count: 1 } // Limit is 1
        })

        mockSupabase.from.mockReturnValue({
            select: mockSelect,
            eq: mockEq,
            single: mockSingle
        } as any)

        // Chain setup: .from('daily_usage').select(...).eq(...)...
        mockSelect.mockReturnValue({ eq: mockEq } as any)
        mockEq.mockReturnValue({ eq: mockEq, single: mockSingle } as any)

        const res = await POST(req)

        expect(res).toEqual({
            body: {
                error: 'DAILY_LIMIT_EXCEEDED',
                message: expect.any(String)
            },
            init: { status: 429 }
        })
    })

    test('should bypass daily limit for admin', async () => {
        const mockUser = { id: 'admin-123', email: 'admin@maptamin.com' }
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } })

        const req = mock<Request>()
        const reqBody = {
            placeName: 'Test Place',
            placeAddress: 'Seoul',
            placeLat: 37.5,
            placeLng: 127.0,
            keywords: ['cafe'],
            gridPoints: [{ enabled: true }],
            distance: 1,
            distanceUnit: 'km'
        }
        req.json.mockResolvedValue(reqBody)

        // Mock search creation
        const mockInsert = jest.fn().mockReturnThis()
        const mockSelect = jest.fn().mockReturnThis()
        const mockSingle = jest.fn().mockResolvedValue({
            data: { id: 'search-123' },
            error: null
        })

        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'daily_usage') return { select: jest.fn() } as any // Should not be called or flow continues
            if (table === 'searches') return {
                insert: mockInsert,
                select: mockSelect,
                single: mockSingle
            } as any
            return {} as any
        })

        // Setup chain for searches insert
        mockInsert.mockReturnValue({ select: mockSelect } as any)
        mockSelect.mockReturnValue({ single: mockSingle } as any)

        const res = await POST(req)

        expect(res).toEqual({
            body: expect.objectContaining({
                searchId: 'search-123',
                status: 'pending'
            }),
            init: undefined // NextResponse.json defaults
        })
    })
})
