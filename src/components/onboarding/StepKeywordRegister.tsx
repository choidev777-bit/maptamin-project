'use client'

import { useState } from 'react'
import { AlertTriangle, Hash } from 'lucide-react'
import { KeywordInput } from '@/components/search/KeywordInput'

interface Props {
    planId: 'starter' | 'pro' | 'premium'
    onComplete: (data: { naverKeywords: string[]; googleKeywords?: string[] }) => void
}

const PLAN_KEYWORD_LIMITS: Record<string, { naver: number; google: number }> = {
    starter: { naver: 2, google: 0 },
    pro: { naver: 5, google: 0 },
    premium: { naver: 5, google: 5 },
}

export default function StepKeywordRegister({ planId, onComplete }: Props) {
    const isPremium = planId === 'premium'
    const limits = PLAN_KEYWORD_LIMITS[planId]

    const [activeTab, setActiveTab] = useState<'naver' | 'google'>('naver')
    const [naverKeywords, setNaverKeywords] = useState<string[]>([''])
    const [googleKeywords, setGoogleKeywords] = useState<string[]>([''])

    const naverFilled = naverKeywords.filter(k => k.trim()).length > 0
    const googleFilled = isPremium ? googleKeywords.filter(k => k.trim()).length > 0 : true
    const canProceed = naverFilled && googleFilled

    const handleNext = () => {
        onComplete({
            naverKeywords: naverKeywords.filter(k => k.trim()),
            googleKeywords: isPremium ? googleKeywords.filter(k => k.trim()) : undefined,
        })
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    <Hash className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                    관리 키워드 등록
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    고객이 내 매장를 찾을 때 검색할 키워드를 등록해주세요.
                </p>
            </div>

            {/* Premium 탭 */}
            {isPremium && (
                <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('naver')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${activeTab === 'naver'
                            ? 'bg-white text-[#03C75A] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-[#03C75A] text-[10px] font-bold text-white">N</span>
                        네이버 키워드 ({naverKeywords.filter(k => k.trim()).length}/{limits.naver})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('google')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${activeTab === 'google'
                            ? 'bg-white text-[#4285F4] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-[#4285F4] text-[10px] font-bold text-white">G</span>
                        구글 키워드 ({googleKeywords.filter(k => k.trim()).length}/{limits.google})
                    </button>
                </div>
            )}

            {/* 키워드 입력 영역 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                {(!isPremium || activeTab === 'naver') && (
                    <div>
                        {!isPremium && (
                            <p className="mb-4 text-sm font-medium text-gray-700">
                                키워드 ({naverKeywords.filter(k => k.trim()).length}/{limits.naver}개)
                            </p>
                        )}
                        <KeywordInput
                            keywords={naverKeywords}
                            onChange={setNaverKeywords}
                            maxKeywords={limits.naver}
                            placeholder='키워드 입력 (예: "강남 카페", "강남역 맛집")'
                        />
                    </div>
                )}

                {isPremium && activeTab === 'google' && (
                    <div>
                        <KeywordInput
                            keywords={googleKeywords}
                            onChange={setGoogleKeywords}
                            maxKeywords={limits.google}
                            placeholder='키워드 입력 (예: "cafe near gangnam", "korean bbq")'
                        />
                    </div>
                )}
            </div>

            {/* 안내 문구 */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                    💡 이 키워드는 <strong>주간 리포트</strong>와 <strong>실시간 진단</strong>에 모두 사용됩니다.
                </p>
            </div>

            {/* 30일 락 경고 */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                    <p className="text-sm font-medium text-amber-800">등록 후 30일간 변경이 불가합니다</p>
                    <p className="mt-1 text-xs text-amber-600">
                        키워드를 신중하게 선택해주세요. 30일 이후 설정 메뉴에서 변경할 수 있습니다.
                    </p>
                </div>
            </div>

            {/* 다음 버튼 */}
            <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className="w-full rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
                다음 단계로 →
            </button>
        </div>
    )
}
