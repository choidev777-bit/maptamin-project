'use client'

import { KeywordInsight } from '@/lib/utils/insights'
import { TrendingUp, ArrowUp, AlertTriangle, ArrowDown } from 'lucide-react'

interface Props {
    rising: KeywordInsight | null
    dropping: KeywordInsight | null
}

export function QuickInsightsRow({ rising, dropping }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Rising */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="absolute top-0 right-[-10px] p-4 opacity-5 dark:opacity-10 pointer-events-none">
                    <TrendingUp className="text-[#00C896] w-24 h-24 transform rotate-12" />
                </div>
                <div className="relative z-10 flex flex-col gap-1">
                    <p className="text-gray-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">지난 주 대비 최고 상승 키워드 🚀</p>

                    {rising ? (
                        <div className="flex items-baseline gap-3 mt-1">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white truncate max-w-[200px]" title={rising.keyword}>
                                {rising.keyword}
                            </h3>
                            <span className="flex items-center text-[#00C896] font-bold bg-[#00C896]/10 px-2 py-0.5 rounded text-sm whitespace-nowrap">
                                <ArrowUp className="w-4 h-4 mr-1" />
                                +{rising.rankChange}계단
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-3 mt-1">
                            <h3 className="text-xl font-medium text-gray-400">데이터 수집 중</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* Attention */}
            <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="absolute top-0 right-[-10px] p-4 opacity-5 dark:opacity-10 pointer-events-none">
                    <AlertTriangle className="text-orange-500 w-24 h-24 transform -rotate-12" />
                </div>
                <div className="relative z-10 flex flex-col gap-1">
                    <p className="text-gray-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">주의가 필요한 키워드 📉</p>

                    {dropping ? (
                        <div className="flex items-baseline gap-3 mt-1">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white truncate max-w-[200px]" title={dropping.keyword}>
                                {dropping.keyword}
                            </h3>
                            <span className="flex items-center text-orange-500 font-bold bg-orange-50 px-2 py-0.5 rounded text-sm whitespace-nowrap">
                                <ArrowDown className="w-4 h-4 mr-1" />
                                {dropping.rankChange}계단 {/* rankChange is already negative */}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-3 mt-1">
                            <h3 className="text-xl font-medium text-gray-400">데이터 수집 중</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
