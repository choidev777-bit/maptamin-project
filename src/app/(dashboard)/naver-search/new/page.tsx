'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeywordInput } from '@/components/search/KeywordInput'
import { NaverMapGridConfigurator } from '@/components/naver/NaverMapGridConfigurator'
import { DistanceSettings } from '@/components/search/DistanceSettings'
import { NaverPlaceSearchInput } from '@/components/search/NaverPlaceSearchInput'
import { PlaceSelector } from '@/components/search/PlaceSelector'
import { generateGridPointsFromTemplate, milesToKm } from '@/lib/utils/grid-calculator'
import { MapPin, Tag, Grid3X3, Check, ArrowLeft, ArrowRight, Loader2, AlertTriangle, Coins, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { UserCredits, ManagedCompetitor, Place } from '@/lib/types'
import { PlaceSelectionModal } from '@/components/dashboard/PlaceSelectionModal'

interface GridPointSelection {
    row: number
    col: number
    enabled: boolean
}

const STEPS = [
    { id: 1, name: '장소 선택', icon: MapPin },
    { id: 2, name: '키워드 입력', icon: Tag },
    { id: 3, name: '그리드 설정', icon: Grid3X3 },
    { id: 4, name: '결제 및 확인', icon: Check },
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
    const competitorId = searchParams.get('competitorId')

    const [step, setStep] = useState(1)

    // User Data
    const [userCredits, setUserCredits] = useState<UserCredits | null>(null)

    // Place Data
    const [placeName, setPlaceName] = useState('')
    const [placeAddress, setPlaceAddress] = useState('')
    const [placeLat, setPlaceLat] = useState('')
    const [placeLng, setPlaceLng] = useState('')
    const [selectedPlaceId, setSelectedPlaceId] = useState<string>('')
    const [placeType, setPlaceType] = useState<'place' | 'competitor' | 'new'>('new')

    const [keywords, setKeywords] = useState<string[]>([''])
    const [gridPoints, setGridPoints] = useState<GridPointSelection[]>(DEFAULT_GRID_POINTS)
    const [gridDistance, setGridDistance] = useState(1) // km
    const [distanceUnit, setDistanceUnit] = useState<'km' | 'mile'>('km')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Competitor Mode State
    const [competitors, setCompetitors] = useState<ManagedCompetitor[]>([])
    const [isCompetitorModalOpen, setIsCompetitorModalOpen] = useState(false)
    // Add loading state for competitor mode to hide UI until auto-selected
    const [isLoadingCompetitor, setIsLoadingCompetitor] = useState(mode === 'competitor' && !!competitorId)

    // My Shop Auto-Register State
    const [isLoadingMyShop, setIsLoadingMyShop] = useState(mode === 'my-shop')
    const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false)

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

    // Auto-fill My Shop or Competitor
    useEffect(() => {
        if (mode === 'my-shop') {
            const fetchMyShop = async () => {
                try {
                    const res = await fetch('/api/settings/my-shop?platform=naver')
                    if (res.ok) {
                        const { data } = await res.json()
                        const myShop = data?.[0]

                        if (myShop && myShop.place_id) {
                            if (myShop.lat && myShop.lng) {
                                setPlaceName(myShop.place_name)
                                setPlaceAddress(myShop.address || '')
                                setPlaceLat(String(myShop.lat))
                                setPlaceLng(String(myShop.lng))
                                setSelectedPlaceId(myShop.place_id)
                                setPlaceType('place')
                                setStep(2)
                                setIsLoadingMyShop(false)
                            } else {
                                setPlaceName(myShop.place_name)
                                setIsLoadingMyShop(false)
                            }
                        } else {
                            // No shop found -> Open Register Modal
                            setIsLoadingMyShop(false)
                            setIsPlaceModalOpen(true)
                        }
                    } else {
                        setIsLoadingMyShop(false)
                    }
                } catch (error) {
                    console.error('Failed to fetch My Shop:', error)
                    setIsLoadingMyShop(false)
                }
            }
            fetchMyShop()
        } else {
            // Not in my-shop mode (or switched out of it), ensure loading is false
            setIsLoadingMyShop(false)
        }

        if (mode === 'competitor') {
            const fetchCompetitors = async () => {
                try {
                    const res = await fetch('/api/settings/competitors?platform=naver')
                    if (res.ok) {
                        const { data } = await res.json()
                        const competitorsList = data || []
                        setCompetitors(competitorsList)

                        // Auto-select if competitorId is present
                        if (competitorId) {
                            const target = competitorsList.find((c: ManagedCompetitor) => c.id === competitorId)
                            if (target) {
                                handleCompetitorSelect(target)
                                setStep(2) // Jump to Keyword Input
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch competitors:', error)
                } finally {
                    setIsLoadingCompetitor(false) // Ready to show UI (Step 2)
                }
            }
            fetchCompetitors()
        }
    }, [mode, competitorId])

    const handleCompetitorSelect = (comp: ManagedCompetitor) => {
        setPlaceName(comp.place_name)
        setPlaceAddress(comp.address || '')
        if (comp.lat && comp.lng) {
            setPlaceLat(String(comp.lat))
            setPlaceLng(String(comp.lng))
        }
        setSelectedPlaceId(comp.place_id)
        setPlaceType('place') // In search context, it's just a place to center on
        // setStep(2) // Optional: Auto-advance
    }

    const handleRegisterMyShop = async (place: Place) => {
        try {
            const res = await fetch('/api/settings/my-shop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: 'naver',
                    placeId: place.placeId,
                    placeName: place.name,
                    address: place.address,
                    lat: place.lat,
                    lng: place.lng
                }),
            })

            if (res.ok) {
                // Success: Set state and move to next step
                setPlaceName(place.name)
                setPlaceAddress(place.address || '')
                setPlaceLat(String(place.lat))
                setPlaceLng(String(place.lng))
                setSelectedPlaceId(place.placeId)
                setPlaceType('place')

                setIsPlaceModalOpen(false)
                setStep(2)
            } else {
                const error = await res.json()
                alert(error.error || '가게 등록에 실패했습니다.')
            }
        } catch (error) {
            console.error(error)
            alert('오류가 발생했습니다.')
        }
    }

    const handleAddCompetitor = async (place: Place) => {
        try {
            const res = await fetch('/api/competitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: 'naver',
                    placeId: place.placeId,
                    placeName: place.name,
                    address: place.address,
                    lat: place.lat,
                    lng: place.lng
                }),
            })

            if (res.ok) {
                const listRes = await fetch('/api/settings/competitors?platform=naver')
                const { data } = await listRes.json()
                setCompetitors(data || [])
                setIsCompetitorModalOpen(false)

                const added = data.find((c: ManagedCompetitor) => c.place_id === place.placeId)
                if (added) handleCompetitorSelect(added)
            } else {
                alert('경쟁사 등록 실패')
            }
        } catch (error) {
            console.error(error)
            alert('오류가 발생했습니다.')
        }
    }

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
                return placeName.trim().length > 0 &&
                    placeLat.trim().length > 0 &&
                    placeLng.trim().length > 0
            case 2:
                return keywords.some(k => k.trim().length > 0)
            case 3:
                return enabledGridCount > 0
            case 4:
                return hasSufficientBalance
            default:
                return false
        }
    }

    const handleNext = () => {
        if (canProceed() && step < 4) {
            setStep(step + 1)
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1)
        }
    }

    const handlePlaceSelect = (id: string, type: 'place' | 'competitor', name?: string) => {
        setSelectedPlaceId(id)
        setPlaceType(type)
        if (name) setPlaceName(name)
        // Note: For existing places, we might lack Lat/Lng. 
        // In a real app, we'd fetch details or require a re-search to set grid center.
        // For this UI demo, we'll keep the PlaceSearchInput visible to "confirm" location.
    }

    const handleSubmit = async () => {
        if (!placeName || !placeLat || !placeLng) return

        setIsSubmitting(true)

        try {
            // Convert grid distance to km if needed
            const distanceKm = distanceUnit === 'mile' ? milesToKm(gridDistance) : gridDistance
            const lat = parseFloat(placeLat)
            const lng = parseFloat(placeLng)

            // Convert row/col to actual lat/lng coordinates
            const gridPointsWithCoords = generateGridPointsFromTemplate(
                lat,
                lng,
                gridPoints,
                distanceKm
            ).filter(p => p.enabled)

            // Step 1: Create search record
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
                    // If selected from list, we pass ID to verify 'managed' status
                    // If 'new', backend might perform logic to register or reject depending on policy
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

            // Step 2: Trigger Playwright scraping
            const processResponse = await fetch(`/api/naver/search/${searchId}/process`, {
                method: 'POST',
            })

            if (!processResponse.ok) {
                console.error('Processing failed, but search was created')
            }

            // Step 3: Navigate to results page
            router.push(`/naver-search/${searchId}`)
        } catch (error) {
            console.error('Search submission error:', error)
            alert('검색 중 오류가 발생했습니다. 다시 시도해주세요.')
            setIsSubmitting(false)
        }
    }

    // New Loading & Empty State Rendering
    if (isLoadingMyShop) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                <p className="text-gray-500">사장님의 가게 정보를 불러오고 있습니다...</p>
            </div>
        )
    }

    if (isLoadingCompetitor) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                <p className="text-gray-500">경쟁사 정보를 불러오는 중...</p>
            </div>
        )
    }

    // Modal for My Shop Registration (Pass-through UI)
    // If modal is open, we can show a minimal background or the underlying UI slightly dimmed
    // To properly "hide" Step 1, we return a simplified view when modal is open
    if (isPlaceModalOpen) {
        return (
            <div className="max-w-3xl mx-auto min-h-[400px]">
                <div className="text-center py-20">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">가게 등록이 필요합니다</h2>
                    <p className="text-gray-600 mb-8">안정적인 순위 추적을 위해 사장님의 가게를 먼저 등록해주세요.</p>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-gray-500 hover:text-gray-900"
                    >
                        이전으로 돌아가기
                    </button>
                </div>

                <PlaceSelectionModal
                    isOpen={isPlaceModalOpen}
                    onClose={() => {
                        // User cancelled registration. Redirect back or show empty state?
                        // Let's redirect back to prevent getting stuck in "No Shop" state
                        router.back()
                    }}
                    platform="naver"
                    onConfirm={handleRegisterMyShop}
                />
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
                {/* Step 1: Place Input */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {mode === 'my-shop' ? '내 순위 조회' : (mode === 'competitor' ? '경쟁사 순위 조회' : '비즈니스 선택')}
                            </h2>
                            <p className="mt-2 text-gray-600">
                                관리 중인 가게를 선택하거나 새로운 가게를 검색하세요.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {mode === 'competitor' ? (
                                <div className="space-y-4">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h3 className="font-semibold text-blue-900 mb-2">경쟁사 선택</h3>
                                        <p className="text-sm text-blue-700 mb-4">
                                            등록된 경쟁사 중 분석할 업체를 선택해주세요.
                                        </p>

                                        {competitors.length === 0 ? (
                                            <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
                                                <p className="text-gray-500 mb-3">등록된 경쟁사가 없습니다.</p>
                                                <button
                                                    onClick={() => setIsCompetitorModalOpen(true)}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                                >
                                                    경쟁사 등록하기
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="grid gap-3">
                                                    {competitors.map((comp) => (
                                                        <div
                                                            key={comp.id}
                                                            onClick={() => handleCompetitorSelect(comp)}
                                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPlaceId === comp.place_id
                                                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-gray-900">{comp.place_name}</div>
                                                                    {comp.address && (
                                                                        <div className="text-sm text-gray-500 mt-0.5">{comp.address}</div>
                                                                    )}
                                                                </div>
                                                                {selectedPlaceId === comp.place_id && (
                                                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                                        <Check className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-end pt-2">
                                                    <button
                                                        onClick={() => setIsCompetitorModalOpen(true)}
                                                        className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        새 경쟁사 등록
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <PlaceSelectionModal
                                        isOpen={isCompetitorModalOpen}
                                        onClose={() => setIsCompetitorModalOpen(false)}
                                        platform="naver"
                                        onConfirm={handleAddCompetitor}
                                    />
                                </div>
                            ) : (
                                <PlaceSelector
                                    onSelect={handlePlaceSelect}
                                />
                            )}
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-500">또는 직접 검색</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <NaverPlaceSearchInput
                                onPlaceSelect={(place) => {
                                    setPlaceName(place.name)
                                    setPlaceAddress(place.address || '')
                                    setPlaceLat(place.lat.toString())
                                    setPlaceLng(place.lng.toString())
                                    // Reset selection if manual search is used?
                                    // setIsNew(true)
                                }}
                                selectedPlace={placeName ? { name: placeName, address: placeAddress } : null}
                            />
                            {selectedPlaceId && !placeLat && (
                                <p className="text-sm text-amber-600 mt-2">
                                    * 선택한 가게의 정확한 위치(그리드 중심)를 위해 위에서 한 번 더 검색해주세요.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Keyword Input */}
                {step === 2 && (
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

                {/* Step 3: Grid Configuration */}
                {step === 3 && (
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

                {/* Step 4: Confirmation & Cost */}
                {step === 4 && (
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

                {step < 4 ? (
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
        </div >
    )
}
