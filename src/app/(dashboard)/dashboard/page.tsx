import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

import { SearchHistoryCard } from '@/components/dashboard/SearchHistoryCard'
import { DeleteAllButton } from '@/components/dashboard/DeleteAllButton'
import { DashboardPlatformCard } from '@/components/dashboard/DashboardPlatformCard'
import { SubscriptionBanner } from '@/components/dashboard/SubscriptionBanner'
import { SearchHistorySection } from '@/components/dashboard/SearchHistorySection'
import { Search } from '@/lib/types'
import { Plus, Search as SearchIcon } from 'lucide-react'
import { canAccessPlatform, isSubscribed } from '@/lib/utils/subscription'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch user subscription
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id')
        .eq('user_id', user?.id)
        .single()

    const planId = subscription?.plan_id || 'free'
    const subscribed = isSubscribed(planId)
    const canNaver = canAccessPlatform(planId, 'naver')
    const canGoogle = canAccessPlatform(planId, 'google')

    // Fetch user's searches (전체)
    const { data: searches } = await supabase
        .from('searches')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    // Fetch managed places
    const { data: managedPlaces } = await supabase
        .from('managed_places')
        .select('*')
        .eq('user_id', user?.id)

    // Fetch managed competitors
    const { data: competitors } = await supabase
        .from('managed_competitors')
        .select('*')
        .eq('user_id', user?.id)

    // Fetch managed keywords
    const { data: managedKeywords } = await supabase
        .from('managed_keywords')
        .select('keyword, platform')
        .eq('user_id', user?.id)

    const naverShop = managedPlaces?.find(p => p.platform === 'naver') || null
    const googleShop = managedPlaces?.find(p => p.platform === 'google') || null

    const naverCompetitors = competitors?.filter(c => c.platform === 'naver') || []
    const googleCompetitors = competitors?.filter(c => c.platform === 'google') || []

    const naverKeywords = managedKeywords?.filter(k => k.platform === 'naver').map(k => k.keyword) || []
    const googleKeywords = managedKeywords?.filter(k => k.platform === 'google').map(k => k.keyword) || []

    return (
        <div className="max-w-6xl mx-auto">
            {/* Subscription Banner (free 사용자) */}
            {!subscribed && <SubscriptionBanner />}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="text-gray-600 mt-1">로컬 검색 순위를 추적하세요</p>
                </div>
            </div>

            {/* My Shop Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <DashboardPlatformCard
                    platform="naver"
                    data={naverShop}
                    competitorCount={naverCompetitors.length}
                    firstCompetitorName={naverCompetitors[0]?.place_name}
                    isLocked={!canNaver}
                    keywords={naverKeywords}
                />
                <DashboardPlatformCard
                    platform="google"
                    data={googleShop}
                    competitorCount={googleCompetitors.length}
                    firstCompetitorName={googleCompetitors[0]?.place_name}
                    isLocked={!canGoogle}
                    keywords={googleKeywords}
                />
            </div>

            {/* Search History Section (페이지네이션 포함) */}
            <SearchHistorySection searches={(searches as Search[]) || []} />
        </div>
    )
}
