'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, AlertTriangle, Loader2 } from 'lucide-react'

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
    onComplete: (data: { naverPlace: Place; googlePlace?: Place }) => void
}

export default function StepStoreRegister({ planId, onComplete }: Props) {
    const isPremium = planId === 'premium'
    const [naverPlace, setNaverPlace] = useState<Place | null>(null)
    const [googlePlace, setGooglePlace] = useState<Place | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showLockConfirm, setShowLockConfirm] = useState(false)

    const canProceed = isPremium
        ? naverPlace !== null && googlePlace !== null
        : naverPlace !== null

    // DB 즉시 커밋: POST /api/settings/my-shop
    const saveToDb = async () => {
        if (!naverPlace) return
        setSaving(true)
        setError(null)

        try {
            // 네이버 매장 등록
            const naverRes = await fetch('/api/settings/my-shop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: 'naver',
                    placeId: naverPlace.placeId,
                    placeName: naverPlace.name,
                    address: naverPlace.address,
                    lat: naverPlace.lat,
                    lng: naverPlace.lng,
                }),
            })

            if (!naverRes.ok) {
                const err = await naverRes.json()
                throw new Error(err.error || '네이버 매장 등록에 실패했습니다.')
            }

            // Premium: 구글 매장도 등록
            if (isPremium && googlePlace) {
                const googleRes = await fetch('/api/settings/my-shop', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        platform: 'google',
                        placeId: googlePlace.placeId,
                        placeName: googlePlace.name,
                        address: googlePlace.address,
                        lat: googlePlace.lat,
                        lng: googlePlace.lng,
                    }),
                })

                if (!googleRes.ok) {
                    const err = await googleRes.json()
                    throw new Error(err.error || '구글 매장 등록에 실패했습니다.')
                }
            }

            // 성공 → 다음 Step (/api가 30일 락을 자동 적용)
            onComplete({
                naverPlace,
                googlePlace: googlePlace || undefined,
            })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    // 다음 버튼 클릭 → 프리미엄은 바로 저장, 그 외는 30일 락 확인 다이얼로그 표시
    const handleNext = () => {
        if (!canProceed) return
        if (isPremium) {
            // 프리미엄: 락 없이 바로 DB 저장
            saveToDb()
        } else {
            setShowLockConfirm(true)
        }
    }

    // 30일 락 확인 → DB 커밋
    const handleConfirmLock = () => {
        setShowLockConfirm(false)
        saveToDb()
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    <MapPin className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                    내 매장 등록
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    {isPremium
                        ? '네이버 지도와 구글 지도에서 내 매장을 검색하여 등록해주세요.'
                        : '네이버 지도에서 내 매장을 검색하여 등록해주세요.'}
                </p>
            </div>

            {/* 네이버 매장 검색 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#03C75A] text-xs font-bold text-white">N</span>
                    네이버 지도에서 내 매장 검색
                </h3>

                <NaverPlaceSearchInput
                    onPlaceSelect={(place) => setNaverPlace(place as Place)}
                    selectedPlace={naverPlace}
                />
            </div>

            {/* 구글 매장 검색 (Premium만) — 같은 화면에 표시 */}
            {isPremium && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4285F4] text-xs font-bold text-white">G</span>
                        구글 지도에서 내 매장 검색
                    </h3>

                    <GoogleMapsProvider>
                        <PlaceSearchInput
                            onPlaceSelect={(place: Place) => setGooglePlace(place)}
                            selectedPlace={googlePlace}
                        />
                    </GoogleMapsProvider>
                </div>
            )}

            {/* 30일 락 경고 (프리미엄 제외) */}
            {!isPremium && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">등록 후 30일간 변경이 불가합니다</p>
                        <p className="mt-1 text-xs text-amber-600">
                            신중하게 선택해주세요. 30일 이후 설정 메뉴에서 변경할 수 있습니다.
                        </p>
                    </div>
                </div>
            )}

            {/* 에러 메시지 */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* 다음 버튼 */}
            <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || saving}
                className="w-full rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
                {saving ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        등록 중...
                    </span>
                ) : (
                    '다음 단계로 →'
                )}
            </button>

            {/* 30일 락 확인 다이얼로그 */}
            {showLockConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                            <AlertTriangle className="h-6 w-6 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">30일간 변경 불가</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            매장을 등록하면 <strong>30일 동안 변경할 수 없습니다</strong>.
                            등록한 매장 정보가 맞는지 다시 한번 확인해주세요.
                        </p>
                        {naverPlace && (
                            <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                📍 네이버: {naverPlace.name}
                            </div>
                        )}
                        {googlePlace && (
                            <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                📍 구글: {googlePlace.name}
                            </div>
                        )}
                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowLockConfirm(false)}
                                className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmLock}
                                className="flex-1 rounded-xl bg-[#001011] py-3 text-sm font-semibold text-white transition-all hover:bg-[#001011]/90"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
