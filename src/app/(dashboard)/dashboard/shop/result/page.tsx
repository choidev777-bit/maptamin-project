'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { CheckCircle2, Ticket, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

function PaymentResultContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)

    // Hydration mismatch 방지 & 데이터 최신화 (상단 네비게이터 티켓 수 갱신)
    useEffect(() => {
        setMounted(true)
        router.refresh()
    }, [router])

    if (!mounted) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const quantity = searchParams.get('quantity')
    const amount = searchParams.get('amount')
    const platform = searchParams.get('platform')

    // URL 직접 접근 등으로 파라미터가 없으면 상점으로 리다이렉트
    if (!quantity || !amount) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <h2 className="text-xl font-semibold mb-4">잘못된 접근입니다.</h2>
                <Button onClick={() => router.push('/dashboard/shop')}>
                    상점으로 돌아가기
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm border border-slate-100 text-center">
            <div className="flex justify-center mb-6">
                <div className="bg-green-100 p-4 rounded-full">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-2">
                결제가 완료되었습니다!
            </h1>
            <p className="text-slate-500 mb-8">
                구매하신 티켓이 정상적으로 지급되었습니다.
            </p>

            <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <span className="text-slate-600 font-medium flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        구매 상품
                    </span>
                    <span className="font-semibold text-slate-900">
                        {platform === 'naver' ? '네이버' : '구글'} 실시간 분석 티켓
                    </span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                    <span className="text-slate-600 font-medium">구매 수량</span>
                    <span className="font-semibold text-slate-900">{quantity}장</span>
                </div>

                <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-600 font-medium">결제 금액</span>
                    <span className="text-xl font-bold text-primary">
                        {Number(amount).toLocaleString()}원
                    </span>
                </div>
            </div>

            <Button
                className="w-full h-12 text-lg font-medium"
                onClick={() => router.replace('/dashboard')}
            >
                대시보드로 이동
                <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
        </div>
    )
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <PaymentResultContent />
        </Suspense>
    )
}
