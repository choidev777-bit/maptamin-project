'use client'

import { useState, useMemo, useCallback } from 'react'
import { NavermapsProvider, Container as MapDiv, NaverMap, Marker, useNavermaps } from 'react-naver-maps'
import { SearchResult, Competitor } from '@/lib/types'
import { CompetitorDetailModal } from '@/components/results/CompetitorDetailModal'

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

// Inner map content (needs useNavermaps hook)
interface MapContentProps {
    center: { lat: number; lng: number }
    comparisonPoints: ComparisonPoint[]
    onMarkerClick: (point: ComparisonPoint) => void
}

function MapContent({ center, comparisonPoints, onMarkerClick }: MapContentProps) {
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
            {/* Center marker */}
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

            {/* Win/Lose markers */}
            {comparisonPoints.map((point) => {
                const style = VERDICT_STYLE[point.verdict]
                return (
                    <Marker
                        key={point.key}
                        position={new navermaps.LatLng(point.lat, point.lng)}
                        icon={{
                            content: `
                                <div style="
                                    width: 32px;
                                    height: 32px;
                                    background-color: ${style.color};
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
                                    ${style.text}
                                </div>
                            `,
                            anchor: new navermaps.Point(16, 16)
                        }}
                        onClick={() => onMarkerClick(point)}
                    />
                )
            })}
        </NaverMap>
    )
}

export function NaverCompetitorComparisonMap({
    center,
    results,
    selectedKeyword,
    competitorPlaceId,
    competitorName,
}: Props) {
    const [selectedPoint, setSelectedPoint] = useState<ComparisonPoint | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID

    // Compute comparison data (pseudocode Section 6)
    const comparisonPoints = useMemo((): ComparisonPoint[] => {
        const filtered = results.filter(r => r.keyword === selectedKeyword)
        const positionMap = new Map<string, SearchResult[]>()

        for (const result of filtered) {
            const key = `${result.grid_lat},${result.grid_lng}`
            const existing = positionMap.get(key)
            if (existing) {
                existing.push(result)
            } else {
                positionMap.set(key, [result])
            }
        }

        const points: ComparisonPoint[] = []

        for (const [key, posResults] of positionMap) {
            const first = posResults[0]
            const myRank = first.rank
            const competitors = (first.competitors || []) as Competitor[]
            const competitor = competitors.find(c => c.place_id === competitorPlaceId)
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

    if (!clientId) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">Naver Maps Client ID가 설정되지 않았습니다.</p>
            </div>
        )
    }

    return (
        <>
            {/* Summary Bar */}
            <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl">
                <div className="flex-1 grid grid-cols-3 gap-2 text-center">
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
                <div className="text-center pl-4 border-l border-gray-200">
                    <p className="text-2xl font-bold text-emerald-600">{summary.winRate}%</p>
                    <p className="text-xs text-gray-500">승률</p>
                </div>
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg" style={{ height: '500px' }}>
                <NavermapsProvider ncpKeyId={clientId}>
                    <MapDiv style={{ width: '100%', height: '100%' }}>
                        <MapContent
                            center={center}
                            comparisonPoints={comparisonPoints}
                            onMarkerClick={handleMarkerClick}
                        />
                    </MapDiv>
                </NavermapsProvider>
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
