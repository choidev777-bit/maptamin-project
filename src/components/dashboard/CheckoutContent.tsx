'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { requestBillingKey } from '@/lib/portone/subscription-client'
import { getPlanDisplayName } from '@/lib/utils/subscription'

/* ──────────────────────────────────────────────
 * Plan Data (Shared with SubscriptionContent - consider moving to shared constant)
 * ────────────────────────────────────────────── */
const PLANS = {
    starter: {
        name: '스타터',
        monthly: 9900,
        yearly: 9075,
    },
    pro: {
        name: '프로',
        monthly: 29000,
        yearly: 26600,
    },
    premium: {
        name: '프리미엄',
        monthly: 99000,
        yearly: 90750,
    },
} as const

type PlanId = keyof typeof PLANS

export function CheckoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const planId = searchParams.get('plan') as PlanId
    const billingCycle = searchParams.get('billing') as 'monthly' | 'yearly'

    const [loading, setLoading] = useState(false)
    const [agreed, setAgreed] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Validate params
    const isValidPlan = planId && PLANS[planId]
    const isValidCycle = billingCycle === 'monthly' || billingCycle === 'yearly'

    useEffect(() => {
        if (!isValidPlan || !isValidCycle) {
            router.replace('/dashboard/subscription')
        }
    }, [isValidPlan, isValidCycle, router])

    if (!isValidPlan || !isValidCycle) return null

    const plan = PLANS[planId]
    const price = billingCycle === 'yearly' ? plan.yearly * 12 : plan.monthly
    const cycleText = billingCycle === 'yearly' ? '년' : '월'
    const totalAmount = price + (price * 0.1) // VAT 10%
    const totalAmountDisplay = totalAmount.toLocaleString()

    const handlePayment = async () => {
        if (!agreed) {
            setError('이용 약관에 동의해주세요.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            // 1. PortOne SDK로 빌링키 발급 (결제창 팝업)
            // 주의: requestBillingKey는 클라이언트 사이드 SDK이므로 여기서 호출
            const billingResult = await requestBillingKey({
                planId,
            })

            if (!billingResult.success || !billingResult.billingKey) {
                throw new Error(billingResult.error || '카드 등록에 실패했습니다.')
            }

            // 2. 서버에 구독 시작 요청
            const response = await fetch('/api/payment/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    billingKey: billingResult.billingKey,
                    planId,
                    billingCycle,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || '구독 시작에 실패했습니다.')
            }

            // 3. 성공 -> 대시보드로 이동
            router.replace('/dashboard/subscription?success=true')

        } catch (err) {
            setError(err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다.')
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                돌아가기
            </button>

            <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
                {/* Left Column: Payment Method & Terms */}
                <div className="lg:col-span-7 space-y-8">
                    <section>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            결제 수단
                        </h2>
                        <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 dark:bg-primary/10 dark:border-primary/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                    <CreditCard className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">신용/체크카드</p>
                                    <p className="text-sm text-gray-500">한국 발행 모든 카드 지원</p>
                                </div>
                            </div>
                            <Check className="w-5 h-5 text-primary" />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5" />
                            약관 동의
                        </h2>
                        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={agreed}
                                    onChange={(e) => {
                                        setAgreed(e.target.checked)
                                        if (e.target.checked) setError(null)
                                    }}
                                    className="mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                        구매 조건 및 정기 결제 확인
                                    </p>
                                    <p>
                                        본 상품은 정기 구독 상품으로, 매{cycleText} 자동 결제됩니다.
                                        언제든지 해지할 수 있으며, 해지 시 다음 결제일부터 청구되지 않습니다.
                                        구매 조건 및 이용약관에 동의합니다.
                                    </p>
                                </div>
                            </label>
                        </div>
                    </section>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-5 mt-10 lg:mt-0">
                    <div className="sticky top-24 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">
                            주문 요약
                        </h2>

                        <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                                        {plan.name} 플랜
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {billingCycle === 'yearly' ? '연간 결제' : '월간 결제'}
                                    </p>
                                </div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                    ₩{price.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex justify-between">
                                <span>공급가액 ({billingCycle === 'yearly' ? '12개월' : '1개월'})</span>
                                <span>₩{price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>부가세 (10%)</span>
                                <span>₩{(price * 0.1).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">총 결제 금액</span>
                            <span className="text-2xl font-bold text-primary">
                                ₩{totalAmountDisplay}
                            </span>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={handlePayment}
                            disabled={loading}
                            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-[#00C896] hover:bg-[#00B386] hover:shadow-xl hover:-translate-y-0.5'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    처리 중...
                                </span>
                            ) : (
                                `₩${totalAmountDisplay} 결제하기`
                            )}
                        </button>

                        <p className="text-xs text-center text-gray-500 mt-4">
                            안전한 결제를 위해 PortOne의 보안 결제 시스템을 이용합니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
