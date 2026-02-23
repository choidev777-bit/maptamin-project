'use client'

import Link from 'next/link'
import { Rocket } from 'lucide-react'

/**
 * 유료 구독자 중 온보딩 미완료 유저 전용 대시보드 배너
 * 온보딩 완료를 유도하는 CTA 표시
 */
export function OnboardingBanner() {
    return (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#00C896]/10 via-emerald-50 to-teal-50 border border-[#00C896]/20 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00C896]/20">
                        <Rocket className="h-5 w-5 text-[#00C896]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">매장 설정을 완료하고 무료 리포트를 받아보세요!</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            간단한 설정만 완료하면 첫 번째 분석 리포트를 바로 받을 수 있어요
                        </p>
                    </div>
                </div>
                <Link
                    href="/onboarding"
                    className="shrink-0 rounded-xl bg-[#00C896] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#00C896]/25 hover:bg-[#00B386] transition-all hover:-translate-y-0.5"
                >
                    온보딩 시작하기
                </Link>
            </div>
        </div>
    )
}
