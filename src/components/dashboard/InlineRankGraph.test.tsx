
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { InlineRankGraph } from './InlineRankGraph'

// Mock Supabase Client
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()
const mockIn = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: mockFrom
    })
}))

// Mock Recharts
// Recharts renders complex SVG, so we just mock it to render children or check for existence
jest.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
    Line: () => <div data-testid="line" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => <div data-testid="tooltip" />,
}))

describe('InlineRankGraph', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Default Mock Chain Setup
        mockFrom.mockReturnValue({ select: mockSelect })
        mockSelect.mockReturnValue({ eq: mockEq, in: mockIn })
        mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, in: mockIn }) // Chainable
        mockOrder.mockReturnValue({ limit: mockLimit }) // Chainable
        mockLimit.mockReturnValue({ data: [] })
        mockIn.mockReturnValue({ eq: mockEq }) // in().eq
    })

    it('renders "데이터 없음" when no searches found', async () => {
        // Setup: No searches found
        mockLimit.mockResolvedValue({ data: [] })

        render(<InlineRankGraph placeId="test_place" keyword="test_keyword" platform="naver" />)

        // Initial loading state might be fast, but we wait for result
        await waitFor(() => {
            expect(screen.getByText('데이터 없음')).toBeInTheDocument()
        })
    })

    it('renders chart when data exists', async () => {
        // Setup: Searches found
        const mockSearches = [
            { id: 1, created_at: '2024-01-01T10:00:00Z' },
            { id: 2, created_at: '2024-01-02T10:00:00Z' }
        ]
        const mockResults = [
            { search_id: 1, rank: 5 },
            { search_id: 2, rank: 3 }
        ]

        // Mock Implementation for specific flow
        // 1. Fetch Searches
        mockLimit.mockResolvedValueOnce({ data: mockSearches })

        // 2. Fetch Results (Second call to supabase)
        // We need to carefully mock the chain for the second call
        // The second call is: from('search_results').select(...).in(...).eq(...)
        // In our simple mockSetup above, everything returns generic chain. 
        // We need to distinguish or just ensure the FINAL result matches what we expect if we assume calls happen in order.

        // Actually, creating a more robust mock factory is better.
        // Let's create a specialized mock implementation for 'from'.
        mockFrom.mockImplementation((table) => {
            if (table === 'searches') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                order: () => ({
                                    limit: jest.fn().mockResolvedValue({ data: mockSearches })
                                })
                            })
                        })
                    })
                }
            }
            if (table === 'search_results') {
                return {
                    select: () => ({
                        in: () => ({
                            eq: jest.fn().mockResolvedValue({ data: mockResults })
                        })
                    })
                }
            }
            return { select: jest.fn() }
        })

        render(<InlineRankGraph placeId="test_place" keyword="test_keyword" platform="naver" />)

        await waitFor(() => {
            // Check if LineChart renders
            expect(screen.getByTestId('line-chart')).toBeInTheDocument()
            expect(screen.queryByText('데이터 없음')).not.toBeInTheDocument()
        })
    })
})
