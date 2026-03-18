'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { NaverMapGridConfigurator } from '@/components/naver/NaverMapGridConfigurator'
// DistanceSettings removed — inline onboarding-style UI used instead
import { generateGridPointsFromTemplate, milesToKm } from '@/lib/utils/grid-calculator'
import { Tag, Grid3X3, Check, ArrowLeft, ArrowRight, Loader2, AlertTriangle, Swords, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Place } from '@/lib/types'
import { PlaceSelectionModal } from '@/components/dashboard/PlaceSelectionModal'
import { useSubscription } from '@/hooks/useSubscription'
import { getAllowedGridSizes } from '@/lib/utils/subscription'
import Link from 'next/link'

interface GridPointSelection {
    row: number
    col: number
    enabled: boolean
}

interface RegisteredKeyword {
    keyword: string
    platform: 'naver' | 'google'
    keyword_type: 'industry' | 'local'
}

// Simplified steps: No place selection (handled via modal)
const STEPS = [
    { id: 1, name: '키워드 선택', icon: Tag },
    { id: 2, name: '좌표 설정', icon: Grid3X3 },
    { id: 3, name: '결제 및 확인', icon: Check },
]

// 간격 프리셋 (온보딩과 동일)
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

export default function NewNaverSearchPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode')
    const subscription = useSubscription()

    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false)

    // User Data
    const [remainingTickets, setRemainingTickets] = useState<number>(0)

    // Place Data (auto-filled from dashboard or modal)
    const [placeName, setPlaceName] = useState('')
    const [placeAddress, setPlaceAddress] = useState('')
    const [placeLat, setPlaceLat] = useState('')
    const [placeLng, setPlaceLng] = useState('')
    const [selectedPlaceId, setSelectedPlaceId] = useState<string>('')

    // Keyword selection (from managed keywords)
    const [registeredKeywords, setRegisteredKeywords] = useState<RegisteredKeyword[]>([])
    const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())

    const [gridPoints, setGridPoints] = useState<GridPointSelection[]>(DEFAULT_GRID_POINTS)
    const [selectedGridSize, setSelectedGridSize] = useState(3)
    const [gridDistance, setGridDistance] = useState(1) // km
    const [distanceUnit, setDistanceUnit] = useState<'km' | 'mile'>('km')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [hasCompetitor, setHasCompetitor] = useState(true) // default true to avoid flash

    // Fetch subscription + keywords on mount
    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Tickets
            const { data: subData } = await supabase
                .from('user_subscriptions')
                .select('remaining_tickets_naver')
                .eq('user_id', user.id)
                .single()

            if (subData) setRemainingTickets(subData.remaining_tickets_naver || 0)

            // Registered keywords (naver only)
            const { data: kwData } = await supabase
                .from('managed_keywords')
                .select('keyword, platform, keyword_type')
                .eq('user_id', user.id)
                .eq('platform', 'naver')

            if (kwData && kwData.length > 0) {
                setRegisteredKeywords(kwData.map(k => ({ ...k, keyword_type: k.keyword_type || 'industry' })))
                // Default: 모든 키워드 선택
                setSelectedKeywords(new Set(kwData.map(k => k.keyword)))
            }
        }
        fetchData()
    }, [])

    // Fetch shop data - show modal if not found
    useEffect(() => {
        const fetchShopData = async () => {
            try {
                const res = await fetch('/api/settings/my-shop?platform=naver')
                if (res.ok) {
                    const { data } = await res.json()
                    const myShop = data?.[0]

                    if (myShop && myShop.place_id && myShop.lat && myShop.lng) {
                        // Shop found - set data
                        setPlaceName(myShop.place_name)
                        setPlaceAddress(myShop.address || '')
                        setPlaceLat(String(myShop.lat))
                        setPlaceLng(String(myShop.lng))
                        setSelectedPlaceId(myShop.place_id)
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
                const res = await fetch('/api/settings/competitors?platform=naver')
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

    // Set default grid size and distance based on subscription plan
    useEffect(() => {
        if (subscription.loading) return

        const planId = subscription.planId
        const allowedSizes = getAllowedGridSizes(planId)

        if (planId === 'premium' && allowedSizes.includes(7)) {
            setSelectedGridSize(7)
            setGridPoints(GRID_TEMPLATES[7] || DEFAULT_GRID_POINTS)
        } else if (planId === 'pro' && allowedSizes.includes(5)) {
            setSelectedGridSize(5)
            setGridPoints(GRID_TEMPLATES[5] || DEFAULT_GRID_POINTS)
        } else {
            // Default (Starter or fallback)
            setSelectedGridSize(3)
            setGridPoints(DEFAULT_GRID_POINTS)
        }

        // Default distance 300m for all
        setDistanceUnit('km')
        setGridDistance(0.3)
    }, [subscription.loading, subscription.planId])

    // Handler: Register shop from modal
    const handleRegisterShop = async (selectedPlace: Place) => {
        try {
            const res = await fetch('/api/settings/my-shop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: 'naver',
                    placeId: selectedPlace.placeId,
                    placeName: selectedPlace.name,
                    address: selectedPlace.address,
                    lat: selectedPlace.lat,
                    lng: selectedPlace.lng
                }),
            })

            if (res.ok) {
                // Success - update state
                setPlaceName(selectedPlace.name)
                setPlaceAddress(selectedPlace.address || '')
                setPlaceLat(String(selectedPlace.lat))
                setPlaceLng(String(selectedPlace.lng))
                setSelectedPlaceId(selectedPlace.placeId)
                setIsPlaceModalOpen(false)
            } else {
                const error = await res.json()
                alert(error.error || '매장 등록에 실패했습니다.')
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
    const localKeywords = registeredKeywords.filter(k => k.keyword_type === 'local').map(k => k.keyword)
    const selectedLocalKeywords = localKeywords.filter(k => selectedKeywords.has(k))
    const industryKeywords = registeredKeywords.filter(k => k.keyword_type === 'industry')
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
            case 1: {
                const selectedIndustryCount = industryKeywords.filter(k => selectedKeywords.has(k.keyword)).length
                return selectedIndustryCount > 0
            }
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
        if (!placeName || !placeLat || !placeLng) return

        setIsSubmitting(true)

        try {
            const distanceKm = distanceUnit === 'mile' ? milesToKm(gridDistance) : gridDistance
            const lat = parseFloat(placeLat)
            const lng = parseFloat(placeLng)

            const gridPointsWithCoords = generateGridPointsFromTemplate(
                lat,
                lng,
                gridPoints,
                distanceKm
            ).filter(p => p.enabled)

            const createResponse = await fetch('/api/naver/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    placeName,
                    placeAddress,
                    placeLat: lat,
                    placeLng: lng,
                    keywords: keywords.filter(k => k.trim() && !localKeywords.includes(k)),
                    local_keywords: selectedLocalKeywords,
                    gridPoints: gridPointsWithCoords,
                    distance: gridDistance,
                    distanceUnit,
                    placeId: selectedPlaceId || undefined
                }),
            })

            if (!createResponse.ok) {
                const error = await createResponse.json()
                if (createResponse.status === 429) {
                    alert('네이버 일일 검색 한도에 도달했습니다. 내일 다시 시도해주세요.')
                } else if (createResponse.status === 402) {
                    alert(error.message || '티켓이 부족합니다.')
                } else if (createResponse.status === 403) {
                    alert(error.message || '플랜 한도를 초과했습니다.')
                } else {
                    alert(error.message || error.error || '검색 생성에 실패했습니다.')
                }
                setIsSubmitting(false)
                return
            }

            const { searchId } = await createResponse.json()

            const processResponse = await fetch(`/api/naver/search/${searchId}/process`, {
                method: 'POST',
            })

            if (!processResponse.ok) {
                console.error('Processing failed, but search was created')
            }

            router.push(`/naver-search/${searchId}`)
        } catch (error) {
            console.error('Search submission error:', error)
            alert('검색 중 오류가 발생했습니다. 다시 시도해주세요.')
            setIsSubmitting(false)
        }
    }

    // Subscription check: block free users
    if (!subscription.loading && !subscription.canAccessPlatform('naver')) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                    <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">구독이 필요합니다</h2>
                <p className="text-gray-500 mb-6">네이버 검색은 스타터 플랜부터 이용 가능합니다.</p>
                <button
                    onClick={() => router.push('/dashboard/subscription')}
                    className="px-6 py-2.5 bg-[#00C896] text-white rounded-xl font-semibold hover:bg-[#00B386] transition-all"
                >
                    구독하기 →
                </button>
            </div>
        )
    }

    // Loading state
    if (isLoading || subscription.loading) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                <p className="text-gray-500">매장 정보를 불러오는 중...</p>
            </div>
        )
    }

    // Check if place is set
    const hasPlace = placeName && placeLat && placeLng

    return (
        <div className="max-w-3xl mx-auto">
            {/* Place Selection Modal */}
            <PlaceSelectionModal
                isOpen={isPlaceModalOpen}
                onClose={handleModalClose}
                platform="naver"
                onConfirm={handleRegisterShop}
                isPlaceLockExempt={subscription.planId === 'premium'}
            />

            {/* Main UI - only show when place is set */}
            {hasPlace && (
                <>

                    {/* Selected Shop Display */}
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm text-emerald-600 mb-1">분석 대상</p>
                        <p className="font-semibold text-emerald-900">{placeName}</p>
                        {placeAddress && <p className="text-sm text-emerald-700">{placeAddress}</p>}
                    </div>

                    {/* Competitor CTA Banner */}
                    {!hasCompetitor && (
                        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
                            <Swords className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-indigo-800">경쟁사가 등록되지 않았습니다</p>
                                <p className="text-sm text-indigo-700">
                                    등록하면 분석 결과에서 승/패 비교가 가능해요!
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
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
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
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-8">
                        {/* Step 1: Keyword Selection */}
                        {step === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">분석 키워드 선택</h2>
                                    <p className="mt-2 text-gray-600">
                                        등록된 키워드 중 분석할 키워드를 선택하세요.
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
                                    <div className="space-y-6">
                                        {/* 지역명 키워드 체크박스 */}
                                        {localKeywords.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">지역명 키워드</p>
                                                {localKeywords.map((kw) => (
                                                    <label
                                                        key={kw}
                                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedKeywords.has(kw)
                                                            ? 'border-emerald-500 bg-emerald-50'
                                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedKeywords.has(kw)}
                                                            onChange={() => toggleKeyword(kw)}
                                                            className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                        />
                                                        <span className={`font-medium ${selectedKeywords.has(kw) ? 'text-emerald-800' : 'text-gray-700'}`}>
                                                            {kw}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {/* 업종 키워드 체크박스 */}
                                        <div className="space-y-2">
                                            {localKeywords.length > 0 && (
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">업종 키워드</p>
                                            )}
                                            {industryKeywords.map((kw) => (
                                                <label
                                                    key={kw.keyword}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedKeywords.has(kw.keyword)
                                                        ? 'border-emerald-500 bg-emerald-50'
                                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedKeywords.has(kw.keyword)}
                                                        onChange={() => toggleKeyword(kw.keyword)}
                                                        className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span className={`font-medium ${selectedKeywords.has(kw.keyword) ? 'text-emerald-800' : 'text-gray-700'
                                                        }`}>
                                                        {kw.keyword}
                                                    </span>
                                                </label>
                                            ))}
                                            <p className="text-xs text-gray-400 mt-2">
                                                {selectedKeywords.size}개 선택됨 · 키워드는 설정에서 관리할 수 있습니다
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: 좌표 설정 (온보딩과 동일 UI) */}
                        {step === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        <Grid3X3 className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                                        순위를 분석할 좌표를 직접 선택하세요
                                    </h2>
                                    <p className="mt-2 text-gray-600">
                                        매장 주변의 검색 순위를 분석할 좌표를 설정합니다.
                                    </p>
                                </div>

                                {/* 분석 좌표 간격 설정 */}
                                <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">분석 좌표 간격 설정</h3>
                                        <p className="text-sm text-gray-500 mb-4">좌표 사이의 거리를 설정하세요</p>

                                        <div className="flex items-center gap-4 mb-6">
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="5"
                                                step="0.1"
                                                value={gridDistance}
                                                onChange={(e) => setGridDistance(parseFloat(e.target.value))}
                                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00C896]"
                                            />
                                            <div className="w-20 text-right">
                                                <span className="text-2xl font-bold text-[#00C896]">{gridDistance}</span>
                                                <span className="text-lg text-gray-500 ml-1">km</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-5 sm:flex gap-1.5">
                                            {DISTANCE_PRESETS.map(preset => (
                                                <button
                                                    key={preset.value}
                                                    type="button"
                                                    onClick={() => setGridDistance(preset.value)}
                                                    className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${gridDistance === preset.value
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

                                {/* 지도 */}
                                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <NaverMapGridConfigurator
                                        centerLat={parseFloat(placeLat) || 37.5665}
                                        centerLng={parseFloat(placeLng) || 126.9780}
                                        selectedPoints={gridPoints}
                                        onPointsChange={setGridPoints}
                                        gridDistance={gridDistance}
                                        maxPoints={selectedGridSize * selectedGridSize}
                                        allowedGridSizes={allowedGridSizes}
                                        onGridSizeChange={handleGridSizeChange}
                                        onReset={() => {
                                            setGridDistance(0.3)
                                            setGridPoints(GRID_TEMPLATES[selectedGridSize] || DEFAULT_GRID_POINTS)
                                        }}
                                    />
                                </div>

                                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <span className="text-sm text-gray-600">활성 좌표</span>
                                    <span className="font-bold text-[#00C896]">{enabledGridCount}/{selectedGridSize * selectedGridSize}개</span>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Confirmation & Cost */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">확인 및 시작</h2>
                                    <p className="mt-2 text-gray-600">
                                        설정을 확인하고 분석을 시작하세요.
                                    </p>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                    <div className="p-6 space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">매장</span>
                                            <span className="font-medium text-gray-900">{placeName}</span>
                                        </div>
                                        {selectedLocalKeywords.length > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">지역명 키워드 ({selectedLocalKeywords.length}개)</span>
                                                <span className="font-medium text-gray-900">
                                                    {selectedLocalKeywords.join(', ')}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-2">
                                            <span className="text-gray-600 flex-shrink-0">업종 키워드 ({keywords.filter(k => k.trim() && !localKeywords.includes(k)).length}개)</span>
                                            <span className="font-medium text-gray-900 text-right break-all">
                                                {keywords.filter(k => k.trim() && !localKeywords.includes(k)).join(', ') || '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">분석 좌표</span>
                                            <span className="font-medium text-gray-900">{enabledGridCount}개</span>
                                        </div>
                                    </div>

                                    {/* Ticket Summary */}
                                    <div className="bg-gray-50 p-6 border-t border-gray-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-gray-600">남은 티켓</span>
                                            <span className="font-medium">{remainingTickets}장</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-gray-600">차감 티켓</span>
                                            <span className="text-xl font-bold text-red-600">-1장</span>
                                        </div>
                                        <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                                            <span className="font-medium text-gray-900">진단 후 잔여</span>
                                            <span className={`text-lg font-bold ${hasTicket ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {Math.max(0, remainingTickets - 1)}장
                                            </span>
                                        </div>
                                        {!hasTicket && (
                                            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                이번 달 진단 티켓이 모두 소진되어 검색을 시작할 수 없습니다.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 rounded-lg">
                                    <p className="text-sm text-amber-800">
                                        ⚠️ 분석 시작 시 티켓 1장이 즉시 차감됩니다. (실패 시 자동 환불)
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
                                    className="flex-1 py-4 px-6 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    다음
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !hasTicket}
                                    className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            처리 중...
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
    )
}
