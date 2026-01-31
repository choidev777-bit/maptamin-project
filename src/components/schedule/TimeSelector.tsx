'use client'

import React from 'react'
import { Clock } from 'lucide-react'

interface Props {
    value: string
    onChange: (time: string) => void
}

export function TimeSelector({ value, onChange }: Props) {
    // Generate hours 00:00 to 23:00
    const hours = Array.from({ length: 24 }, (_, i) => {
        const h = i.toString().padStart(2, '0')
        return `${h}:00`
    })

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                실행 시간
            </label>

            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-10 pl-3 pr-10 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                    {hours.map(h => (
                        <option key={h} value={`${h}:00`}>
                            {h}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            <p className="text-xs text-gray-500">
                * 한국 시간(KST) 기준입니다. 서버 부하에 따라 1~5분 정도 차이가 날 수 있습니다.
            </p>
        </div>
    )
}
