'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { KeywordInput } from '@/components/search/KeywordInput'
import { NaverMapGridConfigurator } from '@/components/naver/NaverMapGridConfigurator'
import { DistanceSettings } from '@/components/search/DistanceSettings'
import { NaverPlaceSearchInput } from '@/components/search/NaverPlaceSearchInput'
import { generateGridPointsFromTemplate, milesToKm } from '@/lib/utils/grid-calculator'
import { MapPin, Tag, Grid3X3, Check, ArrowLeft, ArrowRight, Loader2, AlertTriangle } from 'lucide-react'

interface GridPointSelection {
    row: number
    col: number
    enabled: boolean
}

const STEPS = [
    { id: 1, name: '장소 입력', icon: MapPin },
    { id: 2, name: '키워드 입력', icon: Tag },
    { id: 3, name: '그리드 설정', icon: Grid3X3 },
    { id: 4, name: '확인', icon: Check },
]

// Default 3x3 grid preset
const DEFAULT_GRID_POINTS: GridPointSelection[] = [
    { row: -1, col: -1, enabled: true }, { row: -1, col: 0, enabled: true }, { row: -1, col: 1, enabled: true },
    { row: 0, col: -1, enabled: true }, { row: 0, col: 0, enabled: true }, { row: 0, col: 1, enabled: true },
    { row: 1, col: -1, enabled: true }, { row: 1, col: 0, enabled: true }, { row: 1, col: 1, enabled: true },
]

export default function NewNaverSearchPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)

    // 네이버용 장소 입력 (수동)
    const [placeName, setPlaceName] = useState('')
    const [placeAddress, setPlaceAddress] = useState('')
    const [placeLat, setPlaceLat] = useState('')
    const [placeLng, setPlaceLng] = useState('')

    const [keywords, setKeywords] = useState<string[]>([''])
    const [gridPoints, setGridPoints] = useState<GridPointSelection[]>(DEFAULT_GRID_POINTS)
    const [gridDistance, setGridDistance] = useState(1) // km
    const [distanceUnit, setDistanceUnit] = useState<'km' | 'mile'>('km')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const enabledGridCount = useMemo(() => {
        return gridPoints.filter(p => p.enabled).length
    }, [gridPoints])

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
                return true
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
                }),
            })

            if (!createResponse.ok) {
                const error = await createResponse.json()
                if (createResponse.status === 429) {
                    alert('네이버 일일 검색 한도에 도달했습니다. 내일 다시 시도해주세요.')
                } else {
                    alert(error.error || '검색 생성에 실패했습니다.')
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
                {/* Step 1: Place Input (Automated via Naver Open API) */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">비즈니스 검색</h2>
                            <p className="mt-2 text-gray-600">
                                네이버 지도에서 순위를 추적할 비즈니스를 검색하세요.
                            </p>
                        </div>

                        <div className="flex flex-col items-center py-4">
                            <NaverPlaceSearchInput
                                onPlaceSelect={(place) => {
                                    setPlaceName(place.title)
                                    setPlaceAddress(place.address)
                                    setPlaceLat(place.lat.toString())
                                    setPlaceLng(place.lng.toString())
                                }}
                                selectedPlace={placeName ? { name: placeName, address: placeAddress } : null}
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Keyword Input */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">검색 키워드 입력</h2>
                            <p className="mt-2 text-gray-600">
                                네이버 지도에서 검색할 키워드를 입력하세요. (최대 3개)
                            </p>
                            <p className="mt-1 text-sm text-amber-600">
                                ⚠️ &quot;근처 맛집&quot;처럼 위치 기반 키워드를 사용하세요.
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
                                검색 포인트와 간격을 설정하세요. 각 포인트에서 별도로 순위를 확인합니다.
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

                        <p className="text-center text-sm text-gray-500">
                            선택된 포인트: <span className="font-medium text-emerald-600">{enabledGridCount}</span>개
                        </p>
                    </div>
                )}

                {/* Step 4: Confirmation */}
                {step === 4 && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">검색 확인</h2>
                            <p className="mt-2 text-gray-600">
                                아래 정보로 네이버 지도 순위 검색을 시작합니다.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <span className="text-gray-600">비즈니스</span>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900">{placeName}</p>
                                    {placeAddress && (
                                        <p className="text-sm text-gray-500">{placeAddress}</p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                        ({placeLat}, {placeLng})
                                    </p>
                                </div>
                            </div>
                            <div className="border-t border-gray-200" />
                            <div className="flex justify-between">
                                <span className="text-gray-600">키워드</span>
                                <span className="font-medium text-gray-900">
                                    {keywords.filter(k => k.trim()).join(', ')}
                                </span>
                            </div>
                            <div className="border-t border-gray-200" />
                            <div className="flex justify-between">
                                <span className="text-gray-600">검색 포인트</span>
                                <span className="font-medium text-gray-900">{enabledGridCount}개</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">포인트 간격</span>
                                <span className="font-medium text-gray-900">
                                    {gridDistance} {distanceUnit}
                                </span>
                            </div>
                            <div className="border-t border-gray-200" />
                            <div className="flex justify-between">
                                <span className="text-gray-600">예상 소요 시간</span>
                                <span className="font-medium text-amber-600">
                                    약 {Math.ceil(enabledGridCount * keywords.filter(k => k.trim()).length * 3 / 60)}분
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-lg">
                            <p className="text-sm text-amber-800">
                                ⚠️ 네이버 검색은 구글보다 더 많은 시간이 소요됩니다.
                                잠시 기다려 주세요.
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
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                스크래핑 시작 중...
                            </>
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                검색 시작
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
