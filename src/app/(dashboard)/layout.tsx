
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileNav } from '@/components/layout/MobileNav'
import { DesktopNav } from '@/components/layout/DesktopNav'
import { OnboardingGuard } from '@/components/layout/OnboardingGuard'
import { MaptaminLogo } from '@/components/landing/MaptaminLogo'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const userInfo = {
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '사용자',
        avatarUrl: user.user_metadata?.avatar_url || null,
    }

    // Check subscription status for onboarding redirect & ticket counts
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, onboarding_completed, remaining_tickets_naver, remaining_tickets_google')
        .eq('user_id', user.id)
        .single()

    // 유료 플랜인데 온보딩 미완료이면 리다이렉트 (OnboardingGuard가 /onboarding 예외 처리)
    // TODO: 결제 시스템 구현 후 아래 주석 해제
    // const shouldRedirectToOnboarding =
    //     !!subscription && subscription.plan_id !== 'free' && !subscription.onboarding_completed
    const shouldRedirectToOnboarding = false

    return (
        <OnboardingGuard shouldRedirect={shouldRedirectToOnboarding}>
            <div className="min-h-screen bg-gray-50">
                {/* Desktop Header */}
                <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            {/* Logo */}
                            <a href="/dashboard" className="flex items-center gap-2">
                                <MaptaminLogo />
                            </a>

                            {/* Desktop Navigation */}
                            <div className="hidden md:block">
                                <DesktopNav user={userInfo} subscription={subscription} />
                            </div>

                            {/* Mobile Menu */}
                            <div className="md:hidden">
                                <MobileNav user={userInfo} subscription={subscription} />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                    {children}
                </main>
            </div>
        </OnboardingGuard>
    )
}
