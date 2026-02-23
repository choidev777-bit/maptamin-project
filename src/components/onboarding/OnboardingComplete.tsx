'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertTriangle, Loader2, ArrowRight, RotateCcw, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
    naverSearchId?: string
    googleSearchId?: string
    onRetry?: () => Promise<void>
}

type PollStatus = 'polling' | 'completed' | 'failed'

export default function OnboardingComplete({ naverSearchId, googleSearchId, onRetry }: Props) {
    const router = useRouter()
    const [naverStatus, setNaverStatus] = useState<PollStatus>(naverSearchId ? 'polling' : 'completed')
    const [googleStatus, setGoogleStatus] = useState<PollStatus>(googleSearchId ? 'polling' : 'completed')
    const [confetti, setConfetti] = useState(false)

    const allDone = naverStatus !== 'polling' && googleStatus !== 'polling'
    const anyCompleted = naverStatus === 'completed' || googleStatus === 'completed'
    const allFailed = naverStatus === 'failed' && googleStatus === 'failed'

    // 폴링 로직 (SearchStatusPoller 패턴 재사용)
    const pollSearch = useCallback(async (
        searchId: string,
        setStatus: (s: PollStatus) => void,
    ) => {
        const supabase = createClient()
        const poll = async () => {
            const { data } = await supabase
                .from('searches')
                .select('status')
                .eq('id', searchId)
                .single()

            if (data?.status === 'completed') {
                setStatus('completed')
                return true
            }
            if (data?.status === 'failed') {
                setStatus('failed')
                return true
            }
            return false
        }

        // 즉시 1회 확인
        const done = await poll()
        if (done) return

        // 3초 간격 폴링 (최대 60회 = 3분)
        let attempts = 0
        const interval = setInterval(async () => {
            attempts++
            const finished = await poll()
            if (finished || attempts >= 60) {
                clearInterval(interval)
                if (attempts >= 60) setStatus('failed')
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (naverSearchId) pollSearch(naverSearchId, setNaverStatus)
        if (googleSearchId) pollSearch(googleSearchId, setGoogleStatus)
    }, [naverSearchId, googleSearchId, pollSearch])

    // Confetti 효과 (완료 시)
    useEffect(() => {
        if (anyCompleted && allDone) {
            setConfetti(true)
            const t = setTimeout(() => setConfetti(false), 3000)
            return () => clearTimeout(t)
        }
    }, [anyCompleted, allDone])



    return (
        <div className="mx-auto max-w-lg space-y-8 py-8 text-center">
            {/* Confetti 효과 */}
            {confetti && (
                <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
                    <div className="animate-bounce text-6xl">🎉</div>
                </div>
            )}

            {/* 아이콘 + 타이틀 */}
            {!allDone ? (
                <>
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#00C896]/10">
                        <Loader2 className="h-10 w-10 animate-spin text-[#00C896]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">첫 리포트를 생성하고 있어요</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            잠시만 기다려 주세요. 보통 1~3분 소요됩니다.
                        </p>
                    </div>
                </>
            ) : anyCompleted && !allFailed ? (
                <>
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#00C896]/10">
                        <CheckCircle className="h-10 w-10 text-[#00C896]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            <Sparkles className="mr-2 inline-block h-6 w-6 text-yellow-500" />
                            첫 리포트가 완성되었어요!
                        </h2>
                        <p className="mt-2 text-sm text-gray-500">
                            온보딩이 완료되었습니다. 매주 자동으로 리포트가 생성됩니다.
                        </p>
                    </div>
                </>
            ) : (
                <>
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                        <AlertTriangle className="h-10 w-10 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">리포트 생성에 실패했습니다</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            네트워크 문제일 수 있습니다. 다시 시도해 주세요.
                        </p>
                    </div>
                </>
            )}

            {/* 상태 카드 */}
            <div className="space-y-3">
                {naverSearchId && (
                    <StatusCard
                        platform="naver"
                        status={naverStatus}
                        label="네이버 리포트"
                    />
                )}
                {googleSearchId && (
                    <StatusCard
                        platform="google"
                        status={googleStatus}
                        label="구글 리포트"
                    />
                )}
            </div>

            {/* 액션 버튼 */}
            {allDone && (
                <div className="space-y-3">
                    {allFailed && onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl"
                        >
                            <RotateCcw className="h-5 w-5" />
                            다시 시도하기
                        </button>
                    )}

                    {/* 대시보드로 이동 — window.location.href로 풀 리로딩 (SSR 캐시 갱신) */}
                    <button
                        type="button"
                        onClick={() => { window.location.href = '/dashboard' }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C896] py-4 text-base font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl"
                    >
                        대시보드로 이동
                        <ArrowRight className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    )
}

/* ---- 서브 컴포넌트 ---- */

function StatusCard({ platform, status, label }: {
    platform: 'naver' | 'google'
    status: PollStatus
    label: string
}) {
    const badgeClass = platform === 'naver'
        ? 'bg-[#03C75A] text-white'
        : 'bg-[#4285F4] text-white'
    const badge = platform === 'naver' ? 'N' : 'G'

    return (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex items-center gap-3">
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${badgeClass}`}>
                    {badge}
                </span>
                <span className="text-sm font-medium text-gray-800">{label}</span>
            </div>
            <div>
                {status === 'polling' && (
                    <span className="flex items-center gap-1.5 text-xs text-[#00C896]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        생성 중...
                    </span>
                )}
                {status === 'completed' && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#00C896]">
                        <CheckCircle className="h-3.5 w-3.5" />
                        완료
                    </span>
                )}
                {status === 'failed' && (
                    <span className="flex items-center gap-1.5 text-xs text-red-500">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        실패
                    </span>
                )}
            </div>
        </div>
    )
}
