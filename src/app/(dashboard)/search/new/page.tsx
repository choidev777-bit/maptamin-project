'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { MapGridConfigurator } from '@/components/search/MapGridConfigurator'
import { DistanceSettings } from '@/components/search/DistanceSettings'
import { generateGridPointsFromTemplate, milesToKm } from '@/lib/utils/grid-calculator'
import { Tag, Grid3X3, Check, ArrowLeft, ArrowRight, Loader2, Swords, AlertTriangle, Lock } from 'lucide-react'
import { PlaceSelectionModal } from '@/components/dashboard/PlaceSelectionModal'
import { Place } from '@/lib/types'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSubscription } from '@/hooks/useSubscription'
import { getAllowedGridSizes } from '@/lib/utils/subscription'

// Dynamic import for heavy Google Maps component
const GoogleMapsProvider = dynamic(
    () => import('@/components/maps/GoogleMapsProvider').then(m => m.GoogleMapsProvider),
    { ssr: false }
)

interface GridPointSelection {
    row: number
    col: number
    enabled: boolean
}

interface RegisteredKeyword {
    keyword: string
    platform: 'naver' | 'google'
}

interface PlaceData {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
}

// Simplified steps: No place selection (handled via modal)
const STEPS = [
    { id: 1, name: '키워드 선택', icon: Tag },
    { id: 2, name: '그리드 설정', icon: Grid3X3 },
    { id: 3, name: '확인', icon: Check },
]

// Default 3x3 grid preset
const DEFAULT_GRID_POINTS: GridPointSelection[] = [
    { row: -1, col: -1, enabled: true }, { row: -1, col: 0, enabled: true }, { row: -1, col: 1, enabled: true },
    { row: 0, col: -1, enabled: true }, { row: 0, col: 0, enabled: true }, { row: 0, col: 1, enabled: true },
    { row: 1, col: -1, enabled: true }, { row: 1, col: 0, enabled: true }, { row: 1, col: 1, enabled: true },
]

// Grid templates by size
const GRID_TEMPLATES: Record<number, GridPointSelection[]> = {
    3: DEFAULT_GRID_POINTS,
    5: Array.from({ length: 25 }, (_, i) => ({
        row: Math.floor(i / 5) - 2,
        col: (i % 5) - 2,
        enabled: true,
    })),
    7: Array.from({ length: 49 }, (_, i) => ({
        row: Math.floor(i / 7) - 3,
        col: (i % 7) - 3,
        enabled: true,
    })),
}

