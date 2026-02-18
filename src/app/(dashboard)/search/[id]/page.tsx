import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

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
            .eq('user_id', user.id),
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
                <p className="text-sm text-gray-500">
                    {(() => {
                        const d = new Date(search.created_at)
                        const ampm = d.getHours() < 12 ? '오전' : '오후'
                        const h = d.getHours() % 12 || 12
                        const m = d.getMinutes()
                        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · ${ampm} ${h}시 ${m}분`
                    })()}
                </p>
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
                    <div className="w-16 h-16 mx-auto mb-4 animate-spin">
                        <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full" />
                    </div>
                    <h2 className="text-xl font-semibold text-blue-800 mb-2">처리 중...</h2>
                    <p className="text-blue-600">순위를 분석하고 있습니다. 잠시만 기다려주세요.</p>
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
