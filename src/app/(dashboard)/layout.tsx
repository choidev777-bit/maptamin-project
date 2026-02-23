
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingGuard } from '@/components/layout/OnboardingGuard'
import { DashboardShell } from '@/components/layout/DashboardShell'

export const dynamic = 'force-dynamic'

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
    const shouldRedirectToOnboarding =
        !!subscription && subscription.plan_id !== 'free' && !subscription.onboarding_completed

    return (
        <OnboardingGuard shouldRedirect={shouldRedirectToOnboarding}>
            <DashboardShell user={userInfo} subscription={subscription}>
                {children}
            </DashboardShell>
        </OnboardingGuard>
    )
}
