'use client'

import { useRouter } from 'next/navigation'
import { Lock, ArrowRight, X } from 'lucide-react'

interface Props {
    /** 안내 메시지 (예: "이 기능은 Pro 플랜부터 사용 가능합니다") */
    message: string
    /** 필요한 플랜 이름 표시용 */
    requiredPlan: string
    /** 모달 닫기 */
    onClose: () => void
}

/**
 * 업그레이드 유도 모달
 * 잠긴 기능 클릭 시 표시
 */
export function UpgradePrompt({ message, requiredPlan, onClose }: Props) {
    const router = useRouter()

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* 아이콘 */}
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
                    <Lock className="h-7 w-7 text-amber-500" />
                </div>

                {/* 내용 */}
                <h3 className="text-center text-lg font-bold text-gray-900">
                    {requiredPlan} 플랜 필요
                </h3>
                <p className="mt-2 text-center text-sm text-gray-500 leading-relaxed">
                    {message}
                </p>

                {/* 버튼 */}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border-2 border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/subscription')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#00C896] py-3 text-sm font-semibold text-white shadow-lg shadow-[#00C896]/25 hover:bg-[#00B386] transition-all"
                    >
                        업그레이드
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
