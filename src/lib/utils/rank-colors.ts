export type Platform = 'google' | 'naver'

/**
 * Get color for rank display
 * @param rank - The rank (1 = best), or null if not found
 * @param platform - 'google' (1-3 green) or 'naver' (1-5 green)
 * @returns Hex color string
 */
export function getRankColor(rank: number | null, platform: Platform = 'naver'): string {
    if (rank === null) return '#ef4444'  // Red - not found
    const greenThreshold = platform === 'google' ? 3 : 5
    if (rank <= greenThreshold) return '#22c55e'  // Green
    if (rank <= 10) return '#eab308'               // Yellow
    return '#ef4444'                                // Red
}

/**
 * Get Tailwind background class for rank
 * @param rank - The rank, or null if not found
 * @param platform - 'google' (1-3 green) or 'naver' (1-5 green)
 * @returns Tailwind class string
 */
export function getRankBgClass(rank: number | null, platform: Platform = 'naver'): string {
    if (rank === null) return 'bg-red-500'
    const greenThreshold = platform === 'google' ? 3 : 5
    if (rank <= greenThreshold) return 'bg-green-500'
    if (rank <= 10) return 'bg-yellow-500'
    return 'bg-red-500'
}

/**
 * Get display label for rank
 * @param rank - The rank, or null if not found
 * @returns Display string
 */
export function getRankLabel(rank: number | null): string {
    if (rank === null) return '-'
    return rank.toString()
}

/**
 * Get rank category description
 * @param rank - The rank, or null if not found
 * @param platform - 'google' (1-3 green) or 'naver' (1-5 green)
 * @returns Category description
 */
export function getRankCategory(rank: number | null, platform: Platform = 'naver'): string {
    if (rank === null) return '순위권 외'
    const greenThreshold = platform === 'google' ? 3 : 5
    if (rank <= greenThreshold) return '상위'
    if (rank <= 10) return '중위'
    return '하위'
}
