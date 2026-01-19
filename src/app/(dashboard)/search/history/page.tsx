import { createClient } from '@/lib/supabase/server'
import { SearchHistoryCard } from '@/components/dashboard/SearchHistoryCard'
import { Search } from '@/lib/types'
import Link from 'next/link'
import { Plus, History } from 'lucide-react'

export default async function SearchHistoryPage() {
    const supabase = await createClient()

    // Fetch all user's searches
    const { data: searches } = await supabase
        .from('searches')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <History className="w-6 h-6 text-gray-600" />
                        검색 기록
                    </h1>
                    <p className="text-gray-600 mt-1">
                        총 {searches?.length || 0}개의 검색 기록
                    </p>
                </div>
                <Link
                    href="/search/new"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    새 검색
                </Link>
            </div>

            {/* Content */}
            {!searches || searches.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <History className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">검색 기록이 없습니다</h3>
                    <p className="text-gray-500 mt-1 mb-6">첫 번째 검색을 시작해보세요!</p>
                    <Link
                        href="/search/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        검색 시작하기
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {(searches as Search[]).map((search) => (
                        <SearchHistoryCard key={search.id} search={search} />
                    ))}
                </div>
            )}
        </div>
    )
}
