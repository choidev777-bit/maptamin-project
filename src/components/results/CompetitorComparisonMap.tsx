'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { SearchResult, Competitor } from '@/lib/types'
import { CompetitorDetailModal } from './CompetitorDetailModal'

const NaverCompetitorComparisonMap = dynamic(
    () => import('@/components/naver/NaverCompetitorComparisonMap').then(m => m.NaverCompetitorComparisonMap),
    { ssr: false, loading: () => <div className="flex items-center justify-center h-64 bg-slate-100 text-sm text-gray-400">네이버 지도 로딩 중...</div> }
)

type Verdict = 'WIN' | 'LOSE' | 'DRAW'

interface Props {
    center: { lat: number; lng: number }
    results: SearchResult[]
    selectedKeyword: string
    competitorPlaceId: string
    competitorName: string
}

interface ComparisonPoint {
    key: string
    lat: number
    lng: number
    myRank: number | null
    competitorRank: number | null
    verdict: Verdict
    keyword: string
}

function getVerdict(myRank: number | null, competitorRank: number | null): Verdict {
    if (myRank === null && competitorRank === null) return 'DRAW'
    if (myRank === null) return 'LOSE'
    if (competitorRank === null) return 'WIN'
    if (myRank < competitorRank) return 'WIN'
    if (myRank > competitorRank) return 'LOSE'
    return 'DRAW'
}

const VERDICT_STYLE: Record<Verdict, { color: string; text: string }> = {
    WIN: { color: '#22c55e', text: '승' },
    LOSE: { color: '#ef4444', text: '패' },
    DRAW: { color: '#9ca3af', text: '무' },
}

export function CompetitorComparisonMap({
    center,
    results,
    selectedKeyword,
    competitorPlaceId,
    competitorName,
}: Props) {
    const [selectedPoint, setSelectedPoint] = useState<ComparisonPoint | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showNaverMap, setShowNaverMap] = useState(true)

    // Compute comparison data from search results
    const comparisonPoints = useMemo((): ComparisonPoint[] => {
        const filtered = results.filter(r => r.keyword === selectedKeyword)
        const positionMap: Record<string, SearchResult[]> = {}

        for (const result of filtered) {
            const key = `${result.grid_lat},${result.grid_lng}`
            if (!positionMap[key]) {
                positionMap[key] = []
            }
            positionMap[key].push(result)
        }

        const points: ComparisonPoint[] = []

        for (const [key, posResults] of Object.entries(positionMap)) {
            const first = posResults[0]
            const myRank = first.rank

            const competitors = (first.competitors || []) as Competitor[]
            const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()
            const normalizedCompetitorName = normalize(competitorName)
            const competitor = competitors.find(c => normalize(c.name) === normalizedCompetitorName)
            const competitorRank = competitor ? competitor.rank : null

            points.push({
                key,
                lat: first.grid_lat,
                lng: first.grid_lng,
                myRank,
                competitorRank,
                verdict: getVerdict(myRank, competitorRank),
                keyword: selectedKeyword,
            })
        }

        return points
    }, [results, selectedKeyword, competitorPlaceId])

    // Summary statistics
    const summary = useMemo(() => {
        const wins = comparisonPoints.filter(p => p.verdict === 'WIN').length
        const losses = comparisonPoints.filter(p => p.verdict === 'LOSE').length
        const draws = comparisonPoints.filter(p => p.verdict === 'DRAW').length
        const total = comparisonPoints.length
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
        return { wins, losses, draws, total, winRate }
    }, [comparisonPoints])

    const handleMarkerClick = useCallback((point: ComparisonPoint) => {
        setSelectedPoint(point)
        setIsModalOpen(true)
    }, [])

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false)
        setSelectedPoint(null)
    }, [])

    if (comparisonPoints.length === 0) return null

    // 네이버 지도 모드
    if (showNaverMap) {
        return (
            <NaverCompetitorComparisonMap
                center={center}
                results={results}
                selectedKeyword={selectedKeyword}
                competitorPlaceId={competitorPlaceId}
                competitorName={competitorName}
                onSwitchMap={() => setShowNaverMap(false)}
            />
        )
    }

    // 구글 지도 모드
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap justify-between items-center gap-2 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">경쟁사 분석 지도</h4>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* 네이버 전환 버튼 */}
                    <button
                        onClick={() => setShowNaverMap(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-white border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
                    >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#03C75A] text-[8px] font-bold text-white">N</span>
                        네이버
                    </button>
                    <div className="flex flex-wrap gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span>내 매장 승리 ({summary.wins})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span>경쟁사 승리 ({summary.losses})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                            <span>무승부 ({summary.draws})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Google Map */}
            <div className="relative w-full bg-slate-100 dark:bg-slate-900 flex-grow">
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
                    {comparisonPoints.map((point) => {
                        const style = VERDICT_STYLE[point.verdict]
                        const atCenter = Math.abs(point.lat - center.lat) < 0.0001 && Math.abs(point.lng - center.lng) < 0.0001
                        return (
                            <AdvancedMarker
                                key={point.key}
                                position={{ lat: point.lat, lng: point.lng }}
                                onClick={() => handleMarkerClick(point)}
                            >
                                <div
                                    className={`rounded-full flex items-center justify-center text-white text-sm font-bold cursor-pointer transition-transform hover:scale-110 shadow-lg ${atCenter ? 'w-9 h-9 border-[3px] border-blue-600' : 'w-8 h-8 border-2 border-white'}`}
                                    style={{ backgroundColor: style.color }}
                                >
                                    {style.text}
                                </div>
                            </AdvancedMarker>
                        )
                    })}
                </Map>
            </div>

            {/* Detail Modal */}
            {selectedPoint && (
                <CompetitorDetailModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    keyword={selectedPoint.keyword}
                    gridLat={selectedPoint.lat}
                    gridLng={selectedPoint.lng}
                    myRank={selectedPoint.myRank}
                    competitorRank={selectedPoint.competitorRank}
                    competitorName={competitorName}
                    verdict={selectedPoint.verdict}
                />
            )}
        </div>
    )
}
