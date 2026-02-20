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
                    {/* Rank markers */}
                    {uniquePositions.map((pos) => {
                        const atCenter = Math.abs(pos.lat - center.lat) < 0.0001 && Math.abs(pos.lng - center.lng) < 0.0001
                        return (
                            <AdvancedMarker
                                key={pos.key}
                                position={{ lat: pos.lat, lng: pos.lng }}
                                onClick={() => pos.results[0] && handleMarkerClick(pos.results[0])}
                            >
                                <div
                                    className={`rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer transition-transform hover:scale-110 shadow-lg ${atCenter ? 'w-9 h-9 border-[3px] border-blue-600' : 'w-8 h-8 border-2 border-white'}`}
                                    style={{ backgroundColor: getRankColor(pos.rank, 'google') }}
                                >
                                    {getRankLabel(pos.rank)}
                                </div>
                            </AdvancedMarker>
                        )
                    })}
                </Map>
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {[
                    { label: '1-3위', color: '#22c55e' },
                    { label: '4-10위', color: '#eab308' },
                    { label: '11위~', color: '#ef4444' },
                    { label: '순위권 외', color: '#ef4444' },
                ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-2">
                        <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-gray-600">{label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-300 border-2 border-blue-600" />
                    <span className="text-sm text-gray-600">내 매장</span>
                </div>
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
