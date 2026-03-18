'use client'

import { useState, useMemo, useCallback } from 'react'
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { SearchResult, Competitor } from '@/lib/types'
import { CompetitorDetailModal } from './CompetitorDetailModal'

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

    // Compute comparison data from search results (pseudocode Section 6)
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

            // Find competitor in the competitors array (name-based matching)
            // place_id는 등록 시(base64 pseudo-ID)와 스크래퍼(네이버 Place ID)가 달라서 매칭 불가
            // 이름 기반 매칭 + 공백 정규화로 해결
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

    return (
        <>
            {/* Summary Bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4 bg-white border border-gray-200 rounded-xl">
                <div className="flex-1 min-w-0 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-50 rounded-lg py-2">
                        <p className="text-lg font-bold text-green-700">{summary.wins}</p>
                        <p className="text-xs text-green-600">승리</p>
                    </div>
                    <div className="bg-red-50 rounded-lg py-2">
                        <p className="text-lg font-bold text-red-700">{summary.losses}</p>
                        <p className="text-xs text-red-600">패배</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg py-2">
                        <p className="text-lg font-bold text-gray-700">{summary.draws}</p>
                        <p className="text-xs text-gray-600">무승부</p>
                    </div>
                </div>
                <div className="text-center pl-3 sm:pl-4 border-l border-gray-200">
                    <p className="text-2xl font-bold text-emerald-600">{summary.winRate}%</p>
                    <p className="text-xs text-gray-500">승률</p>
                </div>
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg" style={{ height: 'clamp(280px, 60vw, 500px)' }}>
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
                    {/* Win/Lose markers */}
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

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 justify-center">
                {[
                    { label: '승리 (내 순위가 높음)', color: '#22c55e' },
                    { label: '패배 (경쟁사 순위가 높음)', color: '#ef4444' },
                    { label: '무승부', color: '#9ca3af' },
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
        </>
    )
}
