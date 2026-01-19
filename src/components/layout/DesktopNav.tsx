import Link from 'next/link'
import { Home, Search, History, Settings } from 'lucide-react'

interface Props {
    user: {
        email: string
        name: string
        avatarUrl: string | null
    }
}

export function DesktopNav({ user }: Props) {
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
                <Link
                    href="/search/new"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <Search className="w-4 h-4" />
                    새 검색
                </Link>
                <Link
                    href="/search/history"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <History className="w-4 h-4" />
                    기록
                </Link>
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
                <span className="text-sm text-gray-600">{user.email}</span>
            </div>
        </div>
    )
}
