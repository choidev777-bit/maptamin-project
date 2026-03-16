'use client'

import { useState } from 'react'
import { Calendar, Clock, Phone, Loader2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { OnboardingData } from '@/app/(dashboard)/onboarding/onboarding-utils'

const DAYS = [
    { value: 1, label: '월' },
    { value: 2, label: '화' },
    { value: 3, label: '수' },
    { value: 4, label: '목' },
    { value: 5, label: '금' },
    { value: 6, label: '토' },
    { value: 0, label: '일' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, '0')
    return { value: `${h}:00`, label: `${h}:00` }
})

interface ScheduleData {
    naverCrawlingDays: number[]
    googleCrawlingDay?: number | null
    naverCrawlingTime: string
    googleCrawlingTime?: string
    notifyImmediate: boolean
    phone?: string
}

interface Props {
    planId?: 'starter' | 'pro' | 'premium'
    onboardingData?: OnboardingData
    onComplete: (data: ScheduleData) => void
}

export default function StepScheduleSetting({ planId, onboardingData, onComplete }: Props) {
    const isPremium = planId === 'premium'
    const [naverCrawlingDays, setNaverCrawlingDays] = useState<number[]>([])
    const [googleCrawlingDay, setGoogleCrawlingDay] = useState<number | null>(null)
    const [naverCrawlingTime, setNaverCrawlingTime] = useState('09:00')
    const [googleCrawlingTime, setGoogleCrawlingTime] = useState('09:00')
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const phoneValid = phone.replace(/[^0-9]/g, '').length >= 11
    // 전화번호 필수, 네이버 요일 0개여도 저장 가능 (is_active: false로 저장)
    const canProceed = phoneValid

    const getDayLabel = (value: number) => DAYS.find(d => d.value === value)?.label || ''

    // 전화번호 포맷 (하이픈 자동 삽입)
    const formatPhone = (val: string) => {
        const digits = val.replace(/[^0-9]/g, '').slice(0, 11)
        if (digits.length <= 3) return digits
        if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    }

    // DB 즉시 커밋: search_schedules + notification_schedules INSERT
    const handleComplete = async () => {
        if (!phoneValid) return
        setSaving(true)
        setError(null)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('인증 정보를 확인할 수 없습니다.')

            // 1. 전화번호 저장: user_subscriptions.phone
            const { error: phoneErr } = await supabase
                .from('user_subscriptions')
                .update({ phone: phone.replace(/[^0-9]/g, '') })
                .eq('user_id', user.id)

            if (phoneErr) throw new Error(phoneErr.message)

            // 2. 네이버 search_schedule INSERT
            const naverGrid = onboardingData?.grid?.naverGrid ?? []
            const naverGridConfig = naverGrid.map(p => ({
                lat: p.lat, lng: p.lng, row: p.row, col: p.col,
                enabled: p.enabled, distance: onboardingData?.grid?.distance ?? 1,
            }))

            const { error: naverScheduleErr } = await supabase
                .from('search_schedules')
                .insert({
                    user_id: user.id,
                    platform: 'naver',
                    place_id: onboardingData?.store?.naverPlace?.placeId ?? '',
                    place_name: onboardingData?.store?.naverPlace?.name ?? '',
                    keywords: onboardingData?.keywords?.naverKeywords ?? [],
                    local_keywords: onboardingData?.keywords?.localNaverKeywords ?? [],
                    grid_config: naverGridConfig,
                    grid_distance: onboardingData?.grid?.distance ?? 1,
                    crawling_days: naverCrawlingDays,
                    crawling_day: naverCrawlingDays[0] ?? null,
                    crawling_time: naverCrawlingTime,
                    is_active: naverCrawlingDays.length > 0,
                })

            if (naverScheduleErr) throw new Error(naverScheduleErr.message)

            // 3. Premium: 구글 search_schedule도 INSERT
            if (isPremium) {
                const googleGrid = onboardingData?.grid?.googleGrid ?? []
                const googleGridConfig = googleGrid.map(p => ({
                    lat: p.lat, lng: p.lng, row: p.row, col: p.col,
                    enabled: p.enabled, distance: onboardingData?.grid?.distance ?? 1,
                }))

                const { error: googleScheduleErr } = await supabase
                    .from('search_schedules')
                    .insert({
                        user_id: user.id,
                        platform: 'google',
                        place_id: onboardingData?.store?.googlePlace?.placeId ?? '',
                        place_name: onboardingData?.store?.googlePlace?.name ?? '',
                        keywords: onboardingData?.keywords?.googleKeywords ?? [],
                        grid_config: googleGridConfig,
                        grid_distance: onboardingData?.grid?.distance ?? 1,
                        crawling_day: googleCrawlingDay,
                        crawling_days: googleCrawlingDay !== null ? [googleCrawlingDay] : [],
                        crawling_time: googleCrawlingTime,
                        is_active: googleCrawlingDay !== null,
                    })

                if (googleScheduleErr) throw new Error(googleScheduleErr.message)
            }

            // 4. 네이버 notification_schedule INSERT
            const { error: naverNotifyErr } = await supabase
                .from('notification_schedules')
                .insert({
                    user_id: user.id,
                    is_immediate: true,
                    notify_day: null,
                    notify_time: null,
                })

            if (naverNotifyErr) throw new Error(naverNotifyErr.message)

            // 5. Premium: 구글 notification_schedule도 INSERT
            if (isPremium) {
                const { error: googleNotifyErr } = await supabase
                    .from('notification_schedules')
                    .insert({
                        user_id: user.id,
                        is_immediate: true,
                        notify_day: null,
                        notify_time: null,
                    })

                if (googleNotifyErr) throw new Error(googleNotifyErr.message)
            }

            // 성공 → 다음 Step
            onComplete({
                naverCrawlingDays,
                googleCrawlingDay: isPremium ? googleCrawlingDay : undefined,
                naverCrawlingTime,
                googleCrawlingTime: isPremium ? googleCrawlingTime : undefined,
                notifyImmediate: true,
                phone,
            })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
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
                    자동 리포트를 받을 요일과 시간을 설정해주세요.
                </p>
            </div>

            {/* 전화번호 입력 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-gray-800">
                    <Phone className="h-5 w-5 text-[#00C896]" />
                    전화번호
                </h3>
                <p className="mb-4 text-xs text-gray-500">카카오톡으로 리포트를 받을 전화번호를 입력해주세요.</p>
                <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    placeholder="010-1234-5678"
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#00C896]"
                />
            </div>

            {/* A. 네이버 분석 요일/시간 */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                {/* 네이버 요일 선택 */}
                <div className="mb-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-[#03C75A] text-[10px] font-bold text-white">N</span>
                        네이버 분석 요일을 선택해주세요 (여러 개 선택 가능)</label>

                    {/* 매일 버튼 */}
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setNaverCrawlingDays(naverCrawlingDays.length === 7 ? [] : [0,1,2,3,4,5,6])}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${naverCrawlingDays.length === 7
                                ? 'bg-[#00C896] text-white shadow-md shadow-[#00C896]/20'
                                : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            매일
                        </button>
                    </div>

                    {/* 요일 7개 복수 선택 */}
                    <div className="flex gap-2">
                        {DAYS.map(day => {
                            const isSelected = naverCrawlingDays.includes(day.value)
                            const isWeekend = day.value === 0 || day.value === 6
                            return (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => {
                                        if (isSelected) {
                                            setNaverCrawlingDays(naverCrawlingDays.filter(d => d !== day.value))
                                        } else {
                                            setNaverCrawlingDays([...naverCrawlingDays, day.value])
                                        }
                                    }}
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

                {/* 네이버 분석 시간 */}
                <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Clock className="h-4 w-4" />
                        분석 시간
                    </label>
                    <div className="relative">
                        <select
                            value={naverCrawlingTime}
                            onChange={e => setNaverCrawlingTime(e.target.value)}
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

                {/* 네이버 미리보기 */}
                {naverCrawlingDays.length > 0 && (
                    <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        매주 <strong>{naverCrawlingDays.sort((a,b) => a-b).map(d => getDayLabel(d)).join(', ')}요일 {naverCrawlingTime}</strong>에 자동 분석됩니다
                    </div>
                )}
            </div>

            {/* B. 구글 분석 요일/시간 (Premium only) */}
            {isPremium && (
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    {/* 구글 요일 선택 — 단수 */}
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-[#4285F4] text-[10px] font-bold text-white">G</span>
                            구글 분석 요일 1개를 선택해주세요
                        </label>
                        <div className="flex gap-2">
                            {DAYS.map(day => {
                                const isSelected = googleCrawlingDay === day.value
                                const isWeekend = day.value === 0 || day.value === 6
                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => setGoogleCrawlingDay(day.value)}
                                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${isSelected
                                            ? 'bg-[#4285F4] text-white shadow-md shadow-[#4285F4]/20'
                                            : `border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 ${isWeekend ? 'text-red-500' : 'text-gray-600'}`
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 구글 분석 시간 */}
                    <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Clock className="h-4 w-4" />
                            분석 시간
                        </label>
                        <div className="relative">
                            <select
                                value={googleCrawlingTime}
                                onChange={e => setGoogleCrawlingTime(e.target.value)}
                                className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
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

                    {/* 구글 미리보기 */}
                    {googleCrawlingDay !== null && (
                        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            매주 <strong>{getDayLabel(googleCrawlingDay)}요일 {googleCrawlingTime}</strong>에 자동 분석됩니다
                        </div>
                    )}
                </div>
            )}

            {/* 카카오톡 안내 */}
            <div className="rounded-xl border border-[#00C896]/20 bg-[#E5F9F4] px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <MessageCircle className="h-5 w-5 text-[#00C896]" />
                    분석이 완료되면 즉시 사장님의 카카오톡으로 리포트를 배달할게요!
                </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* 완료 버튼 */}
            <button
                type="button"
                onClick={handleComplete}
                disabled={!canProceed || saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
                {saving ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        저장 중...
                    </span>
                ) : (
                    <>
                        완료하고 첫 리포트 받기 🎉
                    </>
                )}
            </button>
        </div>
    )
}
