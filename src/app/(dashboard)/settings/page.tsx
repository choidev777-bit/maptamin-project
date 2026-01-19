import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsContent } from './SettingsContent'

export default async function SettingsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Get user's usage stats
    const today = new Date().toISOString().split('T')[0]
    const { data: todayUsage } = await supabase
        .from('daily_usage')
        .select('search_count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .single()

    // Get total searches
    const { count: totalSearches } = await supabase
        .from('searches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    const userInfo = {
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '사용자',
        avatarUrl: user.user_metadata?.avatar_url || null,
        createdAt: user.created_at,
    }

    const stats = {
        searchesToday: todayUsage?.search_count || 0,
        totalSearches: totalSearches || 0,
        plan: 'free' as const,
        maxSearchesPerDay: 1,
    }

    return <SettingsContent user={userInfo} stats={stats} />
}
