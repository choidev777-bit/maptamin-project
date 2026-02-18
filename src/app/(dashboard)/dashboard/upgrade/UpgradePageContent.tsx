'use client'

import { useState } from 'react'
import { Check, X, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getPlanDisplayName } from '@/lib/utils/subscription'

/* ---- 가격 카드 데이터 ---- */

interface PlanFeature {
    text: string
    included: boolean
}

interface PlanCard {
    id: string
    name: string
    tagline: string
    monthly: string
    yearly: string
    yearlyTotal: string
    featured: boolean
    badge?: string
    features: PlanFeature[]
    cta: string
    ctaStyle: 'solid' | 'ghost'
}

const PLANS: PlanCard[] = [
    {
        id: 'starter',
        name: '스타터',
        tagline: '1인 매장 사장님용',
        monthly: '9,900원',
        yearly: '9,075원',
        yearlyTotal: '연 108,900원 결제',
        featured: false,
        features: [
            { text: '네이버 지도 진단', included: true },
            { text: '3×3 (9개 좌표) 분석', included: true },
            { text: '관리 키워드 2개', included: true },
            { text: '주간 보고서 자동 발송', included: true },
            { text: '실시간 진단 티켓 월 2회', included: true },
            { text: '경쟁사 비교 분석 불가', included: false },
        ],
        cta: '가볍게 시작하기',
        ctaStyle: 'ghost',
    },
    {
        id: 'pro',
        name: '프로',
        tagline: '마케팅 성과 심층 분석용',
        monthly: '29,000원',
        yearly: '26,600원',
        yearlyTotal: '연 319,000원 결제',
        featured: true,
        badge: '회원 64%가 구독 중',
        features: [
            { text: '네이버 지도 진단', included: true },
            { text: '5×5 (25개 좌표) 분석', included: true },
            { text: '관리 키워드 5개', included: true },
            { text: '주간 보고서 자동 발송', included: true },
            { text: '실시간 진단 티켓 월 10회', included: true },
            { text: '경쟁사 1곳 집중 추적 & 비교', included: true },
        ],
        cta: '내 가게 진단 & 경쟁사 분석',
        ctaStyle: 'solid',
    },
    {
        id: 'premium',
        name: '프리미엄',
        tagline: '상권 장악에 진심인 사장님용',
        monthly: '99,000원',
        yearly: '90,750원',
        yearlyTotal: '연 1,089,000원 결제',
        featured: false,
        features: [
            { text: '네이버 + 구글 지도 진단', included: true },
            { text: '7×7 (49개 좌표) 분석', included: true },
            { text: '관리 키워드 10개', included: true },
            { text: '실시간 진단 티켓 월 15회', included: true },
            { text: '주간 보고서 자동 발송', included: true },
            { text: '경쟁사 10곳 심층 분석', included: true },
            { text: '연결 가게 무제한 변경', included: true },
        ],
        cta: '상권 완전 장악하기',
        ctaStyle: 'ghost',
    },
]

interface Props {
    currentPlanId: string
}

