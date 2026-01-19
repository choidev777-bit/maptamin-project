import { Search, Zap } from 'lucide-react'
import Link from 'next/link'

interface Props {
    searchesToday: number
    maxSearchesPerDay: number
    totalSearches: number
}

export function UsageStatsCard({ searchesToday, maxSearchesPerDay, totalSearches }: Props) {
    const remaining = Math.max(0, maxSearchesPerDay - searchesToday)
    const usagePercentage = (searchesToday / maxSearchesPerDay) * 100

    return (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold opacity-90">오늘 사용량</h3>
                    <p className="text-sm opacity-70 mt-1">무료 플랜: 하루 1회</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6" />
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="opacity-80">{searchesToday} / {maxSearchesPerDay} 사용</span>
                    <span className="font-semibold">{remaining}회 남음</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${usagePercentage >= 100 ? 'bg-red-400' : 'bg-white'
                            }`}
                        style={{ width: `${Math.min(100, usagePercentage)}%` }}
                    />
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <div>
                    <p className="text-2xl font-bold">{totalSearches}</p>
                    <p className="text-xs opacity-70">총 검색 수</p>
                </div>

                {remaining > 0 ? (
                    <Link
                        href="/search/new"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-xl font-medium hover:bg-blue-50 transition-colors"
                    >
                        <Search className="w-4 h-4" />
                        새 검색
                    </Link>
                ) : (
                    <div className="px-4 py-2 bg-white/20 rounded-xl text-sm">
                        내일 다시 가능
                    </div>
                )}
            </div>
        </div>
    )
}
