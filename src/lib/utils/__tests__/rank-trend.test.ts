import { calculateRankTrend, extractKeywordsFromTrend } from '../rank-trend'
import { Search, SearchResult } from '@/lib/types'

// ── Helper factories ──
function makeSearch(overrides: Partial<Search>): Search {
    return {
        id: 'search-1',
        user_id: 'user-1',
        place_id: 'place-1',
        place_name: '테스트매장',
        place_address: '서울시 강남구',
        place_lat: 37.5,
        place_lng: 127.0,
        keywords: ['맛집'],
        grid_points: [],
        grid_distance: 0.5,
        distance_unit: 'km',
        status: 'completed',
        platform: 'naver',
        report_type: 'weekly',
        created_at: '2026-02-09T09:00:00Z',
        ...overrides,
    }
}

function makeResult(overrides: Partial<SearchResult>): SearchResult {
    return {
        id: 'result-1',
        search_id: 'search-1',
        keyword: '맛집',
        grid_index: 0,
        grid_lat: 37.5,
        grid_lng: 127.0,
        rank: 3,
        competitors: null,
        created_at: '2026-02-09T09:00:00Z',
        ...overrides,
    }
}

// ══════════════════════════════════════
// calculateRankTrend 테스트
// ══════════════════════════════════════

describe('calculateRankTrend', () => {
    it('주간 리포트가 없으면 빈 배열을 반환한다', () => {
        const searches: Search[] = []
        const results: SearchResult[] = []

        expect(calculateRankTrend(searches, results)).toEqual([])
    })

    it('주간 리포트 1건일 때도 데이터 포인트 1개를 반환한다', () => {
        const searches = [makeSearch({ id: 's1', keywords: ['맛집'] })]
        const results = [
            makeResult({ search_id: 's1', keyword: '맛집', rank: 3, grid_index: 0 }),
            makeResult({ id: 'r2', search_id: 's1', keyword: '맛집', rank: 5, grid_index: 1 }),
        ]

        const trend = calculateRankTrend(searches, results)
        expect(trend).toHaveLength(1)
        expect(trend[0].date).toBe('02/09')
        expect(trend[0]['맛집']).toBe(4) // (3+5)/2 = 4
    })

    it('주간 리포트 2건에서 키워드별 평균 순위를 올바르게 계산한다', () => {
        const searches = [
            makeSearch({ id: 's1', keywords: ['맛집', '카페'], created_at: '2026-02-09T09:00:00Z' }),
            makeSearch({ id: 's2', keywords: ['맛집', '카페'], created_at: '2026-02-16T09:00:00Z' }),
        ]
        const results = [
            // s1: 맛집 rank 3,5 → avg 4.0 / 카페 rank 7,9 → avg 8.0
            makeResult({ id: 'r1', search_id: 's1', keyword: '맛집', rank: 3, grid_index: 0 }),
            makeResult({ id: 'r2', search_id: 's1', keyword: '맛집', rank: 5, grid_index: 1 }),
            makeResult({ id: 'r3', search_id: 's1', keyword: '카페', rank: 7, grid_index: 0 }),
            makeResult({ id: 'r4', search_id: 's1', keyword: '카페', rank: 9, grid_index: 1 }),
            // s2: 맛집 rank 2,4 → avg 3.0 / 카페 rank 5,7 → avg 6.0
            makeResult({ id: 'r5', search_id: 's2', keyword: '맛집', rank: 2, grid_index: 0 }),
            makeResult({ id: 'r6', search_id: 's2', keyword: '맛집', rank: 4, grid_index: 1 }),
            makeResult({ id: 'r7', search_id: 's2', keyword: '카페', rank: 5, grid_index: 0 }),
            makeResult({ id: 'r8', search_id: 's2', keyword: '카페', rank: 7, grid_index: 1 }),
        ]

        const trend = calculateRankTrend(searches, results)
        expect(trend).toHaveLength(2)

        // 첫 번째 주: 02/09
        expect(trend[0].date).toBe('02/09')
        expect(trend[0]['맛집']).toBe(4)
        expect(trend[0]['카페']).toBe(8)

        // 두 번째 주: 02/16
        expect(trend[1].date).toBe('02/16')
        expect(trend[1]['맛집']).toBe(3)
        expect(trend[1]['카페']).toBe(6)
    })

    it('realtime과 welcome 리포트는 제외된다', () => {
        const searches = [
            makeSearch({ id: 's1', report_type: 'realtime', created_at: '2026-02-08T09:00:00Z' }),
            makeSearch({ id: 's2', report_type: 'welcome', created_at: '2026-02-09T09:00:00Z' }),
            makeSearch({ id: 's3', report_type: 'weekly', keywords: ['맛집'], created_at: '2026-02-10T09:00:00Z' }),
        ]
        const results = [
            makeResult({ id: 'r1', search_id: 's1', keyword: '맛집', rank: 10 }),
            makeResult({ id: 'r2', search_id: 's2', keyword: '맛집', rank: 8 }),
            makeResult({ id: 'r3', search_id: 's3', keyword: '맛집', rank: 5 }),
        ]

        const trend = calculateRankTrend(searches, results)
        expect(trend).toHaveLength(1)
        expect(trend[0]['맛집']).toBe(5)
    })

    it('status가 completed가 아닌 주간 리포트는 제외된다', () => {
        const searches = [
            makeSearch({ id: 's1', status: 'pending' }),
            makeSearch({ id: 's2', status: 'failed' }),
            makeSearch({ id: 's3', status: 'completed', keywords: ['맛집'], created_at: '2026-02-16T09:00:00Z' }),
        ]
        const results = [
            makeResult({ id: 'r1', search_id: 's3', keyword: '맛집', rank: 3 }),
        ]

        const trend = calculateRankTrend(searches, results)
        expect(trend).toHaveLength(1)
    })

    it('rank가 null인 grid_point는 평균 계산에서 제외된다', () => {
        const searches = [makeSearch({ id: 's1', keywords: ['맛집'] })]
        const results = [
            makeResult({ id: 'r1', search_id: 's1', keyword: '맛집', rank: 4, grid_index: 0 }),
            makeResult({ id: 'r2', search_id: 's1', keyword: '맛집', rank: null, grid_index: 1 }),
            makeResult({ id: 'r3', search_id: 's1', keyword: '맛집', rank: 6, grid_index: 2 }),
        ]

        const trend = calculateRankTrend(searches, results)
        expect(trend[0]['맛집']).toBe(5) // (4+6)/2 = 5, null 제외
    })

    it('모든 rank가 null인 키워드는 null로 표시된다', () => {
        const searches = [makeSearch({ id: 's1', keywords: ['맛집'] })]
        const results = [
            makeResult({ id: 'r1', search_id: 's1', keyword: '맛집', rank: null, grid_index: 0 }),
            makeResult({ id: 'r2', search_id: 's1', keyword: '맛집', rank: null, grid_index: 1 }),
        ]

        const trend = calculateRankTrend(searches, results)
        expect(trend[0]['맛집']).toBeNull()
    })

    it('날짜순 오름차순으로 정렬된다', () => {
        const searches = [
            makeSearch({ id: 's2', keywords: ['맛집'], created_at: '2026-02-16T09:00:00Z' }),
            makeSearch({ id: 's1', keywords: ['맛집'], created_at: '2026-02-09T09:00:00Z' }),
        ]
        const results = [
            makeResult({ id: 'r1', search_id: 's1', keyword: '맛집', rank: 5 }),
            makeResult({ id: 'r2', search_id: 's2', keyword: '맛집', rank: 3 }),
        ]

        const trend = calculateRankTrend(searches, results)
        expect(trend[0].date).toBe('02/09')
        expect(trend[1].date).toBe('02/16')
    })

    it('소수점 1자리로 반올림된다', () => {
        const searches = [makeSearch({ id: 's1', keywords: ['맛집'] })]
        const results = [
            makeResult({ id: 'r1', search_id: 's1', keyword: '맛집', rank: 3, grid_index: 0 }),
            makeResult({ id: 'r2', search_id: 's1', keyword: '맛집', rank: 4, grid_index: 1 }),
            makeResult({ id: 'r3', search_id: 's1', keyword: '맛집', rank: 5, grid_index: 2 }),
        ]

        const trend = calculateRankTrend(searches, results)
        expect(trend[0]['맛집']).toBe(4) // (3+4+5)/3 = 4.0
    })
})

// ══════════════════════════════════════
// extractKeywordsFromTrend 테스트
// ══════════════════════════════════════

describe('extractKeywordsFromTrend', () => {
    it('트렌드 데이터에서 고유 키워드 목록을 추출한다', () => {
        const trendData = [
            { date: '02/09', fullDate: '2026-02-09', '맛집': 3, '카페': 5 },
            { date: '02/16', fullDate: '2026-02-16', '맛집': 2, '카페': 4 },
        ]

        const keywords = extractKeywordsFromTrend(trendData)
        expect(keywords).toContain('맛집')
        expect(keywords).toContain('카페')
        expect(keywords).not.toContain('date')
        expect(keywords).not.toContain('fullDate')
        expect(keywords).toHaveLength(2)
    })

    it('빈 배열이면 빈 키워드 목록을 반환한다', () => {
        expect(extractKeywordsFromTrend([])).toEqual([])
    })
})
