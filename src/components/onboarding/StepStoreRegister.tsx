'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, AlertTriangle, Phone } from 'lucide-react'

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
    onComplete: (data: { naverPlace: Place; googlePlace?: Place; phone: string }) => void
}

export default function StepStoreRegister({ planId, onComplete }: Props) {
    const isPremium = planId === 'premium'
    const [subStep, setSubStep] = useState<'naver' | 'google'>('naver')
    const [naverPlace, setNaverPlace] = useState<Place | null>(null)
    const [googlePlace, setGooglePlace] = useState<Place | null>(null)
    const [phone, setPhone] = useState('')

    const isPhoneValid = /^01[016789]\d{7,8}$/.test(phone)
    const canProceed = isPremium
        ? naverPlace !== null && googlePlace !== null && isPhoneValid
        : naverPlace !== null && isPhoneValid

    const handleNext = () => {
        if (isPremium && subStep === 'naver' && naverPlace) {
            setSubStep('google')
            return
        }
        if (naverPlace && isPhoneValid) {
            onComplete({
                naverPlace,
                googlePlace: googlePlace || undefined,
                phone,
            })
        }
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
                        ? '네이버 지도와 구글 지도에서 내 매장를 검색하여 등록해주세요.'
                        : '네이버 지도에서 내 매장를 검색하여 등록해주세요.'}
                </p>
            </div>

            {/* Premium 서브 스텝 인디케이터 */}
            {isPremium && (
                <div className="flex items-center gap-3">
                    <div
                        className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${subStep === 'naver'
                            ? 'bg-[#03C75A]/10 text-[#03C75A]'
                            : naverPlace
                                ? 'bg-green-50 text-green-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                    >
                        {naverPlace && subStep === 'google' ? '✓' : '1'}
                        <span>네이버</span>
                    </div>
                    <div className="h-px w-6 bg-gray-300" />
                    <div
                        className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${subStep === 'google'
                            ? 'bg-[#4285F4]/10 text-[#4285F4]'
                            : 'bg-gray-100 text-gray-400'
                            }`}
                    >
                        2<span>구글</span>
                    </div>
                </div>
            )}

            {/* 플랫폼 레이블 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
                    {subStep === 'naver' ? (
                        <>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#03C75A] text-xs font-bold text-white">N</span>
                            네이버 지도에서 내 매장 검색
                        </>
                    ) : (
                        <>
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4285F4] text-xs font-bold text-white">G</span>
                            구글 지도에서 내 매장 검색
                        </>
                    )}
                </h3>

                <GoogleMapsProvider>
                    <PlaceSearchInput
                        onPlaceSelect={(place: Place) => {
                            if (subStep === 'naver') {
                                setNaverPlace(place)
                            } else {
                                setGooglePlace(place)
                            }
                        }}
                        selectedPlace={subStep === 'naver' ? naverPlace : googlePlace}
                    />
                </GoogleMapsProvider>
            </div>

            {/* 전화번호 입력 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
                    <Phone className="h-5 w-5 text-[#00C896]" />
                    알림톡 수신 전화번호
                </h3>
                <p className="mb-3 text-xs text-gray-500">
                    리포트 결과를 카카오 알림톡으로 받을 전화번호를 입력해주세요.
                </p>
                <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="01012345678"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-[#00C896] focus:outline-none focus:ring-2 focus:ring-[#00C896]/20"
                />
                {phone.length > 0 && !isPhoneValid && (
                    <p className="mt-2 text-xs text-red-500">올바른 전화번호 형식이 아닙니다 (예: 01012345678)</p>
                )}
            </div>

            {/* 30일 락 경고 */}
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

            {/* 다음 버튼 */}
            <button
                type="button"
                onClick={handleNext}
                disabled={subStep === 'naver' ? !naverPlace : !googlePlace}
                className="w-full rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
                {isPremium && subStep === 'naver'
                    ? '다음: 구글 매장 등록 →'
                    : '다음 단계로 →'}
            </button>
        </div>
    )
}
