'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { NaverPlaceSearchInput } from '@/components/search/NaverPlaceSearchInput'
import { generateGridPointsFromTemplate } from '@/lib/utils/grid-calculator'
import { Place } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
    Search as SearchIcon,
    Tag,
    Grid3X3,
    Check,
    ArrowLeft,
    ArrowRight,
    Loader2,
    Store,
    Sparkles,
    MapPin,
    X,
    Plus,
} from 'lucide-react'

/**
 * bundle-dynamic-imports: 네이버 지도 컴포넌트를 dynamic import로 로드
 * — 지도 SDK는 무거우므로 초기 번들에서 제외 (SSR도 불가)
 */
const NaverMapGridConfigurator = dynamic(
    () => import('@/components/naver/NaverMapGridConfigurator').then(m => m.NaverMapGridConfigurator),
    { ssr: false, loading: () => <div className="h-[400px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div> }
)

// ── Types ──
interface GridPointSelection {
    row: number
    col: number
    enabled: boolean
}

// ── Constants ──
const STEPS = [
    { id: 1, name: '매장 검색', icon: Store },
    { id: 2, name: '키워드 입력', icon: Tag },
    { id: 3, name: '좌표 설정', icon: Grid3X3 },
    { id: 4, name: '분석 시작', icon: SearchIcon },
]

const DEFAULT_GRID_POINTS: GridPointSelection[] = [
    { row: -1, col: -1, enabled: true }, { row: -1, col: 0, enabled: true }, { row: -1, col: 1, enabled: true },
    { row: 0, col: -1, enabled: true }, { row: 0, col: 0, enabled: true }, { row: 0, col: 1, enabled: true },
    { row: 1, col: -1, enabled: true }, { row: 1, col: 0, enabled: true }, { row: 1, col: 1, enabled: true },
]

const GRID_TEMPLATES: Record<number, GridPointSelection[]> = {
    3: DEFAULT_GRID_POINTS,
    5: Array.from({ length: 25 }, (_, i) => ({
        row: Math.floor(i / 5) - 2,
        col: (i % 5) - 2,
        enabled: true,
    })),
}

const DISTANCE_PRESETS = [
    { value: 0.1, label: '100m' },
    { value: 0.2, label: '200m' },
    { value: 0.3, label: '300m' },
    { value: 0.5, label: '500m' },
    { value: 1, label: '1km' },
]

export default function FreeTrialPage() {
    const router = useRouter()

    // ── Access Control State ──
    const [accessLoading, setAccessLoading] = useState(true)
    const [accessDenied, setAccessDenied] = useState<string | null>(null)

    // ── Wizard State ──
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Step 1: 매장 검색
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)

    // Step 2: 키워드 입력 (draft: 입력 중, confirmed: 등록된 값)
    const [localKeyword, setLocalKeyword] = useState('')
    const [localKeywordDraft, setLocalKeywordDraft] = useState('')
    const [industryKeyword, setIndustryKeyword] = useState('')
    const [industryKeywordDraft, setIndustryKeywordDraft] = useState('')

    // Step 3: 좌표 설정
    const [gridPoints, setGridPoints] = useState<GridPointSelection[]>(DEFAULT_GRID_POINTS)
    const [selectedGridSize, setSelectedGridSize] = useState(3)
    const [gridDistance, setGridDistance] = useState(0.3) // km

    // Step 4: 전화번호
    const [phone, setPhone] = useState('')

    // ── Access Control: 구독 상태 + free_trial_used 확인 ──
    useEffect(() => {
        const checkAccess = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login?redirectTo=/free-trial')
                return
            }

            const { data: sub } = await supabase
                .from('user_subscriptions')
                .select('plan_id, free_trial_used')
                .eq('user_id', user.id)
                .single()

            if (!sub) {
                setAccessDenied('구독 정보를 찾을 수 없습니다.')
                setAccessLoading(false)
                return
            }

            // 유료 구독자 → 대시보드로 이동
            if (sub.plan_id !== 'free') {
                setAccessDenied('ALREADY_SUBSCRIBED')
                setAccessLoading(false)
                return
            }

            // 이미 사용한 유저
            if (sub.free_trial_used) {
                setAccessDenied('ALREADY_USED')
                setAccessLoading(false)
                return
            }

            setAccessLoading(false)
        }
        checkAccess()
    }, [router])

    // ── Grid Size Change ──
    const handleGridSizeChange = useCallback((size: number) => {
        if (size !== 3 && size !== 5) return
        setSelectedGridSize(size)
        setGridPoints(GRID_TEMPLATES[size] || DEFAULT_GRID_POINTS)
    }, [])

    // ── Step Helpers ──
    const enabledGridCount = useMemo(() => {
        return gridPoints.filter(p => p.enabled).length
    }, [gridPoints])

    const canProceed = useCallback(() => {
        switch (step) {
            case 1: return !!selectedPlace
            case 2: return localKeyword.trim().length > 0 && industryKeyword.trim().length > 0
            case 3: return enabledGridCount > 0
            case 4: return /^01[016789]\d{7,8}$/.test(phone.replace(/[^0-9]/g, ''))
            default: return false
        }
    }, [step, selectedPlace, localKeyword, industryKeyword, enabledGridCount, phone])

    const handleNext = useCallback(() => {
        if (canProceed() && step < 4) setStep(s => s + 1)
    }, [canProceed, step])

    const handleBack = useCallback(() => {
        if (step > 1) setStep(s => s - 1)
    }, [step])

    // ── Submit ──
    const handleSubmit = async () => {
        if (!selectedPlace || !canProceed()) return

        setIsSubmitting(true)
        try {
            const lat = selectedPlace.lat
            const lng = selectedPlace.lng

            const gridPointsWithCoords = generateGridPointsFromTemplate(
                lat, lng, gridPoints, gridDistance
            ).filter(p => p.enabled)

            const res = await fetch('/api/free-trial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    placeName: selectedPlace.name,
                    placeAddress: selectedPlace.address,
                    placeLat: lat,
                    placeLng: lng,
                    keyword: industryKeyword.trim(),
                    localKeyword: localKeyword.trim(),
                    gridPoints: gridPointsWithCoords,
                    distance: gridDistance,
                    distanceUnit: 'km',
                    phone: phone.replace(/[^0-9]/g, ''),
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                if (error.error === 'ALREADY_SUBSCRIBED') {
                    alert('이미 구독 중이시네요! 대시보드로 이동합니다.')
                    router.push('/dashboard')
                } else if (error.error === 'FREE_TRIAL_ALREADY_USED') {
                    alert('이미 무료 체험을 사용하셨습니다.')
                    router.push('/dashboard')
                } else {
                    alert(error.message || '분석 시작에 실패했습니다. 다시 시도해주세요.')
                }
                setIsSubmitting(false)
                return
            }

            const { searchId } = await res.json()
            router.push(`/naver-search/${searchId}`)
        } catch (error) {
            console.error('Free trial submission error:', error)
            alert('오류가 발생했습니다. 다시 시도해주세요.')
            setIsSubmitting(false)
        }
    }

    // ── Access Denied Views ──
    if (accessLoading) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                <p className="text-gray-500">확인 중...</p>
            </div>
        )
    }

    if (accessDenied === 'ALREADY_SUBSCRIBED') {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
                    <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">이미 구독 중이시네요!</h2>
                <p className="text-gray-500 mb-6">대시보드에서 바로 분석을 시작하세요.</p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-2.5 bg-[#00C896] text-white rounded-xl font-semibold hover:bg-[#00B386] transition-all"
                >
                    대시보드로 이동 →
                </button>
            </div>
        )
    }

    if (accessDenied === 'ALREADY_USED') {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
                    <Sparkles className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">이미 무료 체험을 사용하셨습니다</h2>
                <p className="text-gray-500 mb-6">구독하시면 매일 분석 결과를 받아보실 수 있어요!</p>
                <button
                    onClick={() => router.push('/dashboard/subscription')}
                    className="px-6 py-2.5 bg-[#00C896] text-white rounded-xl font-semibold hover:bg-[#00B386] transition-all"
                >
                    구독 플랜 보기 →
                </button>
            </div>
        )
    }

    if (accessDenied) {
        return (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-gray-500">{accessDenied}</p>
            </div>
        )
    }

    // ── Main Wizard UI ──
    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">맵타민 무료체험</h1>
                <p className="text-gray-500 mt-1">1분만에 사장님 매장을 진단하세요! 결과는 카카오톡으로 발송됩니다.</p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-1 mb-8" role="navigation" aria-label="진행 단계">
                {STEPS.map((s, i) => {
                    const isActive = step === s.id
                    const isCompleted = step > s.id
                    return (
                        <div key={s.id} className="flex items-center gap-1 flex-1">
                            <div className={`
                                flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full transition-all
                                ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    isCompleted ? 'bg-emerald-100 text-emerald-800' :
                                        'bg-gray-50 text-gray-400'}
                            `}>
                                <s.icon className="w-4 h-4 flex-shrink-0" />
                                <span className="hidden sm:inline truncate">{s.name}</span>
                            </div>
                            {i < STEPS.length - 1 && (
                                <ArrowRight className={`w-3 h-3 flex-shrink-0 ${isCompleted ? 'text-emerald-400' : 'text-gray-300'}`} />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Step Content */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
                {/* Step 1: 매장 검색 */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                <Store className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                                매장을 검색해주세요
                            </h2>
                            <p className="mt-2 text-gray-600">
                                네이버 플레이스에 등록된 매장의 이름이나 주소를 검색하세요.
                            </p>
                        </div>

                        <NaverPlaceSearchInput
                            onPlaceSelect={(place: Place) => setSelectedPlace(place)}
                            selectedPlace={null}
                        />

                        {selectedPlace && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                                <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-emerald-900">{selectedPlace.name}</p>
                                    <p className="text-sm text-emerald-700">{selectedPlace.address}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: 키워드 입력 */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                <Tag className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                                키워드를 입력해주세요
                            </h2>
                            <p className="mt-2 text-gray-600">
                                순위를 분석할 지역명 키워드와 업종 키워드를 각 1개씩 등록하세요.
                            </p>
                        </div>

                        <div className="space-y-5">
                            {/* 지역명 키워드 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    지역명 키워드
                                    <span className="ml-1 text-gray-400 font-normal text-xs">1개</span>
                                </label>
                                <p className="text-xs text-gray-400 mb-2">예: 이태원역 브런치, 건대 필라테스, 강남역 분위기 좋은 카페 등</p>

                                {/* 등록된 태그 */}
                                {localKeyword ? (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <Tag className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                            <span className="text-sm font-medium text-emerald-800">{localKeyword}</span>
                                            <button
                                                type="button"
                                                onClick={() => { setLocalKeyword(''); setLocalKeywordDraft(''); }}
                                                className="ml-1 text-emerald-500 hover:text-emerald-700 transition-colors"
                                                aria-label="삭제"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={localKeywordDraft}
                                            onChange={(e) => setLocalKeywordDraft(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && localKeywordDraft.trim()) {
                                                    e.preventDefault()
                                                    setLocalKeyword(localKeywordDraft.trim())
                                                    setLocalKeywordDraft('')
                                                }
                                            }}
                                            placeholder="지역명 키워드를 입력하세요"
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            maxLength={30}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (localKeywordDraft.trim()) {
                                                    setLocalKeyword(localKeywordDraft.trim())
                                                    setLocalKeywordDraft('')
                                                }
                                            }}
                                            disabled={!localKeywordDraft.trim()}
                                            className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-4 h-4" />
                                            추가
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 업종 키워드 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    업종 키워드
                                    <span className="ml-1 text-gray-400 font-normal text-xs">1개</span>
                                </label>
                                <p className="text-xs text-gray-400 mb-2">예: 브런치, 필라테스, 분위기 좋은 카페 등</p>

                                {/* 등록된 태그 */}
                                {industryKeyword ? (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <Tag className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                            <span className="text-sm font-medium text-emerald-800">{industryKeyword}</span>
                                            <button
                                                type="button"
                                                onClick={() => { setIndustryKeyword(''); setIndustryKeywordDraft(''); }}
                                                className="ml-1 text-emerald-500 hover:text-emerald-700 transition-colors"
                                                aria-label="삭제"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={industryKeywordDraft}
                                            onChange={(e) => setIndustryKeywordDraft(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && industryKeywordDraft.trim()) {
                                                    e.preventDefault()
                                                    setIndustryKeyword(industryKeywordDraft.trim())
                                                    setIndustryKeywordDraft('')
                                                }
                                            }}
                                            placeholder="업종 키워드를 입력하세요"
                                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            maxLength={30}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (industryKeywordDraft.trim()) {
                                                    setIndustryKeyword(industryKeywordDraft.trim())
                                                    setIndustryKeywordDraft('')
                                                }
                                            }}
                                            disabled={!industryKeywordDraft.trim()}
                                            className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-4 h-4" />
                                            추가
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: 좌표 설정 */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                <Grid3X3 className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                                좌표를 설정하세요
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

                                <div className="grid grid-cols-5 gap-1.5">
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

                        {/* 네이버 지도 */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <NaverMapGridConfigurator
                                centerLat={selectedPlace?.lat || 37.5665}
                                centerLng={selectedPlace?.lng || 126.9780}
                                selectedPoints={gridPoints}
                                onPointsChange={setGridPoints}
                                gridDistance={gridDistance}
                                maxPoints={selectedGridSize * selectedGridSize}
                                allowedGridSizes={[3, 5]}
                                onGridSizeChange={handleGridSizeChange}
                                onReset={() => {
                                    setGridDistance(0.3)
                                    setGridPoints(GRID_TEMPLATES[selectedGridSize] || DEFAULT_GRID_POINTS)
                                }}
                            />
                        </div>

                    </div>
                )}

                {/* Step 4: 전화번호 입력 + 최종 확인 */}
                {step === 4 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                <SearchIcon className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                                전화번호를 입력하세요
                            </h2>
                            <p className="mt-2 text-gray-600">
                                분석 결과를 카카오톡으로 보내드립니다.
                            </p>
                        </div>

                        {/* 전화번호 입력 */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                전화번호
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    // 숫자만 허용, 최대 11자리
                                    const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 11)
                                    setPhone(cleaned)
                                }}
                                placeholder="01012345678"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg tracking-wider"
                                maxLength={13}
                            />
                            <p className="mt-2 text-xs text-gray-400">'-' 없이 숫자만 입력해주세요</p>
                        </div>

                        {/* 분석 요약 */}
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">매장</span>
                                    <span className="font-medium text-gray-900">{selectedPlace?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">지역명 키워드</span>
                                    <span className="font-medium text-gray-900">{localKeyword}</span>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <span className="text-gray-600 flex-shrink-0">업종 키워드</span>
                                    <span className="font-medium text-gray-900 text-right break-all">{industryKeyword}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">분석 좌표</span>
                                    <span className="font-medium text-gray-900">{enabledGridCount}개</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">좌표 간격</span>
                                    <span className="font-medium text-gray-900">{gridDistance >= 1 ? `${gridDistance}km` : `${gridDistance * 1000}m`}</span>
                                </div>
                            </div>
                            <div className="bg-emerald-50 p-5 border-t border-emerald-100">
                                <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium">
                                    <Sparkles className="w-4 h-4" />
                                    무료 체험
                                </div>
                            </div>
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

                    {step < 4 ? (
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
                            disabled={isSubmitting || !canProceed()}
                            className="flex-1 py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    분석 시작 중...
                                </>
                            ) : (
                                <>
                                    <SearchIcon className="w-5 h-5" />
                                    무료 분석 시작하기
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
