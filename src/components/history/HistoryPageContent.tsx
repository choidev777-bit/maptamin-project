'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Search } from '@/lib/types'
import { RankTrendDataPoint } from '@/lib/utils/rank-trend'
import { HistoryTable } from './HistoryTable'
import { Lock, TrendingUp, BarChart3 } from 'lucide-react'

// Vercel best practice: bundle-dynamic-imports — recharts를 포함한 전체 컴포넌트를 lazy load
const RankTrendChart = dynamic(() => import('./RankTrendChart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-[360px]">
            <div className="animate-spin h-8 w-8 border-4 border-[#00C896] border-t-transparent rounded-full" />
        </div>
    ),
})

interface Props {
    searches: Search[]
    naverTrend: RankTrendDataPoint[]
    googleTrend: RankTrendDataPoint[]
    naverKeywords: string[]
    googleKeywords: string[]
    canGoogle: boolean
}

export function HistoryPageContent({
    searches,
    naverTrend,
    googleTrend,
    naverKeywords,
    googleKeywords,
    canGoogle,
}: Props) {
    const [activePlatform, setActivePlatform] = useState<'naver' | 'google'>('naver')
    const [filterPlatform, setFilterPlatform] = useState<'all' | 'naver' | 'google'>('all')
    const [filterReportType, setFilterReportType] = useState<'all' | 'weekly' | 'realtime' | 'welcome'>('all')

    const currentTrend = activePlatform === 'naver' ? naverTrend : googleTrend
    const currentKeywords = activePlatform === 'naver' ? naverKeywords : googleKeywords

    const handlePlatformToggle = (platform: 'naver' | 'google') => {
        if (platform === 'google' && !canGoogle) return
        setActivePlatform(platform)
    }

    // 테이블 필터 적용
    const filteredSearches = searches.filter(s => {
        if (filterPlatform !== 'all' && s.platform !== filterPlatform) return false
        if (filterReportType !== 'all' && s.report_type !== filterReportType) return false
        return true
    })

    return (
        <div className="flex flex-col gap-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">진단 기록</h1>
                <p className="text-gray-500 mt-1">주간 리포트 기반 순위 변화 추이와 전체 진단 기록을 확인하세요.</p>
            </div>

            {/* ── Section 1: 순위 변화 그래프 ── */}
            <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                {/* 그래프 헤더 + 플랫폼 토글 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 pb-4 gap-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#00C896]" />
                        <h2 className="text-lg font-bold text-gray-900">
                            평균 순위 변화
                            <span className="text-sm font-normal text-gray-400 ml-2">(주간 보고서 기준)</span>
                        </h2>
                    </div>

                    {/* 플랫폼 토글 */}
                    <div className="flex bg-gray-100/80 p-1.5 rounded-xl">
                        <button
                            onClick={() => handlePlatformToggle('naver')}
                            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activePlatform === 'naver'
                                ? 'bg-white text-[#00C896] shadow-sm ring-1 ring-gray-900/5'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                }`}
                        >
                            네이버
                        </button>
                        <button
                            onClick={() => handlePlatformToggle('google')}
                            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${activePlatform === 'google'
                                ? 'bg-white text-blue-500 shadow-sm ring-1 ring-gray-900/5'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
                                }`}
                        >
                            구글
                            {!canGoogle && <Lock className="w-3 h-3 text-slate-400" />}
                        </button>
                    </div>
                </div>

                {/* 그래프 */}
                <div className="px-6 pb-6">
                    {currentTrend.length >= 2 ? (
                        <RankTrendChart
                            trendData={currentTrend}
                            keywords={currentKeywords}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <BarChart3 className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">
                                주간 리포트가 2회 이상 누적되면
                            </p>
                            <p className="text-gray-500">
                                순위 변화 그래프가 표시됩니다.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Section 2: 진단 기록 테이블 ── */}
            <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                {/* 테이블 헤더 + 필터 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 pb-4 gap-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        전체 진단 기록
                        <span className="text-sm font-normal text-gray-400 ml-2">
                            ({filteredSearches.length}건)
                        </span>
                    </h2>

                    {/* 필터 */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* 플랫폼 필터 */}
                        <select
                            value={filterPlatform}
                            onChange={(e) => setFilterPlatform(e.target.value as 'all' | 'naver' | 'google')}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00C896]/30 focus:border-[#00C896]"
                        >
                            <option value="all">전체 플랫폼</option>
                            <option value="naver">네이버</option>
                            <option value="google">구글</option>
                        </select>

                        {/* 리포트 타입 필터 */}
                        <select
                            value={filterReportType}
                            onChange={(e) => setFilterReportType(e.target.value as 'all' | 'weekly' | 'realtime' | 'welcome')}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00C896]/30 focus:border-[#00C896]"
                        >
                            <option value="all">전체 유형</option>
                            <option value="weekly">주간 리포트</option>
                            <option value="realtime">실시간 진단</option>
                            <option value="welcome">웰컴 리포트</option>
                        </select>
                    </div>
                </div>

                {/* 테이블 */}
                <HistoryTable searches={filteredSearches} />
            </div>
        </div>
    )
}
