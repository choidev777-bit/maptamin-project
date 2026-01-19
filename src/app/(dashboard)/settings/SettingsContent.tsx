'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Calendar, Crown, LogOut, Settings, ChevronRight, Zap } from 'lucide-react'
import Image from 'next/image'

interface UserInfo {
    email: string
    name: string
    avatarUrl: string | null
    createdAt: string
}

interface Stats {
    searchesToday: number
    totalSearches: number
    plan: 'free' | 'pro'
    maxSearchesPerDay: number
}

interface Props {
    user: UserInfo
    stats: Stats
}

export function SettingsContent({ user, stats }: Props) {
    const router = useRouter()
    const [isLoggingOut, setIsLoggingOut] = useState(false)

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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stats.plan === 'pro' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gray-200'
                            }`}>
                            <Crown className={`w-5 h-5 ${stats.plan === 'pro' ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {stats.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                하루 {stats.maxSearchesPerDay}회 검색 가능
                            </p>
                        </div>
                    </div>

                    {stats.plan === 'free' && (
                        <button className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all">
                            업그레이드
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Usage Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Zap className="w-4 h-4" />
                            <span className="text-sm font-medium">오늘 사용</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                            {stats.searchesToday} / {stats.maxSearchesPerDay}
                        </p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-xl">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <Settings className="w-4 h-4" />
                            <span className="text-sm font-medium">총 검색</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">
                            {stats.totalSearches}
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">계정</h2>

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                    <LogOut className="w-5 h-5" />
                    {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
            </div>
        </div>
    )
}
