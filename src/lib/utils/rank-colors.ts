/**
 * Get color for rank display
 * @param rank - The rank (1 = best), or null if not found
 * @returns Hex color string
 */
export function getRankColor(rank: number | null): string {
    if (rank === null) return '#888888'  // Gray - not found
    if (rank <= 3) return '#22c55e'      // Green - excellent
    if (rank <= 6) return '#84cc16'      // Light green - good
    if (rank <= 10) return '#f97316'     // Orange - needs work
    if (rank <= 15) return '#ef4444'     // Red - poor
    return '#991b1b'                      // Dark red - very poor
}

/**
 * Get Tailwind background class for rank
 * @param rank - The rank, or null if not found
 * @returns Tailwind class string
 */
export function getRankBgClass(rank: number | null): string {
    if (rank === null) return 'bg-gray-400'
    if (rank <= 3) return 'bg-green-500'
    if (rank <= 6) return 'bg-lime-500'
    if (rank <= 10) return 'bg-orange-500'
    if (rank <= 15) return 'bg-red-500'
    return 'bg-red-800'
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
 * @returns Category description
 */
export function getRankCategory(rank: number | null): string {
    if (rank === null) return '순위권 외'
    if (rank <= 3) return '최상위'
    if (rank <= 6) return '상위'
    if (rank <= 10) return '중위'
    if (rank <= 15) return '하위'
    return '최하위'
}
