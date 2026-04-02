'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { NavermapsProvider, Container as MapDiv, NaverMap, Marker, useNavermaps } from 'react-naver-maps'
import { SearchResult, Competitor } from '@/lib/types'
import { CompetitorDetailModal } from '@/components/results/CompetitorDetailModal'
import { Map as MapIcon } from 'lucide-react'

type Verdict = 'WIN' | 'LOSE' | 'DRAW'

interface Props {
    center: { lat: number; lng: number }
    results: SearchResult[]
    selectedKeyword: string
    competitorPlaceId: string
    competitorName: string
    onSwitchMap?: () => void
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

// 폴리곤 centroid 계산
function getCentroid(coords: number[][][]): [number, number] {
    let totalLng = 0, totalLat = 0, count = 0
    const ring = coords[0]
    if (!ring) return [0, 0]
    for (const [lng, lat] of ring) {
        totalLng += lng
        totalLat += lat
        count++
    }
    return [totalLng / count, totalLat / count]
}

function extractDistrictLabel(fullNm: string): string {
    const parts = fullNm.split(' ')
    if (parts.length >= 3) return parts.slice(-2).join('\n')
    return parts[parts.length - 1] || fullNm
}

interface BoundaryFeature {
    geometry: { type: string; coordinates: number[][][][] }
    full_nm: string
}

// Inner map content (needs useNavermaps hook)
interface MapContentProps {
    center: { lat: number; lng: number }
    comparisonPoints: ComparisonPoint[]
    onMarkerClick: (point: ComparisonPoint) => void
    showDistrict: boolean
}

function MapContent({ center, comparisonPoints, onMarkerClick, showDistrict }: MapContentProps) {
    const navermaps = useNavermaps()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [map, setMap] = useState<any>(null)
    const initializedRef = useRef(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const polygonsRef = useRef<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labelsRef = useRef<any[]>([])
    const [boundaryData, setBoundaryData] = useState<BoundaryFeature[] | null>(null)
    const fetchedCenterRef = useRef<string>('')

    // 행정구역 데이터 가져오기 (지도 표시 영역 기준)
    useEffect(() => {
        if (!showDistrict || !map) return

        const bounds = map.getBounds()
        if (!bounds) return
        const sw = bounds.getSW()
        const ne = bounds.getNE()
        const key = `${sw.lat().toFixed(3)},${sw.lng().toFixed(3)},${ne.lat().toFixed(3)},${ne.lng().toFixed(3)}`
        if (fetchedCenterRef.current === key) return
        fetchedCenterRef.current = key

        fetch(`/api/boundary?x1=${sw.lng()}&y1=${sw.lat()}&x2=${ne.lng()}&y2=${ne.lat()}`)
            .then(r => r.json())
            .then(data => { if (data.features) setBoundaryData(data.features) })
            .catch(err => console.error('Boundary fetch error:', err))
    }, [showDistrict, map])

    // 행정구역 경계 렌더링
    useEffect(() => {
        polygonsRef.current.forEach(p => p.setMap(null))
        polygonsRef.current = []
        labelsRef.current.forEach(l => l.setMap(null))
        labelsRef.current = []

        if (!map || !navermaps || !showDistrict || !boundaryData) return

        boundaryData.forEach((feature) => {
            const { geometry, full_nm } = feature
            if (!geometry?.coordinates) return
            const allCoords: number[][][][] = geometry.type === 'MultiPolygon'
                ? geometry.coordinates : [geometry.coordinates as unknown as number[][][]]

            allCoords.forEach((polygonCoords) => {
                if (!polygonCoords[0]) return
                const paths = polygonCoords[0].map(
                    ([lng, lat]: number[]) => new navermaps.LatLng(lat, lng)
                )
                const polygon = new navermaps.Polygon({
                    map, paths,
                    strokeColor: '#3B82F6', strokeWeight: 2.5, strokeOpacity: 0.8,
                    fillColor: '#3B82F6', fillOpacity: 0.03, clickable: false,
                })
                polygonsRef.current.push(polygon)

                const [cLng, cLat] = getCentroid(polygonCoords)
                const label = extractDistrictLabel(full_nm)
                const labelOverlay = new navermaps.Marker({
                    map,
                    position: new navermaps.LatLng(cLat, cLng),
                    icon: {
                        content: `<div style="
                            background:rgba(255,255,255,0.85);border:1px solid #93C5FD;border-radius:4px;
                            padding:2px 6px;font-size:11px;font-weight:600;color:#1E40AF;
                            white-space:pre-line;text-align:center;line-height:1.3;
                            pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,0.1);
                        ">${label}</div>`,
                        anchor: new navermaps.Point(30, 12),
                    },
                    clickable: false, zIndex: 0,
                })
                labelsRef.current.push(labelOverlay)
            })
        })

        return () => {
            polygonsRef.current.forEach(p => p.setMap(null))
            polygonsRef.current = []
            labelsRef.current.forEach(l => l.setMap(null))
            labelsRef.current = []
        }
    }, [map, navermaps, showDistrict, boundaryData])

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            polygonsRef.current.forEach(p => p.setMap(null))
            polygonsRef.current = []
            labelsRef.current.forEach(l => l.setMap(null))
            labelsRef.current = []
        }
    }, [])

    // fitBounds
    useEffect(() => {
        if (!map || initializedRef.current || comparisonPoints.length === 0) return

        const applyFitBounds = () => {
            if (initializedRef.current) return
            initializedRef.current = true

            if (comparisonPoints.length <= 1) {
                map.setCenter(new navermaps.LatLng(center.lat, center.lng))
                map.setZoom(14)
                return
            }

            const bounds = new navermaps.LatLngBounds(
                new navermaps.LatLng(center.lat, center.lng),
                new navermaps.LatLng(center.lat, center.lng)
            )
            comparisonPoints.forEach(point => {
                bounds.extend(new navermaps.LatLng(point.lat, point.lng))
            })

            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
        }

        const timer = setTimeout(applyFitBounds, 300)
        const fallback = setTimeout(applyFitBounds, 3000)

        return () => {
            clearTimeout(timer)
            clearTimeout(fallback)
        }
    }, [map, navermaps, center, comparisonPoints])

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
    onSwitchMap,
}: Props) {
    const [selectedPoint, setSelectedPoint] = useState<ComparisonPoint | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showDistrict, setShowDistrict] = useState(false)

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
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap justify-between items-center gap-2 bg-gray-50 dark:bg-gray-800">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">경쟁사 분석 지도</h4>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* 행정구역 경계 토글 버튼 */}
                    <button
                        onClick={() => setShowDistrict(prev => !prev)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            showDistrict
                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                                : 'bg-white border-gray-200 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                        }`}
                    >
                        <MapIcon className="w-3 h-3" />
                        법정경계
                    </button>
                    {/* 구글 지도 전환 버튼 */}
                    {onSwitchMap && (
                        <button
                            onClick={onSwitchMap}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-white border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
                        >
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#4285F4] text-[8px] font-bold text-white">G</span>
                            구글
                        </button>
                    )}
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

            <div className="relative w-full bg-slate-100 dark:bg-slate-900 flex-grow">
                <NavermapsProvider ncpKeyId={clientId}>
                    <MapDiv style={{ width: '100%', height: 'clamp(280px, 60vw, 500px)' }}>
                        <MapContent
                            center={center}
                            comparisonPoints={comparisonPoints}
                            onMarkerClick={handleMarkerClick}
                            showDistrict={showDistrict}
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
