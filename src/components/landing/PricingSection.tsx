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
        featured: false,
        features: [
            { text: '네이버 플레이스 분석', included: true },
            { text: '3×3 (9개 좌표) 분석', included: true },
            { text: '매일 네이버 보고서 자동 발송', included: true },
            { text: '관리 키워드 2개', included: true },
            { text: '실시간 분석 티켓 월 2장', included: true },
            { text: '연결 매장 1곳 (30일 이후 변경 가능)', included: true },
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
        featured: true,
        badge: '추천!',
        features: [
            { text: '네이버 플레이스 분석', included: true },
            { text: '5×5 (25개 좌표) 분석', included: true },
            { text: '매일 네이버 보고서 자동 발송', included: true },
            { text: '관리 키워드 5개', included: true },
            { text: '실시간 분석 티켓 월 5장', included: true },
            { text: '연결 매장 1곳 (30일 이후 변경 가능)', included: true },
            { text: '경쟁사 5곳 분석', included: true },
        ],
        cta: '내 매장 진단 & 경쟁사 분석 시작하기',
        ctaStyle: 'solid',
    },
    {
        name: '프리미엄',
        planId: 'premium',
        tagline: '상권 장악에 진심인 사장님용',
        monthly: '79,000원',
        featured: false,
        features: [
            { text: '네이버 플레이스 + 구글 지도 분석', included: true },
            { text: '7×7 (49개 좌표) 분석', included: true },
            { text: '매일 네이버 보고서 자동 발송', included: true },
            { text: '매주 구글 보고서 자동 발송', included: true },
            { text: '관리 키워드 10개 (네이버/구글 각 5개)', included: true },
            { text: '실시간 분석 티켓 월 20장 (네이버/구글 각 10장)', included: true },
            { text: '연결 매장 무제한 변경', included: true },
            { text: '경쟁사 50곳 분석', included: true },
        ],
        cta: '상권 완전 장악하기',
        ctaStyle: 'ghost',
    },
]

export default function PricingSection() {

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


                {/* 무료체험 안내 */}
                <p className="mt-6 text-center text-sm text-gray-500">
                    아직 망설여지시나요?{' '}
                    <Link
                        href="/login?redirectTo=/free-trial"
                        className="font-bold text-[#00C896] underline underline-offset-2 hover:text-[#00B386] transition-colors"
                    >
                        먼저 무료로 체험해보세요 →
                    </Link>
                </p>

                {/* 가격 카드 3개 */}
                <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative flex flex-col rounded-3xl border p-7 transition-[transform,box-shadow] duration-300 sm:p-8 ${plan.featured
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
                                        {plan.monthly}
                                    </span>
                                    <span className="text-sm text-gray-500">/월</span>
                                </div>
                                <p className="mt-0.5 text-xs text-gray-400">VAT 포함</p>
                            </div>

                            {/* 기능 목록 */}
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

                            {/* 구독 즉시 리포트 발송 */}
                            <p className="mt-5 text-center text-xs font-medium text-[#00C896]">
                                🚀 구독 즉시 첫 리포트 발송
                            </p>

                            {/* CTA 버튼 */}
                            <Link
                                href={`/login?plan=${plan.planId}`}
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
