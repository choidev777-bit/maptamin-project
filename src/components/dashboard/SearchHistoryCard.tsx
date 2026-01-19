'use client'

import { Search } from '@/lib/types'
import { getRankColor } from '@/lib/utils/rank-colors'
import { MapPin, Calendar, ExternalLink, Clock, CheckCircle, XCircle, Loader } from 'lucide-react'
import Link from 'next/link'

interface Props {
    search: Search
    averageRank?: number | null
}

export function SearchHistoryCard({ search, averageRank }: Props) {
    const getStatusIcon = () => {
        switch (search.status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-500" />
            case 'processing':
                return <Loader className="w-4 h-4 text-yellow-500 animate-spin" />
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />
            default:
                return <Clock className="w-4 h-4 text-gray-400" />
        }
    }

    const getStatusLabel = () => {
        switch (search.status) {
            case 'completed':
                return '완료'
            case 'processing':
                return '처리 중'
            case 'failed':
                return '실패'
            default:
                return '대기 중'
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))

        if (days === 0) return '오늘'
        if (days === 1) return '어제'
        if (days < 7) return `${days}일 전`
        return date.toLocaleDateString('ko-KR')
    }

    return (
        <Link
            href={`/search/${search.id}`}
            className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all group"
        >
            <div className="flex items-start gap-4">
                {/* Average Rank Circle */}
                {search.status === 'completed' && averageRank !== undefined && (
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                        style={{ backgroundColor: getRankColor(averageRank) }}
                    >
                        {averageRank !== null ? averageRank.toFixed(1) : '-'}
                    </div>
                )}

                {/* Processing/Pending indicator */}
                {search.status !== 'completed' && (
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {getStatusIcon()}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {search.place_name}
                        </h3>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    </div>

                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {search.place_address || '주소 없음'}
                    </p>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {search.keywords.map((keyword, i) => (
                            <span
                                key={i}
                                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                            >
                                {keyword}
                            </span>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {formatDate(search.created_at)}
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                            {getStatusIcon()}
                            <span className={`${search.status === 'completed' ? 'text-green-600' :
                                    search.status === 'processing' ? 'text-yellow-600' :
                                        search.status === 'failed' ? 'text-red-600' :
                                            'text-gray-500'
                                }`}>
                                {getStatusLabel()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}
