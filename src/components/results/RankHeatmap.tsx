'use client'

import { useState, useMemo, useCallback } from 'react'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { SearchResult } from '@/lib/types'
import { getRankColor, getRankLabel } from '@/lib/utils/rank-colors'
import { RankDetailModal } from './RankDetailModal'

interface Props {
    center: { lat: number; lng: number }
    results: SearchResult[]
    selectedKeyword?: string
}

interface PositionData {
    key: string
    lat: number
    lng: number
    rank: number | null
    results: SearchResult[]
}

export function RankHeatmap({ center, results, selectedKeyword }: Props) {
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Filter results by keyword if provided
    const filteredResults = useMemo(() => {
        if (!selectedKeyword) return results
        return results.filter(r => r.keyword === selectedKeyword)
    }, [results, selectedKeyword])

    // Group results by grid position
    const uniquePositions = useMemo((): PositionData[] => {
        const positionMap: Record<string, SearchResult[]> = {}

        filteredResults.forEach(result => {
            const key = `${result.grid_lat},${result.grid_lng}`
            if (!positionMap[key]) {
                positionMap[key] = []
            }
            positionMap[key].push(result)
        })

        return Object.entries(positionMap).map(([key, posResults]) => {
            const firstResult = posResults[0]
            const rankedResults = posResults.filter(r => r.rank !== null)

            let averageRank: number | null = null
            if (rankedResults.length > 0) {
                const sum = rankedResults.reduce((a: number, b: SearchResult) => a + (b.rank as number), 0)
                averageRank = Math.round(sum / rankedResults.length)
            }

            return {
                key,
                lat: firstResult.grid_lat,
                lng: firstResult.grid_lng,
                rank: posResults.length === 1 ? posResults[0].rank : averageRank,
                results: posResults,
            }
        })
    }, [filteredResults])

    const handleMarkerClick = useCallback((result: SearchResult) => {
        setSelectedResult(result)
        setIsModalOpen(true)
    }, [])

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false)
        setSelectedResult(null)
    }, [])

    return (
        <>
            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg" style={{ height: '500px' }}>
                <Map
                    defaultCenter={center}
                    defaultZoom={14}
                    mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    zoomControl={true}
                    mapTypeControl={false}
                    streetViewControl={false}
                    fullscreenControl={true}
                >
                    {/* Center marker (business location) */}
                    <AdvancedMarker position={center}>
                        <div className="w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full" />
                        </div>
                    </AdvancedMarker>

                    {/* Rank markers */}
                    {uniquePositions.map((pos) => (
                        <AdvancedMarker
                            key={pos.key}
                            position={{ lat: pos.lat, lng: pos.lng }}
                            onClick={() => pos.results[0] && handleMarkerClick(pos.results[0])}
                        >
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer transition-transform hover:scale-110 shadow-lg border-2 border-white"
                                style={{ backgroundColor: getRankColor(pos.rank) }}
                            >
                                {getRankLabel(pos.rank)}
                            </div>
                        </AdvancedMarker>
                    ))}
                </Map>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {[
                    { label: '1-3위', color: '#22c55e' },
                    { label: '4-6위', color: '#84cc16' },
                    { label: '7-10위', color: '#f97316' },
                    { label: '11-15위', color: '#ef4444' },
                    { label: '16+위', color: '#991b1b' },
                    { label: '순위권 외', color: '#888888' },
                ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-2">
                        <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-gray-600">{label}</span>
                    </div>
                ))}
            </div>

            {/* Detail Modal */}
            {selectedResult && (
                <RankDetailModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    result={selectedResult}
                />
            )}
        </>
    )
}
