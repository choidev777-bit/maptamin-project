'use client'

import { useState } from 'react'
import { AlertTriangle, Hash, Loader2, MapPin } from 'lucide-react'
import { KeywordInput } from '@/components/search/KeywordInput'
import { createClient } from '@/lib/supabase/client'
import { PLAN_CONFIG } from '@/lib/pricing/config'

interface Props {
    planId: 'starter' | 'pro' | 'premium'
    onComplete: (data: { naverKeywords: string[]; googleKeywords?: string[]; localNaverKeywords?: string[] }) => void
}

const PLAN_KEYWORD_LIMITS: Record<string, { naver: number; google: number }> = {
    starter: { naver: 2, google: 0 },
    pro: { naver: 5, google: 0 },
    premium: { naver: 5, google: 5 },
}

export default function StepKeywordRegister({ planId, onComplete }: Props) {
    const isPremium = planId === 'premium'
    const limits = PLAN_KEYWORD_LIMITS[planId]
    const maxLocalKeywords = PLAN_CONFIG[planId]?.localKeywordsNaver ?? 0

    const [activeTab, setActiveTab] = useState<'naver' | 'google'>('naver')
    const [naverKeywords, setNaverKeywords] = useState<string[]>([''])
    const [googleKeywords, setGoogleKeywords] = useState<string[]>([''])
    const [localNaverKeywords, setLocalNaverKeywords] = useState<string[]>([''])
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ⚠️ canProceed 조건 절대 수정 금지 — 지역명 키워드는 선택사항
    const naverFilled = naverKeywords.filter(k => k.trim()).length > 0
    const googleFilled = isPremium ? googleKeywords.filter(k => k.trim()).length > 0 : true
    const canProceed = naverFilled && googleFilled

    // DB 즉시 커밋: Supabase Client 직접 INSERT
    const handleNext = async () => {
        if (!canProceed) return
        setSaving(true)
        setError(null)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('인증 정보를 확인할 수 없습니다.')

            const filteredNaver = naverKeywords.filter(k => k.trim())
            const filteredGoogle = isPremium ? googleKeywords.filter(k => k.trim()) : []
            const filteredLocalNaver = localNaverKeywords.filter(k => k.trim())

            // 네이버 업종 키워드 INSERT
            const naverInserts = filteredNaver.map(keyword => ({
                user_id: user.id,
                platform: 'naver' as const,
                keyword: keyword.trim(),
                keyword_type: 'industry' as const,
            }))

            // 구글 업종 키워드 INSERT (Premium)
            const googleInserts = filteredGoogle.map(keyword => ({
                user_id: user.id,
                platform: 'google' as const,
                keyword: keyword.trim(),
                keyword_type: 'industry' as const,
            }))

            // 네이버 지역명 키워드 INSERT
            const localNaverInserts = filteredLocalNaver.map(keyword => ({
                user_id: user.id,
                platform: 'naver' as const,
                keyword: keyword.trim(),
                keyword_type: 'local' as const,
            }))

            const allInserts = [...naverInserts, ...googleInserts, ...localNaverInserts]

            const { error: insertError } = await supabase
                .from('managed_keywords')
                .insert(allInserts)

            if (insertError) throw new Error(insertError.message)

            onComplete({
                naverKeywords: filteredNaver,
                googleKeywords: isPremium ? filteredGoogle : undefined,
                localNaverKeywords: filteredLocalNaver.length > 0 ? filteredLocalNaver : undefined,
            })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
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
                                업종 키워드 ({naverKeywords.filter(k => k.trim()).length}/{limits.naver}개)
                            </p>
                        )}
                        <KeywordInput
                            keywords={naverKeywords}
                            onChange={setNaverKeywords}
                            maxKeywords={limits.naver}
                            platform="naver"
                        />
                    </div>
                )}

                {isPremium && activeTab === 'google' && (
                    <div>
                        <KeywordInput
                            keywords={googleKeywords}
                            onChange={setGoogleKeywords}
                            maxKeywords={limits.google}
                            platform="google"
                        />
                    </div>
                )}
            </div>

            {/* ── 지역명 키워드 섹션 (네이버 탭일 때만) ── */}
            {(!isPremium || activeTab === 'naver') && maxLocalKeywords > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-amber-600" />
                            지역명 키워드
                            <span className="ml-1 text-xs font-normal text-gray-500">(선택)</span>
                        </h3>
                        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">
                            위치에 관계없이 동일한 순위로 추적됩니다.
                        </p>
                    </div>

                    <KeywordInput
                        keywords={localNaverKeywords}
                        onChange={setLocalNaverKeywords}
                        maxKeywords={maxLocalKeywords}
                        placeholder="예: 홍대 카페, 강남역 미용실"
                        platform="naver"
                    />

                    <div className="mt-4 rounded-lg bg-white border border-amber-100 p-3">
                        <p className="text-xs text-gray-600 leading-relaxed">
                            <span className="font-semibold text-amber-700">💡 지역명 키워드란?</span><br />
                            지역명이 포함된 키워드(예: 홍대 카페)는 검색 위치와 관계없이 동일한 순위입니다.
                            업종 키워드의 좌표별 순위를 개선하면 지역명 키워드 순위에도 영향을 줄 수 있으므로,
                            함께 추적하면 효과를 확인할 수 있습니다.
                        </p>
                    </div>
                </div>
            )}

            {/* 안내 문구 */}
            <div className="rounded-xl border border-[#00C896]/20 bg-[#E5F9F4] p-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                    이 키워드는 <strong>자동 리포트</strong>와 <strong>실시간 진단</strong>에 모두 사용됩니다.<br />
                    등록하신 키워드는 언제든지 자유롭게 변경할 수 있습니다.
                </p>
            </div>

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
                        저장 중...
                    </span>
                ) : (
                    '다음 단계로 →'
                )}
            </button>
        </div>
    )
}
