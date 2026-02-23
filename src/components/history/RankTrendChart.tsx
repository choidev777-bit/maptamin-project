'use client'

import { useState, useMemo } from 'react'
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts'
import { RankTrendDataPoint } from '@/lib/utils/rank-trend'

// 키워드별 색상 팔레트
const KEYWORD_COLORS = [
    '#00C896', // 민트 (브랜드)
    '#3B82F6', // 블루
    '#F59E0B', // 앰버
    '#EF4444', // 레드
    '#8B5CF6', // 퍼플
    '#EC4899', // 핑크
    '#14B8A6', // 틸
    '#F97316', // 오렌지
    '#6366F1', // 인디고
    '#10B981', // 에메랄드
]

interface Props {
    trendData: RankTrendDataPoint[]
    keywords: string[]
}

export function RankTrendChart({ trendData, keywords }: Props) {
    // 기본값: 모든 키워드 활성
    const [activeKeywords, setActiveKeywords] = useState<Set<string>>(
        () => new Set(keywords)
    )

    const toggleKeyword = (keyword: string) => {
        setActiveKeywords(prev => {
            const next = new Set(prev)
            if (next.has(keyword)) {
                // 최소 1개는 활성 유지
                if (next.size > 1) {
                    next.delete(keyword)
                }
            } else {
                next.add(keyword)
            }
            return next
        })
    }

    // 키워드-색상 매핑 (안정적)
    const keywordColorMap = useMemo(() => {
        const map = new Map<string, string>()
        keywords.forEach((kw, i) => {
            map.set(kw, KEYWORD_COLORS[i % KEYWORD_COLORS.length])
        })
        return map
    }, [keywords])

    return (
        <div className="flex flex-col gap-4">
            {/* 키워드 토글 버튼 */}
            <div className="flex flex-wrap gap-2">
                {keywords.map((keyword) => {
                    const isActive = activeKeywords.has(keyword)
                    const color = keywordColorMap.get(keyword) || '#00C896'

                    return (
                        <button
                            key={keyword}
                            onClick={() => toggleKeyword(keyword)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-all ${isActive
                                ? 'text-white shadow-sm'
                                : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                                }`}
                            style={isActive ? {
                                backgroundColor: color,
                                borderColor: color,
                            } : undefined}
                        >
                            {keyword}
                        </button>
                    )
                })}
            </div>

            {/* 차트 */}
            <div className="w-full h-[300px] sm:h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={trendData}
                        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            tickLine={false}
                            axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis
                            reversed
                            domain={[1, 'auto']}
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                            tickLine={false}
                            axisLine={{ stroke: '#E5E7EB' }}
                            label={{
                                value: '순위',
                                position: 'insideTopLeft',
                                offset: 10,
                                style: { fontSize: 11, fill: '#9CA3AF' },
                            }}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload || payload.length === 0) return null
                                const fullDate = payload[0]?.payload?.fullDate || label
                                return (
                                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                                        <p className="font-semibold text-gray-700 mb-1.5">{fullDate}</p>
                                        {payload.map((entry: any) => (
                                            <div key={entry.dataKey} className="flex items-center gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{ backgroundColor: entry.color }}
                                                />
                                                <span className="text-gray-600">{entry.dataKey}:</span>
                                                <span className="font-bold text-gray-900">
                                                    {entry.value !== null ? `${entry.value}위` : '순위 밖'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            }}
                        />
                        {keywords.map((keyword) => {
                            if (!activeKeywords.has(keyword)) return null
                            return (
                                <Line
                                    key={keyword}
                                    type="monotone"
                                    dataKey={keyword}
                                    stroke={keywordColorMap.get(keyword) || '#00C896'}
                                    strokeWidth={2.5}
                                    dot={{ r: 4, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                    connectNulls={false}
                                />
                            )
                        })}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default RankTrendChart
