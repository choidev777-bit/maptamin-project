'use client'

import { useState, useMemo, startTransition } from 'react'
import dynamic from 'next/dynamic'
import { Search } from '@/lib/types'
import { RankTrendDataPoint } from '@/lib/utils/rank-trend'
import { HistoryTable } from './HistoryTable'
import { Lock, TrendingUp, BarChart3, MapPin, Rocket } from 'lucide-react'

// Vercel best practice: bundle-dynamic-imports — recharts를 포함한 전체 컴포넌트를 lazy load
const RankTrendChart = dynamic(() => import('./RankTrendChart'), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-[360px]">
            <div className="animate-spin h-8 w-8 border-4 border-[#00C896] border-t-transparent rounded-full" />
        </div>
    ),
})

// 기간 필터 옵션 — 컴포넌트 외부에 선언 (매 렌더마다 재생성 방지, rerender-hoist)
type PeriodOption = '7' | '30' | '90'

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
    { value: '7',   label: '7일' },
    { value: '30',  label: '30일' },
    { value: '90',  label: '90일' },
]

interface Props {
    searches: Search[]
    naverTrend: RankTrendDataPoint[]
    googleTrend: RankTrendDataPoint[]
    naverKeywords: string[]
    googleKeywords: string[]
    naverLocalTrend: RankTrendDataPoint[]
    naverLocalKeywords: string[]
    naverExposureTrend: RankTrendDataPoint[]
    googleExposureTrend: RankTrendDataPoint[]
    naverTopRateTrend: RankTrendDataPoint[]
    googleTopRateTrend: RankTrendDataPoint[]
    canGoogle: boolean
}

