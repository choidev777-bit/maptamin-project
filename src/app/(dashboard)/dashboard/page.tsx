import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

import { SearchHistoryCard } from '@/components/dashboard/SearchHistoryCard'
import { DeleteAllButton } from '@/components/dashboard/DeleteAllButton'
import { DashboardPlatformCard } from '@/components/dashboard/DashboardPlatformCard'
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
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10)

    // Fetch managed places
    const { data: managedPlaces } = await supabase
        .from('managed_places')
        .select('*')
        .eq('user_id', user?.id)

    const naverShop = managedPlaces?.find(p => p.platform === 'naver') || null
    const googleShop = managedPlaces?.find(p => p.platform === 'google') || null

    // Fetch today's usage


    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
                    <p className="text-gray-600 mt-1">로컬 검색 순위를 추적하세요</p>
                </div>
            </div>

            {/* My Shop Cards (New) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <DashboardPlatformCard platform="naver" data={naverShop} />
                <DashboardPlatformCard platform="google" data={googleShop} />
            </div>



            {/* Search History Section */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">최근 검색</h2>
                {searches && searches.length > 0 && <DeleteAllButton />}
            </div>

            {/* Content */}
            {!searches || searches.length === 0 ? (
                // Empty State
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SearchIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">아직 검색 기록이 없습니다</h3>
                    <p className="text-gray-500 mt-1 mb-6">위의 카드를 통해 매장부터 등록해보세요!</p>
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

