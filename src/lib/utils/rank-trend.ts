import { Search, SearchResult } from '@/lib/types'

/**
 * 그래프 데이터 포인트 (recharts 호환)
 * date는 검색 날짜, 나머지는 keyword별 평균 순위
 */
export interface RankTrendDataPoint {
    date: string                    // 'MM/DD' 형식
    fullDate: string                // 'YYYY-MM-DD' 형식 (tooltip용)
    [keyword: string]: number | string | null  // 키워드별 평균 순위
}

/**
 * 웰컴 리포트(report_type='welcome'), 일간 리포트(report_type='daily'),
 * 주간 리포트(report_type='weekly') 기반으로
 * 키워드별 평균 순위 시계열 데이터를 계산합니다.
 * 실시간(realtime) 리포트는 제외됩니다.
 *
 * @param searches - 전체 검색 목록
 * @param searchResults - 전체 검색 결과 목록
 * @returns recharts LineChart에 사용할 수 있는 데이터 배열
 *
 * @example
 * // 반환값 예시:
 * [
 *   { date: '02/09', fullDate: '2026-02-09', '맛집': 3.5, '카페': 5.2 },
 *   { date: '02/16', fullDate: '2026-02-16', '맛집': 2.8, '카페': 4.1 },
 * ]
 */
export function calculateRankTrend(
    searches: Search[],
    searchResults: SearchResult[]
): RankTrendDataPoint[] {
    // 1. 완료된 웰컴 + 일간 + 주간 리포트 필터링
    const weeklySearches = searches.filter(
        (s) => (s.report_type === 'daily' || s.report_type === 'weekly' || s.report_type === 'welcome') && s.status === 'completed'
    )

    if (weeklySearches.length === 0) {
        return []
    }

    // 2. 날짜순 오름차순 정렬 (오래된 것 먼저)
    weeklySearches.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // 3. search_id → search_results 맵 구축 (O(1) lookup)
    const resultsBySearchId = new Map<string, SearchResult[]>()
    for (const result of searchResults) {
        const existing = resultsBySearchId.get(result.search_id)
        if (existing) {
            existing.push(result)
        } else {
            resultsBySearchId.set(result.search_id, [result])
        }
    }

    // 4. 각 주간 검색에 대해 키워드별 평균 순위 계산
    //    같은 날짜의 검색은 병합(합산 평균)
    const dateGroupMap = new Map<string, { search: typeof weeklySearches[0], results: SearchResult[] }[]>()

    for (const search of weeklySearches) {
        const createdAt = new Date(search.created_at)
        const month = String(createdAt.getMonth() + 1).padStart(2, '0')
        const day = String(createdAt.getDate()).padStart(2, '0')
        const dateKey = `${createdAt.getFullYear()}-${month}-${day}`

        const results = resultsBySearchId.get(search.id) || []
        const existing = dateGroupMap.get(dateKey)
        if (existing) {
            existing.push({ search, results })
        } else {
            dateGroupMap.set(dateKey, [{ search, results }])
        }
    }

    const trendData: RankTrendDataPoint[] = []

    for (const [dateKey, entries] of dateGroupMap) {
        const [year, month, day] = dateKey.split('-')

        const dataPoint: RankTrendDataPoint = {
            date: `${month}/${day}`,
            fullDate: dateKey,
        }

        // 해당 날짜의 모든 검색에서 키워드 목록 수집
        const allKeywords = new Set<string>()
        for (const entry of entries) {
            for (const kw of entry.search.keywords) {
                allKeywords.add(kw)
            }
        }

        // 키워드별 모든 rank를 모아서 평균
        for (const keyword of allKeywords) {
            const allRanks: number[] = []
            for (const entry of entries) {
                const ranks = entry.results
                    .filter((r) => r.keyword === keyword && r.rank !== null)
                    .map((r) => r.rank as number)
                allRanks.push(...ranks)
            }

            if (allRanks.length > 0) {
                const avg = allRanks.reduce((sum, r) => sum + r, 0) / allRanks.length
                dataPoint[keyword] = Math.round(avg * 10) / 10
            } else {
                dataPoint[keyword] = null
            }
        }

        trendData.push(dataPoint)
    }

    return trendData
}

