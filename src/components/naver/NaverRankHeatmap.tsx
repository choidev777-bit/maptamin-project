'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { NavermapsProvider, Container as MapDiv, NaverMap, Marker, useNavermaps } from 'react-naver-maps'
import { SearchResult } from '@/lib/types'
import { getRankColor, getRankLabel } from '@/lib/utils/rank-colors'
import { RankDetailModal } from '@/components/results/RankDetailModal'
import { Grid, Map as MapIcon } from 'lucide-react'

interface Props {
    center: { lat: number; lng: number }
    results: SearchResult[]
    selectedKeyword?: string
    onSwitchMap?: () => void  // 구글 지도 전환 콜백
    platform?: 'naver' | 'google'  // 범례 기준 플랫폼
}

interface PositionData {
    key: string
    lat: number
    lng: number
    rank: number | null
    results: SearchResult[]
}

function isCenter(lat: number, lng: number, center: { lat: number; lng: number }) {
    return Math.abs(lat - center.lat) < 0.0001 && Math.abs(lng - center.lng) < 0.0001
}

// 폴리곤 centroid 계산 (좌표 배열의 평균)
function getCentroid(coords: number[][][]): [number, number] {
    let totalLng = 0, totalLat = 0, count = 0
    // 첫 번째 링만 사용 (외곽선)
    const ring = coords[0]
    if (!ring) return [0, 0]
    for (const [lng, lat] of ring) {
        totalLng += lng
        totalLat += lat
        count++
    }
    return [totalLng / count, totalLat / count]
}

// full_nm에서 "구 동" 형태 추출 (예: "서울특별시 종로구 창성동" → "종로구 창성동")
function extractDistrictLabel(fullNm: string): string {
    const parts = fullNm.split(' ')
    if (parts.length >= 3) {
        return parts.slice(-2).join('\n')
    }
    return parts[parts.length - 1] || fullNm
}

interface BoundaryFeature {
    geometry: { type: string; coordinates: number[][][][] }
    full_nm: string
}

interface MapContentProps {
    center: { lat: number; lng: number }
    uniquePositions: PositionData[]
    onMarkerClick: (result: SearchResult) => void
    showDistrict: boolean
}