export function HistoryPageContent({
    searches,
    naverTrend,
    googleTrend,
    naverKeywords,
    googleKeywords,
    naverLocalTrend,
    naverLocalKeywords,
    naverExposureTrend,
    googleExposureTrend,
    naverTopRateTrend,
    googleTopRateTrend,
    canGoogle,
}: Props) {
    const [activePlatform, setActivePlatform] = useState<'naver' | 'google'>('naver')
    const [activeGraphTab, setActiveGraphTab] = useState<'rank' | 'exposure' | 'topRate'>('rank')
    const [filterPlatform, setFilterPlatform] = useState<'all' | 'naver' | 'google'>('all')
    const [filterReportType, setFilterReportType] = useState<'all' | 'daily' | 'weekly' | 'realtime' | 'welcome'>('all')
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('30')
    const [selectedLocalPeriod, setSelectedLocalPeriod] = useState<PeriodOption>('30')

    const handlePlatformToggle = (platform: 'naver' | 'google') => {
        if (platform === 'google' && !canGoogle) return
        setActivePlatform(platform)
    }

    const handlePeriodChange = (period: PeriodOption) => {
        startTransition(() => { setSelectedPeriod(period) })
    }
    const handleLocalPeriodChange = (period: PeriodOption) => {
        startTransition(() => { setSelectedLocalPeriod(period) })
    }

    // 탭별 현재 데이터
    const currentTrend = activePlatform === 'naver' ? naverTrend : googleTrend
    const currentKeywords = activePlatform === 'naver' ? naverKeywords : googleKeywords
    const currentExposureTrend = activePlatform === 'naver' ? naverExposureTrend : googleExposureTrend
    const currentTopRateTrend = activePlatform === 'naver' ? naverTopRateTrend : googleTopRateTrend

    // 기간 필터 cutoff 날짜 계산 (rerender-memo: selectedPeriod가 바뀔 때만 재계산)
    const cutoffDateStr = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() - parseInt(selectedPeriod))
        return d.toISOString().split('T')[0]  // 'YYYY-MM-DD'
    }, [selectedPeriod])

    // trend 배열 필터링 — fullDate(YYYY-MM-DD) 문자열 비교로 날짜 범위 적용 (rerender-memo)
    const filteredTrend = useMemo(
        () => currentTrend.filter(p => p.fullDate >= cutoffDateStr),
        [currentTrend, cutoffDateStr]
    )
    const filteredExposureTrend = useMemo(
        () => currentExposureTrend.filter(p => p.fullDate >= cutoffDateStr),
        [currentExposureTrend, cutoffDateStr]
    )
    const filteredTopRateTrend = useMemo(
        () => currentTopRateTrend.filter(p => p.fullDate >= cutoffDateStr),
        [currentTopRateTrend, cutoffDateStr]
    )

    // 지역명 키워드 trend 필터링 (Card 2 전용 — 독립 기간)
    const cutoffLocalDateStr = useMemo(() => {
        const d = new Date()
        d.setDate(d.getDate() - parseInt(selectedLocalPeriod))
        return d.toISOString().split('T')[0]
    }, [selectedLocalPeriod])

    const filteredLocalTrend = useMemo(
        () => naverLocalTrend.filter(p => p.fullDate >= cutoffLocalDateStr),
        [naverLocalTrend, cutoffLocalDateStr]
    )

    // 테이블 필터 적용
    const filteredSearches = searches.filter(s => {
        if (filterPlatform !== 'all' && s.platform !== filterPlatform) return false
        if (filterReportType !== 'all' && s.report_type !== filterReportType) return false
        return true
    })

    const tabConfig = [
        { id: 'rank' as const, label: '평균 순위 변화', icon: TrendingUp, color: 'text-[#00C896]' },
        { id: 'exposure' as const, label: '노출된 좌표 수', icon: MapPin, color: 'text-emerald-500' },
        { id: 'topRate' as const, label: '상위 노출률', icon: Rocket, color: 'text-[#00C896]' },
    ]

    const activeTab = tabConfig.find(t => t.id === activeGraphTab)!

    // 전체 데이터 존재 여부 (기간 필터 무관 — "분석 기록이 쌓이면..." 메시지 판단용)
    const hasAnyData =
        activeGraphTab === 'rank' ? currentTrend.length >= 1 :
        activeGraphTab === 'exposure' ? currentExposureTrend.length >= 1 :
        currentTopRateTrend.length >= 1

    // 현재 기간 필터 후 데이터 존재 여부 ("선택한 기간에 데이터가 없습니다." 메시지 판단용)
    const currentTabHasData =
        activeGraphTab === 'rank' ? filteredTrend.length >= 1 :
        activeGraphTab === 'exposure' ? filteredExposureTrend.length >= 1 :
        filteredTopRateTrend.length >= 1

    // 현재 탭 빈 상태 안내 문구
    const emptyMessages: Record<string, string> = {
        rank: '순위 변화 그래프가 표시됩니다.',
        exposure: '노출 좌표 수 그래프가 표시됩니다.',
        topRate: '상위 노출률 그래프가 표시됩니다.',
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">분석 기록</h1>
                <p className="text-gray-500 mt-1">자동 리포트 기반 순위 변화 추이와 전체 분석 기록을 확인하세요.</p>
            </div>

            {/* ── Card 1: 통합 트렌드 그래프 (탭 전환) ── */}
            <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                {/* 헤더: 제목 + 플랫폼 토글 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 pt-6 pb-4 gap-4">
                    <div className="flex items-center gap-2">
                        <activeTab.icon className={`w-5 h-5 ${activeTab.color}`} />
                        <h2 className="text-lg font-bold text-gray-900">
                            {activeTab.label}
                            <span className="block sm:inline text-sm font-normal text-gray-400 sm:ml-2">(자동 리포트 기준)</span>
                        </h2>
                    </div>

                    {/* 우측: 플랫폼 토글 */}
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

                {/* 기간 필터 — 플랫폼 토글 아래 별도 행 */}
                <div className="flex justify-end px-6 pb-2">
                    <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-lg text-xs">
                        {PERIOD_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handlePeriodChange(opt.value)}
                                className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                                    selectedPeriod === opt.value
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 탭 바 */}
                <div className="flex gap-0 px-6 border-b border-gray-100 overflow-x-auto scrollbar-none">
                    {tabConfig.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeGraphTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveGraphTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                                    isActive
                                        ? `border-[#00C896] ${tab.color}`
                                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* 그래프 영역 */}
                <div className="px-6 pb-6 pt-4">
                    {!hasAnyData ? (
                        // 케이스 1: 데이터 자체가 없음 — 기존 "분석 기록이 쌓이면..." 메시지
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <BarChart3 className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">분석 기록이 쌓이면</p>
                            <p className="text-gray-500">{emptyMessages[activeGraphTab]}</p>
                        </div>
                    ) : !currentTabHasData ? (
                        // 케이스 2: 데이터 있지만 선택 기간 내 없음 — 기간 변경 유도 메시지
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <BarChart3 className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">선택한 기간에 데이터가 없습니다.</p>
                            <p className="text-gray-500 text-sm">기간을 넓혀보세요.</p>
                        </div>
                    ) : (
                        // 케이스 3: 데이터 있음 — 그래프 표시
                        <>
                            {activeGraphTab === 'rank' && (
                                <RankTrendChart
                                    key={currentKeywords.join(',')}
                                    trendData={filteredTrend}
                                    keywords={currentKeywords}
                                />
                            )}
                            {activeGraphTab === 'exposure' && (
                                <RankTrendChart
                                    key={currentKeywords.join(',') + '-exposure'}
                                    trendData={filteredExposureTrend}
                                    keywords={currentKeywords}
                                    yAxisMode="count"
                                />
                            )}
                            {activeGraphTab === 'topRate' && (
                                <RankTrendChart
                                    key={currentKeywords.join(',') + '-topRate'}
                                    trendData={filteredTopRateTrend}
                                    keywords={currentKeywords}
                                    yAxisMode="percent"
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Card 2: 지역명 키워드 순위 변화 (네이버 전용) ── */}
            {naverLocalTrend.length >= 1 && (
                <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 pb-4 gap-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-emerald-500" />
                            <h2 className="text-lg font-bold text-gray-900">
                                지역명 키워드 순위 변화
                                <span className="text-sm font-normal text-gray-400 ml-2">(자동 리포트 기준)</span>
                            </h2>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                            네이버 전용
                        </span>
                    </div>

                    {/* 기간 필터 — Card 2 독립 */}
                    <div className="flex justify-end px-6 pb-2">
                        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-lg text-xs">
                            {PERIOD_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleLocalPeriodChange(opt.value)}
                                    className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                                        selectedLocalPeriod === opt.value
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="px-6 pb-6">
                        {filteredLocalTrend.length >= 1 ? (
                            <RankTrendChart
                                key={naverLocalKeywords.join(',')}
                                trendData={filteredLocalTrend}
                                keywords={naverLocalKeywords}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <BarChart3 className="w-8 h-8 text-gray-300" />
                                </div>
                                <p className="text-gray-500 font-medium">선택한 기간에 데이터가 없습니다.</p>
                                <p className="text-gray-500 text-sm">기간을 넓혀보세요.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* ── Section 2: 분석 기록 테이블 ── */}
            <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                {/* 테이블 헤더 + 필터 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 pb-4 gap-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        전체 분석 기록
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
                            onChange={(e) => setFilterReportType(e.target.value as 'all' | 'daily' | 'weekly' | 'realtime' | 'welcome')}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#00C896]/30 focus:border-[#00C896]"
                        >
                            <option value="all">전체 유형</option>
                            <option value="daily">일간 리포트</option>
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