export default function NewSearchPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode')
    const subscription = useSubscription()

    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false)

    // Place Data (auto-filled from dashboard or modal)
    const [place, setPlace] = useState<PlaceData | null>(null)

    // Keyword selection (from managed keywords)
    const [registeredKeywords, setRegisteredKeywords] = useState<RegisteredKeyword[]>([])
    const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())

    const [gridPoints, setGridPoints] = useState<GridPointSelection[]>(DEFAULT_GRID_POINTS)
    const [selectedGridSize, setSelectedGridSize] = useState(3)
    const [gridDistance, setGridDistance] = useState(1) // km
    const [distanceUnit, setDistanceUnit] = useState<'km' | 'mile'>('km')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [hasCompetitor, setHasCompetitor] = useState(true) // default true to avoid flash

    // User Data
    const [remainingTickets, setRemainingTickets] = useState<number>(0)

    // Fetch subscription + keywords on mount
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Tickets
            const { data: subData } = await supabase
                .from('user_subscriptions')
                .select('remaining_tickets_google')
                .eq('user_id', user.id)
                .single()

            if (subData) setRemainingTickets(subData.remaining_tickets_google || 0)

            // Registered keywords (google only)
            const { data: kwData } = await supabase
                .from('managed_keywords')
                .select('keyword, platform')
                .eq('user_id', user.id)
                .eq('platform', 'google')

            if (kwData && kwData.length > 0) {
                setRegisteredKeywords(kwData)
                // Default: all checked
                setSelectedKeywords(new Set(kwData.map(k => k.keyword)))
            }
        }
        fetchData()
    }, [])

    // Fetch shop data - show modal if not found
    useEffect(() => {
        const fetchShopData = async () => {
            try {
                const res = await fetch('/api/settings/my-shop?platform=google')
                if (res.ok) {
                    const { data } = await res.json()
                    const myShop = data?.[0]

                    if (myShop && myShop.place_id && myShop.lat && myShop.lng) {
                        // Shop found - set data
                        setPlace({
                            placeId: myShop.place_id,
                            name: myShop.place_name,
                            address: myShop.address || '',
                            lat: myShop.lat,
                            lng: myShop.lng
                        })
                        setIsLoading(false)
                    } else {
                        // No shop registered - show modal
                        setIsLoading(false)
                        setIsPlaceModalOpen(true)
                    }
                } else {
                    setIsLoading(false)
                    setIsPlaceModalOpen(true)
                }
            } catch (error) {
                console.error('Failed to fetch shop data:', error)
                setIsLoading(false)
                setIsPlaceModalOpen(true)
            }
        }
        fetchShopData()
    }, [])

    // Fetch competitor status
    useEffect(() => {
        const checkCompetitors = async () => {
            try {
                const res = await fetch('/api/settings/competitors?platform=google')
                if (res.ok) {
                    const { data } = await res.json()
                    setHasCompetitor((data?.length || 0) > 0)
                }
            } catch (e) {
                console.error('Failed to check competitors:', e)
            }
        }
        checkCompetitors()
    }, [])

    // Handler: Register shop from modal
    const handleRegisterShop = async (selectedPlace: Place) => {
        try {
            const res = await fetch('/api/settings/my-shop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: 'google',
                    placeId: selectedPlace.placeId,
                    placeName: selectedPlace.name,
                    address: selectedPlace.address,
                    lat: selectedPlace.lat,
                    lng: selectedPlace.lng
                }),
            })

            if (res.ok) {
                // Success - update state
                setPlace({
                    placeId: selectedPlace.placeId,
                    name: selectedPlace.name,
                    address: selectedPlace.address || '',
                    lat: selectedPlace.lat,
                    lng: selectedPlace.lng
                })
                setIsPlaceModalOpen(false)
            } else {
                const error = await res.json()
                alert(error.error || '가게 등록에 실패했습니다.')
            }
        } catch (error) {
            console.error(error)
            alert('오류가 발생했습니다.')
        }
    }

    // Handler: Modal close (cancel)
    const handleModalClose = () => {
        router.back()
    }

    const enabledGridCount = useMemo(() => {
        return gridPoints.filter(p => p.enabled).length
    }, [gridPoints])

    const hasTicket = remainingTickets > 0
    const keywords = Array.from(selectedKeywords)
    const allowedGridSizes = getAllowedGridSizes(subscription.planId)

    const handleGridSizeChange = (size: number) => {
        if (!allowedGridSizes.includes(size)) return
        setSelectedGridSize(size)
        setGridPoints(GRID_TEMPLATES[size] || DEFAULT_GRID_POINTS)
    }

    const toggleKeyword = (keyword: string) => {
        setSelectedKeywords(prev => {
            const next = new Set(prev)
            if (next.has(keyword)) next.delete(keyword)
            else next.add(keyword)
            return next
        })
    }

    const canProceed = () => {
        switch (step) {
            case 1:
                return selectedKeywords.size > 0
            case 2:
                return enabledGridCount > 0
            case 3:
                return hasTicket
            default:
                return false
        }
    }

    const handleNext = () => {
        if (canProceed() && step < 3) {
            setStep(step + 1)
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1)
        }
    }

    const handleSubmit = async () => {
        if (!place) return

        setIsSubmitting(true)

        try {
            const distanceKm = distanceUnit === 'mile' ? milesToKm(gridDistance) : gridDistance

            const gridPointsWithCoords = generateGridPointsFromTemplate(
                place.lat,
                place.lng,
                gridPoints,
                distanceKm
            ).filter(p => p.enabled)

            const createResponse = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    place,
                    keywords: keywords.filter(k => k.trim()),
                    gridPoints: gridPointsWithCoords,
                    distance: gridDistance,
                    distanceUnit,
                }),
            })

            if (!createResponse.ok) {
                const error = await createResponse.json()
                if (createResponse.status === 429) {
                    alert('오늘 일일 검색 한도에 도달했습니다. 내일 다시 시도해주세요.')
                } else if (createResponse.status === 402) {
                    alert(error.message || '티켓이 부족합니다.')
                } else {
                    alert(error.message || error.error || '검색 생성에 실패했습니다.')
                }
                setIsSubmitting(false)
                return
            }

            const { searchId } = await createResponse.json()

            // Trigger fetch not needed as API handles it, but kept if needed for specific logic
            // const processResponse = await fetch(`/api/search/${searchId}/process`, {
            //    method: 'POST',
            // })

            router.push(`/search/${searchId}`)
        } catch (error) {
            console.error('Search submission error:', error)
            alert('검색 중 오류가 발생했습니다. 다시 시도해주세요.')
            setIsSubmitting(false)
        }
    }

    // Subscription check: block users without google access
    if (!subscription.loading && !subscription.canAccessPlatform('google')) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                    <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">구독이 필요합니다</h2>
                <p className="text-gray-500 mb-6">구글 검색은 프리미엄 플랜에서 이용 가능합니다.</p>
                <button
                    onClick={() => router.push('/dashboard/upgrade')}
                    className="px-6 py-2.5 bg-[#00C896] text-white rounded-xl font-semibold hover:bg-[#00B386] transition-all"
                >
                    업그레이드 →
                </button>
            </div>
        )
    }

    // Loading state
    if (isLoading || subscription.loading) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500">가게 정보를 불러오는 중...</p>
            </div>
        )
    }

    return (
        <GoogleMapsProvider>
            <div className="max-w-3xl mx-auto">
                {/* Place Selection Modal */}
                <PlaceSelectionModal
                    isOpen={isPlaceModalOpen}
                    onClose={handleModalClose}
                    platform="google"
                    onConfirm={handleRegisterShop}
                />

                {/* Main UI - only show when place is set */}
                {place && (
                    <>
                        {/* Selected Shop Display */}
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-600 mb-1">분석 대상</p>
                            <p className="font-semibold text-blue-900">{place.name}</p>
                            {place.address && <p className="text-sm text-blue-700">{place.address}</p>}
                        </div>

                        {/* Competitor CTA Banner */}
                        {!hasCompetitor && (
                            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
                                <Swords className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-indigo-800">경쟁사가 등록되지 않았습니다</p>
                                    <p className="text-sm text-indigo-700">
                                        등록하면 검색 결과에서 승/패 비교가 가능해요!
                                    </p>
                                </div>
                                <Link href="/settings" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap">
                                    등록하기 →
                                </Link>
                            </div>
                        )}

                        {/* Step Indicator */}
                        <div className="flex items-center justify-center mb-10">
                            {STEPS.map((s, index) => (
                                <div key={s.id} className="flex items-center">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${step > s.id
                                                ? 'bg-green-500 text-white'
                                                : step === s.id
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                                    : 'bg-gray-100 text-gray-400'
                                                }`}
                                        >
                                            {step > s.id ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                <s.icon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <span className={`mt-2 text-xs font-medium ${step >= s.id ? 'text-gray-900' : 'text-gray-400'
                                            }`}>
                                            {s.name}
                                        </span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className={`w-16 h-1 mx-2 rounded ${step > s.id ? 'bg-green-500' : 'bg-gray-200'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Step Content */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                            {/* Step 1: Keyword Selection */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">검색 키워드 선택</h2>
                                        <p className="mt-2 text-gray-600">
                                            등록된 키워드 중 검색할 키워드를 선택하세요.
                                        </p>
                                    </div>

                                    {registeredKeywords.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <Tag className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-500 mb-4">등록된 키워드가 없습니다</p>
                                            <Link
                                                href="/settings"
                                                className="text-sm font-semibold text-[#00C896] hover:text-[#00B386]"
                                            >
                                                설정에서 키워드 등록하기 →
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {registeredKeywords.map((kw) => (
                                                <label
                                                    key={kw.keyword}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedKeywords.has(kw.keyword)
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedKeywords.has(kw.keyword)}
                                                        onChange={() => toggleKeyword(kw.keyword)}
                                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className={`font-medium ${selectedKeywords.has(kw.keyword) ? 'text-blue-800' : 'text-gray-700'
                                                        }`}>
                                                        {kw.keyword}
                                                    </span>
                                                </label>
                                            ))}
                                            <p className="text-xs text-gray-400 mt-2">
                                                {selectedKeywords.size}개 선택됨 · 키워드는 설정에서 관리할 수 있습니다
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Grid Configuration */}
                            {step === 2 && (
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">그리드 설정</h2>
                                        <p className="mt-2 text-gray-600">
                                            순위를 측정할 지점과 간격을 설정하세요.
                                        </p>
                                    </div>

                                    {/* Grid Size Selector */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-2 block">그리드 크기</label>
                                        <div className="flex gap-3">
                                            {[3, 5, 7].map((size) => {
                                                const allowed = allowedGridSizes.includes(size)
                                                return (
                                                    <button
                                                        key={size}
                                                        onClick={() => handleGridSizeChange(size)}
                                                        disabled={!allowed}
                                                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${selectedGridSize === size
                                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                            : allowed
                                                                ? 'border-gray-200 text-gray-700 hover:border-gray-300'
                                                                : 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                                                            }`}
                                                    >
                                                        {size}×{size}
                                                        <span className="block text-xs font-normal mt-0.5">
                                                            {size * size}좌표
                                                        </span>
                                                        {!allowed && (
                                                            <span className="block text-[10px] text-gray-400 mt-0.5">🔒</span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <MapGridConfigurator
                                        centerLat={place.lat}
                                        centerLng={place.lng}
                                        selectedPoints={gridPoints}
                                        onPointsChange={setGridPoints}
                                        gridDistance={gridDistance}
                                        maxPoints={49}
                                    />

                                    <div className="border-t border-gray-100 pt-8">
                                        <DistanceSettings
                                            distance={gridDistance}
                                            unit={distanceUnit}
                                            onDistanceChange={setGridDistance}
                                            onUnitChange={setDistanceUnit}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Confirmation */}
                            {step === 3 && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">검색 확인</h2>
                                        <p className="mt-2 text-gray-600">
                                            입력한 정보를 확인하고 검색을 시작하세요.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Place Summary */}
                                        <div className="p-5 bg-gray-50 rounded-xl">
                                            <p className="text-sm font-medium text-gray-500 mb-2">비즈니스</p>
                                            <p className="font-semibold text-gray-900">{place.name}</p>
                                            <p className="text-sm text-gray-600">{place.address}</p>
                                        </div>

                                        {/* Keywords Summary */}
                                        <div className="p-5 bg-gray-50 rounded-xl">
                                            <p className="text-sm font-medium text-gray-500 mb-3">키워드</p>
                                            <div className="flex flex-wrap gap-2">
                                                {keywords.filter(k => k.trim()).map((keyword, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                                                    >
                                                        {keyword}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Grid Summary */}
                                        <div className="p-5 bg-gray-50 rounded-xl">
                                            <p className="text-sm font-medium text-gray-500 mb-2">그리드</p>
                                            <p className="font-semibold text-gray-900">
                                                {enabledGridCount}개 측정 지점
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                포인트 간격: {gridDistance} {distanceUnit}
                                            </p>
                                        </div>

                                        {/* Ticket Summary */}
                                        <div className="bg-gray-50 p-6 border-t border-gray-200 rounded-xl">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-gray-600">남은 티켓 (구글)</span>
                                                <span className="font-medium">{remainingTickets}장</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-gray-600">차감 티켓</span>
                                                <span className="text-xl font-bold text-red-600">-1장</span>
                                            </div>
                                            <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                                                <span className="font-medium text-gray-900">진단 후 잔여</span>
                                                <span className={`text-lg font-bold ${hasTicket ? 'text-blue-600' : 'text-red-600'}`}>
                                                    {Math.max(0, remainingTickets - 1)}장
                                                </span>
                                            </div>
                                            {!hasTicket && (
                                                <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    이번 달 구글 진단 티켓이 모두 소진되어 검색을 시작할 수 없습니다.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-50 rounded-lg">
                                        <p className="text-sm text-amber-800">
                                            ⚠️ 검색 시작 시 티켓 1장이 즉시 차감됩니다. (실패 시 자동 환불)
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">
                                {step > 1 && (
                                    <button
                                        onClick={handleBack}
                                        className="flex-1 py-4 px-6 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        이전
                                    </button>
                                )}

                                {step < 3 ? (
                                    <button
                                        onClick={handleNext}
                                        disabled={!canProceed()}
                                        className="flex-1 py-4 px-6 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        다음
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !hasTicket}
                                        className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                검색 시작 중...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5" />
                                                {hasTicket ? '진단 시작 (티켓 1장)' : '티켓 부족'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </GoogleMapsProvider>
    )
}
