'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Home, Search, History, Settings, LogOut, CreditCard, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { WalletLabel, SubscriptionInfo } from './WalletLabel'

interface Props {
    user: {
        email: string
        name: string
        avatarUrl: string | null
    }
    subscription: SubscriptionInfo | null
    isOnboarding?: boolean
}

export function MobileNav({ user, subscription, isOnboarding = false }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const navItems = [
        { href: '/dashboard', label: '대시보드', icon: Home, isLocked: isOnboarding },
        { href: '/history', label: '분석 기록', icon: History, isLocked: isOnboarding },
        {
            label: '내 순위 검색',
            icon: Search,
            isLocked: isOnboarding,
            subItems: [
                { href: '/naver-search/new?mode=my-shop', label: '네이버 지도 검색' },
                { href: '/search/new?mode=my-shop', label: '구글 지도 검색' },
            ]
        },
        { href: '/settings', label: '설정', icon: Settings },
        { href: '/dashboard/subscription', label: '구독 관리', icon: CreditCard },
    ]

    return (
        <>
            {/* Hamburger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="메뉴 열기"
            >
                <Menu className="w-6 h-6" />
            </button>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-50"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Slide-out Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <span className="font-bold text-gray-900">메뉴</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                        aria-label="메뉴 닫기"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User Info */}
                <div className="p-4 border-b">
                    <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                            <Image
                                src={user.avatarUrl}
                                alt="Profile"
                                width={40}
                                height={40}
                                className="rounded-full"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                    {user.name.charAt(0)}
                                </span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{user.name}</p>
                            <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        </div>
                    </div>
                    <div className="mt-3">
                        <WalletLabel subscription={subscription} />
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="p-2 space-y-1">
                    {navItems.map((item, index) => (
                        <div key={index}>
                            {item.isLocked ? (
                                // 잠금 메뉴
                                <div className="flex items-center gap-3 px-4 py-3 text-gray-400 cursor-not-allowed rounded-xl">
                                    <item.icon className="w-5 h-5" />
                                    <span className="font-medium flex-1">{item.label}</span>
                                    <Lock className="w-3.5 h-3.5 text-gray-300" />
                                </div>
                            ) : item.subItems ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3 px-4 py-2 text-gray-900 font-semibold mt-2">
                                        <item.icon className="w-5 h-5 text-gray-500" />
                                        <span>{item.label}</span>
                                    </div>
                                    <div className="pl-12 space-y-1">
                                        {item.subItems.map((sub) => (
                                            <Link
                                                key={sub.href}
                                                href={sub.href}
                                                onClick={() => setIsOpen(false)}
                                                className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                                            >
                                                {sub.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <Link
                                    href={item.href!}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    <item.icon className="w-5 h-5 text-gray-500" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Logout Button */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">로그아웃</span>
                    </button>
                </div>
            </div>
        </>
    )
}
