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

    const UNRANKED_PENALTY = 71

    const keywordStats = useMemo(() => {
        return keywords.map(keyword => {
            const keywordResults = results.filter(r => r.keyword === keyword)
            const rankedResults = keywordResults.filter(r => r.rank !== null)
            const totalPoints = keywordResults.length

            if (totalPoints === 0) {
                return { keyword, average: null, count: 0 }
            }

            const rankedSum = rankedResults.reduce((a, b) => a + (b.rank as number), 0)
            const unrankedCount = totalPoints - rankedResults.length
            const totalSum = rankedSum + UNRANKED_PENALTY * unrankedCount
            const avg = totalSum / totalPoints

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
        <div className="mb-8">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar">
                <div className="flex gap-8 min-w-max px-1">
                    {keywordStats.map(({ keyword, average, count }) => {
                        const isActive = activeKeyword === keyword;
                        return (
                            <button
                                key={keyword}
                                onClick={() => handleTabClick(keyword)}
                                className={`pb-3 border-b-[3px] font-medium text-sm tracking-wide transition-colors flex items-center gap-2 ${isActive
                                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white font-bold'
                                    : 'border-transparent hover:border-gray-300 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                            >
                                <span>{keyword}</span>
                                {average !== null ? (
                                    <span
                                        className="px-1.5 py-0.5 rounded text-[10px] text-white font-bold"
                                        style={{ backgroundColor: getRankColor(Math.round(average)) }}
                                    >
                                        {average}
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 font-bold">
                                        -
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

        </div>
    )
}
