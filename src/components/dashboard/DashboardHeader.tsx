'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'

interface Props {
    hasActiveWeeklyReport: boolean
    nextReportDate?: Date | null
}

export function DashboardHeader({ hasActiveWeeklyReport, nextReportDate }: Props) {
    // Generate text based on status
    const statusText = hasActiveWeeklyReport
        ? `주간 자동 리포트: ON${nextReportDate ? ` (${format(nextReportDate, 'EEEE', { locale: ko })} 발송 예정)` : ''}`
        : '주간 자동 리포트: OFF'

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">대시보드</h1>
                <p className="text-gray-500 dark:text-slate-400 text-base font-normal">사장님의 진짜 상권 순위를 확인하세요.</p>
            </div>

            {/* Auto Report Status Badge — 클릭 시 리포트 설정으로 이동 */}
            <Link
                href="/report-settings"
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-gray-200 dark:border-slate-700 hover:border-[#00C896]/50 hover:shadow-md transition-all cursor-pointer"
            >
                <span className="relative flex h-3 w-3">
                    {hasActiveWeeklyReport && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C896] opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${hasActiveWeeklyReport ? 'bg-[#00C896]' : 'bg-gray-300'}`}></span>
                </span>
                <span className="text-gray-800 dark:text-slate-200 text-sm font-bold">
                    {statusText}
                </span>
            </Link>
        </div>
    )
}
