import { createClient } from '@/lib/supabase/server'
import { SearchHistoryCard } from '@/components/dashboard/SearchHistoryCard'
import { Search } from '@/lib/types'
import Link from 'next/link'
import { Plus, History, X } from 'lucide-react'

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SearchHistoryPage({ searchParams }: Props) {
    const supabase = await createClient()
    const resolvedParams = await searchParams
    const placeId = resolvedParams.placeId as string | undefined

    let query = supabase
        .from('searches')
        .select('*')
        // Filter out Naver searches to show only Google (including legacy/null)
        .neq('platform', 'naver')
        .order('created_at', { ascending: false })

    if (placeId) {
        query = query.eq('place_id', placeId)
    }

    const { data: searches } = await query

    const filteredPlaceName = placeId && searches && searches.length > 0 ? searches[0].place_name : null

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <History className="w-6 h-6 text-gray-600" />
                        {filteredPlaceName ? `${filteredPlaceName} 검색 기록` : 'Google 검색 기록'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-600">
                            총 {searches?.length || 0}개의 검색 기록
                        </p>
                        {placeId && (
                            <Link
                                href="/search/history"
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full"
                            >
                                <X className="w-3 h-3" />
                                필터 해제
                            </Link>
                        )}
                    </div>
                </div>
                <Link
                    href={placeId && resolvedParams.competitorId ?
                        `/search/new?mode=competitor&competitorId=${resolvedParams.competitorId}` :
                        `/search/new`}
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
                    <p className="text-gray-500 mt-1 mb-6">
                        {placeId ? '이 장소에 대한 검색 기록이 없습니다.' : '첫 번째 검색을 시작해보세요!'}
                    </p>
                    <Link
                        href={placeId ?
                            (resolvedParams.competitorId ?
                                `/search/new?mode=competitor&competitorId=${resolvedParams.competitorId}` :
                                `/search/new`)
                            : `/search/new`}
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
