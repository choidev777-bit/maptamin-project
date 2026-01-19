import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UsageStatsCard } from '@/components/dashboard/UsageStatsCard'
import { SearchHistoryCard } from '@/components/dashboard/SearchHistoryCard'
import { Search } from '@/lib/types'
import { Plus, Search as SearchIcon } from 'lucide-react'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch user's searches
    const { data: searches } = await supabase
        .from('searches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    // Fetch today's usage
    const today = new Date().toISOString().split('T')[0]
    const { data: usage } = await supabase
        .from('daily_usage')
        .select('search_count')
        .eq('user_id', user?.id)
        .eq('usage_date', today)
        .single()

    // Count total searches
    const { count: totalSearches } = await supabase
        .from('searches')
        .select('*', { count: 'exact', head: true })

    const searchesToday = usage?.search_count || 0
    const maxSearchesPerDay = 1 // Free plan limit

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="text-gray-600 mt-1">로컬 검색 순위를 추적하세요</p>
                </div>
                <Link
                    href="/search/new"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    새 검색
                </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-1">
                    <UsageStatsCard
                        searchesToday={searchesToday}
                        maxSearchesPerDay={maxSearchesPerDay}
                        totalSearches={totalSearches || 0}
                    />
                </div>

                {/* Quick Tips */}
                <div className="lg:col-span-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                    <h3 className="font-semibold text-emerald-900 mb-3">💡 알고 계셨나요?</h3>
                    <ul className="space-y-2 text-sm text-emerald-800">
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500">•</span>
                            구글 맵스 순위는 검색 위치에 따라 크게 달라집니다.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500">•</span>
                            7x7 그리드(49 포인트)가 가장 상세한 분석을 제공합니다.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500">•</span>
                            정기적인 순위 추적으로 SEO 성과를 모니터링하세요.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Search History Section */}
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">최근 검색</h2>
            </div>

            {/* Content */}
            {!searches || searches.length === 0 ? (
                // Empty State
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SearchIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">아직 검색 기록이 없습니다</h3>
                    <p className="text-gray-500 mt-1 mb-6">첫 번째 로컬 순위 검색을 시작해보세요!</p>
                    <Link
                        href="/search/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        첫 검색 시작하기
                    </Link>
                </div>
            ) : (
                // Search List
                <div className="grid gap-4">
                    {(searches as Search[]).map((search) => (
                        <SearchHistoryCard
                            key={search.id}
                            search={search}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
