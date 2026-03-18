import { Search, SearchResult } from '@/lib/types'

export interface KeywordInsight {
    keyword: string
    rankChange: number
    currentRank: number | null
    previousRank: number | null
}

/**
 * calculates the rank insights (Top Rising & Needs Attention) based on weekly reports.
 * It compares the most recent weekly report with the one prior to it.
 */
export function calculateWeeklyInsights(
    searches: Search[],
    searchResults: SearchResult[],
    keywordFilter?: string[]
): { rising: KeywordInsight | null; dropping: KeywordInsight | null; hasData: boolean } {
    // 1. Filter only completed daily and weekly reports
    const weeklySearches = searches.filter(
        (s) => (s.report_type === 'daily' || s.report_type === 'weekly') && s.status === 'completed'
    )

    if (weeklySearches.length < 2) {
        return { rising: null, dropping: null, hasData: false }
    }

    // Sort by created_at descending (newest first)
    weeklySearches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const latestSearch = weeklySearches[0]
    // Find the next most recent search that is older than the latest one (usually ~7 days ago)
    const previousSearch = weeklySearches.find(s => s.id !== latestSearch.id)

    if (!previousSearch) {
        return { rising: null, dropping: null, hasData: false }
    }

    // 2. Get results for these specific searches
    const latestResults = searchResults.filter((r) => r.search_id === latestSearch.id)
    const previousResults = searchResults.filter((r) => r.search_id === previousSearch.id)

    const insights: KeywordInsight[] = []

    // 3. Compare ranks for each keyword
    // keywordFilter가 주어지면 해당 키워드만, 아니면 전체 keywords
    const targetKeywords = keywordFilter || latestSearch.keywords
    targetKeywords.forEach((keyword) => {
        // We calculate the average rank across all grid points for this keyword
        const latestRankRanks = latestResults
            .filter((r) => r.keyword === keyword && r.rank !== null)
            .map((r) => r.rank as number)
        const previousRankRanks = previousResults
            .filter((r) => r.keyword === keyword && r.rank !== null)
            .map((r) => r.rank as number)

        const latestAvgRank = latestRankRanks.length > 0
            ? latestRankRanks.reduce((sum, r) => sum + r, 0) / latestRankRanks.length
            : null
        const previousAvgRank = previousRankRanks.length > 0
            ? previousRankRanks.reduce((sum, r) => sum + r, 0) / previousRankRanks.length
            : null

        if (latestAvgRank !== null && previousAvgRank !== null) {
            // rankChange: Positive means rank IMPROVED (number went down, e.g., 5 -> 2 = +3)
            // Negative means rank DROPPED (number went up, e.g., 2 -> 5 = -3)
            const rankChange = Math.round((previousAvgRank - latestAvgRank) * 10) / 10

            // Only consider keywords that actually changed rank
            if (rankChange !== 0) {
                insights.push({
                    keyword,
                    rankChange,
                    currentRank: Math.round(latestAvgRank * 10) / 10,
                    previousRank: Math.round(previousAvgRank * 10) / 10
                })
            }
        }
    })

    if (insights.length === 0) {
        return { rising: null, dropping: null, hasData: true }
    }

    // Sort insights by rankChange descending
    insights.sort((a, b) => b.rankChange - a.rankChange)

    return {
        // The one with the highest positive change
        rising: insights[0].rankChange > 0 ? insights[0] : null,
        // The one with the lowest negative change (at the end of the array)
        dropping: insights[insights.length - 1].rankChange < 0 ? insights[insights.length - 1] : null,
        hasData: true,
    }
}
