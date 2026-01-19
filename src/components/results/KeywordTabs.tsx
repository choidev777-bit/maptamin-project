'use client'

import { useState, useMemo } from 'react'
import { SearchResult } from '@/lib/types'
import { getRankColor, getRankLabel } from '@/lib/utils/rank-colors'

interface Props {
    keywords: string[]
    results: SearchResult[]
    onKeywordChange?: (keyword: string) => void
}

export function KeywordTabs({ keywords, results, onKeywordChange }: Props) {
    const [activeKeyword, setActiveKeyword] = useState(keywords[0] || '')

    const filteredResults = useMemo(() => {
        return results.filter(r => r.keyword === activeKeyword)
    }, [results, activeKeyword])

    const keywordStats = useMemo(() => {
        return keywords.map(keyword => {
            const keywordResults = results.filter(r => r.keyword === keyword)
            const rankedResults = keywordResults.filter(r => r.rank !== null)

            if (rankedResults.length === 0) {
                return { keyword, average: null, count: 0 }
            }

            const avg = rankedResults.reduce((a, b) => a + (b.rank as number), 0) / rankedResults.length
            return {
                keyword,
                average: Math.round(avg * 10) / 10,
                count: rankedResults.length,
            }
        })
    }, [keywords, results])

    const handleTabClick = (keyword: string) => {
        setActiveKeyword(keyword)
        onKeywordChange?.(keyword)
    }

    return (
        <div className="mb-6">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {keywordStats.map(({ keyword, average, count }) => (
                    <button
                        key={keyword}
                        onClick={() => handleTabClick(keyword)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${activeKeyword === keyword
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <span>{keyword}</span>
                        {average !== null && (
                            <span
                                className="px-2 py-0.5 rounded-full text-xs text-white"
                                style={{ backgroundColor: getRankColor(Math.round(average)) }}
                            >
                                평균 {average}위
                            </span>
                        )}
                        {average === null && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-400 text-white">
                                순위권 외
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Active Keyword Summary */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">{activeKeyword}</h3>
                    <span className="text-sm text-gray-500">
                        {filteredResults.filter(r => r.rank !== null).length} / {filteredResults.length} 지점 순위권
                    </span>
                </div>
            </div>
        </div>
    )
}
