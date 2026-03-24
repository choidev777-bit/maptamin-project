import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ChevronRight } from 'lucide-react'

import { SubscriptionBanner } from '@/components/dashboard/SubscriptionBanner'
import { OnboardingBanner } from '@/components/dashboard/OnboardingBanner'
import { FreeTrialBanner } from '@/components/dashboard/FreeTrialBanner'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardMetricsToggle } from '@/components/dashboard/DashboardMetricsToggle'
import { DashboardPlatformCard } from '@/components/dashboard/DashboardPlatformCard'
import { SearchHistorySection } from '@/components/dashboard/SearchHistorySection'
import { Search, SearchResult } from '@/lib/types'
import { canAccessPlatform, isSubscribed } from '@/lib/utils/subscription'
import { calculateWeeklyInsights } from '@/lib/utils/insights'
import { getPlanLimit } from '@/lib/pricing/config'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch user subscription (Tickets)
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, remaining_tickets_naver, remaining_tickets_google, onboarding_completed, free_trial_used')
        .eq('user_id', user?.id)
        .single()

    const planId = subscription?.plan_id || 'free'
    const subscribed = isSubscribed(planId)
    const canNaver = canAccessPlatform(planId, 'naver')
    const canGoogle = canAccessPlatform(planId, 'google')
    const limits = getPlanLimit(planId)

    // Quick Stats Data
    const remainingNaverTickets = subscription?.remaining_tickets_naver || 0
    const remainingGoogleTickets = subscription?.remaining_tickets_google || 0

    // Fetch user's searches (전체) for history and insights
    const { data: searchesData } = await supabase
        .from('searches')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    const searches = (searchesData as Search[]) || []

    // Fetch Search Results for calculating insights based on scheduled reports
    // We need results related to 'daily' and 'weekly' searches
    const scheduledSearchIds = searches.filter(s => s.report_type === 'daily' || s.report_type === 'weekly').map(s => s.id)

    let searchResults: SearchResult[] = []
    if (scheduledSearchIds.length > 0) {
        // Supabase PostgREST max_rows=1000 서버 제한 우회: 페이지네이션
        const PAGE_SIZE = 1000
        let page = 0
        let hasMore = true
        while (hasMore) {
            const from = page * PAGE_SIZE
            const to = from + PAGE_SIZE - 1
            const { data: chunk } = await supabase
                .from('search_results')
                .select('*')
                .in('search_id', scheduledSearchIds)
                .range(from, to)

            if (chunk && chunk.length > 0) {
                searchResults.push(...(chunk as SearchResult[]))
                hasMore = chunk.length === PAGE_SIZE
                page++
            } else {
                hasMore = false
            }
        }
    }

    const naverSearches = searches.filter(s => s.platform === 'naver')
    const googleSearches = searches.filter(s => s.platform === 'google')

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
        .select('keyword, platform, keyword_type')
        .eq('user_id', user?.id)

    // Fetch Schedules to determine Auto Report status
    const { data: schedules } = await supabase
        .from('search_schedules')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)

    const hasActiveWeeklyReport = (schedules || []).length > 0;
    // 네이버는 매일, 구글은 주 1회이므로 다음 리포트까지 최단 1일
    const nextReportDate = hasActiveWeeklyReport ? new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) : null;

    const naverShop = managedPlaces?.find(p => p.platform === 'naver') || null
    const googleShop = managedPlaces?.find(p => p.platform === 'google') || null

    const naverCompetitors = competitors?.filter(c => c.platform === 'naver') || []
    const googleCompetitors = competitors?.filter(c => c.platform === 'google') || []

    const naverIndustryKeywords = managedKeywords?.filter(k => k.platform === 'naver' && (k.keyword_type === 'industry' || !k.keyword_type)).map(k => k.keyword) || []
    const naverLocalKeywords = managedKeywords?.filter(k => k.platform === 'naver' && k.keyword_type === 'local').map(k => k.keyword) || []
    const googleKeywords = managedKeywords?.filter(k => k.platform === 'google').map(k => k.keyword) || []

    // Insights 계산 (keyword 분리 후)
    const naverIndustryInsightsRaw = calculateWeeklyInsights(
        naverSearches, searchResults,
        naverIndustryKeywords.length > 0 ? naverIndustryKeywords : undefined
    )
    const naverLocalInsightsRaw = calculateWeeklyInsights(
        naverSearches, searchResults,
        naverLocalKeywords.length > 0 ? naverLocalKeywords : undefined
    )
    const googleInsightsRaw = calculateWeeklyInsights(googleSearches, searchResults)

    // 데모 계정 전용 인사이트 오버라이드 (지정 키워드·수치 고정 표시)
    const DEMO_USER_ID = 'c9441bda-c9b0-44fa-ac95-d7449d928c87'
    const isDemo = user?.id === DEMO_USER_ID

    const naverIndustryInsights = isDemo ? {
        rising:   { keyword: '룸술집', rankChange: 3.5,  currentRank: 5,  previousRank: 8.5 },
        dropping: { keyword: '회식',   rankChange: -4.7, currentRank: 13, previousRank: 8.3 },
        hasData: true,
    } : naverIndustryInsightsRaw

    const naverLocalInsights = isDemo ? {
        rising:   { keyword: '선릉역 룸술집', rankChange: 2,  currentRank: 4, previousRank: 6 },
        dropping: { keyword: '선릉역 하이볼', rankChange: -3, currentRank: 7, previousRank: 4 },
        hasData: true,
    } : naverLocalInsightsRaw

    const googleInsights = isDemo ? {
        rising:   { keyword: '선릉역 룸술집', rankChange: 4,  currentRank: 8,  previousRank: 12 },
        dropping: { keyword: '선릉역 하이볼', rankChange: -2, currentRank: 15, previousRank: 13 },
        hasData: true,
    } : googleInsightsRaw

    const naverData = {
        industryInsights: naverIndustryInsights,
        localInsights: naverLocalInsights,
        hasLocalKeywords: naverLocalKeywords.length > 0,
    }

    const googleData = {
        industryInsights: googleInsights,
    }

    return (
        <div className="max-w-7xl mx-auto pb-12">
            {!subscribed && <SubscriptionBanner />}

            {/* Free Trial Banner (free 플랜 + 무료체험 미사용) */}
            {planId === 'free' && !subscription?.free_trial_used && <FreeTrialBanner />}

            {/* Onboarding Banner (유료 + 온보딩 미완료) */}
            {subscribed && !subscription?.onboarding_completed && <OnboardingBanner />}

            {/* Dashboard Header */}
            <DashboardHeader
                hasActiveWeeklyReport={hasActiveWeeklyReport}
                nextReportDate={nextReportDate}
            />

            {/* Main Content Area */}
            <div className="flex flex-col gap-8">

                {/* Section 1: Registered Places (최상단) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-slate-700 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">등록된 내 매장</h3>
                        <Link href="/settings" className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors">
                            매장 관리 <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DashboardPlatformCard
                            platform="naver"
                            data={naverShop}
                            competitorCount={naverCompetitors.length}
                            firstCompetitorName={naverCompetitors[0]?.place_name}
                            isLocked={!canNaver}
                            keywords={naverIndustryKeywords}
                            localKeywords={naverLocalKeywords}
                            maxKeywords={limits.keywordsNaver}
                            maxLocalKeywords={limits.localKeywordsNaver}
                            maxCompetitors={limits.competitorsNaver}
                            planId={planId}
                        />
                        <DashboardPlatformCard
                            platform="google"
                            data={googleShop}
                            competitorCount={googleCompetitors.length}
                            firstCompetitorName={googleCompetitors[0]?.place_name}
                            isLocked={!canGoogle}
                            keywords={googleKeywords}
                            maxKeywords={limits.keywordsGoogle}
                            maxCompetitors={limits.competitorsGoogle}
                            planId={planId}
                        />
                    </div>
                </div>

                {/* Section 2: Platform Toggle + Weekly Insights */}
                <DashboardMetricsToggle
                    naverData={naverData}
                    googleData={googleData}
                    canGoogle={canGoogle}
                />

                {/* Section 3: Search History Table */}
                <SearchHistorySection searches={searches} />
            </div>
        </div>
    )
}
