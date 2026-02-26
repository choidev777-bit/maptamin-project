import { createClient } from '@/lib/supabase/server'
import { SubscriptionContent } from '@/components/dashboard/SubscriptionContent'

export const metadata = {
    title: '구독 관리 - 맵타민',
    description: '정기 구독 플랜을 관리하고 결제 수단을 변경하세요.',
}

export default async function SubscriptionPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    // 현재 구독 정보 조회
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, remaining_tickets_naver, remaining_tickets_google, current_period_start, current_period_end')
        .eq('user_id', user?.id)
        .single()

    // 빌링 정보 조회
    const { data: billing } = await supabase
        .from('subscription_billing')
        .select('billing_key, card_last4, card_brand, plan_id, status, next_billing_date, pending_plan_id')
        .eq('user_id', user?.id)
        .single()

    // 결제 이력 조회 (최신순 5개)
    const { data: history } = await supabase
        .from('subscription_payment_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5)

    return (
        <SubscriptionContent
            currentPlanId={subscription?.plan_id || 'free'}
            remainingTicketsNaver={subscription?.remaining_tickets_naver || 0}
            remainingTicketsGoogle={subscription?.remaining_tickets_google || 0}
            currentPeriodEnd={subscription?.current_period_end || null}
            billingStatus={billing?.status || null}
            cardLast4={billing?.card_last4 || null}
            cardBrand={billing?.card_brand || null}
            nextBillingDate={billing?.next_billing_date || null}
            pendingPlanId={billing?.pending_plan_id || null}
            paymentHistory={history || []}
        />
    )
}
