'use client'

import { useState } from 'react'
import { QuickStatsRow } from './QuickStatsRow'
import { QuickInsightsRow } from './QuickInsightsRow'
import { UpgradePrompt } from './UpgradePrompt'
import { KeywordInsight } from '@/lib/utils/insights'
import { Lock } from 'lucide-react'

interface MetricsData {
    keywordsCount: number
    competitorsCount: number
    insights: {
        rising: KeywordInsight | null
        dropping: KeywordInsight | null
    }
}

interface Props {
    naverData: MetricsData
    googleData: MetricsData
    canGoogle: boolean
}

export function DashboardMetricsToggle({ naverData, googleData, canGoogle }: Props) {
    const [activePlatform, setActivePlatform] = useState<'naver' | 'google'>('naver')
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

    const handleToggle = (platform: 'naver' | 'google') => {
        if (platform === 'google' && !canGoogle) {
            setShowUpgradePrompt(true)
            return
        }
        setActivePlatform(platform)
    }

    const currentData = activePlatform === 'naver' ? naverData : googleData

    return (
        <div className="flex flex-col gap-6">
            {/* Toggle Control */}
            <div className="flex justify-start">
                <div className="flex bg-gray-100/80 dark:bg-slate-800 p-1.5 rounded-xl">
                    <button
                        onClick={() => handleToggle('naver')}
                        className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activePlatform === 'naver'
                                ? 'bg-white dark:bg-slate-700 text-[#00C896] shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
                                : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/50'
                            }`}
                    >
                        네이버 플레이스
                    </button>
                    <button
                        onClick={() => handleToggle('google')}
                        className={`px-5 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${activePlatform === 'google'
                                ? 'bg-white dark:bg-slate-700 text-blue-500 shadow-sm ring-1 ring-gray-900/5 dark:ring-white/10'
                                : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/50'
                            }`}
                    >
                        구글 비즈니스 프로필
                        {!canGoogle && <Lock className="w-3 h-3 text-slate-400" />}
                    </button>
                </div>
            </div>

            {/* Quick Stats Overview */}
            <QuickStatsRow
                managedKeywordsCount={currentData.keywordsCount}
                competitorsTrackedCount={currentData.competitorsCount}
            />

            {/* Quick Insights */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-transparent pb-1">
                        주간 리포트 요약 <span className="text-sm font-normal text-gray-400 ml-2">({activePlatform === 'naver' ? '네이버' : '구글'})</span>
                    </h3>
                </div>
                <QuickInsightsRow rising={currentData.insights.rising} dropping={currentData.insights.dropping} />
            </div>

            {/* 업그레이드 유도 모달 */}
            {showUpgradePrompt && (
                <UpgradePrompt
                    message={`구글 비즈니스 프로필 관리는 프리미엄 플랜부터 사용할 수 있습니다.`}
                    requiredPlan="프리미엄"
                    onClose={() => setShowUpgradePrompt(false)}
                />
            )}
        </div>
    )
}
