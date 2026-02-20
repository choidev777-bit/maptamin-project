'use client'

import { useState, useMemo, useCallback } from 'react'
import { NavermapsProvider, Container as MapDiv, NaverMap, Marker, useNavermaps } from 'react-naver-maps'
import { SearchResult } from '@/lib/types'
import { getRankColor, getRankLabel } from '@/lib/utils/rank-colors'
import { RankDetailModal } from '@/components/results/RankDetailModal'
import { MapPin } from 'lucide-react'

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

// Inner map content component (uses hooks)
interface MapContentProps {
    center: { lat: number; lng: number }
    uniquePositions: PositionData[]
    onMarkerClick: (result: SearchResult) => void
}

function MapContent({ center, uniquePositions, onMarkerClick }: MapContentProps) {
    const navermaps = useNavermaps()

    return (
        <NaverMap
            defaultCenter={new navermaps.LatLng(center.lat, center.lng)}
            defaultZoom={14}
            zoomControl={true}
            zoomControlOptions={{
                position: navermaps.Position.TOP_RIGHT
            }}
            scaleControl={true}
        >
            {/* Center marker (business location) */}
            <Marker
                position={new navermaps.LatLng(center.lat, center.lng)}
                icon={{
                    content: `
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                            border: 4px solid white;
                            border-radius: 50%;
                            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <div style="width: 12px; height: 12px; background: white; border-radius: 50%;"></div>
                        </div>
                    `,
                    anchor: new navermaps.Point(20, 20)
                }}
            />

            {/* Rank markers */}
            {uniquePositions.map((pos) => (
                <Marker
                    key={pos.key}
                    position={new navermaps.LatLng(pos.lat, pos.lng)}
                    icon={{
                        content: `
                            <div style="
                                width: 32px;
                                height: 32px;
                                background-color: ${getRankColor(pos.rank)};
                                border: 2px solid white;
                                border-radius: 50%;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                color: white;
                                font-size: 14px;
                                font-weight: bold;
                                cursor: pointer;
                            ">
                                ${getRankLabel(pos.rank)}
                            </div>
                        `,
                        anchor: new navermaps.Point(16, 16)
                    }}
                    onClick={() => pos.results[0] && onMarkerClick(pos.results[0])}
                />
            ))}
        </NaverMap>
    )
}

export function NaverRankHeatmap({ center, results, selectedKeyword }: Props) {
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID

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

    if (!clientId) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">Naver Maps Client ID가 설정되지 않았습니다.</p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-8 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-emerald-500">
                        <MapPin className="w-5 h-5" />
                    </span>
                    플레이스 순위 지도
                </h3>
                <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        1-5위
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        6-10위
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        11위 이상
                    </div>
                </div>
            </div>

            <div className="relative w-full h-[500px] bg-slate-100 dark:bg-slate-900 group">
                <NavermapsProvider ncpKeyId={clientId}>
                    <MapDiv style={{ width: '100%', height: '100%' }}>
                        <MapContent
                            center={center}
                            uniquePositions={uniquePositions}
                            onMarkerClick={handleMarkerClick}
                        />
                    </MapDiv>
                </NavermapsProvider>
            </div>



            {/* Detail Modal */}
            {selectedResult && (
                <RankDetailModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    result={selectedResult}
                />
            )}
        </div>
    )
}
