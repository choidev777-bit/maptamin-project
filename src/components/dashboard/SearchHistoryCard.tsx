'use client'

import { Search } from '@/lib/types'
import { getRankColor } from '@/lib/utils/rank-colors'
import { MapPin, Calendar, ExternalLink, Clock, CheckCircle, XCircle, Loader, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
    search: Search
    averageRank?: number | null
}

export function SearchHistoryCard({ search, averageRank }: Props) {
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault() // Link 이동 방지
        e.stopPropagation()

        if (!confirm('정말 이 검색 기록을 삭제하시겠습니까?')) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/search/${search.id}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete')

            router.refresh()
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.')
            setIsDeleting(false)
        }
    }

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

    if (isDeleting) {
        return (
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 flex items-center justify-center h-[160px]">
                <div className="text-gray-400 flex flex-col items-center gap-2">
                    <Loader className="w-6 h-6 animate-spin" />
                    <span className="text-sm">삭제 중...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="relative group">
            <Link
                href={`/search/${search.id}`}
                className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all"
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
                    <div className="flex-1 min-w-0 pr-8"> {/* 우측 여백 추가 (삭제 버튼 공간) */}
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors">
                                {search.place_name}
                            </h3>
                            {/* ExternalLink 제거됨 - 원본 코드에는 있었으나 삭제/이동됨 */}
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

            {/* Delete Button - Absolute positioned */}
            <button
                onClick={handleDelete}
                className="absolute top-5 right-5 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10 opacity-0 group-hover:opacity-100"
                title="기록 삭제"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    )
}