export function UpgradePageContent({ currentPlanId }: Props) {
    const router = useRouter()
    const [isYearly, setIsYearly] = useState(true)

    const handlePlanClick = (planId: string) => {
        if (planId === currentPlanId) return
        alert('결제 시스템 준비 중입니다.\n빠른 시일 내에 오픈 예정입니다!')
    }

    const currentPlanName = getPlanDisplayName(currentPlanId)

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 뒤로가기 */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                돌아가기
            </button>

            {/* 타이틀 */}
            <div className="text-center mb-10">
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                    플랜 업그레이드
                </h1>
                <p className="mt-2 text-gray-500">
                    현재 <span className="font-semibold text-gray-700">{currentPlanName}</span> 플랜 이용 중
                </p>
            </div>

            {/* 토글 */}
            <div className="flex items-center justify-center gap-3 mb-12">
                <span
                    className={`min-w-[4.5rem] text-right text-sm font-medium transition-colors ${!isYearly ? 'text-gray-900' : 'text-gray-400'}`}
                >
                    월간
                </span>
                <button
                    type="button"
                    role="switch"
                    aria-checked={isYearly}
                    onClick={() => setIsYearly(!isYearly)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C896] focus-visible:ring-offset-2 ${isYearly ? 'bg-[#00C896]' : 'bg-gray-300'}`}
                >
                    <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ${isYearly ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                </button>
                <span
                    className={`min-w-[4.5rem] text-sm font-medium transition-colors ${isYearly ? 'text-gray-900' : 'text-gray-400'}`}
                >
                    연간{' '}
                    <span className="rounded-full bg-[#00C896]/10 px-2 py-0.5 text-xs font-semibold text-[#00C896]">
                        1개월 무료
                    </span>
                </span>
            </div>

            {/* 카드 3개 */}
            <div className="grid items-stretch gap-6 lg:grid-cols-3">
                {PLANS.map((plan) => {
                    const isCurrentPlan = plan.id === currentPlanId

                    return (
                        <div
                            key={plan.name}
                            className={`relative flex flex-col rounded-3xl border p-7 transition-all duration-300 sm:p-8 ${isCurrentPlan
                                ? 'border-2 border-blue-500 bg-white shadow-lg ring-4 ring-blue-500/10'
                                : plan.featured
                                    ? 'scale-[1.03] border-2 border-[#00C896] bg-white shadow-2xl shadow-[#00C896]/10 lg:scale-105'
                                    : 'border border-gray-200 bg-white shadow-sm hover:-translate-y-1 hover:shadow-lg'
                                }`}
                        >
                            {/* 현재 플랜 표시 */}
                            {isCurrentPlan && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                    <span className="whitespace-nowrap rounded-full bg-blue-500 px-4 py-1.5 text-xs font-bold text-white shadow-md">
                                        현재 플랜
                                    </span>
                                </div>
                            )}

                            {/* 추천 뱃지 (현재 플랜이 아닐 때만) */}
                            {plan.badge && !isCurrentPlan && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                    <span className="whitespace-nowrap rounded-full bg-[#00C896] px-4 py-1.5 text-xs font-bold text-white shadow-md">
                                        {plan.badge}
                                    </span>
                                </div>
                            )}

                            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                            <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>

                            <div className="mt-5">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                                        {isYearly ? plan.yearly : plan.monthly}
                                    </span>
                                    <span className="text-sm text-gray-500">/월</span>
                                </div>
                                {isYearly && (
                                    <p className="mt-1 text-xs text-gray-400">
                                        ({plan.yearlyTotal})
                                    </p>
                                )}
                                <p className="mt-0.5 text-xs text-gray-400">VAT 별도</p>
                            </div>

                            <ul className="mt-6 flex-1 space-y-3">
                                {plan.features.map((feature) => (
                                    <li
                                        key={feature.text}
                                        className="flex items-start gap-2.5 text-sm"
                                    >
                                        {feature.included ? (
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00C896]/10 text-xs text-[#00C896]">
                                                ✓
                                            </span>
                                        ) : (
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400">
                                                ✕
                                            </span>
                                        )}
                                        <span
                                            className={
                                                feature.included ? 'text-gray-700' : 'text-gray-400'
                                            }
                                        >
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* 버튼 */}
                            <button
                                type="button"
                                disabled={isCurrentPlan}
                                onClick={() => handlePlanClick(plan.id)}
                                className={`mt-6 w-full rounded-xl py-3.5 text-sm font-bold transition-all duration-300 ${isCurrentPlan
                                    ? 'cursor-not-allowed border-2 border-gray-100 bg-gray-50 text-gray-400'
                                    : plan.ctaStyle === 'solid'
                                        ? 'bg-[#00C896] text-white shadow-lg shadow-[#00C896]/25 hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl'
                                        : 'border-2 border-gray-100 bg-white text-[#00C896] hover:-translate-y-0.5 hover:border-[#00C896] hover:bg-[#00C896]/5'
                                    }`}
                            >
                                {(() => {
                                    if (isCurrentPlan) return '현재 이용 중'

                                    const planOrder = { free: 0, starter: 1, pro: 2, premium: 3 }
                                    const currentOrder = planOrder[currentPlanId as keyof typeof planOrder] || 0
                                    const targetOrder = planOrder[plan.id as keyof typeof planOrder] || 0

                                    if (targetOrder > currentOrder) return '업그레이드'
                                    return `${plan.name}로 전환`
                                })()}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
