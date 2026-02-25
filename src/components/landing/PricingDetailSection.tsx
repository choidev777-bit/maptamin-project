'use client'

import { useState } from 'react'
import { Check, X, HelpCircle, Shield, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

/* ---- 비교 테이블 데이터 ---- */

interface ComparisonRow {
    label: string
    starter: string
    pro: string
    premium: string
    tooltip?: string
}

const COMPARISON: ComparisonRow[] = [
    { label: '월 구독료', starter: '9,900원', pro: '29,000원', premium: '99,000원' },
    {
        label: '연결 매장',
        starter: '1곳 \n(30일 이후 변경 가능)',
        pro: '1곳 \n(30일 이후 변경 가능)',
        premium: '무제한 \n변경 가능',
        tooltip: '그리드 분석의 중심이 되는 매장입니다. 스타터/프로는 설정 후 30일간 변경 불가합니다.',
    },
    { label: '제공 채널', starter: '네이버 지도', pro: '네이버 지도', premium: '네이버 + 구글' },
    {
        label: '리포트 주기',
        starter: '주 1회',
        pro: '주 1회',
        premium: '주 1회',
        tooltip: '결제 즉시 웰컴 리포트 1회가 추가 발송됩니다.',
    },
    {
        label: '실시간 진단 티켓',
        starter: '월 2회',
        pro: '월 10회',
        premium: '월 15회 (각 채널)',
        tooltip: '지금 당장 순위가 궁금할 때 사용하는 즉시 조회 기능입니다.',
    },
    { label: '분석 범위', starter: '3×3 (9좌표)', pro: '5×5 (25좌표)', premium: '7×7 (49좌표)' },
    {
        label: '관리 키워드',
        starter: '2개',
        pro: '5개',
        premium: '10개 (각 채널 5개)',
        tooltip: '검색할 때 입력하는 키워드입니다. 설정 후 30일간 변경 불가합니다.',
    },
    { label: '경쟁사 분석', starter: '—', pro: '1곳', premium: '10곳' },
]

/* ---- 용어 설명 ---- */

interface Term {
    icon: string
    title: string
    desc: string
}

const TERMS: Term[] = [
    {
        icon: '📍',
        title: '연결 매장',
        desc: '분석의 중심이 되는 매장입니다. 사장님의 매장라고 생각하시면 됩니다.',
    },
    {
        icon: '🔑',
        title: '관리 키워드',
        desc: '순위를 추적할 검색 키워드입니다. 예: "근처 맛집", "주변 조용한 카페" 등 고객이 매장 근처에서 실제로 검색하는 키워드를 등록합니다.',
    },
    {
        icon: '⚡',
        title: '실시간 진단 티켓',
        desc: '정기 리포트(주 1회) 외에, 지금 당장 내 매장 순위가 궁금할 때 사용하는 즉시 조회 기능입니다.',
    },
    {
        icon: '👋',
        title: '웰컴 리포트',
        desc: '결제 즉시 발송되는 첫 번째 리포트입니다. 가입 후 일주일을 기다릴 필요 없이, 바로 내 매장 상태를 확인할 수 있습니다.',
    },
]

/* ---- 가격 카드 데이터 ---- */

interface PlanFeature {
    text: string
    included: boolean
}

interface PlanCard {
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

const PLANS: PlanCard[] = [
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
        badge: '추천!',
        features: [
            { text: '네이버 지도 진단', included: true },
            { text: '5×5 (25개 좌표) 분석', included: true },
            { text: '관리 키워드 5개', included: true },
            { text: '주간 보고서 자동 발송', included: true },
            { text: '실시간 진단 티켓 월 10회', included: true },
            { text: '경쟁사 1곳 집중 추적 & 비교', included: true },
        ],
        cta: '내 매장 진단 & 경쟁사 분석', // PricingSection은 '... 분석 시작하기' 인데 여기는 짧게 유지? 사용자는 "그대로" 원함. PricingSection의 CTA 사용.
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
            { text: '연결 매장 무제한 변경', included: true },
        ],
        cta: '상권 완전 장악하기',
        ctaStyle: 'ghost',
    },
]

