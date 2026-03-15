'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
    CalendarClock, Clock, Phone, Grid3X3, MapPin,
    Loader2, MessageCircle, CheckCircle, AlertTriangle, Settings,
} from 'lucide-react'
import { PLAN_CONFIG } from '@/lib/pricing/config'

const NaverMapGridConfigurator = dynamic(
    () => import('@/components/naver/NaverMapGridConfigurator').then(m => m.NaverMapGridConfigurator),
    { ssr: false, loading: () => <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">지도 로딩 중...</div> }
)

const MapGridConfigurator = dynamic(
    () => import('@/components/search/MapGridConfigurator').then(m => m.MapGridConfigurator),
    { ssr: false, loading: () => <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400">지도 로딩 중...</div> }
)

const GoogleMapsProvider = dynamic(
    () => import('@/components/maps/GoogleMapsProvider').then(m => m.GoogleMapsProvider),
    { ssr: false }
)

// ─── Constants ──────────────────────────────────────────────
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

const DISTANCE_PRESETS = [
    { value: 0.1, label: '100m' },
    { value: 0.2, label: '200m' },
    { value: 0.3, label: '300m' },
    { value: 0.4, label: '400m' },
    { value: 0.5, label: '500m' },
    { value: 1, label: '1km' },
    { value: 2, label: '2km' },
    { value: 3, label: '3km' },
    { value: 5, label: '5km' },
]

// ─── Types ──────────────────────────────────────────────────
interface GridPoint {
    row: number
    col: number
    enabled: boolean
}

interface PlaceData {
    place_id: string
    place_name: string
    lat: number
    lng: number
}

interface ScheduleData {
    id: string
    is_active: boolean
    crawling_day?: number | null
    crawling_days?: number[]
    crawling_time: string
    grid_config: Array<GridPoint & { lat?: number; lng?: number; distance?: number }>
    grid_distance?: number
    place_id: string
    place_name: string
    keywords: string[]
}

interface Props {
    planId: string
    subscribed: boolean
    canGoogle: boolean
    allowedGridSizes: number[]
    phone: string
    naverSchedule: ScheduleData | null
    googleSchedule: ScheduleData | null
    naverPlace: PlaceData | null
    googlePlace: PlaceData | null
    naverKeywords: string[]
    googleKeywords: string[]
}

function formatPhone(val: string): string {
    const nums = val.replace(/[^0-9]/g, '').slice(0, 11)
    if (nums.length <= 3) return nums
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`
}

// ─── Component ──────────────────────────────────────────────
export function ReportSettingsContent({
    planId,
    subscribed,
    canGoogle,
    allowedGridSizes,
    phone: initialPhone,
    naverSchedule,
    googleSchedule,
    naverPlace,
    googlePlace,
    naverKeywords,
    googleKeywords,
}: Props) {
    // ── Free 유저 ──
    if (!subscribed) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                        <CalendarClock className="mr-2 inline-block h-7 w-7 text-[#00C896]" />
                        자동 리포트 설정
                    </h1>
                    <p className="mt-2 text-gray-500">자동으로 순위를 분석하고 카카오톡으로 리포트를 받아보세요.</p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
                    <CalendarClock className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-700 mb-2">구독이 필요합니다</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        자동 리포트는 스타터 플랜부터 이용할 수 있습니다.
                    </p>
                    <Link
                        href="/dashboard/subscription"
                        className="rounded-xl bg-[#00C896] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#00C896]/25 hover:bg-[#00B386] transition-all"
                    >
                        구독하러 가기
                    </Link>
                </div>
            </div>
        )
    }

    // ── Platform Tab (Premium) ──
    const [activeTab, setActiveTab] = useState<'naver' | 'google'>('naver')

    const currentSchedule = activeTab === 'naver' ? naverSchedule : googleSchedule
    const currentPlace = activeTab === 'naver' ? naverPlace : googlePlace
    const currentKeywords = activeTab === 'naver' ? naverKeywords : googleKeywords

    // ── Form State ──
    const [isActive, setIsActive] = useState(currentSchedule?.is_active ?? false)
    const [naverCrawlingDays, setNaverCrawlingDays] = useState<number[]>(
        naverSchedule?.crawling_days ?? (naverSchedule?.crawling_day != null ? [naverSchedule.crawling_day] : [])
    )
    const [googleCrawlingDay, setGoogleCrawlingDay] = useState<number | null>(
        googleSchedule?.crawling_day ?? null
    )
    const [crawlingTime, setCrawlingTime] = useState(currentSchedule?.crawling_time?.slice(0, 5) || '09:00')
    const [phone, setPhone] = useState(formatPhone(initialPhone))
    const [distance, setDistance] = useState(currentSchedule?.grid_distance ?? 0.3)

    // 기존 그리드 데이터 복원 or 기본 그리드 생성
    const gridSize = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG]?.gridSize ?? 3
    const maxPoints = gridSize * gridSize

    const defaultGrid = useMemo(() => {
        const points: GridPoint[] = []
        const half = Math.floor(gridSize / 2)
        for (let r = -half; r <= half; r++) {
            for (let c = -half; c <= half; c++) {
                points.push({ row: r, col: c, enabled: true })
            }
        }
        return points
    }, [gridSize])

    const restoreGrid = useCallback((schedule: ScheduleData | null): GridPoint[] => {
        if (!schedule?.grid_config || schedule.grid_config.length === 0) return defaultGrid
        return schedule.grid_config.map(p => ({ row: p.row, col: p.col, enabled: p.enabled }))
    }, [defaultGrid])

    const [naverPoints, setNaverPoints] = useState<GridPoint[]>(restoreGrid(naverSchedule))
    const [googlePoints, setGooglePoints] = useState<GridPoint[]>(restoreGrid(googleSchedule))

    const currentPoints = activeTab === 'naver' ? naverPoints : googlePoints
    const setCurrentPoints = activeTab === 'naver' ? setNaverPoints : setGooglePoints
    const enabledCount = currentPoints.filter(p => p.enabled).length

    // ── Save ──
    const [saving, setSaving] = useState(false)
    const [saveResult, setSaveResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const phoneValid = phone.replace(/[^0-9]/g, '').length >= 11

    // Tab 전환 시 state 동기화
    const handleTabChange = (tab: 'naver' | 'google') => {
        setActiveTab(tab)
        const schedule = tab === 'naver' ? naverSchedule : googleSchedule
        setIsActive(schedule?.is_active ?? false)
        setCrawlingTime(schedule?.crawling_time?.slice(0, 5) || '09:00')
        setDistance(schedule?.grid_distance ?? 0.3)
        setSaveResult(null)
        setError(null)
    }

    const getDayLabel = (value: number) => DAYS.find(d => d.value === value)?.label || ''

    const handleReset = useCallback(() => {
        setDistance(0.3)
        setCurrentPoints(defaultGrid)
    }, [defaultGrid, setCurrentPoints])

    const handleSave = async () => {
        // 네이버: 활성 상태에서 요일 0개면 경고
        if (activeTab === 'naver' && naverCrawlingDays.length === 0 && isActive) {
            setError('자동 리포트를 받을 요일을 1개 이상 선택해주세요.')
            return
        }
        // 구글: 활성 상태에서 요일 미선택이면 경고
        if (activeTab === 'google' && googleCrawlingDay === null && isActive) {
            setError('분석 요일을 선택해주세요.')
            return
        }
        if (isActive && !phoneValid) {
            setError('전화번호를 정확히 입력해주세요.')
            return
        }

        setSaving(true)
        setError(null)
        setSaveResult(null)

        try {
            const crawlingDaysPayload = activeTab === 'naver'
                ? naverCrawlingDays
                : (googleCrawlingDay !== null ? [googleCrawlingDay] : [])

            const res = await fetch('/api/settings/schedule', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: activeTab,
                    crawling_days: crawlingDaysPayload,
                    crawling_time: crawlingTime,
                    grid_config: currentPoints,
                    grid_distance: distance,
                    is_active: isActive,
                    phone: phone.replace(/[^0-9]/g, ''),
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || '저장에 실패했습니다.')
                return
            }

            setSaveResult({ type: 'success', message: '설정이 저장되었습니다.' })
            setTimeout(() => setSaveResult(null), 3000)
        } catch {
            setError('네트워크 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    // ── 매장/키워드 미등록 검사 ──
    const hasPlace = !!currentPlace
    const hasKeywords = currentKeywords.length > 0
    const canActivate = hasPlace && hasKeywords

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                    <CalendarClock className="mr-2 inline-block h-7 w-7 text-[#00C896]" />
                    자동 리포트 설정
                </h1>
                <p className="mt-2 text-gray-500">
                    자동으로 순위를 분석하고 카카오톡으로 리포트를 받아보세요.
                </p>
            </div>

            {/* Premium: 네이버/구글 탭 */}
            {canGoogle && (
                <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
                    <button
                        type="button"
                        onClick={() => handleTabChange('naver')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${activeTab === 'naver'
                            ? 'bg-white text-[#03C75A] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-[#03C75A] text-[10px] font-bold text-white">N</span>
                        네이버
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('google')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${activeTab === 'google'
                            ? 'bg-white text-[#4285F4] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-[#4285F4] text-[10px] font-bold text-white">G</span>
                        구글
                    </button>
                </div>
            )}

            {/* 스케줄 없음 */}
            {!currentSchedule && (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                    <AlertTriangle className="mx-auto h-10 w-10 text-amber-400 mb-3" />
                    <h3 className="text-lg font-bold text-gray-700 mb-2">설정된 자동 리포트가 없습니다</h3>
                    <p className="text-sm text-gray-500">
                        온보딩을 완료하면 자동 리포트가 설정됩니다.
                    </p>
                </div>
            )}

            {/* 스케줄 존재 → 설정 UI */}
            {currentSchedule && (
                <>
                    {/* 매장/키워드 미등록 경고 */}
                    {!canActivate && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-800">리포트를 활성화하려면 먼저 설정을 완료해주세요</p>
                                    <ul className="mt-2 space-y-1 text-sm text-amber-700">
                                        {!hasPlace && (
                                            <li>
                                                • 매장이 등록되지 않았습니다.{' '}
                                                <Link href="/settings" className="font-medium text-amber-900 underline hover:text-amber-700">설정 페이지에서 등록</Link>
                                            </li>
                                        )}
                                        {!hasKeywords && (
                                            <li>
                                                • 키워드가 등록되지 않았습니다.{' '}
                                                <Link href="/settings" className="font-medium text-amber-900 underline hover:text-amber-700">설정 페이지에서 등록</Link>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ON/OFF 토글 */}
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-6">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">자동 리포트 활성화</h3>
                            <p className="text-sm text-gray-500">
                                {isActive ? '자동으로 분석됩니다' : '리포트가 중지되어 있습니다'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (!isActive && !canActivate) return
                                setIsActive(!isActive)
                            }}
                            disabled={!isActive && !canActivate}
                            className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00C896] focus:ring-offset-2 ${isActive ? 'bg-[#00C896]' : 'bg-gray-200'
                                } ${!isActive && !canActivate ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span
                                className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* 전화번호 */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
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

                    {/* 분석 요일/시간 */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6">
                        <h3 className="mb-1 text-base font-semibold text-gray-800">분석 실행 시간 설정</h3>
                        <p className="mb-5 text-xs text-gray-500">
                            {activeTab === 'naver' ? '선택한 요일에 자동으로 분석합니다' : '매주 해당 요일에 분석합니다'}
                        </p>

                        {/* 요일 — 네이버: 복수 선택 + 매일 버튼, 구글: 단수 선택 */}
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                {activeTab === 'naver' ? '분석 요일 (여러 개 선택 가능)' : '분석 요일 1개를 선택해주세요'}
                            </label>

                            {activeTab === 'naver' && (
                                <div className="flex gap-2 mb-2">
                                    {/* 매일 버튼 */}
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
                            )}

                            <div className="flex gap-2">
                                {DAYS.map(day => {
                                    if (activeTab === 'naver') {
                                        // 네이버: 복수 선택 토글
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
                                    } else {
                                        // 구글: 단수 선택
                                        const isSelected = googleCrawlingDay === day.value
                                        const isWeekend = day.value === 0 || day.value === 6
                                        return (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => setGoogleCrawlingDay(day.value)}
                                                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${isSelected
                                                    ? 'bg-[#00C896] text-white shadow-md shadow-[#00C896]/20'
                                                    : `border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 ${isWeekend ? 'text-red-500' : 'text-gray-600'}`
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        )
                                    }
                                })}
                            </div>
                        </div>

                        {/* 시간 */}
                        <div>
                            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                <Clock className="h-4 w-4" />
                                분석 시간
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
                        {activeTab === 'naver' ? (
                            naverCrawlingDays.length > 0 ? (
                                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    매주 <strong>{naverCrawlingDays.sort((a,b) => a-b).map(d => getDayLabel(d)).join(', ')}요일 {crawlingTime}</strong>에 자동 분석됩니다
                                </div>
                            ) : (
                                <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-600">
                                    요일을 1개 이상 선택해주세요
                                </div>
                            )
                        ) : (
                            googleCrawlingDay !== null && (
                                <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                    매주 <strong>{getDayLabel(googleCrawlingDay)}요일 {crawlingTime}</strong>에 자동 분석됩니다
                                </div>
                            )
                        )}
                    </div>

                    {/* 좌표 설정 */}
                    {currentPlace && (
                        <>
                            {/* 간격 설정 */}
                            <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900">분석 좌표 간격 설정</h3>
                                    <p className="text-sm text-gray-500 mb-4">좌표 사이의 거리를 설정하세요</p>

                                    <div className="flex items-center gap-4 mb-6">
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="5"
                                            step="0.1"
                                            value={distance}
                                            onChange={e => setDistance(parseFloat(e.target.value))}
                                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00C896]"
                                        />
                                        <div className="w-20 text-right">
                                            <span className="text-2xl font-bold text-[#00C896]">{distance}</span>
                                            <span className="text-lg text-gray-500 ml-1">km</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {DISTANCE_PRESETS.map(preset => (
                                            <button
                                                key={preset.value}
                                                type="button"
                                                onClick={() => setDistance(preset.value)}
                                                className={`flex-1 min-w-0 py-2 px-1 rounded-lg text-xs sm:text-sm font-medium transition-all ${distance === preset.value
                                                    ? 'bg-[#E5F9F4] text-[#00A87D] border-2 border-[#00C896]'
                                                    : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                                                    }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 지도 그리드 */}
                            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                                <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-3">
                                    <MapPin className={`h-4 w-4 ${activeTab === 'naver' ? 'text-[#03C75A]' : 'text-[#4285F4]'}`} />
                                    <span className="text-sm font-medium text-gray-700">
                                        {currentPlace.place_name}
                                    </span>
                                    <span className="ml-auto text-xs text-gray-400">
                                        {enabledCount}/{maxPoints} 좌표 활성
                                    </span>
                                </div>

                                {activeTab === 'naver' ? (
                                    <NaverMapGridConfigurator
                                        centerLat={currentPlace.lat}
                                        centerLng={currentPlace.lng}
                                        selectedPoints={currentPoints}
                                        onPointsChange={setCurrentPoints}
                                        gridDistance={distance}
                                        maxPoints={maxPoints}
                                        onReset={handleReset}
                                    />
                                ) : (
                                    <GoogleMapsProvider>
                                        <MapGridConfigurator
                                            centerLat={currentPlace.lat}
                                            centerLng={currentPlace.lng}
                                            selectedPoints={currentPoints}
                                            onPointsChange={setCurrentPoints}
                                            gridDistance={distance}
                                            maxPoints={maxPoints}
                                            onReset={handleReset}
                                        />
                                    </GoogleMapsProvider>
                                )}
                            </div>
                        </>
                    )}

                    {/* 카카오톡 안내 */}
                    <div className="rounded-xl border border-[#00C896]/20 bg-[#E5F9F4] px-5 py-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <MessageCircle className="h-5 w-5 text-[#00C896]" />
                            분석이 완료되면 즉시 사장님의 카카오톡으로 리포트를 배달할게요!
                        </p>
                    </div>

                    {/* 성공/에러 메시지 */}
                    {saveResult && (
                        <div className={`flex items-center gap-2 rounded-xl border px-5 py-4 ${saveResult.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                            }`}
                        >
                            <CheckCircle className="h-5 w-5 flex-shrink-0" />
                            <p className="text-sm font-medium">{saveResult.message}</p>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* 저장 버튼 */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="mx-auto flex items-center justify-center gap-2 rounded-xl bg-[#00C896] px-12 py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                저장 중...
                            </span>
                        ) : (
                            <>
                                <Settings className="h-5 w-5" />
                                설정 저장{canGoogle ? ` - ${activeTab === 'naver' ? '네이버' : '구글'}` : ''}
                            </>
                        )}
                    </button>
                </>
            )}
        </div>
    )
}
