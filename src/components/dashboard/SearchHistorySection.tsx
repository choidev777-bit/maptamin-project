'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DeleteAllButton } from './DeleteAllButton'
import {
    Search as SearchIcon,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    CheckCircle2,
    Clock,
    Loader2,
    XCircle,
    Trash2,
    Loader,
} from 'lucide-react'
import { Search } from '@/lib/types'

const PAGE_SIZE = 5

interface Props {
    searches: Search[]
}

/* ── 상태 뱃지 맵 (HistoryTable과 동일) ── */
const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    completed: {
        label: '완료',
        icon: <CheckCircle2 className="w-4 h-4" />,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    processing: {
        label: '분석 중',
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    pending: {
        label: '대기',
        icon: <Clock className="w-4 h-4" />,
        className: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    failed: {
        label: '실패',
        icon: <XCircle className="w-4 h-4" />,
        className: 'bg-red-50 text-red-700 border-red-200',
    },
}

const REPORT_TYPE_MAP: Record<string, { label: string; className: string }> = {
    weekly: { label: '주간', className: 'bg-indigo-50 text-indigo-600' },
    realtime: { label: '실시간', className: 'bg-gray-50 text-gray-600' },
    welcome: { label: '웰컴', className: 'bg-purple-50 text-purple-600' },
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${y}.${m}.${d} ${h}:${min}`
}

export function SearchHistorySection({ searches }: Props) {
    const router = useRouter()
    const [currentPage, setCurrentPage] = useState(1)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const totalPages = Math.ceil(searches.length / PAGE_SIZE)
    const startIndex = (currentPage - 1) * PAGE_SIZE
    const currentSearches = searches.slice(startIndex, startIndex + PAGE_SIZE)

    const goToPage = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: document.getElementById('search-history')?.offsetTop ?? 0, behavior: 'smooth' })
    }

    const getPageNumbers = () => {
        const pages: number[] = []
        let start = Math.max(1, currentPage - 2)
        let end = Math.min(totalPages, start + 4)
        if (end - start < 4) {
            start = Math.max(1, end - 4)
        }
        for (let i = start; i <= end; i++) {
            pages.push(i)
        }
        return pages
    }

    const handleDelete = async (e: React.MouseEvent, searchId: string) => {
        e.preventDefault()
        e.stopPropagation()
        if (!confirm('정말 이 진단 기록을 삭제하시겠습니까?')) return

        setDeletingId(searchId)
        try {
            const response = await fetch(`/api/search/${searchId}`, { method: 'DELETE' })
            if (!response.ok) throw new Error('Failed to delete')
            router.refresh()
        } catch {
            alert('삭제 중 오류가 발생했습니다.')
            setDeletingId(null)
        }
    }

    return (
        <div id="search-history" className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">최근 진단 기록</h3>
                <div className="flex items-center gap-3">
                    <Link
                        href="/history"
                        className="text-sm font-medium text-gray-500 hover:text-[#00C896] transition-colors whitespace-nowrap"
                    >
                        전체 보기 →
                    </Link>
                </div>
            </div>

            {/* Content */}
            {searches.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SearchIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-base font-medium text-gray-900">아직 진단 기록이 없습니다</h3>
                    <p className="text-gray-500 mt-1 text-sm">위의 카드를 통해 새 키워드를 진단해보세요!</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                <th className="px-6 py-4">상태</th>
                                <th className="px-6 py-4">유형</th>
                                <th className="px-6 py-4">대상 매장명</th>
                                <th className="px-6 py-4">플랫폼</th>
                                <th className="px-6 py-4">분석 일시</th>
                                <th className="px-6 py-4 text-right">상세</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {currentSearches.map((search) => {
                                const status = STATUS_MAP[search.status] || STATUS_MAP.pending
                                const reportType = REPORT_TYPE_MAP[search.report_type || 'realtime'] || REPORT_TYPE_MAP.realtime
                                const resultUrl = search.platform === 'naver'
                                    ? `/naver-search/${search.id}`
                                    : `/search/${search.id}`

                                if (deletingId === search.id) {
                                    return (
                                        <tr key={search.id}>
                                            <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader className="w-4 h-4 animate-spin" />
                                                    삭제 중...
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }

                                return (
                                    <tr key={search.id} className="hover:bg-gray-50/50 transition-colors group">
                                        {/* 상태 */}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.className}`}>
                                                {status.icon}
                                                {status.label}
                                            </span>
                                        </td>

                                        {/* 리포트 유형 */}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${reportType.className}`}>
                                                {reportType.label}
                                            </span>
                                        </td>

                                        {/* 매장명 */}
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900">{search.place_name}</span>
                                        </td>

                                        {/* 플랫폼 */}
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold uppercase ${search.platform === 'naver' ? 'text-[#00C896]' : 'text-blue-500'}`}>
                                                {search.platform === 'naver' ? '네이버' : '구글'}
                                            </span>
                                        </td>

                                        {/* 일시 */}
                                        <td className="px-6 py-4 text-gray-500">
                                            {formatDate(search.created_at)}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center gap-2">
                                                {search.status === 'completed' ? (
                                                    <Link
                                                        href={resultUrl}
                                                        className="inline-flex items-center gap-1 text-[#00C896] hover:text-[#00B085] font-medium text-sm transition-colors"
                                                    >
                                                        보기
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Link>
                                                ) : (
                                                    <span className="text-gray-300 text-sm">—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && searches.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <p className="text-sm text-gray-500">
                        총 <span className="font-bold text-gray-900">{searches.length}</span>건 중
                        <span className="font-bold text-gray-900 ml-1">
                            {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, searches.length)}
                        </span>건 표시
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {getPageNumbers().map((page) => (
                            <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${page === currentPage
                                    ? 'bg-[#00C896] text-white font-bold shadow-md shadow-[#00C896]/20'
                                    : 'border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
