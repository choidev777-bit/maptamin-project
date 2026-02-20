'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowRight,
    Loader2,
    Calendar,
    Shield,
    XCircle,
    CheckCircle2,
    AlertCircle,
    CreditCard,
    FileText,
    RefreshCw,
    Download,
} from 'lucide-react'
import { getPlanDisplayName } from '@/lib/utils/subscription'
import { PlanCardData } from './PlanCard'

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

export interface PaymentHistoryItem {
    id: string
    payment_id: string
    amount: number
    status: string
    created_at: string
    plan_id: string
    receipt_url?: string
}

interface Props {
    currentPlanId: string
    billingCycle?: string
    remainingTicketsNaver: number
    remainingTicketsGoogle: number
    currentPeriodEnd: string | null
    billingStatus: string | null
    cardLast4: string | null
    cardBrand: string | null
    nextBillingDate: string | null
    paymentHistory?: PaymentHistoryItem[]
}

const PLANS: PlanCardData[] = [
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
        cta: '다운그레이드',
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
        cta: '업그레이드',
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
        cta: '업그레이드',
        ctaStyle: 'ghost',
    },
]

export function SubscriptionContent({
    currentPlanId,
    billingCycle = 'monthly',
    remainingTicketsNaver,
    remainingTicketsGoogle,
    currentPeriodEnd,
    billingStatus,
    cardLast4,
    cardBrand,
    nextBillingDate,
    paymentHistory = []
}: Props) {
    const router = useRouter()
    const [isYearly, setIsYearly] = useState(true)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const [canceling, setCanceling] = useState(false)
    const [cancelError, setCancelError] = useState<string | null>(null)
    const [canceledUntil, setCanceledUntil] = useState<string | null>(null)

    const isSubscribed = billingStatus === 'active'
    const isCanceled = billingStatus === 'canceled'

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const handleSubscribe = async (planId: string) => {
        const billingCycle = isYearly ? 'yearly' : 'monthly'
        router.push(`/dashboard/subscription/checkout?plan=${planId}&billing=${billingCycle}`)
    }

    const handleCancelSubscription = async () => {
        setCanceling(true)
        setCancelError(null)

        try {
            const response = await fetch('/api/payment/subscribe/cancel', {
                method: 'POST',
            })
            const data = await response.json()

            if (!response.ok) {
                setCancelError(data.error || '구독 해지에 실패했습니다.')
                setCanceling(false)
                return
            }

            setCanceledUntil(data.effectiveUntil)
            setShowCancelModal(false)
            setCanceling(false)
        } catch (error) {
            setCancelError(
                error instanceof Error ? error.message : '구독 해지 처리 중 오류가 발생했습니다.'
            )
            setCanceling(false)
        }
    }

    const renderCancelModal = () => {
        if (!showCancelModal) return null

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">
                            구독을 해지하시겠습니까?
                        </h3>
                    </div>

                    <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-sm text-amber-800">
                            해지하더라도 현재 이용 기간(<strong>{formatDate(nextBillingDate)}</strong>)까지는 모든 혜택이 유지됩니다.
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                            이후 자동 결제가 중단되며, 무료 플랜으로 전환됩니다.
                        </p>
                    </div>

                    {cancelError && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                            <p className="text-sm text-red-700">{cancelError}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setShowCancelModal(false); setCancelError(null) }}
                            disabled={canceling}
                            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            유지하기
                        </button>
                        <button
                            onClick={handleCancelSubscription}
                            disabled={canceling}
                            className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            {canceling ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    처리 중...
                                </span>
                            ) : (
                                '해지하기'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    /* ── Render Logic for Table ── */
    const getStatusBadge = (status: string) => {
        if (status === 'paid') {
            return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold uppercase">결제 완료</span>
        }
        if (status === 'failed') {
            return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase">실패</span>
        }
        return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase">{status}</span>
    }

    const getDisplayAmount = () => {
        const currentPlan = PLANS.find(p => p.id === currentPlanId)
        if (!currentPlan) return { amount: '-', period: '월' }
        if (billingCycle === 'yearly') {
            const amountMatch = currentPlan.yearlyTotal.match(/[0-9,]+/)
            return { amount: amountMatch ? amountMatch[0] : '-', period: '연' }
        }
        return { amount: currentPlan.monthly.replace('원', ''), period: '월' }
    }
    const { amount: displayAmount, period: displayPeriod } = getDisplayAmount()

    const getHistoryPlanName = (item: PaymentHistoryItem) => {
        const plan = PLANS.find(p => p.id === item.plan_id)
        if (!plan) return getPlanDisplayName(item.plan_id)

        // 결제 금액으로 연간/월간 구분
        const yearlyAmount = parseInt(plan.yearlyTotal.replace(/[^0-9]/g, ''))
        if (item.amount === yearlyAmount) {
            return `${plan.name} (연 결제)`
        }
        return `${plan.name} (월 결제)`
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans text-[#001011]">
            {renderCancelModal()}

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#001011]">결제 및 구독 관리</h1>
                <p className="mt-2 text-slate-500">플랜, 결제 수단 및 청구 내역을 관리하세요.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                {/* 1. Subscription Overview Card */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-1">현재 이용 중인 플랜</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-[#001011]">{getPlanDisplayName(currentPlanId)}</span>
                                {isSubscribed && !isCanceled && (
                                    <span className="px-2 py-0.5 bg-[#00C896]/10 text-[#00C896] text-xs font-bold rounded border border-[#00C896]/20">이용 중</span>
                                )}
                                {isCanceled && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded border border-amber-200">해지됨</span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => document.getElementById('plans-grid')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-4 py-2 bg-[#001011] text-white font-semibold rounded-lg text-sm hover:bg-slate-800 transition-all">
                            플랜 변경
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-slate-400" />
                                <div>
                                    <p className="text-xs text-slate-500">다음 결제일</p>
                                    <p className="font-medium text-[#001011]">{formatDate(nextBillingDate)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <CreditCard className="w-5 h-5 text-slate-400" />
                                <div>
                                    <p className="text-xs text-slate-500">결제 금액</p>
                                    <p className="font-medium text-[#001011]">
                                        {displayAmount}원 <span className="text-xs text-slate-500 font-normal">/ {displayPeriod}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <RefreshCw className={`w-5 h-5 ${isCanceled ? 'text-amber-500' : 'text-[#00C896]'}`} />
                                <div>
                                    <p className="text-xs text-slate-500">상태</p>
                                    {isCanceled ? (
                                        <p className="font-medium text-amber-600">
                                            {formatDate(canceledUntil || nextBillingDate)} 종료 예정
                                        </p>
                                    ) : (
                                        <p className="font-medium text-[#00C896]">자동 결제 활성화 상태</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 max-w-[200px]">
                                <p className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-tighter text-center">실시간 진단 티켓</p>
                                <div className="flex gap-4 justify-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg font-bold text-[#001011]">{remainingTicketsNaver}</span>
                                        <span className="text-[10px] text-slate-400">네이버</span>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg font-bold text-[#001011]">{remainingTicketsGoogle}</span>
                                        <span className="text-[10px] text-slate-400">구글</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Payment Method Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">결제 수단 정보</h3>

                    <div className="flex-grow flex flex-col justify-center">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 mb-6">
                            <div className="w-12 h-8 bg-slate-800 rounded flex items-center justify-center overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                                    <span className="text-[8px] text-white/50 font-bold italic">CARD</span>
                                </div>
                            </div>
                            <div>
                                {cardBrand && cardLast4 ? (
                                    <>
                                        <p className="font-bold text-sm text-[#001011]">{cardBrand}</p>
                                        <p className="text-xs text-slate-500 tracking-widest">•••• {cardLast4}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-bold text-sm text-[#001011]">등록된 카드 없음</p>
                                        <p className="text-xs text-slate-500">결제 수단이 없습니다.</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/dashboard/subscription/checkout')}
                        className="w-full py-2.5 border border-gray-300 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                    >
                        <CreditCard className="w-5 h-5" />
                        결제 수단 변경
                    </button>
                </div>
            </div>

            {/* Billing History Table */}
            {isSubscribed && (
                <section className="mb-12">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-3 text-[#001011]">
                            <div className="bg-[#00C896]/10 p-2 rounded-lg">
                                <FileText className="w-5 h-5 text-[#00C896]" />
                            </div>
                            결제 내역
                        </h3>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-600">날짜</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">플랜</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">금액</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600">상태</th>
                                        <th className="px-6 py-4 font-semibold text-slate-600 text-right">영수증</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paymentHistory.length > 0 ? (
                                        paymentHistory.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-slate-700 font-medium whitespace-nowrap">
                                                    {formatDate(item.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {getHistoryPlanName(item)}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-[#001011]">
                                                    {item.amount.toLocaleString()}원
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(item.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => item.receipt_url && window.open(item.receipt_url, '_blank')}
                                                        className={`${item.receipt_url ? 'text-slate-600 hover:text-[#00C896] cursor-pointer' : 'text-slate-300 cursor-not-allowed'} transition-colors`}
                                                        title={item.receipt_url ? '영수증 조회' : '영수증이 없습니다.'}
                                                        disabled={!item.receipt_url}
                                                    >
                                                        <Download className="w-5 h-5" strokeWidth={1.5} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                결제 내역이 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {/* Plan Management Grid */}
            <section id="plans-grid" className="mb-20">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-2xl font-bold text-[#001011] tracking-tight">이용 플랜 변경</h3>
                        <p className="text-slate-500 mt-1">비즈니스 성장에 맞춰 플랜을 업그레이드하세요.</p>
                    </div>
                    {/* Toggle */}
                    <div className="flex items-center p-1 bg-white border border-gray-200 rounded-full shadow-sm self-start">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`relative w-24 rounded-full py-2 text-sm font-semibold transition-colors duration-200 ${!isYearly ? 'bg-[#001011] text-white' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            월 결제
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`relative w-28 rounded-full py-2 text-sm font-semibold transition-colors duration-200 ${isYearly ? 'bg-[#001011] text-white' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            연 결제
                            <span className="absolute -top-3 -right-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                                1개월 무료
                            </span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => {
                        const isCurrent = currentPlanId === plan.id
                        const isFeatured = plan.featured
                        const price = isYearly ? plan.yearly : plan.monthly

                        return (
                            <div
                                key={plan.id}
                                className={`relative rounded-xl p-8 bg-white flex flex-col h-full transition-all duration-200
                                    ${isFeatured || isCurrent ? 'border-2 border-[#00C896] shadow-xl' : 'border border-gray-200 shadow-sm hover:shadow-md'}
                                `}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00C896] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                                        현재 이용 중
                                    </div>
                                )}

                                {/* 플랜 이름 상단에 뱃지가 있는 경우 (PricingSection 참고) */}
                                {plan.badge && !isCurrent && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                        <span className="whitespace-nowrap rounded-full bg-[#00C896] px-4 py-1.5 text-xs font-bold text-white shadow-md">
                                            {plan.badge}
                                        </span>
                                    </div>
                                )}

                                <h4 className={`text-lg font-bold ${isCurrent || isFeatured ? 'text-[#00C896]' : 'text-gray-900'}`}>
                                    {plan.name}
                                </h4>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-3xl font-extrabold text-[#001011] sm:text-4xl">{price.replace('원', '')}</span>
                                    <span className="text-sm font-semibold text-gray-500 uppercase">원<span className="font-normal">/월</span></span>
                                </div>
                                {isYearly && (
                                    <p className="mt-1 text-xs text-gray-400 font-medium tracking-tight">
                                        ({plan.yearlyTotal})
                                    </p>
                                )}
                                <p className="mt-0.5 text-xs text-gray-400">VAT 별도</p>

                                <p className="mt-4 text-sm text-gray-500 leading-relaxed min-h-[3rem]">
                                    {plan.tagline}
                                </p>

                                <ul className="mt-6 flex-1 space-y-3">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2.5 text-sm">
                                            {feature.included ? (
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00C896]/20 text-sm font-black text-[#00C896]">
                                                    ✓
                                                </span>
                                            ) : (
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-400">
                                                    ✕
                                                </span>
                                            )}
                                            <span className={feature.included ? 'text-gray-700 font-medium' : 'text-gray-400 line-through'}>
                                                {feature.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {isCurrent ? (
                                    <button
                                        disabled
                                        className="mt-8 w-full font-bold py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed transition-all"
                                    >
                                        현재 이용 중인 플랜
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSubscribe(plan.id)}
                                        className={`mt-8 w-full rounded-xl py-3.5 text-center text-sm font-bold transition-all duration-300
                                            ${plan.ctaStyle === 'solid'
                                                ? 'bg-[#00C896] text-white shadow-lg shadow-[#00C896]/25 hover:-translate-y-0.5 hover:bg-[#00B386]'
                                                : 'border-2 border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-[#00C896] hover:text-[#00C896]'
                                            }
                                        `}
                                    >
                                        {plan.cta}
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Footer Links (Danger Zone) */}
            {isSubscribed && (
                <footer className="pt-8 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={() => setShowCancelModal(true)}
                        className="text-sm text-gray-400 hover:text-red-500 transition-colors font-medium flex items-center gap-1"
                    >
                        구독 해지
                    </button>
                </footer>
            )}
        </div>
    )
}
