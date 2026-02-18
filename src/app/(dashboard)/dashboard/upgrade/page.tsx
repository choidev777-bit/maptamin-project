import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UpgradePageContent } from './UpgradePageContent'

export default async function UpgradePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id')
        .eq('user_id', user.id)
        .single()

    const VALID_PLANS = ['free', 'starter', 'pro', 'premium']
    const currentPlanId = (subscription?.plan_id && VALID_PLANS.includes(subscription.plan_id))
        ? subscription.plan_id
        : 'free'

    return <UpgradePageContent currentPlanId={currentPlanId} />
}
