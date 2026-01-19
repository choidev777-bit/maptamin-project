interface MapRankResult {
    rank: number | null
    competitors: Array<{ name: string; rank: number; placeId: string }>
    error?: string
}

/**
 * Fetch Google Maps rank for a keyword at a specific location
 * @param keyword - Search keyword
 * @param lat - Latitude
 * @param lng - Longitude
 * @param targetPlaceId - Optional: The Google Place ID of the business to find rank for
 * @returns MapRankResult with rank (if targetPlaceId found) and competitors list
 */
export async function fetchMapRank(
    keyword: string,
    lat: number,
    lng: number,
    targetPlaceId?: string
): Promise<MapRankResult> {
    try {
        const auth = Buffer.from(
            `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
        ).toString('base64')

        const response = await fetch(
            'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
            {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([
                    {
                        keyword,
                        location_coordinate: `${lat},${lng},100`,
                        language_code: 'ko',
                        device: 'desktop',
                        depth: 20,
                    },
                ]),
            }
        )

        if (!response.ok) {
            return {
                rank: null,
                competitors: [],
                error: `API error: ${response.status} ${response.statusText}`,
            }
        }

        const data = await response.json()

        // Check for API-level errors
        if (data.status_code !== 20000) {
            return {
                rank: null,
                competitors: [],
                error: `DataForSEO error: ${data.status_message}`,
            }
        }

        if (data.tasks?.[0]?.result?.[0]?.items) {
            const items = data.tasks[0].result[0].items
            const competitors = items.map((item: any, index: number) => ({
                name: item.title || '',
                rank: index + 1,
                placeId: item.place_id || '',
            }))

            // Calculate rank if targetPlaceId is provided
            let rank: number | null = null
            if (targetPlaceId) {
                const foundIndex = competitors.findIndex(
                    (c: { placeId: string }) => c.placeId === targetPlaceId
                )
                if (foundIndex !== -1) {
                    rank = foundIndex + 1
                }
            }

            return { rank, competitors }
        }

        return { rank: null, competitors: [] }
    } catch (error) {
        // Network or parsing error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return {
            rank: null,
            competitors: [],
            error: `Network error: ${errorMessage}`,
        }
    }
}

/**
 * Task definition for batch processing
 */
export interface MapRankTask {
    keyword: string
    lat: number
    lng: number
    gridIndex: number
    targetPlaceId?: string
}

/**
 * Result from batch processing
 */
export interface MapRankBatchResult extends MapRankResult {
    keyword: string
    gridIndex: number
    lat: number
    lng: number
}

/**
 * Process multiple map rank requests in parallel with concurrency limit
 * @param tasks - Array of tasks to process
 * @param concurrency - Max concurrent requests (default 10)
 * @returns Array of results
 */
export async function fetchMapRankBatch(
    tasks: MapRankTask[],
    concurrency: number = 10
): Promise<MapRankBatchResult[]> {
    const results: MapRankBatchResult[] = []

    // Process in chunks to limit concurrency
    for (let i = 0; i < tasks.length; i += concurrency) {
        const chunk = tasks.slice(i, i + concurrency)

        const chunkResults = await Promise.all(
            chunk.map(async (task) => {
                const result = await fetchMapRank(
                    task.keyword,
                    task.lat,
                    task.lng,
                    task.targetPlaceId
                )
                return {
                    ...result,
                    keyword: task.keyword,
                    gridIndex: task.gridIndex,
                    lat: task.lat,
                    lng: task.lng,
                }
            })
        )

        results.push(...chunkResults)
    }

    return results
}
