'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, Users, X, SkipForward, Loader2 } from 'lucide-react'
import { PLAN_CONFIG } from '@/lib/pricing/config'

const GoogleMapsProvider = dynamic(
    () => import('@/components/maps/GoogleMapsProvider').then(m => m.GoogleMapsProvider),
    { ssr: false }
)

const PlaceSearchInput = dynamic(
    () => import('@/components/search/PlaceSearchInput').then(m => m.PlaceSearchInput),
    { ssr: false }
)

const NaverPlaceSearchInput = dynamic(
    () => import('@/components/search/NaverPlaceSearchInput').then(m => m.NaverPlaceSearchInput),
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
    pro: PLAN_CONFIG.pro.competitorsNaver,
    premium: PLAN_CONFIG.premium.competitorsNaver,
}

export default function StepCompetitorRegister({ planId, onComplete, onSkip }: Props) {
    const isPremium = planId === 'premium'
    const maxCompetitors = PLAN_COMPETITOR_LIMITS[planId]

    // 플랫폼별 경쟁사 분리 관리
    const [naverCompetitors, setNaverCompetitors] = useState<Place[]>([])
    const [googleCompetitors, setGoogleCompetitors] = useState<Place[]>([])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const allCompetitors = [...naverCompetitors, ...googleCompetitors]

    // 네이버 경쟁사 추가
    const handleNaverSelect = (place: Place) => {
        if (maxCompetitors !== -1 && naverCompetitors.length >= maxCompetitors) return
        if (naverCompetitors.some(c => c.placeId === place.placeId)) return
        setNaverCompetitors(prev => [...prev, place])
    }

    // 구글 경쟁사 추가
    const handleGoogleSelect = (place: Place) => {
        if (maxCompetitors !== -1 && googleCompetitors.length >= maxCompetitors) return
        if (googleCompetitors.some(c => c.placeId === place.placeId)) return
        setGoogleCompetitors(prev => [...prev, place])
    }

    const removeNaver = (placeId: string) => {
        setNaverCompetitors(prev => prev.filter(c => c.placeId !== placeId))
    }

    const removeGoogle = (placeId: string) => {
        setGoogleCompetitors(prev => prev.filter(c => c.placeId !== placeId))
    }

    // DB 즉시 커밋: POST /api/settings/competitors (플랫폼별)
    const handleNext = async () => {
        if (allCompetitors.length === 0) return
        setSaving(true)
        setError(null)

        try {
            // 네이버 경쟁사 등록
            for (const comp of naverCompetitors) {
                const res = await fetch('/api/settings/competitors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform: 'naver',
                        placeId: comp.placeId,
                        placeName: comp.name,
                        address: comp.address,
                        lat: comp.lat,
                        lng: comp.lng,
                    }),
                })
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || '네이버 경쟁사 등록에 실패했습니다.')
                }
            }

            // 구글 경쟁사 등록 (프리미엄만)
            for (const comp of googleCompetitors) {
                const res = await fetch('/api/settings/competitors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform: 'google',
                        placeId: comp.placeId,
                        placeName: comp.name,
                        address: comp.address,
                        lat: comp.lat,
                        lng: comp.lng,
                    }),
                })
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || '구글 경쟁사 등록에 실패했습니다.')
                }
            }

            onComplete({ competitors: allCompetitors })
        } catch (err: any) {
            setError('경쟁사 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
        } finally {
            setSaving(false)
        }
    }

    // 경쟁사 목록 렌더링 헬퍼
    const renderCompetitorList = (
        competitors: Place[],
        onRemove: (id: string) => void,
        label: string,
        badgeColor: string,
    ) => {
        if (competitors.length === 0) return (
            <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-8 text-center">
                <p className="text-sm text-gray-500">아직 등록된 경쟁사가 없습니다.</p>
                <p className="mt-1 text-xs text-gray-400">위 검색창에서 경쟁 매장을 검색하여 등록해주세요.</p>
            </div>
        )
        return (
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700">
                    {label} ({competitors.length}/{maxCompetitors})
                </p>
                {competitors.map((comp, index) => (
                    <div
                        key={comp.placeId}
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-gray-300"
                    >
                        <div className="flex items-center gap-3">
                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${badgeColor}`}>
                                {index + 1}
                            </span>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{comp.name}</p>
                                <p className="text-xs text-gray-500">{comp.address}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => onRemove(comp.placeId)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title="삭제"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        )
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
                        ? '비교 분석할 경쟁 매장 1곳을 등록해주세요.'
                        : `네이버와 구글 각각 최대 ${maxCompetitors}곳의 경쟁 매장을 등록할 수 있습니다.`}
                </p>
            </div>

            {/* ═══ 네이버 경쟁사 섹션 ═══ */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#03C75A] text-xs font-bold text-white">N</span>
                    네이버 경쟁사 등록
                </h3>

                {/* 입력 제어부 최상단 배치 */}
                {naverCompetitors.length < maxCompetitors ? (
                    <div className="relative z-20">
                        <NaverPlaceSearchInput
                            onPlaceSelect={(place) => handleNaverSelect(place as Place)}
                            selectedPlace={null}
                        />
                    </div>
                ) : (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 text-center">
                        네이버 경쟁사 등록 한도({maxCompetitors}개)에 도달했습니다.
                    </div>
                )}

                {/* 결과 목록 리스트 하단 배치 */}
                {renderCompetitorList(naverCompetitors, removeNaver, '선택된 네이버 경쟁사', 'bg-green-100 text-green-600')}
            </div>

            {/* ═══ 구글 경쟁사 섹션 (프리미엄만) ═══ */}
            {isPremium && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4285F4] text-xs font-bold text-white">G</span>
                        구글 경쟁사 등록
                    </h3>

                    {/* 입력 제어부 최상단 배치 */}
                    {googleCompetitors.length < maxCompetitors ? (
                        <div className="relative z-10">
                            <GoogleMapsProvider>
                                <PlaceSearchInput
                                    onPlaceSelect={handleGoogleSelect}
                                    selectedPlace={null}
                                />
                            </GoogleMapsProvider>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 text-center">
                            구글 경쟁사 등록 한도({maxCompetitors}개)에 도달했습니다.
                        </div>
                    )}

                    {/* 결과 목록 리스트 하단 배치 */}
                    {renderCompetitorList(googleCompetitors, removeGoogle, '선택된 구글 경쟁사', 'bg-blue-100 text-blue-600')}
                </div>
            )}

            {/* 안내 문구 */}
            <div className="rounded-xl border border-[#00C896]/20 bg-[#E5F9F4] p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                    등록하신 경쟁사는 언제든지 자유롭게 변경할 수 있습니다.
                </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* 버튼 그룹 */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onSkip}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-4 text-sm font-semibold text-gray-600 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md disabled:opacity-50"
                >
                    <SkipForward className="h-4 w-4" />
                    건너뛰기
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    disabled={allCompetitors.length === 0 || saving}
                    className="flex-1 rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
                >
                    {saving ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            저장 중...
                        </span>
                    ) : (
                        '다음 단계로 →'
                    )}
                </button>
            </div>
        </div>
    )
}
