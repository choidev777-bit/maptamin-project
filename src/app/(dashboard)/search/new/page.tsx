'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider'
import { PlaceSearchInput } from '@/components/search/PlaceSearchInput'
import { KeywordInput } from '@/components/search/KeywordInput'
import { GridConfigurator } from '@/components/search/GridConfigurator'
import { DistanceSettings } from '@/components/search/DistanceSettings'
import { MapPin, Tag, Grid3X3, Check, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

interface Place {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
}

interface GridPointSelection {
    row: number
    col: number
    enabled: boolean
}

const STEPS = [
    { id: 1, name: '장소 선택', icon: MapPin },
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

export default function NewSearchPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [place, setPlace] = useState<Place | null>(null)
    const [keywords, setKeywords] = useState<string[]>([''])
    const [gridPoints, setGridPoints] = useState<GridPointSelection[]>(DEFAULT_GRID_POINTS)
    const [gridDistance, setGridDistance] = useState(1) // km
    const [distanceUnit, setDistanceUnit] = useState<'km' | 'mile'>('km')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handlePlaceSelect = useCallback((p: Place) => {
        setPlace(p)
    }, [])

    const enabledGridCount = useMemo(() => {
        return gridPoints.filter(p => p.enabled).length
    }, [gridPoints])

    const canProceed = () => {
        switch (step) {
            case 1:
                return place !== null
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
        if (!place) return

        setIsSubmitting(true)
        // TODO: Submit to API
        console.log('Submitting:', {
            place,
            keywords: keywords.filter(k => k.trim()),
            gridPoints: gridPoints.filter(p => p.enabled),
            gridDistance,
            distanceUnit
        })

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        setIsSubmitting(false)
        router.push('/dashboard')
    }

    return (
        <GoogleMapsProvider>
            <div className="max-w-3xl mx-auto">
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
                    {/* Step 1: Place Search */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">비즈니스 검색</h2>
                                <p className="mt-2 text-gray-600">
                                    Google 지도에서 순위를 추적할 비즈니스를 검색하세요.
                                </p>
                            </div>

                            <PlaceSearchInput
                                onPlaceSelect={handlePlaceSelect}
                                selectedPlace={place}
                            />
                        </div>
                    )}

                    {/* Step 2: Keywords */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">키워드 입력</h2>
                                <p className="mt-2 text-gray-600">
                                    고객들이 비즈니스를 찾을 때 사용하는 검색어를 입력하세요.
                                </p>
                            </div>

                            <KeywordInput keywords={keywords} onChange={setKeywords} />
                        </div>
                    )}

                    {/* Step 3: Grid Configuration */}
                    {step === 3 && (
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">그리드 설정</h2>
                                <p className="mt-2 text-gray-600">
                                    순위를 측정할 지점과 간격을 설정하세요.
                                </p>
                            </div>

                            <GridConfigurator
                                selectedPoints={gridPoints}
                                onPointsChange={setGridPoints}
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

                    {/* Step 4: Confirmation */}
                    {step === 4 && (
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
                                    <p className="font-semibold text-gray-900">{place?.name}</p>
                                    <p className="text-sm text-gray-600">{place?.address}</p>
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
                                className="flex-1 py-4 px-6 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                다음
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
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
                                        검색 시작
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </GoogleMapsProvider>
    )
}
