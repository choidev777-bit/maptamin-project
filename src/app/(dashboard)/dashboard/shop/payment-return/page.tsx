'use client'

/**
 * 티켓 결제 모바일 리다이렉션 복귀 페이지
 *
 * 카카오페이 등 모바일 REDIRECTION 방식 결제 완료 후 돌아오는 페이지.
 * PortOne SDK 모바일 환경에서는 `requestPayment()` Promise가 resolve되지 않으므로,
 * `redirectUrl`로 이 페이지를 지정한 후 여기서 서버 검증 API를 직접 호출한다.
 *
 * 포트원 V2 redirectUrl 쿼리 파라미터:
 *   - payment_id: 결제 건 ID (성공 시)
 *   - code: 오류 코드 (실패 시)
 *   - message: 오류 메시지 (실패 시)
 *
 * 이 페이지로 넘어올 때 추가 쿼리 파라미터 (client.ts에서 redirectUrl에 포함):
 *   - platform: 'naver' | 'google'
 *   - quantity: 구매 수량 (string)
 *   - amount: 결제 금액 (string, 결과 페이지 표시용)
 *
 * @see https://developers.portone.io/opi/ko/integration/start/v2/checkout (3-1. redirect 방식)
 */

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'

function PaymentReturnContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [status, setStatus] = useState<'processing' | 'error'>('processing')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        async function handleReturn() {
            // 포트원 V2 리다이렉션 쿼리 파라미터
            const portonePaymentId = searchParams.get('payment_id')  // PortOne이 붙여주는 키
            const portoneCode = searchParams.get('code')

            // 고객사 커스텀 파라미터 (redirectUrl에 포함시킨 것)
            const platform = searchParams.get('platform')
            const quantityStr = searchParams.get('quantity')
            const amount = searchParams.get('amount')

            // 1. 포트원이 오류 코드를 반환한 경우 (결제 실패/취소)
            if (portoneCode) {
                const message = searchParams.get('message') || '결제가 취소되었습니다.'
                setErrorMessage(message)
                setStatus('error')
                // 3초 후 상점으로 이동
                setTimeout(() => {
                    router.replace('/dashboard/shop')
                }, 3000)
                return
            }

            // 2. 필수 파라미터 검증
            if (!portonePaymentId || !platform || !quantityStr) {
                setErrorMessage('결제 정보가 올바르지 않습니다. 상점으로 돌아갑니다.')
                setStatus('error')
                setTimeout(() => {
                    router.replace('/dashboard/shop')
                }, 3000)
                return
            }

            const quantity = parseInt(quantityStr, 10)
            if (isNaN(quantity) || quantity < 1) {
                setErrorMessage('결제 정보가 올바르지 않습니다. 상점으로 돌아갑니다.')
                setStatus('error')
                setTimeout(() => {
                    router.replace('/dashboard/shop')
                }, 3000)
                return
            }

            // 3. 서버 결제 검증 API 호출
            try {
                const response = await fetch('/api/payment/ticket', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentId: portonePaymentId,
                        platform,
                        quantity,
                    }),
                })

                const data = await response.json()

                if (!response.ok || !data.success) {
                    setErrorMessage(data.error || '결제 검증에 실패했습니다. 고객센터에 문의해주세요.')
                    setStatus('error')
                    setTimeout(() => {
                        router.replace('/dashboard/shop')
                    }, 3000)
                    return
                }

                // 4. 성공 → 결과 페이지로 이동
                router.replace(
                    `/dashboard/shop/result?quantity=${quantity}&amount=${amount ?? ''}&platform=${platform}`
                )
            } catch {
                setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
                setStatus('error')
                setTimeout(() => {
                    router.replace('/dashboard/shop')
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
                <p className="text-xs text-gray-400">잠시 후 상점으로 이동합니다...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">결제 처리 중...</h2>
            <p className="text-sm text-gray-500">잠시만 기다려주세요.</p>
        </div>
    )
}

export default function TicketPaymentReturnPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <PaymentReturnContent />
        </Suspense>
    )
}
