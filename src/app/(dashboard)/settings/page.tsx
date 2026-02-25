import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsContent } from './SettingsContent'
import { PLAN_CONFIG } from '@/lib/pricing/config'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const userInfo = {
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '사용자',
        avatarUrl: user.user_metadata?.avatar_url || null,
        createdAt: user.created_at,
        notificationEmail: '' as string, // 아래에서 subscription 조회 후 설정
    }

    // Fetch User Subscription
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, notification_email')
        .eq('user_id', user.id)
        .single()

    const planId = subscription?.plan_id || 'free'
    const planConfig = PLAN_CONFIG[planId] || PLAN_CONFIG['free']

    // notification_email 설정 (subscription 조회 후)
    userInfo.notificationEmail = subscription?.notification_email || user.email || ''

    const planStats = {
        plan: planId as 'free' | 'starter' | 'pro' | 'premium',
        limitCompetitorNaver: planConfig.competitorsNaver,
        limitCompetitorGoogle: planConfig.competitorsGoogle,
        limitKeywordsNaver: planConfig.keywordsNaver,
        limitKeywordsGoogle: planConfig.keywordsGoogle,
        maxSearchesPerDay: 1,
    }

    return <SettingsContent user={userInfo} planStats={planStats} />
}
