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
        <div id="search-history">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                    최근 검색
                    <span className="ml-2 text-sm font-normal text-gray-400">
                        총 {searches.length}건
                    </span>
                </h2>
                {searches.length > 0 && <DeleteAllButton />}
            </div>

            {/* Content */}
            {searches.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SearchIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">아직 검색 기록이 없습니다</h3>
                    <p className="text-gray-500 mt-1 mb-6">위의 카드를 통해 매장부터 등록해보세요!</p>
                </div>
            ) : (
                <>
                    {/* Search List */}
                    <div className="grid gap-4">
                        {currentSearches.map((search) => (
                            <SearchHistoryCard
                                key={search.id}
                                search={search}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1 mt-8">
                            {/* Previous */}
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {/* Page Numbers */}
                            {getPageNumbers().map((page) => (
                                <button
                                    key={page}
                                    onClick={() => goToPage(page)}
                                    className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === currentPage
                                            ? 'bg-[#00C896] text-white shadow-sm'
                                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            {/* Next */}
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
