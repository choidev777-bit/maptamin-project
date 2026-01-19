import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileNav } from '@/components/layout/MobileNav'
import { DesktopNav } from '@/components/layout/DesktopNav'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const userInfo = {
        email: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || '사용자',
        avatarUrl: user.user_metadata?.avatar_url || null,
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <a href="/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-lg font-bold text-gray-900 hidden sm:block">RankTracker</span>
                        </a>

                        {/* Desktop Navigation */}
                        <div className="hidden md:block">
                            <DesktopNav user={userInfo} />
                        </div>

                        {/* Mobile Menu */}
                        <div className="md:hidden">
                            <MobileNav user={userInfo} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                {children}
            </main>
        </div>
    )
}
