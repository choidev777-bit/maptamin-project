'use client'

import { KeywordInsight } from '@/lib/utils/insights'
import { TrendingUp, ArrowUp, AlertTriangle, ArrowDown } from 'lucide-react'

interface Props {
    rising: KeywordInsight | null
    dropping: KeywordInsight | null
    hasData?: boolean
    localRising?: KeywordInsight | null
    localDropping?: KeywordInsight | null
    hasLocalData?: boolean
    showLocal?: boolean
}

function InsightCard({
    label,
    insight,
    type,
    hasData = false,
}: {
    label: string
    insight: KeywordInsight | null
    type: 'rising' | 'dropping'
    hasData?: boolean
}) {
    const isRising = type === 'rising'
    const Icon = isRising ? TrendingUp : AlertTriangle
    const ArrowIcon = isRising ? ArrowUp : ArrowDown
    const iconColor = isRising ? 'text-[#00C896]' : 'text-orange-500'
    const badgeClass = isRising
        ? 'text-[#00C896] bg-[#00C896]/10'
        : 'text-orange-500 bg-orange-50'

    return (
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="absolute top-0 right-[-10px] p-4 opacity-5 dark:opacity-10 pointer-events-none">
                <Icon className={`${iconColor} w-24 h-24 transform ${isRising ? 'rotate-12' : '-rotate-12'}`} />
            </div>
            <div className="relative z-10 flex flex-col gap-1">
                <p className="text-gray-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">{label}</p>

                {insight ? (
                    <div className="flex items-baseline gap-3 mt-1">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white truncate max-w-[200px]" title={insight.keyword}>
                            {insight.keyword}
                        </h3>
                        <span className={`flex items-center font-bold px-2 py-0.5 rounded text-sm whitespace-nowrap ${badgeClass}`}>
                            <ArrowIcon className="w-4 h-4 mr-1" />
                            {isRising ? `+${insight.rankChange}` : insight.rankChange}순위
                        </span>
                    </div>
                ) : hasData ? (
                    <div className="flex items-baseline gap-3 mt-1">
                        <h3 className="text-xl font-medium text-gray-400">변동 없음</h3>
                    </div>
                ) : (
                    <div className="flex items-baseline gap-3 mt-1">
                        <h3 className="text-xl font-medium text-gray-400">데이터 수집 중</h3>
                    </div>
                )}
            </div>
        </div>
    )
}

export function QuickInsightsRow({ rising, dropping, hasData = false, localRising, localDropping, hasLocalData = false, showLocal = false }: Props) {
    return (
        <div className="space-y-6">
            {/* 업종 키워드 행 */}
            <div>
                {showLocal && (
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">업종 키워드</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InsightCard label={showLocal ? '지난 분석 대비 최고 상승 🚀' : '지난 분석 대비 최고 상승 키워드 🚀'} insight={rising} type="rising" hasData={hasData} />
                    <InsightCard label="주의가 필요한 키워드 📉" insight={dropping} type="dropping" hasData={hasData} />
                </div>
            </div>

            {/* 지역명 키워드 행 (네이버 + 지역명 키워드 있을 때만) */}
            {showLocal && (
                <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">지역명 키워드</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InsightCard
                            label="지난 분석 대비 최고 상승 🚀"
                            insight={localRising ?? null}
                            type="rising"
                            hasData={hasLocalData}
                        />
                        <InsightCard
                            label="주의가 필요한 키워드 📉"
                            insight={localDropping ?? null}
                            type="dropping"
                            hasData={hasLocalData}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