/**
 * 트렌드 데이터에서 모든 고유 키워드 목록을 추출합니다.
 */
export function extractKeywordsFromTrend(trendData: RankTrendDataPoint[]): string[] {
    const keywords = new Set<string>()
    for (const point of trendData) {
        for (const key of Object.keys(point)) {
            if (key !== 'date' && key !== 'fullDate') {
                keywords.add(key)
            }
        }
    }
    return Array.from(keywords)
}

/**
 * 지역명 키워드(local_keywords)의 순위 추이를 계산합니다.
 * search.local_keywords에서 키워드를 수집하고, grid_index=-1인 결과만 사용합니다.
 * 지역명 키워드는 좌표별 평균이 아닌 단일 순위(rank)를 그대로 사용합니다.
 */
export function calculateLocalKeywordTrend(
    searches: Search[],
    searchResults: SearchResult[]
): RankTrendDataPoint[] {
    // 1. local_keywords가 있는 완료된 리포트만 필터링
    const relevantSearches = searches.filter(
        (s) =>
            (s.report_type === 'daily' || s.report_type === 'weekly' || s.report_type === 'welcome') &&
            s.status === 'completed' &&
            s.local_keywords && s.local_keywords.length > 0
    )

    if (relevantSearches.length === 0) {
        return []
    }

    // 2. 날짜순 오름차순 정렬
    relevantSearches.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // 3. search_id → local search_results 맵 (grid_index=-1만)
    const localResultsBySearchId = new Map<string, SearchResult[]>()
    for (const result of searchResults) {
        if (result.grid_index !== -1) continue
        const existing = localResultsBySearchId.get(result.search_id)
        if (existing) {
            existing.push(result)
        } else {
            localResultsBySearchId.set(result.search_id, [result])
        }
    }

    // 4. 날짜별 그룹핑
    const dateGroupMap = new Map<string, { search: typeof relevantSearches[0], results: SearchResult[] }[]>()

    for (const search of relevantSearches) {
        const createdAt = new Date(search.created_at)
        const month = String(createdAt.getMonth() + 1).padStart(2, '0')
        const day = String(createdAt.getDate()).padStart(2, '0')
        const dateKey = `${createdAt.getFullYear()}-${month}-${day}`

        const results = localResultsBySearchId.get(search.id) || []
        const existing = dateGroupMap.get(dateKey)
        if (existing) {
            existing.push({ search, results })
        } else {
            dateGroupMap.set(dateKey, [{ search, results }])
        }
    }

    // 5. 데이터 포인트 생성
    const trendData: RankTrendDataPoint[] = []

    for (const [dateKey, entries] of dateGroupMap) {
        const [year, month, day] = dateKey.split('-')

        const dataPoint: RankTrendDataPoint = {
            date: `${month}/${day}`,
            fullDate: dateKey,
        }

        // local_keywords에서 키워드 수집
        const allKeywords = new Set<string>()
        for (const entry of entries) {
            if (entry.search.local_keywords) {
                for (const kw of entry.search.local_keywords) {
                    allKeywords.add(kw)
                }
            }
        }

        // 키워드별 rank (지역명은 좌표당 1개이므로 단일 rank)
        for (const keyword of allKeywords) {
            const allRanks: number[] = []
            for (const entry of entries) {
                const ranks = entry.results
                    .filter((r) => r.keyword === keyword && r.rank !== null)
                    .map((r) => r.rank as number)
                allRanks.push(...ranks)
            }

            if (allRanks.length > 0) {
                // 지역명은 단일 순위이지만, 같은 날짜에 여러 리포트가 있을 수 있으므로 평균
                const avg = allRanks.reduce((sum, r) => sum + r, 0) / allRanks.length
                dataPoint[keyword] = Math.round(avg * 10) / 10
            } else {
                dataPoint[keyword] = null
            }
        }

        trendData.push(dataPoint)
    }

    return trendData
}
/**
 * 키워드별 '노출된 좌표 수' 추이를 계산합니다.
 * dataPoint[keyword] = 해당 날짜에 rank !== null인 좌표 수 (정수)
 */
