'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
    error: Error & { digest?: string }
    reset: () => void
}

export default function DashboardError({ error, reset }: Props) {
    useEffect(() => {
        console.error('Dashboard error:', error)
    }, [error])

    return (
        <div className="max-w-md mx-auto text-center py-16">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                오류가 발생했습니다
            </h2>
            <p className="text-gray-600 mb-6">
                페이지를 불러오는 중 문제가 발생했습니다.
                잠시 후 다시 시도해주세요.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                    onClick={reset}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    다시 시도
                </button>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                    <Home className="w-4 h-4" />
                    홈으로
                </Link>
            </div>
        </div>
    )
}
