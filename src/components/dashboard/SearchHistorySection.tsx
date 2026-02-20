'use client'

import { useState } from 'react'
import { SearchHistoryCard } from './SearchHistoryCard'
import { DeleteAllButton } from './DeleteAllButton'
import { Search as SearchIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Search } from '@/lib/types'

const PAGE_SIZE = 5

interface Props {
    searches: Search[]
}

export function SearchHistorySection({ searches }: Props) {
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = Math.ceil(searches.length / PAGE_SIZE)
    const startIndex = (currentPage - 1) * PAGE_SIZE
    const currentSearches = searches.slice(startIndex, startIndex + PAGE_SIZE)

    const goToPage = (page: number) => {
        setCurrentPage(page)
        window.scrollTo({ top: document.getElementById('search-history')?.offsetTop ?? 0, behavior: 'smooth' })
    }

    // 표시할 페이지 번호 계산 (최대 5개)
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

    return (
        <div id="search-history" className="bg-white dark:bg-slate-800 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">최근 진단 기록</h3>
                <div className="flex gap-2">
                    {searches.length > 0 && <DeleteAllButton />}
                </div>
            </div>

            {/* Content & List */}
            {searches.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SearchIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">아직 진단 기록이 없습니다</h3>
                    <p className="text-gray-500 dark:text-slate-400 mt-1 mb-6">위의 카드를 통해 새 키워드를 진단해보세요!</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
                                <th className="px-6 py-4">분석 상태</th>
                                <th className="px-6 py-4">대상 매장명</th>
                                <th className="px-6 py-4">플랫폼</th>
                                <th className="px-6 py-4">검색 일시</th>
                                <th className="pl-6 pr-[60px] py-4 text-right">상세조회</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-sm">
                            {currentSearches.map((search) => (
                                <SearchHistoryCard
                                    key={search.id}
                                    search={search}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && searches.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/30">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                        총 <span className="font-bold text-gray-900 dark:text-white">{searches.length}</span>건 중
                        <span className="font-bold text-gray-900 dark:text-white ml-1">
                            {startIndex + 1}-{Math.min(startIndex + PAGE_SIZE, searches.length)}
                        </span>건 표시
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {getPageNumbers().map((page) => (
                            <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${page === currentPage
                                    ? 'bg-[#00C896] text-white font-bold shadow-md shadow-[#00C896]/20'
                                    : 'border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 hover:text-gray-900 transition-colors font-medium'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-slate-600 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
