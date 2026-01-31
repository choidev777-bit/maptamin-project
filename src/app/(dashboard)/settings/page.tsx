import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsContent } from './SettingsContent'
import { PLAN_CONFIG } from '@/lib/pricing/config'
import { UserCredits } from '@/lib/types'

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
    }

    // Fetch User Credits
    const { data: userCredits } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single()

    const planId = (userCredits as UserCredits)?.plan_id || 'light'
    const planConfig = PLAN_CONFIG[planId] || PLAN_CONFIG['light']

    // planConfig.limits.competitor (singular) is correct per config.ts
    const planStats = {
        plan: planId as 'light' | 'basic' | 'pro',
        limitCompetitor: planConfig.limits.competitor,
        maxSearchesPerDay: 1,
    }

    return <SettingsContent user={userInfo} planStats={planStats} />
}
