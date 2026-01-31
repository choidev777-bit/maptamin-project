'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ManagedPlace } from '@/lib/types'
import { CostCalculator } from '@/lib/pricing/cost-calculator'

// Components
import { Button } from '@/components/ui/button'
import { MyShopSelector } from '@/components/schedule/MyShopSelector'
import { KeywordInput } from '@/components/search/KeywordInput'
import { MapGridConfigurator } from '@/components/search/MapGridConfigurator'
import { NaverMapGridConfigurator } from '@/components/naver/NaverMapGridConfigurator'
import { GoogleMapsProvider } from '@/components/maps/GoogleMapsProvider'
import { DaySelector } from '@/components/schedule/DaySelector'
import { TimeSelector } from '@/components/schedule/TimeSelector'
import { CostPreviewCard } from '@/components/schedule/CostPreviewCard'
import { CalendarClock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
    params: {
        platform: string
    }
}

// Grid Point type for local state
interface GridPoint {
    row: number
    col: number
    enabled: boolean
}

export default function SchedulePage() {
    const params = useParams()
    const platform = (params.platform as 'naver' | 'google') || 'naver'
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    // Form State - Use ManagedPlace for selected shop
    const [selectedShop, setSelectedShop] = useState<ManagedPlace | null>(null)
    const [keywords, setKeywords] = useState<string[]>([])
    const [gridPoints, setGridPoints] = useState<GridPoint[]>([])
    const [gridDistance, setGridDistance] = useState<number>(1) // 1km default

    // Schedule State
    const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri default
    const [time, setTime] = useState<string>('09:00')

    // Initialize Grid (Default 3x3)
    useEffect(() => {
        if (gridPoints.length === 0) {
            const initialGrid: GridPoint[] = []
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    initialGrid.push({ row: r, col: c, enabled: true })
                }
            }
            setGridPoints(initialGrid)
        }
    }, [])

    // Cost Calculation
    const costPerRun = CostCalculator.calculate(keywords, gridPoints as any)
    const monthlyRunCount = Math.round(days.length * 4.3)
    const monthlyCost = costPerRun * monthlyRunCount

    const handleSubmit = async () => {
        if (!selectedShop) return alert('장소를 선택해주세요.')
        if (keywords.length === 0) return alert('키워드를 입력해주세요.')
        if (days.length === 0) return alert('요일을 하나 이상 선택해주세요.')

        if (!confirm(`${time}에 자동 검색을 예약하시겠습니까?\n월 예상 비용: ${monthlyCost.toLocaleString()} 포인트`)) {
            return
        }

        setIsLoading(true)
        try {
            const apiGridConfig = gridPoints.map(p => ({
                ...p,
                lat: selectedShop.lat || 0,
                lng: selectedShop.lng || 0
            }))

            const response = await fetch('/api/settings/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform,
                    place_id: selectedShop.place_id,
                    place_name: selectedShop.place_name,
                    keywords,
                    grid_config: apiGridConfig,
                    crawling_days: days,
                    crawling_time: time,
                    is_active: true
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to create schedule')
            }

            alert('예약이 성공적으로 완료되었습니다!')
            router.push('/settings')

        } catch (error: any) {
            console.error(error)
            alert(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    // Platform-specific colors
    const accentColor = platform === 'naver' ? 'emerald' : 'blue'

    return (
        <div className="max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    대시보드로 돌아가기
                </Link>
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${platform === 'naver' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        <CalendarClock className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {platform === 'naver' ? '네이버' : '구글'} 자동 검색 예약
                        </h1>
                        <p className="text-gray-600 mt-1">
                            원하는 요일과 시간에 자동으로 순위를 추적하세요.
                        </p>
                    </div>
                </div>
            </div>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
                {/* Left Column: Form Sections */}
                <div className="space-y-6">
                    {/* Section 1: Place Selection */}
                    <section className="bg-white p-6 rounded-2xl border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full bg-${accentColor}-100 text-${accentColor}-600 flex items-center justify-center text-sm font-semibold`}>1</span>
                            추적할 장소 선택
                        </h2>
                        <MyShopSelector
                            platform={platform}
                            onSelect={setSelectedShop}
                            selectedPlace={selectedShop}
                        />
                    </section>

                    {/* Section 2: Schedule Config (Moved Up) */}
                    <section className={`bg-white p-6 rounded-2xl border-2 border-${accentColor}-200 ring-2 ring-${accentColor}-100`}>
                        <h2 className={`text-lg font-bold text-${accentColor}-900 mb-4 flex items-center gap-2`}>
                            <span className={`w-6 h-6 rounded-full bg-${accentColor}-500 text-white flex items-center justify-center text-sm font-semibold`}>2</span>
                            예약 시간 설정
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <DaySelector selectedDays={days} onChange={setDays} />
                            <TimeSelector value={time} onChange={setTime} />
                        </div>
                    </section>

                    {/* Section 3: Search Config (Keywords + Grid) */}
                    <section className="bg-white p-6 rounded-2xl border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-semibold">3</span>
                            검색 조건 설정
                        </h2>

                        <div className="space-y-8">
                            {/* Keywords */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">검색 키워드</h3>
                                <KeywordInput
                                    keywords={keywords}
                                    onChange={setKeywords}
                                />
                            </div>

                            {/* Grid Map - Conditional Rendering based on Platform */}
                            <div className="border-t pt-6">
                                {selectedShop && selectedShop.lat && selectedShop.lng ? (
                                    platform === 'naver' ? (
                                        <NaverMapGridConfigurator
                                            centerLat={selectedShop.lat}
                                            centerLng={selectedShop.lng}
                                            selectedPoints={gridPoints}
                                            onPointsChange={setGridPoints}
                                            gridDistance={gridDistance}
                                        />
                                    ) : (
                                        <GoogleMapsProvider>
                                            <MapGridConfigurator
                                                centerLat={selectedShop.lat}
                                                centerLng={selectedShop.lng}
                                                selectedPoints={gridPoints}
                                                onPointsChange={setGridPoints}
                                                gridDistance={gridDistance}
                                            />
                                        </GoogleMapsProvider>
                                    )
                                ) : (
                                    <div className="p-8 bg-gray-50 rounded-xl text-center text-gray-500">
                                        <p>먼저 장소를 선택하면 지도에서 그리드를 설정할 수 있습니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Column: Cost Preview (Sticky) */}
                <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
                    <CostPreviewCard costPerRun={costPerRun} monthlyCost={monthlyCost} />

                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !selectedShop || keywords.length === 0}
                        size="lg"
                        className={`w-full text-lg py-6 rounded-xl shadow-lg ${platform === 'naver'
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                            }`}
                    >
                        {isLoading ? '저장 중...' : '자동 예약 저장하기'}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                        예약 설정 후 설정 페이지에서 관리할 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    )
}
