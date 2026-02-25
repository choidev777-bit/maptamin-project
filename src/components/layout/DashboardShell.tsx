'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar, SidebarMode } from './Sidebar'
import { MobileNav } from './MobileNav'
import { MaptaminLogo } from '../landing/MaptaminLogo'
import { SubscriptionInfo } from './WalletLabel'

interface UserInfo {
    email: string
    name: string
    avatarUrl: string | null
}

interface Props {
    children: React.ReactNode
    user: UserInfo
    subscription: SubscriptionInfo | null
}

const SIDEBAR_MODE_KEY = 'maptamin-sidebar-mode'

export function DashboardShell({ children, user, subscription }: Props) {
    const pathname = usePathname()
    const isOnboarding = pathname.startsWith('/onboarding')

    // ── Sidebar Mode State ──
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('pinned')
    const [isHoverExpanded, setIsHoverExpanded] = useState(false)
    const [mounted, setMounted] = useState(false)
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // localStorage에서 모드 로드
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_MODE_KEY) as SidebarMode | null
        if (saved && ['pinned', 'collapsed', 'hover'].includes(saved)) {
            setSidebarMode(saved)
        }
        setMounted(true)
    }, [])

    // 모드 변경 시 localStorage 저장
    const handleModeChange = useCallback((newMode: SidebarMode) => {
        setSidebarMode(newMode)
        localStorage.setItem(SIDEBAR_MODE_KEY, newMode)
        setIsHoverExpanded(false)
    }, [])

    // ── Hover mode handlers ──
    const handleHoverEnter = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
        }
        setIsHoverExpanded(true)
    }, [])

    const handleHoverLeave = useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHoverExpanded(false)
        }, 300)
    }, [])

    // cleanup
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current)
            }
        }
    }, [])

    // ── 사이드바 너비 계산 ──
    const isExpanded = sidebarMode === 'pinned'
    // hover 모드에서 확장 시 main은 움직이지 않음 (overlay 방식)
    const mainMarginLeft = sidebarMode === 'pinned'
        ? '240px'  // w-60
        : '64px'   // w-16

    // 사이드바 전환 후 지도 리사이징을 위한 resize 이벤트 발행
    useEffect(() => {
        if (!mounted) return
        const timer = setTimeout(() => {
            window.dispatchEvent(new Event('resize'))
        }, 220) // transition 200ms + buffer
        return () => clearTimeout(timer)
    }, [sidebarMode, mounted])

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── Desktop Sidebar (lg 이상) ── */}
            <div className="hidden lg:block">
                <Sidebar
                    mode={sidebarMode}
                    onModeChange={handleModeChange}
                    user={user}
                    subscription={subscription}
                    isHoverExpanded={isHoverExpanded}
                    onHoverEnter={handleHoverEnter}
                    onHoverLeave={handleHoverLeave}
                    isOnboarding={isOnboarding}
                />
            </div>

            {/* ── Mobile Header (lg 미만) ── */}
            <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <a href={isOnboarding ? '/onboarding' : '/dashboard'} className="flex items-center gap-2">
                            <MaptaminLogo />
                        </a>
                        <MobileNav user={user} subscription={subscription} isOnboarding={isOnboarding} />
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <main
                className="transition-[margin-left] duration-200 ease-in-out"
                style={{
                    marginLeft: mounted ? `var(--sidebar-ml, ${mainMarginLeft})` : '0px',
                }}
            >
                {/* lg 이상에서만 sidebar margin 적용 */}
                <style>{`
                    @media (min-width: 1024px) {
                        :root { --sidebar-ml: ${mainMarginLeft}; }
                    }
                    @media (max-width: 1023px) {
                        :root { --sidebar-ml: 0px; }
                    }
                `}</style>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
