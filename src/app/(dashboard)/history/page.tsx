import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Search, SearchResult } from '@/lib/types'
import { calculateRankTrend, calculateLocalKeywordTrend, extractKeywordsFromTrend, calculateExposureCountTrend, calculateTopExposureRateTrend } from '@/lib/utils/rank-trend'
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
        .filter(s => (s.report_type === 'daily' || s.report_type === 'weekly' || s.report_type === 'welcome') && s.status === 'completed')
        .map(s => s.id)

    let searchResults: SearchResult[] = []
    if (scheduledSearchIds.length > 0) {
        const { data: resultsData } = await supabase
            .from('search_results')
            .select('*')
            .in('search_id', scheduledSearchIds)

        searchResults = (resultsData as SearchResult[]) || []
    }

    // 플랫폼별 트렌드 데이터 계산 (업종 키워드: grid_index >= 0)
    const industryResults = searchResults.filter(r => r.grid_index >= 0)
    const naverTrend = calculateRankTrend(naverSearches, industryResults)
    const googleTrend = calculateRankTrend(googleSearches, industryResults)

    // 키워드 목록: trendData에서 추출 (과거 키워드도 포함)
    const naverKeywords = extractKeywordsFromTrend(naverTrend)
    const googleKeywords = extractKeywordsFromTrend(googleTrend)

    // 지역명 키워드 트렌드 (네이버만)
    const naverLocalTrend = calculateLocalKeywordTrend(naverSearches, searchResults)
    const naverLocalKeywords = extractKeywordsFromTrend(naverLocalTrend)

    // 노출된 좌표 수 추이
    const naverExposureTrend = calculateExposureCountTrend(naverSearches, industryResults)
    const googleExposureTrend = calculateExposureCountTrend(googleSearches, industryResults)

    // 상위 노출률 추이 (1~5위 기준)
    const naverTopRateTrend = calculateTopExposureRateTrend(naverSearches, industryResults)
    const googleTopRateTrend = calculateTopExposureRateTrend(googleSearches, industryResults)

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <HistoryPageContent
                searches={searches}
                naverTrend={naverTrend}
                googleTrend={googleTrend}
                naverKeywords={naverKeywords}
                googleKeywords={googleKeywords}
                naverLocalTrend={naverLocalTrend}
                naverLocalKeywords={naverLocalKeywords}
                naverExposureTrend={naverExposureTrend}
                googleExposureTrend={googleExposureTrend}
                naverTopRateTrend={naverTopRateTrend}
                googleTopRateTrend={googleTopRateTrend}
                canGoogle={canGoogle}
            />
        </div>
    )
}
