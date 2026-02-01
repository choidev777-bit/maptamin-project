'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeywordInput } from '@/components/search/KeywordInput'
import { NaverMapGridConfigurator } from '@/components/naver/NaverMapGridConfigurator'
import { DistanceSettings } from '@/components/search/DistanceSettings'
import { generateGridPointsFromTemplate, milesToKm } from '@/lib/utils/grid-calculator'
import { Tag, Grid3X3, Check, ArrowLeft, ArrowRight, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { UserCredits } from '@/lib/types'

interface GridPointSelection {
    row: number
    col: number
    enabled: boolean
}

// Simplified steps: No place selection (handled in dashboard)
const STEPS = [
    { id: 1, name: '키워드 입력', icon: Tag },
    { id: 2, name: '그리드 설정', icon: Grid3X3 },
    { id: 3, name: '결제 및 확인', icon: Check },
]

// Default 3x3 grid preset
const DEFAULT_GRID_POINTS: GridPointSelection[] = [
    { row: -1, col: -1, enabled: true }, { row: -1, col: 0, enabled: true }, { row: -1, col: 1, enabled: true },
    { row: 0, col: -1, enabled: true }, { row: 0, col: 0, enabled: true }, { row: 0, col: 1, enabled: true },
    { row: 1, col: -1, enabled: true }, { row: 1, col: 0, enabled: true }, { row: 1, col: 1, enabled: true },
]

export default function NewNaverSearchPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode')

    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(true)

    // User Data
    const [userCredits, setUserCredits] = useState<UserCredits | null>(null)

    // Place Data (auto-filled from dashboard)
    const [placeName, setPlaceName] = useState('')
    const [placeAddress, setPlaceAddress] = useState('')
    const [placeLat, setPlaceLat] = useState('')
    const [placeLng, setPlaceLng] = useState('')
    const [selectedPlaceId, setSelectedPlaceId] = useState<string>('')

    const [keywords, setKeywords] = useState<string[]>([''])
    const [gridPoints, setGridPoints] = useState<GridPointSelection[]>(DEFAULT_GRID_POINTS)
    const [gridDistance, setGridDistance] = useState(1) // km
    const [distanceUnit, setDistanceUnit] = useState<'km' | 'mile'>('km')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch credits on mount
    useEffect(() => {
        const fetchCredits = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('user_credits')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (data) setUserCredits(data as UserCredits)
        }
        fetchCredits()
    }, [])

    // Fetch shop data and redirect if not found
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
                        // No shop registered - redirect to dashboard
                        alert('네이버 지도에 등록된 사장님의 매장을 먼저 대시보드에서 등록해주세요.')
                        router.push('/dashboard')
                    }
                } else {
                    // API error - redirect
                    router.push('/dashboard')
                }
            } catch (error) {
                console.error('Failed to fetch shop data:', error)
                router.push('/dashboard')
            }
        }
        fetchShopData()
    }, [router])

    const enabledGridCount = useMemo(() => {
        return gridPoints.filter(p => p.enabled).length
    }, [gridPoints])

    const totalCost = useMemo(() => {
        const activeKeywords = keywords.filter(k => k.trim().length > 0).length
        return activeKeywords * enabledGridCount
    }, [keywords, enabledGridCount])

    const totalBalance = (userCredits?.subscription_balance || 0) + (userCredits?.cash_balance || 0)
    const hasSufficientBalance = totalBalance >= totalCost

    const canProceed = () => {
        switch (step) {
            case 1:
                return keywords.some(k => k.trim().length > 0)
            case 2:
                return enabledGridCount > 0
            case 3:
                return hasSufficientBalance
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
                    keywords: keywords.filter(k => k.trim()),
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
                    alert(error.message || '포인트가 부족합니다.')
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

    // Loading state
    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                <p className="text-gray-500">가게 정보를 불러오는 중...</p>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Beta Warning */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="text-sm font-medium text-amber-800">베타 기능</p>
                    <p className="text-sm text-amber-700">
                        네이버 지도 검색은 베타 기능입니다.
                        네이버 정책 변경에 따라 기능이 제한될 수 있습니다.
                    </p>
                </div>
            </div>

            {/* Selected Shop Display */}
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm text-emerald-600 mb-1">분석 대상</p>
                <p className="font-semibold text-emerald-900">{placeName}</p>
                {placeAddress && <p className="text-sm text-emerald-700">{placeAddress}</p>}
            </div>

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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {/* Step 1: Keyword Input */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">검색 키워드 입력</h2>
                            <p className="mt-2 text-gray-600">
                                네이버 지도에서 검색할 키워드를 입력하세요.
                            </p>
                        </div>

                        <KeywordInput
                            keywords={keywords}
                            onChange={setKeywords}
                            maxKeywords={3}
                        />
                    </div>
                )}

                {/* Step 2: Grid Configuration */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">검색 그리드 설정</h2>
                            <p className="mt-2 text-gray-600">
                                검색 포인트와 간격을 설정하세요.
                            </p>
                        </div>

                        <DistanceSettings
                            distance={gridDistance}
                            unit={distanceUnit}
                            onDistanceChange={setGridDistance}
                            onUnitChange={setDistanceUnit}
                        />

                        <NaverMapGridConfigurator
                            centerLat={parseFloat(placeLat) || 37.5665}
                            centerLng={parseFloat(placeLng) || 126.9780}
                            selectedPoints={gridPoints}
                            onPointsChange={setGridPoints}
                            gridDistance={distanceUnit === 'mile' ? gridDistance * 1.60934 : gridDistance}
                        />

                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">활성 포인트</span>
                            <span className="font-bold text-emerald-600">{enabledGridCount}개</span>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirmation & Cost */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">결제 및 확인</h2>
                            <p className="mt-2 text-gray-600">
                                예상 비용을 확인하고 검색을 시작하세요.
                            </p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">비즈니스</span>
                                    <span className="font-medium text-gray-900">{placeName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">키워드 ({keywords.filter(k => k.trim()).length}개)</span>
                                    <span className="font-medium text-gray-900">
                                        {keywords.filter(k => k.trim()).join(', ')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">그리드 포인트</span>
                                    <span className="font-medium text-gray-900">{enabledGridCount}개</span>
                                </div>
                            </div>

                            {/* Cost Summary */}
                            <div className="bg-gray-50 p-6 border-t border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-600">보유 포인트</span>
                                    <span className="font-medium">{totalBalance.toLocaleString()} P</span>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-gray-600">차감 예정 포인트</span>
                                    <span className="text-xl font-bold text-red-600">-{totalCost.toLocaleString()} P</span>
                                </div>
                                <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                                    <span className="font-medium text-gray-900">잔액 예상</span>
                                    <span className={`text-lg font-bold ${hasSufficientBalance ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {(totalBalance - totalCost).toLocaleString()} P
                                    </span>
                                </div>
                                {!hasSufficientBalance && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        포인트가 부족하여 검색을 시작할 수 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-lg">
                            <p className="text-sm text-amber-800">
                                ⚠️ 검색 시작 시 포인트가 즉시 차감됩니다. (실패 시 자동 환불)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
                <button
                    onClick={handleBack}
                    disabled={step === 1}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${step === 1
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <ArrowLeft className="w-5 h-5" />
                    이전
                </button>

                {step < 3 ? (
                    <button
                        onClick={handleNext}
                        disabled={!canProceed()}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${canProceed()
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/30'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        다음
                        <ArrowRight className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !hasSufficientBalance}
                        className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                처리 중...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                {hasSufficientBalance ? '결제 및 시작' : '잔액 부족'}
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
