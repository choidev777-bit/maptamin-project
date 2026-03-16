'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
    Home,
    History,
    Search,
    Settings,
    CreditCard,
    LogOut,
    ChevronDown,
    ChevronRight,
    PanelLeftOpen,
    PanelLeftClose,
    PanelLeft,
    Lock,
    Ticket,
    Map,
    CalendarClock,
} from 'lucide-react'
import { isSubscribed, getPlanDisplayName, canAccessPlatform } from '@/lib/utils/subscription'
import { WalletLabel, SubscriptionInfo } from './WalletLabel'

// ── Types ──

export type SidebarMode = 'pinned' | 'collapsed' | 'hover'

interface UserInfo {
    email: string
    name: string
    avatarUrl: string | null
}

interface Props {
    mode: SidebarMode
    onModeChange: (mode: SidebarMode) => void
    user: UserInfo
    subscription: SubscriptionInfo | null
    isHoverExpanded: boolean
    onHoverEnter: () => void
    onHoverLeave: () => void
    isOnboarding?: boolean
}

// ── Route Matching ──

interface NavRoute {
    href: string
    label: string
    icon: React.ElementType
    match: 'exact' | 'startsWith'
    isLocked?: boolean
}

function isRouteActive(pathname: string, route: NavRoute): boolean {
    if (route.match === 'exact') {
        return pathname === route.href
    }
    return pathname.startsWith(route.href)
}

function findActiveRoute(pathname: string, routes: NavRoute[]): string | null {
    // 긴 경로부터 체크 (우선순위: /dashboard/subscription > /dashboard)
    const sorted = [...routes].sort((a, b) => b.href.length - a.href.length)
    for (const route of sorted) {
        if (isRouteActive(pathname, route)) {
            return route.href
        }
    }
    return null
}

// ── Custom Platform Icons ──
const NaverPlatformIcon = ({ className }: { className?: string }) => (
    <span className={`inline-flex items-center justify-center text-white text-[10px] font-bold rounded bg-slate-400 ${className}`}>
        N
    </span>
)

const GooglePlatformIcon = ({ className }: { className?: string }) => (
    <span className={`inline-flex items-center justify-center text-white text-[10px] font-bold rounded bg-slate-400 ${className}`}>
        G
    </span>
)

// ── Component ──

