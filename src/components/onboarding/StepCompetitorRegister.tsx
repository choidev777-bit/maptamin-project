'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, Users, X, SkipForward } from 'lucide-react'

const GoogleMapsProvider = dynamic(
    () => import('@/components/maps/GoogleMapsProvider').then(m => m.GoogleMapsProvider),
    { ssr: false }
)

const PlaceSearchInput = dynamic(
    () => import('@/components/search/PlaceSearchInput').then(m => m.PlaceSearchInput),
    { ssr: false }
)

interface Place {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
}

interface Props {
    planId: 'starter' | 'pro' | 'premium'
    onComplete: (data: { competitors: Place[] }) => void
    onSkip: () => void
}

const PLAN_COMPETITOR_LIMITS: Record<string, number> = {
    starter: 0,
    pro: 1,
    premium: 10,
}

export default function StepCompetitorRegister({ planId, onComplete, onSkip }: Props) {
    const isPremium = planId === 'premium'
    const maxCompetitors = PLAN_COMPETITOR_LIMITS[planId]
    const [competitors, setCompetitors] = useState<Place[]>([])

    const handlePlaceSelect = (place: Place) => {
        if (competitors.length < maxCompetitors) {
            // 중복 방지
            if (competitors.some(c => c.placeId === place.placeId)) return
            setCompetitors(prev => [...prev, place])
        }
    }

    const handleRemove = (placeId: string) => {
        setCompetitors(prev => prev.filter(c => c.placeId !== placeId))
    }

    const handleNext = () => {
        onComplete({ competitors })
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    <Users className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                    경쟁사 등록
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    {planId === 'pro'
                        ? '비교 분석할 경쟁 가게 1곳을 등록해주세요.'
                        : `비교 분석할 경쟁 가게를 최대 ${maxCompetitors}곳 등록할 수 있습니다.`}
                </p>
            </div>

            {/* 등록된 경쟁사 목록 */}
            {competitors.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                        등록된 경쟁사 ({competitors.length}/{maxCompetitors})
                    </p>
                    {competitors.map((comp, index) => (
                        <div
                            key={comp.placeId}
                            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                                    {index + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{comp.name}</p>
                                    <p className="text-xs text-gray-500">{comp.address}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(comp.placeId)}
                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 검색 입력 */}
            {competitors.length < maxCompetitors && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="mb-4 text-sm font-medium text-gray-700">
                        경쟁사 검색
                    </h3>
                    <GoogleMapsProvider>
                        <PlaceSearchInput
                            onPlaceSelect={handlePlaceSelect}
                            selectedPlace={null}
                        />
                    </GoogleMapsProvider>
                </div>
            )}

            {/* 30일 락 경고 */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                    <p className="text-sm font-medium text-amber-800">등록 후 30일간 변경이 불가합니다</p>
                    {isPremium && (
                        <p className="mt-1 text-xs text-amber-600">
                            경쟁사를 1개라도 등록하면 30일 타이머가 시작됩니다. 30일 후 전체 슬롯을 일괄 변경할 수 있습니다.
                        </p>
                    )}
                </div>
            </div>

            {/* 버튼 그룹 */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onSkip}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-4 text-sm font-semibold text-gray-600 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md"
                >
                    <SkipForward className="h-4 w-4" />
                    건너뛰기
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={competitors.length === 0}
                    className="flex-1 rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
                >
                    다음 단계로 →
                </button>
            </div>
        </div>
    )
}
