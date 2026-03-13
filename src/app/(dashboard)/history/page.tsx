import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Search, SearchResult } from '@/lib/types'
import { calculateRankTrend, extractKeywordsFromTrend } from '@/lib/utils/rank-trend'
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
        { data: placesData },
    ] = await Promise.all([
        supabase
            .from('user_subscriptions')
            .select('plan_id')
            .eq('user_id', user.id)
            .single(),
        supabase
            .from('searches')
            .select('*')
            .eq('user_id', user.id)       // 보안: 본인 데이터만
            .is('deleted_at', null)
            .order('created_at', { ascending: false }),
        supabase
            .from('managed_places')
            .select('place_id, platform')
            .eq('user_id', user.id),
    ])

    const planId = subscription?.plan_id || 'free'
    const canGoogle = canAccessPlatform(planId, 'google')
    const searches = (searchesData as Search[]) || []

    // 플랫폼별 현재 매장 place_id 추출
    const naverPlaceId = placesData?.find(p => p.platform === 'naver')?.place_id || null
    const googlePlaceId = placesData?.find(p => p.platform === 'google')?.place_id || null

    // 플랫폼별 검색 분리 + 현재 매장 필터링
    const naverSearches = searches.filter(s =>
        s.platform === 'naver' &&
        (!naverPlaceId || s.place_id === naverPlaceId)
    )
    const googleSearches = searches.filter(s =>
        s.platform === 'google' &&
        (!googlePlaceId || s.place_id === googlePlaceId)
    )

    // 자동 리포트(daily+weekly)의 search_results만 조회 (그래프용)
    const allFilteredSearches = [...naverSearches, ...googleSearches]
    const scheduledSearchIds = allFilteredSearches
        .filter(s => (s.report_type === 'daily' || s.report_type === 'weekly') && s.status === 'completed')
        .map(s => s.id)

    let searchResults: SearchResult[] = []
    if (scheduledSearchIds.length > 0) {
        const { data: resultsData } = await supabase
            .from('search_results')
            .select('*')
            .in('search_id', scheduledSearchIds)

        searchResults = (resultsData as SearchResult[]) || []
    }

    // 플랫폼별 트렌드 데이터 계산
    const naverTrend = calculateRankTrend(naverSearches, searchResults)
    const googleTrend = calculateRankTrend(googleSearches, searchResults)

    // 키워드 목록: trendData에서 추출 (과거 키워드도 포함)
    const naverKeywords = extractKeywordsFromTrend(naverTrend)
    const googleKeywords = extractKeywordsFromTrend(googleTrend)

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
