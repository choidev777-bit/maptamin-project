'use client'

/**
 * 구독 빌링키 발급 모바일 리다이렉션 복귀 페이지
 *
 * 카카오페이 등 모바일 REDIRECTION 방식 빌링키 발급 완료 후 돌아오는 페이지.
 * PortOne SDK 모바일 환경에서는 `requestIssueBillingKey()` Promise가 resolve되지 않으므로,
 * `redirectUrl`로 이 페이지를 지정한 후 여기서 구독 시작 API를 직접 호출한다.
 *
 * 포트원 V2 redirectUrl 쿼리 파라미터:
 *   - billing_key: 발급된 빌링키 (성공 시)
 *   - code: 오류 코드 (실패 시)
 *   - message: 오류 메시지 (실패 시)
 *
 * 이 페이지로 넘어올 때 추가 쿼리 파라미터 (subscription-client.ts에서 redirectUrl에 포함):
 *   - planId: 구독 플랜 ID
 *   - email: 결제 알림 이메일 (URL 인코딩)
 *   - termsAgreedAt: 약관 동의 시각 (ISO 8601)
 *
 * @see https://developers.portone.io/opi/ko/integration/start/v2/checkout (3-1. redirect 방식)
 */

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle } from 'lucide-react'

function BillingKeyReturnContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [status, setStatus] = useState<'processing' | 'error'>('processing')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        async function handleReturn() {
            // 포트원 V2 리다이렉션 쿼리 파라미터
            const billingKey = searchParams.get('billing_key')  // PortOne이 붙여주는 키
            const portoneCode = searchParams.get('code')

            // 고객사 커스텀 파라미터 (redirectUrl에 포함시킨 것)
            const planId = searchParams.get('planId')
            const email = searchParams.get('email')
            const termsAgreedAt = searchParams.get('termsAgreedAt')

            // 1. 포트원이 오류 코드를 반환한 경우 (발급 실패/취소)
            if (portoneCode) {
                const message = searchParams.get('message') || '카카오페이 등록이 취소되었습니다.'
                setErrorMessage(message)
                setStatus('error')
                setTimeout(() => {
                    router.replace(planId
                        ? `/dashboard/subscription/checkout?plan=${planId}`
                        : '/dashboard/subscription'
                    )
                }, 3000)
                return
            }

            // 2. 필수 파라미터 검증
            if (!billingKey || !planId) {
                setErrorMessage('결제 정보가 올바르지 않습니다. 체크아웃으로 돌아갑니다.')
                setStatus('error')
                setTimeout(() => {
                    router.replace('/dashboard/subscription')
                }, 3000)
                return
            }

            // 3. 구독 시작 API 호출
            try {
                const response = await fetch('/api/payment/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        billingKey,
                        planId,
                        email: email ?? '',
                        termsAgreedAt: termsAgreedAt ?? new Date().toISOString(),
                    }),
                })

                const data = await response.json()

                if (!response.ok) {
                    setErrorMessage(data.error || '구독 시작에 실패했습니다. 고객센터에 문의해주세요.')
                    setStatus('error')
                    setTimeout(() => {
                        router.replace(`/dashboard/subscription/checkout?plan=${planId}`)
                    }, 3000)
                    return
                }

                // 4. 성공 → 온보딩 미완료 vs 완료 분기 (CheckoutContent.tsx L128-138 패턴 동일)
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
            } catch {
                setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
                setStatus('error')
                setTimeout(() => {
                    router.replace(`/dashboard/subscription/checkout?plan=${planId ?? ''}`)
                }, 3000)
            }
        }

        handleReturn()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (status === 'error' && errorMessage) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
                <div className="bg-red-100 p-4 rounded-full mb-4">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">결제 처리 실패</h2>
                <p className="text-sm text-gray-500 mb-4">{errorMessage}</p>
                <p className="text-xs text-gray-400">잠시 후 체크아웃으로 이동합니다...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">구독 처리 중...</h2>
            <p className="text-sm text-gray-500">잠시만 기다려주세요.</p>
        </div>
    )
}

export default function SubscriptionPaymentReturnPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <BillingKeyReturnContent />
        </Suspense>
    )
}
