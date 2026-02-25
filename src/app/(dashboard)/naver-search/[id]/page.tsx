import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { NaverResultsContent } from './NaverResultsContent'
import { NaverResultsHeader } from '@/components/results/NaverResultsHeader'
import { SearchStatusPoller } from '@/components/search/SearchStatusPoller'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function NaverSearchResultsPage({ params }: PageProps) {
    const { id } = await params

    // Use cached getCurrentUser for auth deduplication
    const user = await getCurrentUser()
    if (!user) {
        notFound()
    }

    const supabase = await createClient()

    // Parallel fetch: search record, results, competitors, plan (async-parallel pattern)
    const [searchResult, resultsResult, competitorsResult, subscriptionResult] = await Promise.all([
        supabase
            .from('searches')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('platform', 'naver')  // 네이버 플랫폼만
            .single(),
        supabase
            .from('search_results')
            .select('*')
            .eq('search_id', id),
        supabase
            .from('managed_competitors')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', 'naver'),
        supabase
            .from('user_subscriptions')
            .select('plan_id')
            .eq('user_id', user.id)
            .single(),
    ])

    const { data: search, error: searchError } = searchResult
    const { data: results } = resultsResult
    const { data: competitors } = competitorsResult
    const planId = subscriptionResult.data?.plan_id || 'starter'

    if (searchError || !search) {
        notFound()
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header with Naver branding */}
            <NaverResultsHeader search={search} />

            {/* Status-based content */}
            {search.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">⏳</span>
                    </div>
                    <h2 className="text-xl font-semibold text-yellow-800 mb-2">대기 중</h2>
                    <p className="text-yellow-600">네이버 검색이 아직 시작되지 않았습니다.</p>
                </div>
            )}

            {search.status === 'processing' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                    <SearchStatusPoller searchId={id} initialStatus={search.status} />
                    <div className="w-16 h-16 mx-auto mb-4 animate-spin">
                        <div className="w-full h-full border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
                    </div>
                    <h2 className="text-xl font-semibold text-emerald-800 mb-2">순위를 진단 중입니다...</h2>
                    <p className="text-emerald-600">이 화면을 나가셔도 됩니다.<br />결과는 진단 기록 페이지에서 확인하실 수 있습니다.</p>
                </div>
            )}

            {search.status === 'failed' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-semibold text-amber-800 mb-2">검색 취소됨</h2>
                    <p className="text-amber-700">현재 사용자가 많아 검색이 취소되었습니다.</p>
                    <p className="text-amber-600 text-sm mt-2">
                        사용된 포인트는 <strong>자동으로 환불</strong>되었습니다.
                    </p>
                    <p className="text-gray-500 text-xs mt-4">
                        잠시 후 다시 시도해 주세요.
                    </p>
                </div>
            )}

            {search.status === 'completed' && results && results.length > 0 && (
                <Suspense fallback={<div>로딩 중...</div>}>
                    <NaverResultsContent search={search} results={results} competitors={competitors || []} planId={planId} />
                </Suspense>
            )}

            {search.status === 'completed' && (!results || results.length === 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">📭</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">결과 없음</h2>
                    <p className="text-gray-600">검색 결과가 없습니다.</p>
                </div>
            )}
        </div>
    )
}
