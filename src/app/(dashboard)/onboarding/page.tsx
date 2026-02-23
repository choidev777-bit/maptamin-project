'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Store, Hash, Users, Calendar, Sparkles, Grid3X3, Rocket } from 'lucide-react'
import StepStoreRegister from '@/components/onboarding/StepStoreRegister'
import StepKeywordRegister from '@/components/onboarding/StepKeywordRegister'
import StepCompetitorRegister from '@/components/onboarding/StepCompetitorRegister'
import StepScheduleSetting from '@/components/onboarding/StepScheduleSetting'
import StepGridSetting from '@/components/onboarding/StepGridSetting'
import OnboardingComplete from '@/components/onboarding/OnboardingComplete'
import { createClient } from '@/lib/supabase/client'
import {
    getSteps,
    computeStartStep,
    type OnboardingData,
    type PlanId,
    type StepId,
} from './onboarding-utils'

/* ---- Step 아이콘 매핑 ---- */

const STEP_ICONS: Record<StepId, React.ReactNode> = {
    store: <Store className="h-4 w-4" />,
    keyword: <Hash className="h-4 w-4" />,
    competitor: <Users className="h-4 w-4" />,
    grid: <Grid3X3 className="h-4 w-4" />,
    schedule: <Calendar className="h-4 w-4" />,
}

/* ---- 메인 컴포넌트 ---- */

