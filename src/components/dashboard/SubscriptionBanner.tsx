'use client'

import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

/**
 * 미구독자(free) 전용 대시보드 상단 배너
 * 구독 유도 CTA 표시
 */
export function SubscriptionBanner() {
    const router = useRouter()

    return (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#00C896]/10 via-emerald-50 to-teal-50 border border-[#00C896]/20 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00C896]/20">
                        <Sparkles className="h-5 w-5 text-[#00C896]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">맵타민을 시작하려면 구독이 필요합니다</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            구독하고 내 가게의 지도 검색 순위를 분석해보세요
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => router.push('/dashboard/upgrade')}
                    className="shrink-0 rounded-xl bg-[#00C896] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#00C896]/25 hover:bg-[#00B386] transition-all hover:-translate-y-0.5"
                >
                    구독하기
                </button>
            </div>
        </div>
    )
}