export function calculateExposureCountTrend(
    searches: Search[],
    searchResults: SearchResult[]
): RankTrendDataPoint[] {
    const weeklySearches = searches.filter(
        (s) => (s.report_type === 'daily' || s.report_type === 'weekly' || s.report_type === 'welcome') && s.status === 'completed'
    )
    if (weeklySearches.length === 0) return []

    weeklySearches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const resultsBySearchId = new Map<string, SearchResult[]>()
    for (const result of searchResults) {
        const existing = resultsBySearchId.get(result.search_id)
        if (existing) existing.push(result)
        else resultsBySearchId.set(result.search_id, [result])
    }

    const dateGroupMap = new Map<string, { search: typeof weeklySearches[0], results: SearchResult[] }[]>()
    for (const search of weeklySearches) {
        const createdAt = new Date(search.created_at)
        const month = String(createdAt.getMonth() + 1).padStart(2, '0')
        const day = String(createdAt.getDate()).padStart(2, '0')
        const dateKey = `${createdAt.getFullYear()}-${month}-${day}`
        const results = resultsBySearchId.get(search.id) || []
        const existing = dateGroupMap.get(dateKey)
        if (existing) existing.push({ search, results })
        else dateGroupMap.set(dateKey, [{ search, results }])
    }

    const trendData: RankTrendDataPoint[] = []
    for (const [dateKey, entries] of dateGroupMap) {
        const [, month, day] = dateKey.split('-')
        const dataPoint: RankTrendDataPoint = { date: `${month}/${day}`, fullDate: dateKey }

        const allKeywords = new Set<string>()
        for (const entry of entries) {
            for (const kw of entry.search.keywords) allKeywords.add(kw)
        }

        for (const keyword of allKeywords) {
            let exposedCount = 0
            for (const entry of entries) {
                exposedCount += entry.results.filter(r => r.keyword === keyword && r.rank !== null).length
            }
            dataPoint[keyword] = exposedCount
        }

        trendData.push(dataPoint)
    }

    return trendData
}

/**
 * 키워드별 '상위 노출률' 추이를 계산합니다.
 * dataPoint[keyword] = Math.round(topCount / totalCount * 100) (0~100 정수)
 */
export function calculateTopExposureRateTrend(
    searches: Search[],
    searchResults: SearchResult[],
    threshold = 5
): RankTrendDataPoint[] {
    const weeklySearches = searches.filter(
        (s) => (s.report_type === 'daily' || s.report_type === 'weekly' || s.report_type === 'welcome') && s.status === 'completed'
    )
    if (weeklySearches.length === 0) return []

    weeklySearches.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const resultsBySearchId = new Map<string, SearchResult[]>()
    for (const result of searchResults) {
        const existing = resultsBySearchId.get(result.search_id)
        if (existing) existing.push(result)
        else resultsBySearchId.set(result.search_id, [result])
    }

    const dateGroupMap = new Map<string, { search: typeof weeklySearches[0], results: SearchResult[] }[]>()
    for (const search of weeklySearches) {
        const createdAt = new Date(search.created_at)
        const month = String(createdAt.getMonth() + 1).padStart(2, '0')
        const day = String(createdAt.getDate()).padStart(2, '0')
        const dateKey = `${createdAt.getFullYear()}-${month}-${day}`
        const results = resultsBySearchId.get(search.id) || []
        const existing = dateGroupMap.get(dateKey)
        if (existing) existing.push({ search, results })
        else dateGroupMap.set(dateKey, [{ search, results }])
    }

    const trendData: RankTrendDataPoint[] = []
    for (const [dateKey, entries] of dateGroupMap) {
        const [, month, day] = dateKey.split('-')
        const dataPoint: RankTrendDataPoint = { date: `${month}/${day}`, fullDate: dateKey }

        const allKeywords = new Set<string>()
        for (const entry of entries) {
            for (const kw of entry.search.keywords) allKeywords.add(kw)
        }

        for (const keyword of allKeywords) {
            let totalCount = 0
            let topCount = 0
            for (const entry of entries) {
                const kwResults = entry.results.filter(r => r.keyword === keyword)
                totalCount += kwResults.length
                topCount += kwResults.filter(r => r.rank !== null && (r.rank as number) <= threshold).length
            }
            dataPoint[keyword] = totalCount > 0 ? Math.round((topCount / totalCount) * 100) : 0
        }

        trendData.push(dataPoint)
    }

    return trendData
}
