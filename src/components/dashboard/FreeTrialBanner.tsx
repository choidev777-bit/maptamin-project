'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Gift, X } from 'lucide-react'

export function FreeTrialBanner() {
    const [dismissed, setDismissed] = useState(false)

    if (dismissed) return null

    return (
        <div className="mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl px-5 py-3.5 flex items-center justify-between shadow-sm">
            <Link
                href="/free-trial"
                className="flex items-center gap-3 flex-1 group"
            >
                <Gift className="w-5 h-5 text-white/90 shrink-0" />
                <p className="text-sm font-medium text-white">
                    <span className="opacity-90">무료 체험 가능!</span>{' '}
                    5분 만에 우리 매장 &lsquo;진짜 순위&rsquo;를 확인해보세요.{' '}
                    <span className="underline underline-offset-2 font-bold group-hover:opacity-80 transition-opacity">
                        무료 체험 시작하기 →
                    </span>
                </p>
            </Link>
            <button
                onClick={(e) => {
                    e.preventDefault()
                    setDismissed(true)
                }}
                className="ml-3 p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                aria-label="닫기"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
