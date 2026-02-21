'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Store, Hash, Users, Calendar, Sparkles } from 'lucide-react'
import StepStoreRegister from '@/components/onboarding/StepStoreRegister'
import StepKeywordRegister from '@/components/onboarding/StepKeywordRegister'
import StepCompetitorRegister from '@/components/onboarding/StepCompetitorRegister'
import StepScheduleSetting from '@/components/onboarding/StepScheduleSetting'
import { createClient } from '@/lib/supabase/client'

/* ---- 타입 ---- */

interface Place {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
}

interface OnboardingData {
    store?: { naverPlace: Place; googlePlace?: Place; phone: string }
    keywords?: { naverKeywords: string[]; googleKeywords?: string[] }
    competitors?: { competitors: Place[] }
    schedule?: {
        crawlingDay: number
        crawlingTime: string
        notifyImmediate: boolean
        notifyDay?: number
        notifyTime?: string
    }
}

/* ---- 스텝 정의 ---- */

interface StepDef {
    id: string
    label: string
    icon: React.ReactNode
}

function getSteps(planId: string): StepDef[] {
    const base: StepDef[] = [
        { id: 'store', label: '매장 등록', icon: <Store className="h-4 w-4" /> },
        { id: 'keyword', label: '키워드 등록', icon: <Hash className="h-4 w-4" /> },
    ]

    if (planId !== 'starter') {
        base.push({ id: 'competitor', label: '경쟁사 등록', icon: <Users className="h-4 w-4" /> })
    }

    base.push({ id: 'schedule', label: '스케줄 설정', icon: <Calendar className="h-4 w-4" /> })

    return base
}

/* ---- 메인 컴포넌트 ---- */

export default function OnboardingPage() {
    const router = useRouter()

    // TODO: 실제로는 Supabase에서 사용자의 plan_id를 가져와야 합니다
    // const planId: 'starter' | 'pro' | 'premium' = 'pro'
    // -> Converted to async data fetching via useEffect or Server Component passed props.
    // Client Component cannot be async like this. Need to useEffect or useSubscription hook.

    // Using simple useEffect for client-side fetching to replace hardcoded value
    const [planId, setPlanId] = useState<'starter' | 'pro' | 'premium'>('starter')
    const [loading, setLoading] = useState(true)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [data, setData] = useState<OnboardingData>({})
    const [isComplete, setIsComplete] = useState(false)

    // Fetch user plan on mount
    useEffect(() => {
        const fetchPlan = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.replace('/login')
                return
            }

            const { data: sub } = await supabase
                .from('user_subscriptions')
                .select('plan_id')
                .eq('user_id', user.id)
                .single()

            if (sub && sub.plan_id && ['starter', 'pro', 'premium'].includes(sub.plan_id)) {
                setPlanId(sub.plan_id as 'starter' | 'pro' | 'premium')
            }
            setLoading(false)
        }
        fetchPlan()
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

    const handleScheduleComplete = useCallback((scheduleData: OnboardingData['schedule']) => {
        const finalData = { ...data, schedule: scheduleData }
        setData(finalData)
        setIsComplete(true)

        // TODO: Supabase에 데이터 저장
        console.log('🎉 온보딩 완료! 데이터:', finalData)
        console.log('🚀 웰컴 리포트 트리거 발동!')

        // 3초 후 대시보드로 이동
        setTimeout(() => {
            router.push('/dashboard')
        }, 3000)
    }, [data, router])

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
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#00C896]/10">
                    <Sparkles className="h-10 w-10 text-[#00C896]" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                    온보딩 완료! 🎉
                </h1>
                <p className="mt-3 text-gray-600">
                    웰컴 리포트가 자동으로 생성되고 있습니다.
                </p>
                <p className="mt-1 text-sm text-gray-400">
                    잠시 후 대시보드로 이동합니다…
                </p>
                <div className="mt-8">
                    <div className="h-1.5 w-48 overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full animate-pulse rounded-full bg-[#00C896]" style={{ width: '100%' }} />
                    </div>
                </div>
            </div>
        )
    }

    /* ---- 메인 렌더링 ---- */

    return (
        <div className="mx-auto max-w-2xl py-4 sm:py-8">
            {/* 타이틀 */}
            <div className="mb-8 text-center">
                <h1 className="text-lg font-bold text-gray-900 sm:text-xl">맵타민 시작하기</h1>
                <p className="mt-1 text-sm text-gray-500">4단계를 완료하면 첫 리포트가 무료로 발송됩니다</p>
            </div>

            {/* 프로그레스 바 */}
            <div className="mb-10">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const isActive = index === currentStepIndex
                        const isDone = index < currentStepIndex

                        return (
                            <div key={step.id} className="flex flex-1 items-center">
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
                                        {isDone ? <Check className="h-5 w-5" /> : step.icon}
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
                                            className={`h-full rounded-full transition-colors ${isDone ? 'bg-[#00C896]' : 'bg-gray-200'
                                                }`}
                                        />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
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
                {currentStep.id === 'schedule' && (
                    <StepScheduleSetting onComplete={handleScheduleComplete} />
                )}
            </div>
        </div>
    )
}
