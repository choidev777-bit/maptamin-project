'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

export function PaymentSuccessToast() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (searchParams.get('payment') === 'success') {
            setIsVisible(true)

            // 3초 후 토스트 숨기기
            const hideTimer = setTimeout(() => {
                setIsVisible(false)
            }, 3000)

            // URL에서 파라미터 제거 (선택 사항)
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('payment')
            window.history.replaceState({}, '', newUrl.toString())

            return () => clearTimeout(hideTimer)
        }
    }, [searchParams])

    if (!isVisible) return null

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
            <div className="bg-[#00C896] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-1">
                    <Check className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">결제가 성공적으로 완료되었습니다.</span>
            </div>
        </div>
    )
}
