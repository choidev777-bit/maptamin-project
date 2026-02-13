
import { createClient } from '@/lib/supabase/server'
import { CompetitorManagementView } from '@/components/competitor/CompetitorManagementView'
import { PLAN_CONFIG } from '@/lib/pricing/config'

export const dynamic = 'force-dynamic'

export default async function NaverCompetitorPage() {
    const supabase = await createClient()

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <div>Auth required</div>

    // 2. Get Competitors
    const { data: competitors } = await supabase
        .from('managed_competitors')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'naver')
        .order('created_at', { ascending: true })

    // 3. Get Plan Limits
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id')
        .eq('user_id', user.id)
        .single()

    const planId = subscription?.plan_id || 'starter'
    const planConfig = PLAN_CONFIG[planId] || PLAN_CONFIG['starter']
    const maxSlots = planConfig.competitors

    return (
        <div className="max-w-6xl mx-auto py-8">
            <CompetitorManagementView
                platform="naver"
                competitors={competitors || []}
                maxSlots={maxSlots}
                userId={user.id}
            />
        </div>
    )
}
