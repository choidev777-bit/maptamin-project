import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
    const supabase = await createClient()

    // Fetch user's searches
    const { data: searches } = await supabase
        .from('searches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Your Searches</h1>
                    <p className="text-gray-600 mt-1">Track your local ranking performance</p>
                </div>
                <Link
                    href="/search/new"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Search
                </Link>
            </div>

            {/* Content */}
            {!searches || searches.length === 0 ? (
                // Empty State
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No searches yet</h3>
                    <p className="text-gray-500 mt-1 mb-6">Start tracking your local rankings!</p>
                    <Link
                        href="/search/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create your first search
                    </Link>
                </div>
            ) : (
                // Search List
                <div className="grid gap-4">
                    {searches.map((search) => (
                        <Link
                            key={search.id}
                            href={`/search/${search.id}`}
                            className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{search.place_name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{search.place_address}</p>
                                    <div className="flex gap-2 mt-3">
                                        {search.keywords.map((keyword: string, i: number) => (
                                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full ${search.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            search.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                                                search.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                        }`}>
                                        {search.status}
                                    </span>
                                    <p className="text-xs text-gray-400 mt-2">
                                        {new Date(search.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
