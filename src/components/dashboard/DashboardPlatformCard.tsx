'use client'

import { Card } from '@/components/ui/card'
import { Lock, Store, ArrowRight } from 'lucide-react'
import { PlaceSelectionModal } from './PlaceSelectionModal'
import { UpgradePrompt } from './UpgradePrompt'
import { getRequiredPlanForPlatform } from '@/lib/utils/subscription'

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
}

export function DashboardPlatformCard({ platform, data, competitorCount = 0, firstCompetitorName, isLocked = false, keywords = [] }: Props) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)

    const handleRegister = async (place: Place) => {
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
            ) : (
                // Active State
                <div className={`group relative flex flex-col sm:flex-row gap-4 p-5 rounded-xl bg-white dark:bg-slate-800 border-2 shadow-[0_4px_20px_rgba(0,199,149,0.15)] transition-all ${platform === 'naver' ? 'border-[#00C896]' : 'border-blue-500'}`}>
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
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{data.place_name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-1 mt-1">{data.address || '주소 정보 없음'}</p>

                            {keywords.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {keywords.map((kw) => (
                                        <span key={kw} className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                                            #{kw}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {data.locked_until ? (
                                <p className="text-xs text-amber-600 mt-2">
                                    {new Date(data.locked_until).toLocaleDateString()}까지 변경 제한
                                </p>
                            ) : null}
                        </div>
                        <div className="mt-4 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex-1 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white text-sm font-medium py-2 rounded-lg transition-colors"
                            >
                                정보 변경
                            </button>
                            <button
                                onClick={() => router.push(platform === 'naver' ? '/naver-search/new?mode=my-shop' : '/search/new?mode=my-shop')}
                                className="flex-1 bg-[#00C896] hover:bg-[#00B386] text-white text-sm font-bold py-2 rounded-lg transition-colors"
                            >
                                순위 검색
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PlaceSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                platform={platform}
                onConfirm={handleRegister}
            />

            {/* 업그레이드 유도 모달 */}
            {showUpgradePrompt && (
                <UpgradePrompt
                    message={`${platformName} 기능은 ${requiredPlan} 플랜부터 사용할 수 있습니다.`}
                    requiredPlan={requiredPlan}
                    onClose={() => setShowUpgradePrompt(false)}
                />
            )}
        </>
    )
}
