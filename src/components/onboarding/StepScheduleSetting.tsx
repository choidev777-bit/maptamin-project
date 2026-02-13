'use client'

import { useState } from 'react'
import { Calendar, Clock, MessageSquare, Check } from 'lucide-react'

const DAYS = [
    { value: 1, label: '월' },
    { value: 2, label: '화' },
    { value: 3, label: '수' },
    { value: 4, label: '목' },
    { value: 5, label: '금' },
    { value: 6, label: '토' },
    { value: 0, label: '일' },
]

const HOURS = Array.from({ length: 13 }, (_, i) => {
    const h = (i + 7).toString().padStart(2, '0')
    return { value: `${h}:00`, label: `${h}:00` }
})

interface ScheduleData {
    crawlingDay: number
    crawlingTime: string
    notifyImmediate: boolean
    notifyDay?: number
    notifyTime?: string
}

interface Props {
    onComplete: (data: ScheduleData) => void
}

export default function StepScheduleSetting({ onComplete }: Props) {
    const [crawlingDay, setCrawlingDay] = useState<number | null>(null)
    const [crawlingTime, setCrawlingTime] = useState('09:00')
    const [notifyImmediate, setNotifyImmediate] = useState(true)
    const [notifyDay, setNotifyDay] = useState<number | null>(null)
    const [notifyTime, setNotifyTime] = useState('10:00')

    const canProceed = crawlingDay !== null && (notifyImmediate || notifyDay !== null)

    const getDayLabel = (value: number) => DAYS.find(d => d.value === value)?.label || ''

    const handleComplete = () => {
        if (crawlingDay === null) return
        onComplete({
            crawlingDay,
            crawlingTime,
            notifyImmediate,
            notifyDay: notifyImmediate ? undefined : (notifyDay ?? undefined),
            notifyTime: notifyImmediate ? undefined : notifyTime,
        })
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    <Calendar className="mr-2 inline-block h-6 w-6 text-[#00C896]" />
                    스케줄 설정
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    주간 리포트를 받아볼 요일과 시간을 설정해주세요.
                </p>
            </div>

            {/* A. 검색 실행 시점 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00C896] text-xs font-bold text-white">A</span>
                    검색 실행 시점
                </h3>
                <p className="mb-5 text-xs text-gray-500">매주 이 시간에 자동으로 순위를 분석합니다</p>

                {/* 요일 선택 — 단일 선택 */}
                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">검색 요일 (1개 선택)</label>
                    <div className="flex gap-2">
                        {DAYS.map(day => {
                            const isSelected = crawlingDay === day.value
                            const isWeekend = day.value === 0 || day.value === 6
                            return (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => setCrawlingDay(day.value)}
                                    className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${isSelected
                                        ? 'bg-[#00C896] text-white shadow-md shadow-[#00C896]/20'
                                        : `border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 ${isWeekend ? 'text-red-500' : 'text-gray-600'}`
                                        }`}
                                >
                                    {day.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 시간 선택 */}
                <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Clock className="h-4 w-4" />
                        검색 시간
                    </label>
                    <div className="relative">
                        <select
                            value={crawlingTime}
                            onChange={e => setCrawlingTime(e.target.value)}
                            className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00C896]"
                        >
                            {HOURS.map(h => (
                                <option key={h.value} value={h.value}>{h.label}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* 미리보기 */}
                {crawlingDay !== null && (
                    <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        🔍 매주 <strong>{getDayLabel(crawlingDay)}요일 {crawlingTime}</strong>에 자동 분석됩니다
                    </div>
                )}
            </div>

            {/* B. 카톡 수신 시점 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00C896] text-xs font-bold text-white">B</span>
                    카카오톡 수신 시점
                </h3>
                <p className="mb-5 text-xs text-gray-500">리포트를 카카오톡으로 받아볼 시점을 설정합니다</p>

                {/* 즉시 받기 옵션 */}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 transition-all hover:border-[#00C896]/30 hover:bg-[#00C896]/5">
                    <div className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                        <input
                            type="checkbox"
                            checked={notifyImmediate}
                            onChange={e => setNotifyImmediate(e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-[#00C896] focus:ring-[#00C896]"
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">분석 완료 즉시 받기</p>
                        <p className="mt-0.5 text-xs text-gray-500">분석이 끝나면 바로 카카오톡으로 알립니다 (권장)</p>
                    </div>
                </label>

                {/* 직접 설정 */}
                {!notifyImmediate && (
                    <div className="mt-4 space-y-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-700">직접 수신 시간 설정</p>

                        {/* 요일 */}
                        <div>
                            <label className="mb-2 block text-xs text-gray-500">수신 요일</label>
                            <div className="flex gap-2">
                                {DAYS.map(day => {
                                    const isSelected = notifyDay === day.value
                                    return (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => setNotifyDay(day.value)}
                                            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${isSelected
                                                ? 'bg-[#00C896] text-white shadow-sm'
                                                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {day.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 시간 */}
                        <div>
                            <label className="mb-2 block text-xs text-gray-500">수신 시간</label>
                            <div className="relative">
                                <select
                                    value={notifyTime}
                                    onChange={e => setNotifyTime(e.target.value)}
                                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00C896]"
                                >
                                    {HOURS.map(h => (
                                        <option key={h.value} value={h.value}>{h.label}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {notifyDay !== null && (
                            <p className="text-xs text-gray-600">
                                📱 매주 <strong>{getDayLabel(notifyDay)}요일 {notifyTime}</strong>에 카톡을 보내드립니다
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* 완료 버튼 */}
            <button
                type="button"
                onClick={handleComplete}
                disabled={!canProceed}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
                <Check className="h-5 w-5" />
                온보딩 완료하기
            </button>
        </div>
    )
}
