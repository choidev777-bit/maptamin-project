import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Search, SearchResult } from '@/lib/types'
import { calculateRankTrend } from '@/lib/utils/rank-trend'
import { canAccessPlatform } from '@/lib/utils/subscription'
import { HistoryPageContent } from '@/components/history/HistoryPageContent'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 병렬 데이터 조회 (Vercel best practice: async-parallel)
    const [
        { data: subscription },
        { data: searchesData },
        { data: keywordsData },
    ] = await Promise.all([
        supabase
            .from('user_subscriptions')
            .select('plan_id')
            .eq('user_id', user.id)
            .single(),
        supabase
            .from('searches')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: false }),
        supabase
            .from('managed_keywords')
            .select('keyword, platform')
            .eq('user_id', user.id),
    ])

    const planId = subscription?.plan_id || 'free'
    const canGoogle = canAccessPlatform(planId, 'google')
    const searches = (searchesData as Search[]) || []

    // 주간 리포트의 search_results만 조회 (그래프용)
    const weeklySearchIds = searches
        .filter(s => s.report_type === 'weekly' && s.status === 'completed')
        .map(s => s.id)

    let searchResults: SearchResult[] = []
    if (weeklySearchIds.length > 0) {
        const { data: resultsData } = await supabase
            .from('search_results')
            .select('*')
            .in('search_id', weeklySearchIds)

        searchResults = (resultsData as SearchResult[]) || []
    }

    // 플랫폼별 트렌드 데이터 계산
    const naverSearches = searches.filter(s => s.platform === 'naver')
    const googleSearches = searches.filter(s => s.platform === 'google')

    const naverTrend = calculateRankTrend(naverSearches, searchResults)
    const googleTrend = calculateRankTrend(googleSearches, searchResults)

    // 키워드 목록
    const naverKeywords = keywordsData?.filter(k => k.platform === 'naver').map(k => k.keyword) || []
    const googleKeywords = keywordsData?.filter(k => k.platform === 'google').map(k => k.keyword) || []

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <HistoryPageContent
                searches={searches}
                naverTrend={naverTrend}
                googleTrend={googleTrend}
                naverKeywords={naverKeywords}
                googleKeywords={googleKeywords}
                canGoogle={canGoogle}
            />
        </div>
    )
}
