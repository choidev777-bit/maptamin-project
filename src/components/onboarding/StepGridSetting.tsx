'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Grid3X3, MapPin } from 'lucide-react'
import { PLAN_CONFIG } from '@/lib/pricing/config'

const NaverMapGridConfigurator = dynamic(
    () => import('@/components/naver/NaverMapGridConfigurator').then(m => m.NaverMapGridConfigurator),
    { ssr: false, loading: () => <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">지도 로딩 중...</div> }
)

const MapGridConfigurator = dynamic(
    () => import('@/components/search/MapGridConfigurator').then(m => m.MapGridConfigurator),
    { ssr: false, loading: () => <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">지도 로딩 중...</div> }
)

const GoogleMapsProvider = dynamic(
    () => import('@/components/maps/GoogleMapsProvider').then(m => m.GoogleMapsProvider),
    { ssr: false }
)

interface Place {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
}

interface GridPoint {
    row: number
    col: number
    enabled: boolean
}

interface Props {
    planId: 'starter' | 'pro' | 'premium'
    naverPlace: Place
    googlePlace?: Place
    onComplete: (data: {
        naverGrid: Array<GridPoint & { lat: number; lng: number }>
        googleGrid?: Array<GridPoint & { lat: number; lng: number }>
        distance: number
    }) => void
}

const DISTANCE_PRESETS = [
    { value: 0.1, label: '100m' },
    { value: 0.2, label: '200m' },
    { value: 0.3, label: '300m' },
    { value: 0.4, label: '400m' },
    { value: 0.5, label: '500m' },
    { value: 1, label: '1km' },
    { value: 2, label: '2km' },
    { value: 3, label: '3km' },
    { value: 5, label: '5km' },
]

export default function StepGridSetting({ planId, naverPlace, googlePlace, onComplete }: Props) {
    const isPremium = planId === 'premium'
    const gridSize = PLAN_CONFIG[planId]?.gridSize ?? 3
    const maxPoints = gridSize * gridSize

    const [activeTab, setActiveTab] = useState<'naver' | 'google'>('naver')
    const [distance, setDistance] = useState(0.3) // km

    // 기본 그리드: 모든 포인트 활성화 (gridSize × gridSize)
    const defaultGrid = useMemo(() => {
        const points: GridPoint[] = []
        const half = Math.floor(gridSize / 2)
        for (let r = -half; r <= half; r++) {
            for (let c = -half; c <= half; c++) {
                points.push({ row: r, col: c, enabled: true })
            }
        }
        return points
    }, [gridSize])

    const [naverPoints, setNaverPoints] = useState<GridPoint[]>(defaultGrid)
    const [googlePoints, setGooglePoints] = useState<GridPoint[]>(defaultGrid)

    const handleReset = useCallback(() => {
        setDistance(0.3)
        setNaverPoints(defaultGrid)
        setGooglePoints(defaultGrid)
    }, [defaultGrid])

    // 활성화된 포인트 수
    const naverEnabledCount = naverPoints.filter(p => p.enabled).length
    const googleEnabledCount = googlePoints.filter(p => p.enabled).length

    const canProceed = naverEnabledCount > 0 && (isPremium ? googleEnabledCount > 0 : true)

    const handleComplete = () => {
        if (!canProceed) return

        // lat/lng 계산 유틸 (NaverMapGridConfigurator와 동일한 공식)
        const calculatePos = (centerLat: number, centerLng: number, row: number, col: number, distKm: number) => {
            const latOff = (row * distKm) / 111.32
            const lngOff = (col * distKm) / (111.32 * Math.cos((centerLat * Math.PI) / 180))
            return { lat: centerLat + latOff, lng: centerLng + lngOff }
        }

        const naverGrid = naverPoints.filter(p => p.enabled).map(p => ({
            ...p,
            ...calculatePos(naverPlace.lat, naverPlace.lng, p.row, p.col, distance),
        }))

        const googleGrid = isPremium && googlePlace
            ? googlePoints.filter(p => p.enabled).map(p => ({
                ...p,
                ...calculatePos(googlePlace.lat, googlePlace.lng, p.row, p.col, distance),
            }))
            : undefined

        onComplete({ naverGrid, googleGrid, distance })
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    <Grid3X3 className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                    순위를 분석할 좌표를 직접 선택하세요
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    매장 주변의 검색 순위를 분석할 좌표를 설정합니다.
                </p>
            </div>

            {/* Premium: 네이버/구글 탭 */}
            {isPremium && googlePlace && (
                <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('naver')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${activeTab === 'naver'
                            ? 'bg-white text-[#03C75A] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-[#03C75A] text-[10px] font-bold text-white">N</span>
                        네이버
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('google')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${activeTab === 'google'
                            ? 'bg-white text-[#4285F4] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-[#4285F4] text-[10px] font-bold text-white">G</span>
                        구글
                    </button>
                </div>
            )}


            {/* 간격 설정 및 슬라이더 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
                <div>
                    <h3 className="font-semibold text-gray-900">분석 좌표 간격 설정</h3>
                    <p className="text-sm text-gray-500 mb-4">좌표 사이의 거리를 설정하세요</p>

                    <div className="flex items-center gap-4 mb-6">
                        <input
                            type="range"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={distance}
                            onChange={(e) => setDistance(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00C896]"
                        />
                        <div className="w-20 text-right">
                            <span className="text-2xl font-bold text-[#00C896]">{distance}</span>
                            <span className="text-lg text-gray-500 ml-1">km</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {DISTANCE_PRESETS.map(preset => (
                            <button
                                key={preset.value}
                                type="button"
                                onClick={() => setDistance(preset.value)}
                                className={`flex-1 min-w-0 py-2 px-1 rounded-lg text-xs sm:text-sm font-medium transition-all ${distance === preset.value
                                    ? 'bg-[#E5F9F4] text-[#00A87D] border-2 border-[#00C896]'
                                    : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>


            </div>



            {/* 네이버 그리드 설정 */}
            {(!isPremium || activeTab === 'naver') && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    {!isPremium && (
                        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
                            <MapPin className="h-4 w-4 text-[#03C75A]" />
                            <span className="text-sm font-medium text-gray-700">
                                {naverPlace.name}
                            </span>
                            <span className="ml-auto text-xs text-gray-400">
                                {naverEnabledCount}/{maxPoints} 좌표 활성
                            </span>
                        </div>
                    )}
                    <NaverMapGridConfigurator
                        centerLat={naverPlace.lat}
                        centerLng={naverPlace.lng}
                        selectedPoints={naverPoints}
                        onPointsChange={setNaverPoints}
                        gridDistance={distance}
                        maxPoints={maxPoints}
                        onReset={handleReset}
                    />
                </div>
            )}

            {/* 구글 그리드 설정 (Premium) — 기본: 네이버 지도(행정구역), 토글: 구글 지도 */}
            {isPremium && googlePlace && activeTab === 'google' && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <NaverMapGridConfigurator
                        centerLat={googlePlace.lat}
                        centerLng={googlePlace.lng}
                        selectedPoints={googlePoints}
                        onPointsChange={setGooglePoints}
                        gridDistance={distance}
                        maxPoints={maxPoints}
                        onReset={handleReset}
                        colorScheme="blue"
                    />
                </div>
            )}

            {/* 다음 버튼 */}
            <button
                type="button"
                onClick={handleComplete}
                disabled={!canProceed}
                className="w-full rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
                다음 단계로 →
            </button>
        </div>
    )
}
