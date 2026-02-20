import { render, screen } from '@testing-library/react'
import { NaverResultsContent } from './NaverResultsContent'
import { Search, SearchResult } from '@/lib/types'

// Mock components to avoid complex rendering
jest.mock('@/components/results/AverageRankCard', () => ({
    AverageRankCard: () => <div data-testid="average-rank-card">Average Rank</div>
}))
jest.mock('@/components/results/KeywordTabs', () => ({
    KeywordTabs: () => <div data-testid="keyword-tabs">Keyword Tabs</div>
}))
jest.mock('@/components/naver/NaverRankHeatmap', () => ({
    NaverRankHeatmap: () => <div data-testid="rank-heatmap">Rank Heatmap</div>
}))
jest.mock('@/components/results/CompetitorSelector', () => ({
    CompetitorSelector: () => <div data-testid="competitor-selector">Competitor Selector</div>
}))
jest.mock('@/components/naver/NaverCompetitorComparisonMap', () => ({
    NaverCompetitorComparisonMap: () => <div data-testid="competitor-map">Competitor Map</div>
}))

describe('NaverResultsContent', () => {
    const mockSearch: Search = {
        id: 'search-123',
        user_id: 'user-123',
        place_id: 'place-123',
        place_name: 'Test Place',
        place_address: 'Seoul',
        place_lat: 37.5,
        place_lng: 127.0,
        keywords: ['cafe', 'restaurant'],
        grid_points: [],
        grid_distance: 1,
        distance_unit: 'km',
        status: 'completed',
        platform: 'naver',
        created_at: new Date().toISOString()
    }

    const mockResults: SearchResult[] = [
        {
            id: 'res-1',
            search_id: 'search-123',
            keyword: 'cafe',
            grid_index: 0,
            grid_lat: 37.5,
            grid_lng: 127.0,
            rank: 1,
            competitors: [],
            created_at: new Date().toISOString()
        }
    ]

    test('should render competitor section for pro plan', () => {
        render(<NaverResultsContent search={mockSearch} results={mockResults} competitors={[]} planId="pro" />)
        expect(screen.getByText(/경쟁사 비교 분석/)).toBeInTheDocument()
    })

    test('should render all child components', () => {
        render(<NaverResultsContent search={mockSearch} results={mockResults} competitors={[]} planId="pro" />)

        expect(screen.getByTestId('average-rank-card')).toBeInTheDocument()
        expect(screen.getByTestId('keyword-tabs')).toBeInTheDocument()
        expect(screen.getByTestId('rank-heatmap')).toBeInTheDocument()
    })
})
