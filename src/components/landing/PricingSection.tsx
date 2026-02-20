'use client'

import { useState } from 'react'
import Link from 'next/link'

import { FractionOneFifty } from './FractionOneFifty'

/* ---- 플랜 데이터 ---- */

interface PlanFeature {
    text: string
    included: boolean
}

interface Plan {
    name: string
    planId: string
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

const PLANS: Plan[] = [
    {
        name: '스타터',
        planId: 'starter',
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
        name: '프로',
        planId: 'pro',
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
        cta: '내 가게 진단 & 경쟁사 분석 시작하기',
        ctaStyle: 'solid',
    },
    {
        name: '프리미엄',
        planId: 'premium',
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

export default function PricingSection() {
    const [isYearly, setIsYearly] = useState(true)

    return (
        <section id="pricing" className="bg-white py-20 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* 섹션 타이틀 */}
                <div className="text-center">
                    <h2 className="break-keep text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
                        <strong className="text-[#00C896]">하루 900원대</strong>로 사장님의 플레이스 순위를 지키세요.
                    </h2>
                    <p className="mt-4 break-keep text-base text-gray-600 sm:text-lg">
                        불필요한 기능은 빼고 &lsquo;순위 지도&rsquo; 하나에 집중했습니다.
                        <br />
                        마케팅 의사결정의 기준을 바꾸세요.
                    </p>
                </div>

                {/* 토글 스위치 */}
                <div className="mt-10 flex items-center justify-center gap-3">
                    <span
                        className={`min-w-[4.5rem] text-right text-sm font-medium transition-colors ${!isYearly ? 'text-gray-900' : 'text-gray-400'
                            }`}
                    >
                        월간
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isYearly}
                        onClick={() => setIsYearly(!isYearly)}
                        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C896] focus-visible:ring-offset-2 ${isYearly ? 'bg-[#00C896]' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ${isYearly ? 'translate-x-5' : 'translate-x-0'
                                }`}
                        />
                    </button>
                    <span
                        className={`min-w-[4.5rem] text-sm font-medium transition-colors ${isYearly ? 'text-gray-900' : 'text-gray-400'
                            }`}
                    >
                        연간{' '}
                        <span className="rounded-full bg-[#00C896]/10 px-2 py-0.5 text-xs font-semibold text-[#00C896]">
                            1개월 무료
                        </span>
                    </span>
                </div>

                {/* 가격 카드 3개 */}
                <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative flex flex-col rounded-3xl border p-7 transition-all duration-300 sm:p-8 ${plan.featured
                                ? 'scale-[1.03] border-[#00C896] bg-white shadow-2xl shadow-[#00C896]/10 lg:scale-105 hover:-translate-y-1'
                                : 'border-gray-200 bg-white shadow-sm hover:-translate-y-1 hover:shadow-lg'
                                }`}
                        >
                            {/* 뱃지 */}
                            {plan.badge && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                    <span className="whitespace-nowrap rounded-full bg-[#00C896] px-4 py-1.5 text-xs font-bold text-white shadow-md">
                                        {plan.badge}
                                    </span>
                                </div>
                            )}

                            {/* 플랜 이름 */}
                            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                            <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>

                            {/* 가격 */}
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

                            {/* 기능 목록 */}
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

                            {/* 결제 즉시 보고서 발송 */}
                            <p className="mt-5 text-center text-xs font-medium text-[#00C896]">
                                🚀 결제 즉시 첫 보고서 발송
                            </p>

                            {/* CTA 버튼 */}
                            <Link
                                href={`/login?plan=${plan.planId}${isYearly ? '&billing=yearly' : ''}`}
                                className={`mt-5 block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-all duration-300 ${plan.ctaStyle === 'solid'
                                    ? 'bg-[#00C896] text-white shadow-lg shadow-[#00C896]/25 hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl'
                                    : 'border-2 border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-[#00C896] hover:text-[#00C896]'
                                    }`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