export default function OnboardingPage() {
    const router = useRouter()
    const [planId, setPlanId] = useState<PlanId>('starter')
    const [loading, setLoading] = useState(true)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [data, setData] = useState<OnboardingData>({})
    const [isComplete, setIsComplete] = useState(false)
    const [naverSearchId, setNaverSearchId] = useState<string | undefined>()
    const [googleSearchId, setGoogleSearchId] = useState<string | undefined>()
    const [confirming, setConfirming] = useState(false)
    const [showIntro, setShowIntro] = useState(false)

    // 진입 시: 플랜 확인 + 접근 제어 가드 + 이탈 복구
    useEffect(() => {
        const fetchPlanAndRestore = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.replace('/login')
                return
            }

            // 1. 구독 정보 가져오기
            const { data: sub } = await supabase
                .from('user_subscriptions')
                .select('plan_id, onboarding_completed')
                .eq('user_id', user.id)
                .single()

            // ── 가드 1: 무료 유저 차단 ──
            if (!sub || !sub.plan_id || sub.plan_id === 'free') {
                router.replace('/dashboard')
                return
            }

            // ── 가드 2: 이미 온보딩 완료한 유저 차단 ──
            if (sub.onboarding_completed) {
                router.replace('/dashboard')
                return
            }

            // 플랜 검증
            const validPlans: PlanId[] = ['starter', 'pro', 'premium']
            if (!validPlans.includes(sub.plan_id as PlanId)) {
                router.replace('/dashboard')
                return
            }

            const userPlanId = sub.plan_id as PlanId
            setPlanId(userPlanId)

            // 2. 이탈 복구: 기존 데이터 조회 → 시작 Step 결정
            const [
                { data: places },
                { data: keywords },
                { data: competitors },
                { data: schedules },
            ] = await Promise.all([
                supabase.from('managed_places').select('*').eq('user_id', user.id),
                supabase.from('managed_keywords').select('id').eq('user_id', user.id).limit(1),
                supabase.from('managed_competitors').select('id').eq('user_id', user.id).limit(1),
                supabase.from('search_schedules').select('id').eq('user_id', user.id).limit(1),
            ])

            const startStep = computeStartStep(userPlanId, {
                hasPlaces: (places?.length ?? 0) > 0,
                hasKeywords: (keywords?.length ?? 0) > 0,
                hasCompetitors: (competitors?.length ?? 0) > 0,
                hasSchedules: (schedules?.length ?? 0) > 0,
            })

            // 이탈 복구: 매장 데이터가 있으면 data.store에 복원 (그리드 설정 등 후속 Step에서 필요)
            if (places && places.length > 0) {
                const naverRow = places.find((p: any) => p.platform === 'naver')
                const googleRow = places.find((p: any) => p.platform === 'google')

                if (naverRow) {
                    setData(prev => ({
                        ...prev,
                        store: {
                            naverPlace: {
                                placeId: naverRow.place_id,
                                name: naverRow.place_name,
                                address: naverRow.address || '',
                                lat: naverRow.lat || 0,
                                lng: naverRow.lng || 0,
                            },
                            ...(googleRow ? {
                                googlePlace: {
                                    placeId: googleRow.place_id,
                                    name: googleRow.place_name,
                                    address: googleRow.address || '',
                                    lat: googleRow.lat || 0,
                                    lng: googleRow.lng || 0,
                                }
                            } : {}),
                        }
                    }))
                }
            }

            setCurrentStepIndex(startStep)
            // 첫 진입(모든 데이터 없음)일 때만 환영 인트로 표시
            if (startStep === 0) setShowIntro(true)
            setLoading(false)
        }
        fetchPlanAndRestore()
    }, [router])

    const steps = getSteps(planId)
    const currentStep = steps[currentStepIndex]

    const goNext = useCallback(() => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [currentStepIndex, steps.length])

    const handleStoreComplete = useCallback((storeData: OnboardingData['store']) => {
        setData(prev => ({ ...prev, store: storeData }))
        goNext()
    }, [goNext])

    const handleKeywordComplete = useCallback((keywordData: OnboardingData['keywords']) => {
        setData(prev => ({ ...prev, keywords: keywordData }))
        goNext()
    }, [goNext])

    const handleCompetitorComplete = useCallback((competitorData: OnboardingData['competitors']) => {
        setData(prev => ({ ...prev, competitors: competitorData }))
        goNext()
    }, [goNext])

    const handleCompetitorSkip = useCallback(() => {
        setData(prev => ({ ...prev, competitors: { competitors: [] } }))
        goNext()
    }, [goNext])

    const handleGridComplete = useCallback((gridData: OnboardingData['grid']) => {
        setData(prev => ({ ...prev, grid: gridData }))
        goNext()
    }, [goNext])

    // 온보딩 완료 — 웰컴 리포트 트리거
    const handleConfirm = useCallback(async () => {
        if (confirming) return
        setConfirming(true)

        try {
            const supabase = createClient()

            // 1. 온보딩 완료 플래그 설정
            await supabase
                .from('user_subscriptions')
                .update({ onboarding_completed: true })
                .eq('user_id', (await supabase.auth.getUser()).data.user!.id)

            // 2. 네이버 웰컴 리포트 POST
            let nSearchId: string | undefined
            if (data.store && data.keywords && data.grid) {
                try {
                    const res = await fetch('/api/naver/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            placeName: data.store.naverPlace.name,
                            placeAddress: data.store.naverPlace.address,
                            placeLat: data.store.naverPlace.lat,
                            placeLng: data.store.naverPlace.lng,
                            placeId: data.store.naverPlace.placeId,
                            keywords: data.keywords.naverKeywords,
                            gridPoints: data.grid.naverGrid,
                            distance: data.grid.distance,
                            distanceUnit: 'km',
                            reportType: 'welcome',
                        }),
                    })
                    if (res.ok) {
                        const json = await res.json()
                        nSearchId = json.searchId
                    }
                } catch (e) {
                    console.error('Naver welcome report failed:', e)
                }
            }

            // 3. Premium: 구글 웰컴 리포트 POST
            let gSearchId: string | undefined
            if (planId === 'premium' && data.store?.googlePlace && data.keywords?.googleKeywords && data.grid?.googleGrid) {
                try {
                    const res = await fetch('/api/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            place: {
                                placeId: data.store.googlePlace.placeId,
                                name: data.store.googlePlace.name,
                                address: data.store.googlePlace.address,
                                lat: data.store.googlePlace.lat,
                                lng: data.store.googlePlace.lng,
                            },
                            keywords: data.keywords.googleKeywords,
                            gridPoints: data.grid.googleGrid,
                            distance: data.grid.distance,
                            distanceUnit: 'km',
                            reportType: 'welcome',
                        }),
                    })
                    if (res.ok) {
                        const json = await res.json()
                        gSearchId = json.searchId
                    }
                } catch (e) {
                    console.error('Google welcome report failed:', e)
                }
            }

            // 4. welcome_report_sent 플래그 — 하나라도 성공한 경우에만 true
            if (nSearchId || gSearchId) {
                await supabase
                    .from('user_subscriptions')
                    .update({ welcome_report_sent: true })
                    .eq('user_id', (await supabase.auth.getUser()).data.user!.id)
            }

            // 5. 대시보드로 즉시 이동 (리포트는 백그라운드 생성)
            window.location.href = '/dashboard'
        } catch (err) {
            console.error('Onboarding completion error:', err)
            // 에러가 나도 대시보드로 이동
            window.location.href = '/dashboard'
        } finally {
            setConfirming(false)
        }
    }, [data, planId, confirming])

    const handleScheduleComplete = useCallback((scheduleData: OnboardingData['schedule']) => {
        setData(prev => ({ ...prev, schedule: scheduleData }))
        // 스케줄이 마지막 단계이므로 바로 온보딩 완료 처리
        handleConfirm()
    }, [handleConfirm])

    // 웰컴 리포트 재시도
    const retryWelcomeReport = useCallback(async () => {
        setIsComplete(false)
        setNaverSearchId(undefined)
        setGoogleSearchId(undefined)
        await handleConfirm()
    }, [handleConfirm])

    /* ---- 로딩 화면 ---- */

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-[#00C896] border-t-transparent rounded-full" />
            </div>
        )
    }

    /* ---- 완료 화면 ---- */

    if (isComplete) {
        return (
            <div className="mx-auto max-w-2xl px-4 py-8">
                <OnboardingComplete
                    naverSearchId={naverSearchId}
                    googleSearchId={googleSearchId}
                    onRetry={retryWelcomeReport}
                />
            </div>
        )
    }

    /* ---- 메인 렌더링 ---- */

    const totalSteps = steps.length
    const stepsLabel = `${totalSteps}단계를 완료하면 첫 리포트가 무료로 발송됩니다`

    return (
        <div className="mx-auto max-w-2xl py-4 sm:py-8">
            {/* 타이틀 */}
            <div className="mb-8 text-center">
                <h1 className="text-lg font-bold text-gray-900 sm:text-xl">맵타민 시작하기</h1>
                <p className="mt-1 text-sm text-gray-500">{stepsLabel}</p>
            </div>

            {/* 환영 인트로 */}
            {showIntro && (
                <div className="mb-10 rounded-2xl border border-[#00C896]/20 bg-gradient-to-br from-[#00C896]/5 via-white to-emerald-50 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#00C896]/10">
                        <Rocket className="h-8 w-8 text-[#00C896]" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                        구독을 시작해 주셔서 감사합니다! 🎉
                    </h2>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                        몇 가지 설정만 완료하면 <br className="sm:hidden" />
                        매주 자동으로 [플레이스 순위 지도] 리포트를 받을 수 있어요.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowIntro(false)}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#00C896] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl"
                    >
                        <Sparkles className="h-4 w-4" />
                        시작하기
                    </button>
                </div>
            )}

            {/* 프로그레스 바 + 스텝 컨텐츠: 시작하기 누른 후에만 표시 */}
            {!showIntro && (
                <>
                    <div className="mb-10">
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => {
                                const isActive = index === currentStepIndex
                                const isDone = index < currentStepIndex

                                return (
                                    <div key={step.id} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                                        {/* 스텝 원 */}
                                        <div className="flex flex-col items-center">
                                            <div
                                                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all sm:h-10 sm:w-10 ${isDone
                                                    ? 'bg-[#00C896] text-white'
                                                    : isActive
                                                        ? 'border-2 border-[#00C896] bg-white text-[#00C896] shadow-md shadow-[#00C896]/20'
                                                        : 'border-2 border-gray-200 bg-white text-gray-400'
                                                    }`}
                                            >
                                                {isDone ? <Check className="h-5 w-5" /> : STEP_ICONS[step.id]}
                                            </div>
                                            <span
                                                className={`mt-2 text-[10px] font-medium sm:text-xs ${isActive ? 'text-[#00C896]' : isDone ? 'text-gray-600' : 'text-gray-400'
                                                    }`}
                                            >
                                                {step.label}
                                            </span>
                                        </div>

                                        {/* 연결 선 */}
                                        {index < steps.length - 1 && (
                                            <div className="mx-1 mb-6 h-0.5 flex-1 sm:mx-2">
                                                <div
                                                    className={`h-full w-full transition-all ${isDone ? 'bg-[#00C896]' : 'bg-gray-200'
                                                        }`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <p className="mt-3 text-center text-xs font-medium text-gray-400">
                            {currentStepIndex + 1}단계 / {totalSteps}단계
                        </p>
                    </div>

                    {/* 스텝 컨텐츠 */}
                    <div className="min-h-[400px]">
                        {currentStep.id === 'store' && (
                            <StepStoreRegister planId={planId} onComplete={handleStoreComplete} />
                        )}
                        {currentStep.id === 'keyword' && (
                            <StepKeywordRegister planId={planId} onComplete={handleKeywordComplete} />
                        )}
                        {currentStep.id === 'competitor' && (
                            <StepCompetitorRegister
                                planId={planId}
                                onComplete={handleCompetitorComplete}
                                onSkip={handleCompetitorSkip}
                            />
                        )}
                        {currentStep.id === 'grid' && data.store && (
                            <StepGridSetting
                                planId={planId}
                                naverPlace={data.store.naverPlace}
                                googlePlace={data.store.googlePlace}
                                onComplete={handleGridComplete}
                            />
                        )}
                        {currentStep.id === 'schedule' && (
                            <StepScheduleSetting planId={planId} onboardingData={data} onComplete={handleScheduleComplete} />
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
