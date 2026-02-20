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
}

interface Props {
    currentPlanId: string
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

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 font-sans text-[#001011]">
            {renderCancelModal()}

            {/* Header */}
            <div className="mb-10">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#001011]">구독 관리</h1>
                <p className="mt-2 text-slate-500 text-lg">플랜, 결제 수단 및 청구 내역을 관리하세요.</p>
            </div>

            {/* Current Subscription Card (Hero) */}
            <section className="mb-10">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col md:flex-row">
                    {/* Left: Plan Details */}
                    <div className="p-8 flex-1 border-b md:border-b-0 md:border-r border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-[#001011]">{getPlanDisplayName(currentPlanId)}</h2>
                            {isSubscribed && !isCanceled && (
                                <span className="inline-flex items-center rounded-full bg-[#00C896]/10 px-3 py-1 text-xs font-bold text-[#00C896]">
                                    Active
                                </span>
                            )}
                            {isCanceled && (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                                    해지됨
                                </span>
                            )}
                        </div>

                        {isSubscribed && (
                            <div className="mb-6">
                                {isCanceled ? (
                                    <p className="text-amber-600 text-sm flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {formatDate(canceledUntil || nextBillingDate)}에 종료됩니다.
                                    </p>
                                ) : (
                                    <p className="text-slate-500 text-sm flex items-center gap-1">
                                        <RefreshCw className="w-4 h-4" />
                                        자동 갱신 활성화됨
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="space-y-4">
                            <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">잔여 티켓 (이번 달)</p>
                            <div className="flex flex-col gap-3">
                                <div>
                                    <div className="flex justify-between items-center text-sm mb-1.5">
                                        <span className="text-slate-500 font-medium">네이버 지도 진단</span>
                                        <span className="font-bold text-[#001011]">{remainingTicketsNaver}장</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-[#00C896] h-2 rounded-full" style={{ width: `${Math.min(remainingTicketsNaver * 10, 100)}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center text-sm mb-1.5">
                                        <span className="text-slate-500 font-medium">구글 지도 진단</span>
                                        <span className="font-bold text-[#001011]">{remainingTicketsGoogle}장</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-[#00C896] h-2 rounded-full" style={{ width: `${Math.min(remainingTicketsGoogle * 10, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Billing Info */}
                    <div className="p-8 bg-gray-50 md:w-80 flex flex-col justify-center">
                        {isSubscribed ? (
                            <>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500 font-medium">다음 결제일</p>
                                    <p className="text-xl font-bold text-[#001011] tracking-tight">{formatDate(nextBillingDate)}</p>
                                </div>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-[#00C896]">
                                        {PLANS.find(p => p.id === currentPlanId)?.monthly.replace('원', '') || '-'}
                                    </span>
                                    <span className="text-lg font-bold text-[#00C896]">원</span>
                                </div>

                                {/* 결제 수단 */}
                                <div className="mt-8 pt-6 border-t border-gray-200">
                                    <p className="text-xs text-slate-400 font-semibold uppercase mb-2">결제 수단</p>
                                    <div className="flex items-center gap-2 mb-3">
                                        <CreditCard className="w-5 h-5 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700">
                                            {cardBrand ? `${cardBrand} **** ${cardLast4}` : '카드 정보 없음'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => router.push('/dashboard/subscription/checkout')}
                                        className="text-xs font-semibold text-[#00C896] hover:text-[#00B386] transition-colors flex items-center gap-1"
                                    >
                                        카드 변경 <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center">
                                <p className="text-slate-500 mb-4">현재 무료 플랜 이용 중입니다.</p>
                                <button
                                    onClick={() => document.getElementById('plans-grid')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="w-full bg-[#00C896] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#00B386] transition-all shadow-md shadow-[#00C896]/20"
                                >
                                    구독 시작하기
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Billing History Table */}
            {isSubscribed && (
                <section className="mb-12">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-[#001011]">
                            <FileText className="w-6 h-6 text-[#00C896]" />
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
                                                    {getPlanDisplayName(item.plan_id)}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-[#001011]">
                                                    {item.amount.toLocaleString()}원
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(item.status)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-slate-400 hover:text-[#00C896] transition-colors" title="영수증 다운로드 (준비 중)">
                                                        <Download className="w-5 h-5" />
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
                    <div className="flex items-center bg-gray-100 p-1 rounded-lg self-start">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`px-4 py-2 text-sm font-bold rounded-md shadow-sm transition-all ${!isYearly ? 'bg-white text-[#001011]' : 'text-slate-500 hover:text-[#001011]'}`}
                        >
                            월간
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`px-4 py-2 text-sm font-bold rounded-md shadow-sm transition-all ${isYearly ? 'bg-white text-[#001011]' : 'text-slate-500 hover:text-[#001011]'}`}
                        >
                            연간 (20% 할인)
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
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00C896] text-white text-xs font-black uppercase px-4 py-1.5 rounded-full tracking-wider shadow-sm">
                                        현재 이용 중
                                    </div>
                                )}

                                <h4 className={`text-lg font-bold ${isFeatured ? 'text-[#00C896]' : 'text-slate-700'}`}>
                                    {plan.name}
                                </h4>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-[#001011]">{price.replace('원', '')}</span>
                                    <span className="text-sm font-semibold text-slate-500 uppercase">원</span>
                                </div>
                                <p className="mt-4 text-sm text-slate-500 leading-relaxed min-h-[3rem]">
                                    {plan.tagline}
                                </p>

                                <ul className="mt-8 space-y-4 flex-grow">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-3 text-sm text-slate-600">
                                            {feature.included ? (
                                                <CheckCircle2 className="w-5 h-5 text-[#00C896] shrink-0" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-slate-300 shrink-0" />
                                            )}
                                            <span className={feature.included ? '' : 'text-slate-400 line-through'}>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>

                                {isCurrent ? (
                                    <div className="mt-8 w-full bg-slate-100 text-slate-400 font-bold py-3 rounded-lg text-center cursor-default">
                                        현재 이용 중인 플랜
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleSubscribe(plan.id)}
                                        className={`mt-8 w-full font-bold py-3 rounded-lg transition-colors
                                            ${isFeatured
                                                ? 'bg-[#00C896] text-white hover:bg-[#00B386] shadow-md shadow-[#00C896]/20'
                                                : 'border-2 border-[#00C896] text-[#00C896] hover:bg-[#00C896]/5'
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