function MapContent({ center, uniquePositions, onMarkerClick, showDistrict }: MapContentProps) {
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

    // 행정구역 데이터 가져오기 (토글 ON + map 준비 시)
    useEffect(() => {
        if (!showDistrict || !map) return

        // 지도의 현재 표시 영역에서 바운드 가져오기
        const bounds = map.getBounds()
        if (!bounds) return
        const sw = bounds.getSW()
        const ne = bounds.getNE()
        const key = `${sw.lat().toFixed(3)},${sw.lng().toFixed(3)},${ne.lat().toFixed(3)},${ne.lng().toFixed(3)}`
        if (fetchedCenterRef.current === key) return
        fetchedCenterRef.current = key

        fetch(`/api/boundary?x1=${sw.lng()}&y1=${sw.lat()}&x2=${ne.lng()}&y2=${ne.lat()}`)
            .then(r => r.json())
            .then(data => {
                if (data.features) {
                    setBoundaryData(data.features)
                }
            })
            .catch(err => console.error('Boundary fetch error:', err))
    }, [showDistrict, map])

    // 행정구역 경계 렌더링 (Polygon + Label)
    useEffect(() => {
        // cleanup 기존 폴리곤/라벨
        polygonsRef.current.forEach(p => p.setMap(null))
        polygonsRef.current = []
        labelsRef.current.forEach(l => l.setMap(null))
        labelsRef.current = []

        if (!map || !navermaps || !showDistrict || !boundaryData) return

        boundaryData.forEach((feature) => {
            const { geometry, full_nm } = feature
            if (!geometry?.coordinates) return

            // MultiPolygon: coordinates is number[][][][]
            const allCoords: number[][][][] = geometry.type === 'MultiPolygon'
                ? geometry.coordinates
                : [geometry.coordinates as unknown as number[][][]]

            allCoords.forEach((polygonCoords) => {
                if (!polygonCoords[0]) return

                const paths = polygonCoords[0].map(
                    ([lng, lat]: number[]) => new navermaps.LatLng(lat, lng)
                )

                const polygon = new navermaps.Polygon({
                    map,
                    paths,
                    strokeColor: '#3B82F6',
                    strokeWeight: 2.5,
                    strokeOpacity: 0.8,
                    fillColor: '#3B82F6',
                    fillOpacity: 0.03,
                    clickable: false,
                })
                polygonsRef.current.push(polygon)

                // 동 이름 라벨 (centroid에 표시)
                const [cLng, cLat] = getCentroid(polygonCoords)
                const label = extractDistrictLabel(full_nm)
                const labelOverlay = new navermaps.Marker({
                    map,
                    position: new navermaps.LatLng(cLat, cLng),
                    icon: {
                        content: `<div style="
                            background:rgba(255,255,255,0.85);
                            border:1px solid #93C5FD;
                            border-radius:4px;
                            padding:2px 6px;
                            font-size:11px;
                            font-weight:600;
                            color:#1E40AF;
                            white-space:pre-line;
                            text-align:center;
                            line-height:1.3;
                            pointer-events:none;
                            box-shadow:0 1px 3px rgba(0,0,0,0.1);
                        ">${label}</div>`,
                        anchor: new navermaps.Point(30, 12),
                    },
                    clickable: false,
                    zIndex: 0,
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
        if (!map || initializedRef.current || uniquePositions.length === 0) return

        const applyFitBounds = () => {
            if (initializedRef.current) return
            initializedRef.current = true

            if (uniquePositions.length <= 1) {
                map.setCenter(new navermaps.LatLng(center.lat, center.lng))
                map.setZoom(14)
                return
            }

            const bounds = new navermaps.LatLngBounds(
                new navermaps.LatLng(center.lat, center.lng),
                new navermaps.LatLng(center.lat, center.lng)
            )
            uniquePositions.forEach(pos => {
                bounds.extend(new navermaps.LatLng(pos.lat, pos.lng))
            })

            map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
        }

        const timer = setTimeout(applyFitBounds, 300)
        const fallback = setTimeout(applyFitBounds, 3000)

        return () => {
            clearTimeout(timer)
            clearTimeout(fallback)
        }
    }, [map, navermaps, center, uniquePositions])

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

export function NaverRankHeatmap({ center, results, selectedKeyword, onSwitchMap, platform = 'naver' }: Props) {
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showDistrict, setShowDistrict] = useState(false)

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID

    const filteredResults = useMemo(() => {
        if (!selectedKeyword) return results
        return results.filter(r => r.keyword === selectedKeyword)
    }, [results, selectedKeyword])

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
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-emerald-500">
                        <Grid className="w-5 h-5" />
                    </span>
                    플레이스 순위 지도
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* 행정구역 경계 토글 버튼 */}
                    <button
                        onClick={() => setShowDistrict(prev => !prev)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            showDistrict
                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                                : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                        }`}
                    >
                        <MapIcon className="w-3.5 h-3.5" />
                        행정구역 경계
                    </button>
                    {/* 구글 지도 전환 버튼 */}
                    {onSwitchMap && (
                        <button
                            onClick={onSwitchMap}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
                        >
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-[#4285F4] text-[8px] font-bold text-white">G</span>
                            구글 지도로 보기
                        </button>
                    )}
                    {/* 범례 */}
                    <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            {platform === 'google' ? '1-3위' : '1-5위'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            {platform === 'google' ? '4-10위' : '6-10위'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            {platform === 'google' ? '11위~' : '11위 이상'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-gray-300 border-2 border-blue-600"></div>
                            내 매장
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative w-full bg-slate-100 dark:bg-slate-900 group">
                <NavermapsProvider ncpKeyId={clientId}>
                    <MapDiv style={{ width: '100%', height: 'clamp(280px, 60vw, 500px)' }}>
                        <MapContent
                            center={center}
                            uniquePositions={uniquePositions}
                            onMarkerClick={handleMarkerClick}
                            showDistrict={showDistrict}
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