export function Sidebar({
    mode,
    onModeChange,
    user,
    subscription,
    isHoverExpanded,
    onHoverEnter,
    onHoverLeave,
    isOnboarding = false,
}: Props) {
    const pathname = usePathname()
    const router = useRouter()
    const [searchGroupOpen, setSearchGroupOpen] = useState(false)

    const subscribed = subscription ? isSubscribed(subscription.plan_id) : false
    const canGoogle = subscription ? canAccessPlatform(subscription.plan_id, 'google') : false
    const planName = subscription ? getPlanDisplayName(subscription.plan_id) : ''

    const isExpanded = mode === 'pinned' || isHoverExpanded

    // ── Navigation Routes ──
    const mainRoutes: NavRoute[] = [
        { href: '/dashboard', label: '대시보드', icon: Home, match: 'exact', isLocked: isOnboarding },
        { href: '/history', label: '분석 기록', icon: History, match: 'startsWith', isLocked: isOnboarding },
        { href: '/report-settings', label: '자동 리포트 설정', icon: CalendarClock, match: 'startsWith', isLocked: !subscribed || isOnboarding },
    ]

    const searchSubRoutes: NavRoute[] = [
        { href: '/naver-search', label: '네이버', icon: NaverPlatformIcon, match: 'startsWith', isLocked: isOnboarding },
        { href: '/search', label: '구글', icon: GooglePlatformIcon, match: 'startsWith', isLocked: !canGoogle || isOnboarding },
    ]

    const bottomRoutes: NavRoute[] = [
        { href: '/dashboard/shop', label: '티켓 상점', icon: Ticket, match: 'startsWith' },
        { href: '/dashboard/subscription', label: '구독 관리', icon: CreditCard, match: 'startsWith' },
        { href: '/settings', label: '설정', icon: Settings, match: 'startsWith' },
    ]

    const allRoutes = [...mainRoutes, ...searchSubRoutes, ...bottomRoutes]
    const activeHref = findActiveRoute(pathname, allRoutes)

    // 검색 서브메뉴가 활성화된 경우 자동 열기
    const isSearchActive = searchSubRoutes.some(r => isRouteActive(pathname, r))
    useEffect(() => {
        if (isSearchActive) setSearchGroupOpen(true)
    }, [isSearchActive])

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const toggleMode = () => {
        onModeChange(mode === 'pinned' ? 'collapsed' : 'pinned')
    }

    return (
        <aside
            onMouseEnter={mode === 'hover' ? onHoverEnter : undefined}
            onMouseLeave={mode === 'hover' ? onHoverLeave : undefined}
            className={`
                fixed top-0 left-0 h-full bg-white border-r border-gray-200 
                flex flex-col z-40
                transition-[width] duration-200 ease-in-out
                ${isExpanded ? 'w-60' : 'w-16'}
            `}
        >
            {/* ── Logo ── */}
            <div className="h-16 flex items-center px-4 border-b border-gray-100 flex-shrink-0">
                <Link href={isOnboarding ? '/onboarding' : '/dashboard'} className="flex items-center gap-3 overflow-hidden">
                    {/* Mini Grid Logo */}
                    <div className="w-8 h-8 flex-shrink-0">
                        <svg viewBox="0 0 112 112" className="w-8 h-8">
                            {[0, 1, 2].map(row =>
                                [0, 1, 2].map(col => {
                                    const i = row * 3 + col
                                    return (
                                        <rect
                                            key={i}
                                            x={col * 40}
                                            y={row * 40}
                                            width={32}
                                            height={32}
                                            rx={4.8}
                                            fill={i === 4 ? '#00C896' : '#002959'}
                                        />
                                    )
                                })
                            )}
                        </svg>
                    </div>
                    {isExpanded && (
                        <span className="text-lg font-bold text-[#002959] whitespace-nowrap transition-opacity duration-150">
                            Maptamin
                        </span>
                    )}
                </Link>
            </div>

            {/* ── Navigation Links ── */}
            <nav className="flex-1 overflow-y-auto py-3 px-2" role="navigation" aria-label="메인 메뉴">
                {/* Main Routes */}
                <div className="space-y-0.5">
                    {mainRoutes.map((route) => (
                        <SidebarLink
                            key={route.href}
                            route={route}
                            isActive={activeHref === route.href}
                            isExpanded={isExpanded}
                        />
                    ))}
                </div>

                {/* Search Group (Accordion) */}
                <div className="mt-1">
                    <button
                        onClick={isOnboarding ? undefined : () => setSearchGroupOpen(!searchGroupOpen)}
                        disabled={isOnboarding}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                            transition-colors group relative
                            ${isOnboarding
                                ? 'text-gray-400 cursor-not-allowed'
                                : isSearchActive
                                    ? 'text-[#00C896] bg-emerald-50'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }
                        `}
                        title={!isExpanded ? '실시간 순위 진단' : undefined}
                    >
                        <Search className="w-5 h-5 flex-shrink-0" />
                        {isExpanded && (
                            <>
                                <span className="flex-1 text-left whitespace-nowrap">실시간 순위 진단</span>
                                <ChevronDown
                                    className={`w-4 h-4 transition-transform ${searchGroupOpen ? 'rotate-0' : '-rotate-90'}`}
                                />
                            </>
                        )}
                    </button>

                    {/* Sub Items */}
                    {searchGroupOpen && isExpanded && (
                        <div className="ml-5 pl-3 border-l-2 border-gray-100 mt-0.5 space-y-0.5">
                            {searchSubRoutes.map((route) => (
                                <SidebarLink
                                    key={route.href}
                                    route={route}
                                    isActive={activeHref === route.href}
                                    isExpanded={isExpanded}
                                    isSubItem
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="my-3 mx-3 border-t border-gray-100" />

                {/* Bottom Routes */}
                <div className="space-y-0.5">
                    {bottomRoutes.map((route) => (
                        <SidebarLink
                            key={route.href}
                            route={route}
                            isActive={activeHref === route.href}
                            isExpanded={isExpanded}
                        />
                    ))}
                </div>
            </nav>

            {/* ── Ticket / CTA Section ── */}
            <div className="px-2 py-2 border-t border-gray-100 flex-shrink-0">
                {subscribed ? (
                    <div className={`px-3 py-2.5 rounded-lg bg-gray-50 ${isExpanded ? '' : 'flex justify-center'}`}>
                        {isExpanded ? (
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-500">{planName} 플랜</span>
                                    <WalletLabel subscription={subscription} />
                                </div>
                            </div>
                        ) : (
                            <div title="티켓 보기">
                                <Ticket className="w-5 h-5 text-emerald-600" />
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => router.push('/dashboard/subscription')}
                        className={`
                            w-full rounded-lg font-semibold transition-colors
                            bg-[#00C896] text-white hover:bg-[#00B085]
                            ${isExpanded ? 'px-4 py-2.5 text-sm' : 'p-2.5 flex justify-center'}
                        `}
                    >
                        {isExpanded ? '구독하기' : <CreditCard className="w-5 h-5" />}
                    </button>
                )}
            </div>

            {/* ── User Profile + Logout ── */}
            <div className="px-2 py-3 border-t border-gray-100 flex-shrink-0">
                <div className={`flex items-center ${isExpanded ? 'gap-3 px-3' : 'justify-center'}`}>
                    {/* Avatar */}
                    {user.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt="Profile"
                            width={32}
                            height={32}
                            className="rounded-full flex-shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-medium text-xs">
                                {user.name.charAt(0)}
                            </span>
                        </div>
                    )}

                    {isExpanded && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                    )}

                    {isExpanded && (
                        <button
                            onClick={handleLogout}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            aria-label="로그아웃"
                            title="로그아웃"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Mode Toggle ── */}
            <div className="px-2 pb-3 flex-shrink-0">
                <button
                    onClick={toggleMode}
                    className={`
                        w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                        text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors
                        ${isExpanded ? '' : 'justify-center'}
                    `}
                    aria-label={mode === 'pinned' ? '사이드바 접기' : '사이드바 펼치기'}
                    title={mode === 'pinned' ? '사이드바 접기' : '사이드바 펼치기'}
                >
                    {mode === 'pinned' ? (
                        <>
                            <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
                            {isExpanded && <span>접기</span>}
                        </>
                    ) : (
                        <>
                            <PanelLeftOpen className="w-4 h-4 flex-shrink-0" />
                            {isExpanded && <span>펼치기</span>}
                        </>
                    )}
                </button>
            </div>
        </aside>
    )
}

// ── SidebarLink Sub-component ──

function SidebarLink({
    route,
    isActive,
    isExpanded,
    isSubItem = false,
}: {
    route: NavRoute
    isActive: boolean
    isExpanded: boolean
    isSubItem?: boolean
}) {
    if (route.isLocked) {
        return (
            <div
                className={`
                    flex items-center gap-3 rounded-lg text-sm font-medium
                    text-gray-400 cursor-not-allowed
                    ${isSubItem ? 'px-3 py-2' : 'px-3 py-2.5'}
                    ${isExpanded ? '' : 'justify-center'}
                `}
                title={isExpanded ? undefined : `${route.label} (잠김)`}
            >
                <route.icon className={`flex-shrink-0 ${isSubItem ? 'w-4 h-4' : 'w-5 h-5'}`} />
                {isExpanded && (
                    <span className="flex-1 whitespace-nowrap">{route.label}</span>
                )}
                {isExpanded && <Lock className="w-3.5 h-3.5 text-gray-300" />}
            </div>
        )
    }

    return (
        <Link
            href={route.href === '/naver-search' ? '/naver-search/new?mode=my-shop' : route.href === '/search' ? '/search/new?mode=my-shop' : route.href}
            className={`
                flex items-center gap-3 rounded-lg text-sm font-medium transition-colors
                ${isSubItem ? 'px-3 py-2' : 'px-3 py-2.5'}
                ${isExpanded ? '' : 'justify-center'}
                ${isActive
                    ? 'text-[#00C896] bg-emerald-50 font-semibold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
            `}
            title={isExpanded ? undefined : route.label}
        >
            <route.icon className={`flex-shrink-0 ${isSubItem ? 'w-4 h-4' : 'w-5 h-5'}`} />
            {isExpanded && (
                <span className="flex-1 whitespace-nowrap">{route.label}</span>
            )}
            {isActive && !isExpanded && (
                <span className="absolute left-0 w-0.5 h-6 bg-[#00C896] rounded-r" />
            )}
        </Link>
    )
}
