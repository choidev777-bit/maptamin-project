
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { MobileNav } from '@/components/layout/MobileNav'
import { DesktopNav } from '@/components/layout/DesktopNav'
import logo from '@/assets/logo3.png'

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
                        {/* Logo */}
                        <a href="/dashboard" className="flex items-center gap-2">
                            <Image
                                src={logo}
                                alt="RankTracker"
                                className="h-10 w-auto object-contain"
                                priority
                            />
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
