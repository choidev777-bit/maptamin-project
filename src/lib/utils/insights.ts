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
    searchResults: SearchResult[]
): { rising: KeywordInsight | null; dropping: KeywordInsight | null } {
    // 1. Filter only completed weekly reports
    const weeklySearches = searches.filter(
        (s) => s.report_type === 'weekly' && s.status === 'completed'
    )

    if (weeklySearches.length < 2) {
        return { rising: null, dropping: null }
    }

    // Sort by created_at descending (newest first)
    weeklySearches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const latestSearch = weeklySearches[0]
    // Find the next most recent search that is older than the latest one (usually ~7 days ago)
    const previousSearch = weeklySearches.find(s => s.id !== latestSearch.id)

    if (!previousSearch) {
        return { rising: null, dropping: null }
    }

    // 2. Get results for these specific searches
    const latestResults = searchResults.filter((r) => r.search_id === latestSearch.id)
    const previousResults = searchResults.filter((r) => r.search_id === previousSearch.id)

    const insights: KeywordInsight[] = []

    // 3. Compare ranks for each keyword
    // Assuming each search has results for its keywords
    latestSearch.keywords.forEach((keyword) => {
        // We look for the best rank (minimum number) across grid points for this keyword
        // Or if rank is unified per keyword, we just take the first valid one.
        // Assuming rank is per keyword/grid_index, we might want the average or best rank.
        // For simplicity, let's take the best (lowest) rank found for the keyword.
        const latestRankRanks = latestResults
            .filter((r) => r.keyword === keyword && r.rank !== null)
            .map((r) => r.rank as number)
        const previousRankRanks = previousResults
            .filter((r) => r.keyword === keyword && r.rank !== null)
            .map((r) => r.rank as number)

        const latestBestRank = latestRankRanks.length > 0 ? Math.min(...latestRankRanks) : null
        const previousBestRank = previousRankRanks.length > 0 ? Math.min(...previousRankRanks) : null

        if (latestBestRank !== null && previousBestRank !== null) {
            // rankChange: Positive means rank IMPROVED (number went down, e.g., 5 -> 2 = +3)
            // Negative means rank DROPPED (number went up, e.g., 2 -> 5 = -3)
            const rankChange = previousBestRank - latestBestRank

            // Only consider keywords that actually changed rank
            if (rankChange !== 0) {
                insights.push({
                    keyword,
                    rankChange,
                    currentRank: latestBestRank,
                    previousRank: previousBestRank
                })
            }
        }
    })

    if (insights.length === 0) {
        return { rising: null, dropping: null }
    }

    // Sort insights by rankChange descending
    insights.sort((a, b) => b.rankChange - a.rankChange)

    return {
        // The one with the highest positive change
        rising: insights[0].rankChange > 0 ? insights[0] : null,
        // The one with the lowest negative change (at the end of the array)
        dropping: insights[insights.length - 1].rankChange < 0 ? insights[insights.length - 1] : null
    }
}
