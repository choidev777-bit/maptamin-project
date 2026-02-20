'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
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
function isCenter(lat: number, lng: number, center: { lat: number; lng: number }) {
    return Math.abs(lat - center.lat) < 0.0001 && Math.abs(lng - center.lng) < 0.0001
}

interface MapContentProps {
    center: { lat: number; lng: number }
    uniquePositions: PositionData[]
    onMarkerClick: (result: SearchResult) => void
}

function MapContent({ center, uniquePositions, onMarkerClick }: MapContentProps) {
    const navermaps = useNavermaps()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [map, setMap] = useState<any>(null)
    const initializedRef = useRef(false)

    // Force correct zoom/center once after map first loads
    useEffect(() => {
        if (map && !initializedRef.current) {
            initializedRef.current = true
            map.setCenter(new navermaps.LatLng(center.lat, center.lng))
            map.setZoom(14)
        }
    }, [map, navermaps, center])

    return (
        <NaverMap
            ref={setMap}
            defaultCenter={new navermaps.LatLng(center.lat, center.lng)}
            defaultZoom={14}
            zoomControl={true}
            zoomControlOptions={{
                position: navermaps.Position.TOP_RIGHT
            }}
            scaleControl={true}
        >
            {/* Rank markers */}
            {uniquePositions.map((pos) => {
                const atCenter = isCenter(pos.lat, pos.lng, center)
                const borderStyle = atCenter ? '3px solid #2563eb' : '2px solid white'
                const size = atCenter ? 36 : 32
                const anchor = atCenter ? 18 : 16
                return (
                    <Marker
                        key={pos.key}
                        position={new navermaps.LatLng(pos.lat, pos.lng)}
                        icon={{
                            content: `
                            <div style="
                                width: ${size}px;
                                height: ${size}px;
                                background-color: ${getRankColor(pos.rank)};
                                border: ${borderStyle};
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
                            anchor: new navermaps.Point(anchor, anchor)
                        }}
                        onClick={() => pos.results[0] && onMarkerClick(pos.results[0])}
                    />
                )
            })}
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
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-blue-600"></div>
                        내 매장
                    </div>
                </div>
            </div>

            <div className="relative w-full bg-slate-100 dark:bg-slate-900 group">
                <NavermapsProvider ncpKeyId={clientId}>
                    <MapDiv style={{ width: '100%', height: '500px' }}>
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
