'use client'

import { Key, Eye } from 'lucide-react'

interface Props {
    managedKeywordsCount: number
    competitorsTrackedCount: number
}

export function QuickStatsRow({
    managedKeywordsCount,
    competitorsTrackedCount
}: Props) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
            {/* Keywords */}
            <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow border border-gray-100 dark:border-slate-700 hover:border-[#00C896]/30">
                <div className="flex items-center justify-between">
                    <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">관리 중인 키워드</p>
                    <Key className="text-purple-400/60 w-5 h-5" />
                </div>
                <p className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight">
                    {managedKeywordsCount}<span className="text-sm text-gray-500 font-normal ml-1">개</span>
                </p>
            </div>

            {/* Competitors */}
            <div className="flex flex-col gap-3 rounded-xl p-6 bg-white dark:bg-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow border border-gray-100 dark:border-slate-700 hover:border-[#00C896]/30">
                <div className="flex items-center justify-between">
                    <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">등록된 경쟁사</p>
                    <Eye className="text-orange-400/60 w-5 h-5" />
                </div>
                <p className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight">
                    {competitorsTrackedCount}<span className="text-sm text-gray-500 font-normal ml-1">곳</span>
                </p>
            </div>
        </div>
    )
}
