'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { requestBillingKey } from '@/lib/portone/subscription-client'
import { PLAN_CONFIG } from '@/lib/pricing/config'
import { createClient } from '@/lib/supabase/client'
import { EmailInput, isValidEmail } from '@/components/ui/EmailInput'

/* ──────────────────────────────────────────────
 * 유효한 유료 플랜 ID
 * ────────────────────────────────────────────── */
const PAID_PLAN_IDS = ['starter', 'pro', 'premium'] as const
type PaidPlanId = typeof PAID_PLAN_IDS[number]

function isPaidPlan(id: string | null): id is PaidPlanId {
    return id !== null && PAID_PLAN_IDS.includes(id as PaidPlanId)
}

export function CheckoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const planId = searchParams.get('plan')

    const [loading, setLoading] = useState(false)
    const [agreed, setAgreed] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [email, setEmail] = useState('')
    const [emailLoading, setEmailLoading] = useState(true)
    const [hasExistingEmail, setHasExistingEmail] = useState(false)

    // 기존 이메일 로드
    useEffect(() => {
        const loadEmail = async () => {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                // 1순위: user_subscriptions.notification_email
                const { data: sub } = await supabase
                    .from('user_subscriptions')
                    .select('notification_email')
                    .eq('user_id', user.id)
                    .single()

                if (sub?.notification_email) {
                    setEmail(sub.notification_email)
                    setHasExistingEmail(true)
                } else if (user.email) {
                    // 2순위: auth user.email
                    setEmail(user.email)
                    setHasExistingEmail(true)
                }
            } catch {
                // 이메일 로드 실패는 무시 (사용자가 직접 입력)
            } finally {
                setEmailLoading(false)
            }
        }
        loadEmail()
    }, [])

    // Validate params
    const isValidPlan = isPaidPlan(planId)

    useEffect(() => {
        if (!isValidPlan) {
            router.replace('/dashboard/subscription')
        }
    }, [isValidPlan, router])

    if (!isValidPlan) return null

    const plan = PLAN_CONFIG[planId]
    // ⚠️ PLAN_CONFIG의 price는 VAT 포함 최종가 — 별도 가산 없음
    const totalAmount = plan.price
    const totalAmountDisplay = totalAmount.toLocaleString()

    const handlePayment = async () => {
        if (!agreed) {
            setError('이용 약관에 동의해주세요.')
            return
        }

        if (!email || !isValidEmail(email)) {
            setError('유효한 이메일 주소를 입력해주세요.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const termsAgreedAt = new Date().toISOString()

            // 1. PortOne SDK로 빌링키 발급 (결제창 팝업)
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
                    email,
                    termsAgreedAt: new Date().toISOString(), // 약관 동의 시각 기록
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || '구독 시작에 실패했습니다.')
            }

            // 3. 성공 -> 신규 가입 vs 업그레이드 분기
            // 신규 가입(온보딩 미완료) → /onboarding
            // 플랜 업그레이드(온보딩 완료) → /dashboard/subscription?success=true
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { data: sub } = await supabase
                .from('user_subscriptions')
                .select('onboarding_completed')
                .single()

            if (sub && !sub.onboarding_completed) {
                router.replace('/onboarding')
            } else {
                router.replace('/dashboard/subscription?success=true')
            }

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
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <CreditCard className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">신용/체크카드</p>
                            </div>
                        </div>
                    </section>

                    {/* Email Section */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            결제 알림 이메일
                        </h2>
                        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            {emailLoading ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    이메일 확인 중...
                                </div>
                            ) : (
                                <>
                                    <EmailInput
                                        value={email}
                                        onChange={(val) => {
                                            setEmail(val)
                                            if (error === '유효한 이메일 주소를 입력해주세요.') setError(null)
                                        }}
                                        required
                                    />
                                    <p className="mt-2 text-xs text-gray-500">
                                        결제 영수증, 갱신 안내 등 결제 관련 알림이 이 이메일로 발송됩니다.
                                    </p>
                                </>
                            )}
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
                                        본 상품은 정기 구독 상품으로, 매월 자동 결제됩니다.
                                        언제든지 해지할 수 있으며, 해지 시 다음 결제일부터 청구되지 않습니다.
                                        {' '}<a href="/terms" target="_blank" className="underline text-primary hover:text-primary/80">이용약관</a> 및{' '}
                                        <a href="/privacy" target="_blank" className="underline text-primary hover:text-primary/80">개인정보처리방침</a>에 동의합니다.
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
                                        월간 결제
                                    </p>
                                </div>
                                <p className="font-semibold text-gray-900 dark:text-gray-100">
                                    ₩{totalAmountDisplay}
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">총 결제 금액</span>
                                <p className="text-xs text-gray-400 mt-0.5">VAT 포함</p>
                            </div>
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


                    </div>
                </div>
            </div>

            {/* 사업자 정보 (PG사/카드사 심사 필수 노출) */}
            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-xs font-semibold text-gray-500 mb-1">아카식 허브</p>
                <div className="space-y-0.5 text-[11px] text-gray-400">
                    <p>대표: 최연준 | 사업자등록번호: 186-35-01741 | 통신판매업신고: 제 2026-고양일산서-0229 호</p>
                    <p>주소: 경기도 고양시 일산서구 대산로 142, 305동 802호 | 대표번호: 070-8065-3362</p>
                </div>
            </div>
        </div>
    )
}
