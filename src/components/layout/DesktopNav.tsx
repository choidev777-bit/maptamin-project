'use client'

import Link from 'next/link'
import { Home, Search, Settings } from 'lucide-react'
import { WalletLabel, SubscriptionInfo } from './WalletLabel'
import { NavDropdown } from './NavDropdown'

interface Props {
    user: {
        email: string
        name: string
        avatarUrl: string | null
    }
    subscription: SubscriptionInfo | null
}

export function DesktopNav({ user, subscription }: Props) {
    return (
        <div className="flex items-center gap-6">
            {/* Navigation Links */}
            <nav className="flex items-center gap-1">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <Home className="w-4 h-4" />
                    대시보드
                </Link>

                <NavDropdown
                    label="내 순위 검색"
                    icon={Search}
                    items={[
                        { label: '네이버 지도 검색', href: '/naver-search/new?mode=my-shop' },
                        { label: '구글 지도 검색', href: '/search/new?mode=my-shop' },
                    ]}
                />


                <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    설정
                </Link>
            </nav>

            {/* User Info */}
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
                <WalletLabel subscription={subscription} />
                <span className="text-sm text-gray-600">{user.name} 님</span>
            </div>
        </div>
    )
}
