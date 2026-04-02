'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { SearchResult } from '@/lib/types'
import { getRankColor, getRankLabel } from '@/lib/utils/rank-colors'
import { RankDetailModal } from './RankDetailModal'
import { Grid } from 'lucide-react'

const NaverRankHeatmap = dynamic(
    () => import('@/components/naver/NaverRankHeatmap').then(m => m.NaverRankHeatmap),
    { ssr: false, loading: () => <div className="flex items-center justify-center h-64 bg-slate-100 text-sm text-gray-400">네이버 지도 로딩 중...</div> }
)

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
    const [showNaverMap, setShowNaverMap] = useState(true)

    const filteredResults = useMemo(() => {
        if (!selectedKeyword) return results
        return results.filter(r => r.keyword === selectedKeyword)
    }, [results, selectedKeyword])

    const uniquePositions = useMemo((): PositionData[] => {
        const positionMap: Record<string, SearchResult[]> = {}

        filteredResults.forEach(result => {
            const key = `${result.grid_lat},${result.grid_lng}`
            if (!positionMap[key]) positionMap[key] = []
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

    // 네이버 지도 모드: NaverRankHeatmap 컴포넌트에 위임 (행정구역 토글 포함)
    if (showNaverMap) {
        return (
            <div className="relative">
                <NaverRankHeatmap
                    center={center}
                    results={results}
                    selectedKeyword={selectedKeyword}
                />
                {/* 구글 지도 전환 버튼 — 지도 좌측 하단 플로팅 */}
                <button
                    onClick={() => setShowNaverMap(false)}
                    className="absolute bottom-20 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white/90 backdrop-blur-sm border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 shadow-sm transition-all"
                >
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#4285F4] text-[8px] font-bold text-white">G</span>
                    구글 지도로 보기
                </button>
            </div>
        )
    }

    // 구글 지도 모드: 기존 구글 맵 렌더링
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-8 overflow-hidden">
            {/* 헤더: 타이틀 + 토글 + legend */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-blue-500">
                        <Grid className="w-5 h-5" />
                    </span>
                    플레이스 순위 지도
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* 네이버 지도 전환 버튼 */}
                    <button
                        onClick={() => setShowNaverMap(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
                    >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#03C75A] text-[8px] font-bold text-white">N</span>
                        네이버 지도로 보기
                    </button>
                    {/* 범례 */}
                    <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            1-3위
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            4-10위
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            11위~
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-blue-600"></div>
                            내 매장
                        </div>
                    </div>
                </div>
            </div>

            {/* 구글 지도 */}
            <div className="relative w-full bg-slate-100 dark:bg-slate-900">
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
                    style={{ width: '100%', height: 'clamp(280px, 60vw, 500px)' }}
                >
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
