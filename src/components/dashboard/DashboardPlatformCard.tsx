'use client'

import { Card } from '@/components/ui/card'
import { Lock, Store, ArrowRight, Key, Swords, ChevronRight } from 'lucide-react'
import { PlaceSelectionModal } from './PlaceSelectionModal'
import { KeywordManageModal } from './KeywordManageModal'
import { CompetitorManageModal } from './CompetitorManageModal'
import { UpgradePrompt } from './UpgradePrompt'
import { getRequiredPlanForPlatform, isPlaceLockExempt } from '@/lib/utils/subscription'

import { useState } from 'react'
import { Place } from '@/lib/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ManagedPlaceData {
    id: string
    place_id: string
    place_name: string
    locked_until: string | null
    keywords?: string[]
    address?: string
    lat?: number
    lng?: number
}

interface Props {
    platform: 'naver' | 'google'
    data: ManagedPlaceData | null
    competitorCount?: number
    firstCompetitorName?: string
    isLocked?: boolean
    keywords?: string[]
    maxKeywords?: number
    maxCompetitors?: number
    planId?: string
}

export function DashboardPlatformCard({ platform, data, competitorCount = 0, firstCompetitorName, isLocked = false, keywords = [], maxKeywords = 0, maxCompetitors = 0, planId = 'free' }: Props) {
    const lockExempt = isPlaceLockExempt(planId)
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
    const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false)
    const [isCompetitorModalOpen, setIsCompetitorModalOpen] = useState(false)

    const handleRegister = async (place: Place) => {
        // 기존 매장이 있고, 다른 매장으로 변경하는 경우 → 확인
        if (data && data.place_id !== place.placeId) {
            const confirmed = confirm(
                '매장을 변경하면 기존 키워드와 경쟁사가 초기화됩니다.\n계속하시겠습니까?'
            )
            if (!confirmed) return
        }

        // API Call
        const response = await fetch('/api/settings/my-shop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform,
                placeId: place.placeId,
                placeName: place.name,
                address: place.address,
                lat: place.lat,
                lng: place.lng
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to save settings')
        }

        // Refresh page to show updated state
        router.refresh()
    }

    const requiredPlan = getRequiredPlanForPlatform(platform)
    const platformName = platform === 'naver' ? '네이버 플레이스' : '구글 비즈니스 프로필'
    const platformInitial = platform === 'naver' ? 'N' : 'G'

    return (
        <>
            {isLocked ? (
                // Locked State
                <div
                    className="relative flex flex-col sm:flex-row gap-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 transition-all cursor-pointer group"
                    onClick={() => setShowUpgradePrompt(true)}
                >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/70 dark:bg-slate-900/60 z-10 transition-opacity rounded-xl backdrop-blur-[2px]">
                        <span className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg shadow-sm font-bold text-sm border border-slate-200">
                            잠금 해제하기 ({requiredPlan} 플랜 필요)
                        </span>
                    </div>
                    <div className="w-full sm:w-32 aspect-square rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                        <Lock className="text-slate-400 w-8 h-8" />
                    </div>
                    <div className="flex flex-col flex-1 justify-center gap-2 py-1 opacity-70">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white border border-slate-300 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded">{platformInitial}</span>
                            <span className="text-xs font-bold uppercase text-slate-500 tracking-wide">이용 불가</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{platformName}</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-500">이 플랫폼은 {requiredPlan} 플랜부터 이용할 수 있습니다.</p>
                        <button className="mt-2 w-fit text-sm font-bold text-[#00C896] dark:text-[#00B386] flex items-center gap-1">
                            플랜 업그레이드 <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : !data ? (
                // Inactive (Not Connected) State
                <div
                    className="relative flex flex-col sm:flex-row gap-4 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-600 hover:border-slate-400 transition-all cursor-pointer group"
                    onClick={() => setIsModalOpen(true)}
                >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/70 dark:bg-slate-900/60 z-10 transition-opacity rounded-xl backdrop-blur-[2px]">
                        <span className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg shadow-sm font-bold text-sm border border-slate-200">연결하기 클릭</span>
                    </div>
                    <div className="w-full sm:w-32 aspect-square rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center">
                        <Store className="text-slate-400 w-10 h-10" />
                    </div>
                    <div className="flex flex-col flex-1 justify-center gap-2 py-1 opacity-70">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white border border-slate-300 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded">{platformInitial}</span>
                            <span className="text-xs font-bold uppercase text-slate-500 tracking-wide">미연결 상태</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{platformName}</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-500">계정을 연동하고 검색 순위를 추적해 보세요.</p>
                        <button className="mt-2 w-fit text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            지금 연동하기 <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (() => {
                // 매장 변경 잠금 체크
                const isPlaceLocked = !lockExempt && data.locked_until && new Date(data.locked_until) > new Date()
                return (
                    // Active State
                    <div className={`group relative flex flex-col sm:flex-row gap-4 p-5 rounded-xl bg-white dark:bg-slate-800 border-2 transition-all ${platform === 'naver' ? 'border-[#00C896] shadow-[0_4px_20px_rgba(0,199,149,0.15)]' : 'border-blue-500 shadow-[0_4px_20px_rgba(59,130,246,0.15)]'}`}>
                        <div className="w-full sm:w-32 aspect-square rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <Store className={`w-12 h-12 ${platform === 'naver' ? 'text-[#00C896]/50' : 'text-blue-500/50'}`} />
                        </div>
                        <div className="flex flex-col flex-1 justify-between py-1">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-white text-[10px] font-bold px-1.5 py-0.5 rounded ${platform === 'naver' ? 'bg-[#03C75A]' : 'bg-blue-600'}`}>{platformInitial}</span>
                                        <span className={`text-xs font-bold uppercase tracking-wide ${platform === 'naver' ? 'text-[#00C896]' : 'text-blue-600'}`}>연동됨</span>
                                    </div>
                                    {isPlaceLocked && (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded font-medium">
                                            <Lock className="w-3.5 h-3.5" />
                                            <span>{new Date(data.locked_until!).toLocaleDateString('ko-KR').replace(/\.$/, '')} 까지 매장 변경 제한</span>
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{data.place_name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-1 mt-1">{data.address || '주소 정보 없음'}</p>

                                {/* 키워드/경쟁사 관리 버튼 */}
                                <div className="flex flex-col gap-2 mt-3">
                                    <button
                                        onClick={() => setIsKeywordModalOpen(true)}
                                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-600 transition-colors group/btn"
                                    >
                                        <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                                            <Key className={`w-4 h-4 ${platform === 'naver' ? 'text-[#00C896]' : 'text-blue-500'}`} />
                                            저장된 키워드: <span className="font-bold text-gray-900 dark:text-white">{keywords.length}개</span>
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover/btn:text-gray-600 transition-colors" />
                                    </button>
                                    <button
                                        onClick={() => setIsCompetitorModalOpen(true)}
                                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-100 dark:border-slate-600 transition-colors group/btn"
                                    >
                                        <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                                            <Swords className={`w-4 h-4 ${platform === 'naver' ? 'text-[#00C896]' : 'text-blue-500'}`} />
                                            저장된 경쟁사: <span className="font-bold text-gray-900 dark:text-white">{competitorCount}곳</span>
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover/btn:text-gray-600 transition-colors" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => {
                                        if (isPlaceLocked) {
                                            alert(`매장 변경은 ${new Date(data.locked_until!).toLocaleDateString('ko-KR')}까지 제한됩니다.`)
                                            return
                                        }
                                        setIsModalOpen(true)
                                    }}
                                    disabled={!!isPlaceLocked}
                                    className={`flex-1 border text-sm font-medium py-2 rounded-lg transition-colors ${isPlaceLocked
                                        ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                                        : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white'
                                        }`}
                                    title={isPlaceLocked ? `${new Date(data.locked_until!).toLocaleDateString('ko-KR')}까지 변경 제한` : '매장 정보 변경'}
                                >
                                    {isPlaceLocked ? '변경 제한 중' : '매장 변경'}
                                </button>
                                <button
                                    onClick={() => router.push(platform === 'naver' ? '/naver-search/new?mode=my-shop' : '/search/new?mode=my-shop')}
                                    className={`flex-1 text-white text-sm font-bold py-2 rounded-lg transition-colors ${platform === 'naver' ? 'bg-[#00C896] hover:bg-[#00B386]' : 'bg-blue-500 hover:bg-blue-600'}`}
                                >
                                    순위 분석
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            <PlaceSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                platform={platform}
                onConfirm={handleRegister}
                isPlaceLockExempt={lockExempt}
            />

            {/* 업그레이드 유도 모달 */}
            {showUpgradePrompt && (
                <UpgradePrompt
                    message={`${platformName} 기능은 ${requiredPlan} 플랜부터 사용할 수 있습니다.`}
                    requiredPlan={requiredPlan}
                    onClose={() => setShowUpgradePrompt(false)}
                />
            )}

            {/* 키워드 관리 모달 */}
            <KeywordManageModal
                isOpen={isKeywordModalOpen}
                onClose={() => setIsKeywordModalOpen(false)}
                platform={platform}
                maxKeywords={maxKeywords}
            />

            {/* 경쟁사 관리 모달 */}
            <CompetitorManageModal
                isOpen={isCompetitorModalOpen}
                onClose={() => setIsCompetitorModalOpen(false)}
                platform={platform}
                maxCompetitors={maxCompetitors}
            />
        </>
    )
}