export default function PricingDetailSection() {
    const [isYearly, setIsYearly] = useState(true)

    return (
        <>
            {/* ========== 1. 메인 가격 카드 ========== */}
            <section className="bg-white pb-20 pt-10 sm:pb-28 sm:pt-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* 타이틀 */}
                    <div className="text-center">
                        <h1 className="break-keep text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
                            맵타민 가격 안내
                        </h1>
                        <p className="mt-4 break-keep text-base text-gray-600 sm:text-lg">
                            맵타민은 <strong className="text-[#00C896]">하루 330원</strong>부터 시작합니다.
                        </p>
                    </div>

                    {/* 토글 */}
                    <div className="mt-10 flex items-center justify-center gap-3">
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
                    <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
                        {PLANS.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col rounded-3xl border p-7 transition-all duration-300 sm:p-8 ${plan.featured
                                    ? 'scale-[1.03] border-[#00C896] bg-white shadow-2xl shadow-[#00C896]/10 lg:scale-105 hover:-translate-y-1'
                                    : 'border-gray-200 bg-white shadow-sm hover:-translate-y-1 hover:shadow-lg'
                                    }`}
                            >
                                {plan.badge && (
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
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00C896]/20 text-xs font-bold text-[#00A078]">
                                                    ✓
                                                </span>
                                            ) : (
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">
                                                    ✕
                                                </span>
                                            )}
                                            <span
                                                className={
                                                    feature.included ? 'text-gray-800 font-medium' : 'text-gray-400'
                                                }
                                            >
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <p className="mt-5 text-center text-xs font-medium text-[#00C896]">
                                    🚀 결제 즉시 웰컴 리포트 발송
                                </p>

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

            {/* ========== 2. 전체 스펙 비교 테이블 ========== */}
            <section className="border-t border-gray-100 bg-gray-50 py-20 sm:py-24">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <h2 className="mb-12 text-center text-xl font-bold text-gray-900 sm:text-2xl">
                        요금제 상세 비교
                    </h2>

                    {/* 데스크톱 테이블 - 툴팁 잘림 방지를 위해 overflow-visible */}
                    <div className="hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block md:overflow-visible">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="rounded-tl-2xl px-6 py-4 text-left font-semibold text-gray-500">항목</th>
                                    <th className="px-6 py-4 text-center font-semibold text-gray-900">스타터</th>
                                    <th className="relative px-6 py-4 text-center font-extrabold text-[#00C896]">
                                        프로 ⭐
                                        <div className="absolute inset-x-0 top-0 h-0.5 bg-[#00C896]" />
                                    </th>
                                    <th className="rounded-tr-2xl px-6 py-4 text-center font-semibold text-gray-900">프리미엄</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARISON.map((row, i) => (
                                    <tr
                                        key={row.label}
                                        className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                                    >
                                        <td className={`px-6 py-4 font-medium text-gray-700 ${i === COMPARISON.length - 1 ? 'rounded-bl-2xl' : ''}`}>
                                            <div className="relative flex items-center gap-1.5">
                                                {row.label}
                                                {row.tooltip && (
                                                    <div className="group relative">
                                                        <HelpCircle className="h-3.5 w-3.5 cursor-help text-gray-400 transition-colors hover:text-gray-600" />
                                                        <div className="absolute bottom-full left-0 z-50 mb-2 hidden w-64 rounded-xl bg-gray-900/95 px-4 py-3 text-xs font-normal leading-relaxed text-white shadow-xl backdrop-blur-sm group-hover:block">
                                                            {row.tooltip}
                                                            {/* 말풍선 꼬리 */}
                                                            <div className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 bg-gray-900/95" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-gray-600">
                                            {row.starter === '—' ? (
                                                <X className="mx-auto h-4 w-4 text-gray-300" />
                                            ) : (
                                                row.starter
                                            )}
                                        </td>
                                        <td className="border-x border-[#00C896]/10 bg-[#00C896]/[0.02] px-6 py-4 text-center font-extrabold text-gray-900">
                                            {row.pro === '—' ? (
                                                <X className="mx-auto h-4 w-4 text-gray-300" />
                                            ) : (
                                                row.pro
                                            )}
                                        </td>
                                        <td className={`px-6 py-4 text-center text-gray-600 ${i === COMPARISON.length - 1 ? 'rounded-br-2xl' : ''}`}>
                                            {row.premium === '—' ? (
                                                <X className="mx-auto h-4 w-4 text-gray-300" />
                                            ) : (
                                                row.premium
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 모바일 비교 카드 */}
                    <div className="space-y-4 md:hidden">
                        {COMPARISON.map((row) => (
                            <div key={row.label} className="rounded-xl border border-gray-200 bg-white p-4">
                                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                    {row.label}
                                    {row.tooltip && (
                                        <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
                                    )}
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-center text-[11px] tracking-tight whitespace-pre-line">
                                    <div className="rounded-lg bg-gray-50 px-2 py-2.5">
                                        <p className="mb-1 font-medium text-gray-400">스타터</p>
                                        <p className="font-semibold text-gray-700">
                                            {row.starter === '—' ? '—' : row.starter}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-[#00C896]/20 bg-[#00C896]/5 px-2 py-2.5">
                                        <p className="mb-1 font-extrabold text-[#00C896]">프로 ⭐</p>
                                        <p className="font-semibold text-gray-900">
                                            {row.pro === '—' ? '—' : row.pro}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-2 py-2.5">
                                        <p className="mb-1 font-medium text-gray-400">프리미엄</p>
                                        <p className="font-semibold text-gray-700">
                                            {row.premium === '—' ? '—' : row.premium}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== 3. 용어 설명 (30일 락 안내 삭제됨) ========== */}
            <section className="border-t border-gray-100 bg-gray-50 py-20 sm:py-24">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <h2 className="mb-10 text-center text-xl font-bold text-gray-900 sm:text-2xl">
                        용어가 어려우신가요?
                    </h2>
                    <div className="grid gap-5 sm:grid-cols-2">
                        {TERMS.map((term) => (
                            <div
                                key={term.title}
                                className="rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <div className="mb-3 flex items-center gap-3">
                                    <span className="text-2xl">{term.icon}</span>
                                    <h3 className="text-base font-bold text-gray-900">{term.title}</h3>
                                </div>
                                <p className="break-keep text-sm leading-relaxed text-gray-600">
                                    {term.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}
