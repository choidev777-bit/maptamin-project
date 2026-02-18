'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
    shouldRedirect: boolean
    children: React.ReactNode
}

/**
 * 온보딩 미완료 유저를 /onboarding으로 리다이렉트하는 가드
 * 단, 이미 /onboarding에 있으면 리다이렉트하지 않음 (뺑뺑이 방지)
 */
export function OnboardingGuard({ shouldRedirect, children }: Props) {
    const pathname = usePathname()
    const router = useRouter()
    const isOnboardingPage = pathname.startsWith('/onboarding')

    useEffect(() => {
        if (shouldRedirect && !isOnboardingPage) {
            router.replace('/onboarding')
        }
    }, [shouldRedirect, isOnboardingPage, router])

    // 리다이렉트 대기 중이면 로딩 표시
    if (shouldRedirect && !isOnboardingPage) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-[#00C896] border-t-transparent rounded-full" />
            </div>
        )
    }

    return <>{children}</>
}
