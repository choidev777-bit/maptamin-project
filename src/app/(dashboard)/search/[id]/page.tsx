import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { SearchStatusPoller } from '@/components/search/SearchStatusPoller'

import { ResultsContent } from './ResultsContent'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function SearchResultsPage({ params }: PageProps) {
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
            .single(),
        supabase
            .from('search_results')
            .select('*')
            .eq('search_id', id),
        supabase
            .from('managed_competitors')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', 'google'),
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
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        구글
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-medium" suppressHydrationWarning>
                        분석 일시: {(() => {
                            const d = new Date(search.created_at)
                            const ampm = d.getHours() < 12 ? '오전' : '오후'
                            const h = d.getHours() % 12 || 12
                            const m = d.getMinutes()
                            return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · ${ampm} ${h}시 ${m}분`
                        })()}
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mt-1">{search.place_name}</h1>
                <p className="text-gray-500">{search.place_address}</p>
            </div>

            {/* Status-based content */}
            {search.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">⏳</span>
                    </div>
                    <h2 className="text-xl font-semibold text-yellow-800 mb-2">대기 중</h2>
                    <p className="text-yellow-600">검색이 아직 시작되지 않았습니다.</p>
                </div>
            )}

            {search.status === 'processing' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
                    <SearchStatusPoller searchId={id} initialStatus={search.status} />
                    <div className="w-16 h-16 mx-auto mb-4 animate-spin">
                        <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full" />
                    </div>
                    <h2 className="text-xl font-semibold text-blue-800 mb-2">순위를 진단 중입니다...</h2>
                    <p className="text-blue-600">이 화면을 나가셔도 됩니다.<br />결과는 진단 기록 페이지에서 확인하실 수 있습니다.</p>
                </div>
            )}

            {search.status === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">❌</span>
                    </div>
                    <h2 className="text-xl font-semibold text-red-800 mb-2">처리 실패</h2>
                    <p className="text-red-600">검색 처리 중 오류가 발생했습니다. 다시 시도해주세요.</p>
                </div>
            )}

            {search.status === 'completed' && results && results.length > 0 && (
                <Suspense fallback={<div>로딩 중...</div>}>
                    <ResultsContent search={search} results={results} competitors={competitors || []} planId={planId} />
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
