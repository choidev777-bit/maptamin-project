'use client'

import { useMemo } from 'react'
import { getRankColor, getRankCategory } from '@/lib/utils/rank-colors'
import { SearchResult } from '@/lib/types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
    results: SearchResult[]
    previousAverage?: number | null
}

export function AverageRankCard({ results, previousAverage }: Props) {
    const stats = useMemo(() => {
        const rankedResults = results.filter(r => r.rank !== null)

        if (rankedResults.length === 0) {
            return {
                average: null,
                count: 0,
                total: results.length,
                bestRank: null,
                worstRank: null,
            }
        }

        const ranks = rankedResults.map(r => r.rank as number)
        const average = ranks.reduce((a, b) => a + b, 0) / ranks.length

        return {
            average: Math.round(average * 10) / 10,
            count: rankedResults.length,
            total: results.length,
            bestRank: Math.min(...ranks),
            worstRank: Math.max(...ranks),
        }
    }, [results])

    const change = useMemo(() => {
        if (stats.average === null || previousAverage === null || previousAverage === undefined) {
            return null
        }
        return previousAverage - stats.average // Positive = improved
    }, [stats.average, previousAverage])

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">평균 순위</h3>

            <div className="flex items-center gap-6">
                {/* Average Rank Display */}
                <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                    style={{ backgroundColor: getRankColor(stats.average) }}
                >
                    {stats.average !== null ? stats.average.toFixed(1) : '-'}
                </div>

                {/* Stats */}
                <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">순위권 진입</span>
                        <span className="font-medium">{stats.count} / {stats.total} 지점</span>
                    </div>

                    {stats.bestRank !== null && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">최고 순위</span>
                            <span className="font-medium text-green-600">{stats.bestRank}위</span>
                        </div>
                    )}

                    {stats.worstRank !== null && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">최저 순위</span>
                            <span className="font-medium text-red-600">{stats.worstRank}위</span>
                        </div>
                    )}

                    {stats.average !== null && (
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">평가</span>
                            <span className="font-medium">{getRankCategory(Math.round(stats.average))}</span>
                        </div>
                    )}
                </div>

                {/* Change Indicator */}
                {change !== null && (
                    <div className={`flex flex-col items-center p-4 rounded-xl ${change > 0 ? 'bg-green-50' : change < 0 ? 'bg-red-50' : 'bg-gray-50'
                        }`}>
                        {change > 0 ? (
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        ) : change < 0 ? (
                            <TrendingDown className="w-6 h-6 text-red-600" />
                        ) : (
                            <Minus className="w-6 h-6 text-gray-600" />
                        )}
                        <span className={`text-lg font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            {change > 0 ? '+' : ''}{change.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">이전 대비</span>
                    </div>
                )}
            </div>
        </div>
    )
}
