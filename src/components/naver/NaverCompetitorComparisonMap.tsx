'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapRef = useRef<any>(null)

    // Force correct zoom/center after map mounts
    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.setCenter(new navermaps.LatLng(center.lat, center.lng))
            mapRef.current.setZoom(14)
        }
    }, [navermaps, center])

    return (
        <NaverMap
            ref={mapRef}
            defaultCenter={new navermaps.LatLng(center.lat, center.lng)}
            defaultZoom={14}
            zoomControl={true}
            zoomControlOptions={{
                position: navermaps.Position.TOP_RIGHT
            }}
            scaleControl={true}
        >
            {/* Win/Lose markers */}
            {comparisonPoints.map((point) => {
                const style = VERDICT_STYLE[point.verdict]
                const atCenter = Math.abs(point.lat - center.lat) < 0.0001 && Math.abs(point.lng - center.lng) < 0.0001
                const borderStyle = atCenter ? '3px solid #2563eb' : '2px solid white'
                const size = atCenter ? 36 : 32
                const anchorPt = atCenter ? 18 : 16
                return (
                    <Marker
                        key={point.key}
                        position={new navermaps.LatLng(point.lat, point.lng)}
                        icon={{
                            content: `
                                <div style="
                                    width: ${size}px;
                                    height: ${size}px;
                                    background-color: ${style.color};
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
                                    ${style.text}
                                </div>
                            `,
                            anchor: new navermaps.Point(anchorPt, anchorPt)
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
            // place_id는 등록 시(base64 pseudo-ID)와 스크래퍼(네이버 Place ID)가 달라서 매칭 불가
            // 이름 기반 매칭 + 공백 정규화로 해결
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

    if (!clientId) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">Naver Maps Client ID가 설정되지 않았습니다.</p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">경쟁사 분석 지도</h4>
                <div className="flex gap-4 text-xs">
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

            <div className="relative w-full h-[500px] bg-slate-100 dark:bg-slate-900 flex-grow">
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
