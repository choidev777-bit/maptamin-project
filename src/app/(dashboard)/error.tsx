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
        // Log error to console (replace with proper error reporting service in production)
        console.error('Dashboard Error:', error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="max-w-md w-full p-8 text-center">
                {/* Error Icon */}
                <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>

                {/* Error Message */}
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    문제가 발생했습니다
                </h2>
                <p className="text-gray-600 mb-6">
                    페이지를 불러오는 중에 오류가 발생했습니다.
                    <br />
                    잠시 후 다시 시도해 주세요.
                </p>

                {/* Error Details (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                        <p className="text-xs text-gray-500 mb-1">Error Details:</p>
                        <p className="text-sm text-red-600 font-mono break-all">
                            {error.message}
                        </p>
                        {error.digest && (
                            <p className="text-xs text-gray-400 mt-2">
                                Digest: {error.digest}
                            </p>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        다시 시도
                    </button>
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    >
                        <Home className="w-4 h-4" />
                        대시보드로
                    </Link>
                </div>
            </div>
        </div>
    )
}
