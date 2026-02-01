'use client'

import React, { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface InlineRankGraphProps {
    placeId: string
    keyword: string
    platform: 'naver' | 'google'
}

interface RankData {
    date: string
    rank: number
}

export function InlineRankGraph({ placeId, keyword, platform }: InlineRankGraphProps) {
    const [data, setData] = useState<RankData[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchHistory() {
            setLoading(true)
            const supabase = createClient()

            // In a real scenario, we would join 'search_results' to get specific rank per date
            // For MVP/Demo, we might need a dedicated API or complex query.
            // Let's assume we can fetch 'search_results' linked to 'searches' for this place & keyword.
            // Since our schema structure for 'search_results' might vary, 
            // we will simulate fetching or use a direct query if 'search_results' table is robust.

            // Current 'search_results' has: search_id, keyword, rank
            // 'searches' has: id, place_id, created_at, platform

            // We need to fetch searches for this place, then their results for this keyword.

            const { data: searches } = await supabase
                .from('searches')
                .select('id, created_at')
                .eq('place_id', placeId)
                .eq('platform', platform)
                .order('created_at', { ascending: true }) // Oldest first for graph
                .limit(30) // Last 30 entries

            if (searches && searches.length > 0) {
                const searchIds = searches.map(s => s.id)

                const { data: results } = await supabase
                    .from('search_results')
                    .select('search_id, rank')
                    .in('search_id', searchIds)
                    .eq('keyword', keyword)

                if (results) {
                    // Merge
                    const chartData = searches.map(s => {
                        const res = results.find(r => r.search_id === s.id)
                        return {
                            date: new Date(s.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }),
                            rank: res?.rank || null // null means not found/not ranked
                        }
                    }).filter(d => d.rank !== null) // Filter out missing data points if desired, or keep as break

                    setData(chartData as RankData[])
                }
            } else {
                setData([])
            }
            setLoading(false)
        }

        fetchHistory()
    }, [placeId, keyword, platform])

    if (loading) return <div className="h-20 w-full animate-pulse bg-gray-100 rounded" />
    if (data.length === 0) return <div className="h-20 w-full flex items-center justify-center text-xs text-gray-400">데이터 없음</div>

    return (
        <div className="h-20 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <Tooltip
                        contentStyle={{ fontSize: '12px', padding: '4px' }}
                        formatter={(value: number | string | Array<number | string>) => [`${value}위`, '순위']}
                        labelStyle={{ display: 'none' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="rank"
                        stroke="#059669" // Emerald 600
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                        reversed // Rank 1 is higher (at top)
                    />
                    {/* YAxis reversed domain to show 1 at top, e.g. [1, 50] */}
                    <YAxis hide domain={[1, 'auto']} result="revers" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
