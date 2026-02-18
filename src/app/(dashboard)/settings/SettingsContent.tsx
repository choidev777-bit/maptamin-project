'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Calendar, Crown, LogOut, Settings, ChevronRight, Zap, Lock, Key } from 'lucide-react'
import Image from 'next/image'
import { MyShopManager } from '@/components/settings/MyShopManager'
import { CompetitorManager } from '@/components/settings/CompetitorManager'
import { KeywordManager } from '@/components/settings/KeywordManager'
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection'
import { UpgradePrompt } from '@/components/dashboard/UpgradePrompt'
import { isSubscribed, canManageCompetitors, canAccessPlatform, getRequiredPlanForCompetitors } from '@/lib/utils/subscription'

interface UserInfo {
    email: string
    name: string
    avatarUrl: string | null
    createdAt: string
}

interface Props {
    user: UserInfo
    planStats: {
        plan: 'free' | 'starter' | 'pro' | 'premium'
        limitCompetitorNaver: number
        limitCompetitorGoogle: number
        limitKeywordsNaver: number
        limitKeywordsGoogle: number
        maxSearchesPerDay: number
    }
}

export function SettingsContent({ user, planStats }: Props) {
    const router = useRouter()
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [upgradePrompt, setUpgradePrompt] = useState<{ message: string; requiredPlan: string } | null>(null)

    const subscribed = isSubscribed(planStats.plan)
    const canCompetitors = canManageCompetitors(planStats.plan)
    const canGoogle = canAccessPlatform(planStats.plan, 'google')

    const handleLogout = async () => {
        setIsLoggingOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const planDisplayName = {
        free: '무료',
        starter: 'Starter',
        pro: 'Pro',
        premium: 'Premium',
    }[planStats.plan]

    const planBgClass = {
        free: 'bg-gray-200',
        starter: 'bg-gray-200',
        pro: 'bg-blue-600',
        premium: 'bg-gradient-to-r from-yellow-400 to-orange-500',
    }[planStats.plan]

    const planIconClass = {
        free: 'text-gray-500',
        starter: 'text-gray-500',
        pro: 'text-white',
        premium: 'text-white',
    }[planStats.plan]

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-gray-600" />
                    설정
                </h1>
                <p className="text-gray-600 mt-1">계정 정보 및 구독 관리</p>
            </div>

            {/* Profile Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">프로필</h2>

                <div className="flex items-center gap-4">
                    {user.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt="Profile"
                            width={64}
                            height={64}
                            className="rounded-full"
                        />
                    ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                        </div>
                    )}

                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Mail className="w-4 h-4" />
                            {user.email}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(user.createdAt)} 가입
                        </p>
                    </div>
                </div>
            </div>

            {/* Plan Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">구독 플랜</h2>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${planBgClass}`}>
                            <Crown className={`w-5 h-5 ${planIconClass}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{planDisplayName}</h3>
                            <p className="text-sm text-gray-500">
                                {subscribed
                                    ? `경쟁사 최대 ${planStats.limitCompetitorNaver + planStats.limitCompetitorGoogle}개 등록 가능`
                                    : '구독하여 모든 기능을 이용하세요'
                                }
                            </p>
                        </div>
                    </div>

                    {planStats.plan !== 'premium' && (
                        <button
                            onClick={() => router.push('/dashboard/upgrade')}
                            className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-[#00C896] to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-[#00B386] hover:to-emerald-700 transition-all"
                        >
                            {subscribed ? '업그레이드' : '구독하기'}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* My Shop Management */}
            <div className="mb-6">
                {subscribed ? (
                    <MyShopManager />
                ) : (
                    <div
                        className="relative bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer"
                        onClick={() => setUpgradePrompt({ message: '매장 관리는 구독 후 이용할 수 있습니다.', requiredPlan: 'Starter' })}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-gray-400">내 매장 관리</h2>
                            <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400">구독하여 매장을 등록하세요</p>
                    </div>
                )}
            </div>

            {/* Keyword Management */}
            <div className="mb-6">
                {subscribed ? (
                    <KeywordManager
                        planId={planStats.plan}
                        maxNaverKeywords={planStats.limitKeywordsNaver}
                        maxGoogleKeywords={planStats.limitKeywordsGoogle}
                        canGoogle={canGoogle}
                        onUpgradeClick={() => setUpgradePrompt({ message: '구글 키워드 관리는 Premium 플랜에서 이용 가능합니다.', requiredPlan: 'Premium' })}
                    />
                ) : (
                    <div
                        className="relative bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer"
                        onClick={() => setUpgradePrompt({ message: '키워드 관리는 구독 후 이용할 수 있습니다.', requiredPlan: 'Starter' })}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-gray-400">키워드 관리</h2>
                            <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400">구독하여 키워드를 등록하세요</p>
                    </div>
                )}
            </div>

            {/* Competitor Management */}
            <div className="mb-6">
                {canCompetitors ? (
                    <CompetitorManager planId={planStats.plan} maxNaverCompetitors={planStats.limitCompetitorNaver} maxGoogleCompetitors={planStats.limitCompetitorGoogle} />
                ) : (
                    <div
                        className="relative bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer"
                        onClick={() => setUpgradePrompt({ message: '경쟁사 분석은 Pro 플랜부터 이용 가능합니다.', requiredPlan: getRequiredPlanForCompetitors() })}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-gray-400">경쟁사 관리</h2>
                            <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400">Pro 플랜부터 경쟁사를 등록하고 비교할 수 있습니다</p>
                    </div>
                )}
            </div>

            {/* Actions Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">계정</h2>

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-600 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 border border-gray-200"
                >
                    <LogOut className="w-5 h-5" />
                    {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
            </div>

            {/* Danger Zone */}
            <DeleteAccountSection />

            {/* Upgrade Prompt Modal */}
            {upgradePrompt && (
                <UpgradePrompt
                    message={upgradePrompt.message}
                    requiredPlan={upgradePrompt.requiredPlan}
                    onClose={() => setUpgradePrompt(null)}
                />
            )}
        </div>
    )
}
