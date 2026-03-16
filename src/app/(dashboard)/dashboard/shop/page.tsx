import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TicketShopContent } from '@/components/dashboard/TicketShopContent'

export const metadata = {
    title: '티켓 구매 - 맵타민',
    description: '실시간 분석 티켓을 추가 구매하세요.',
}

export default async function ShopPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, remaining_tickets_naver, remaining_tickets_google')
        .eq('user_id', user?.id)
        .single()

    const planId = subscription?.plan_id || 'free'

    // 무료 플랜은 티켓 구매 불가 → 구독 페이지로 이동
    if (planId === 'free') {
        redirect('/dashboard/subscription')
    }

    const remainingTicketsNaver = subscription?.remaining_tickets_naver || 0
    const remainingTicketsGoogle = subscription?.remaining_tickets_google || 0

    return (
        <TicketShopContent
            planId={planId}
            remainingTicketsNaver={remainingTicketsNaver}
            remainingTicketsGoogle={remainingTicketsGoogle}
        />
    )
}

