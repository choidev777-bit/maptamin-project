'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, XCircle } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

interface Props {
    planDisplayName: string
}

export function CancelSubscriptionSection({ planDisplayName }: Props) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCancel = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/subscription/cancel', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || '구독 해지에 실패했습니다.')
            }

            // 성공 시 페이지 새로고침 (서버 컴포넌트 데이터 갱신)
            setIsOpen(false)
            router.refresh()

        } catch (err: any) {
            console.error('Cancel subscription error:', err)
            setError(err.message || '알 수 없는 오류가 발생했습니다.')
            setIsLoading(false)
        }
    }

    return (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        구독 해지
                    </h3>
                    <p className="text-xs text-orange-600 mt-1">
                        해지 시 무료 플랜으로 전환되며 유료 기능이 제한됩니다.
                    </p>
                </div>

                <Dialog.Root open={isOpen} onOpenChange={(open) => {
                    setIsOpen(open)
                    if (!open) {
                        setError(null)
                        setIsLoading(false)
                    }
                }}>
                    <Dialog.Trigger asChild>
                        <button className="whitespace-nowrap px-4 py-2 text-xs font-semibold text-orange-700 border border-orange-300 rounded-lg bg-white hover:bg-orange-100 transition-colors">
                            해지하기
                        </button>
                    </Dialog.Trigger>

                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
                        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-xl shadow-2xl p-6 z-50 animate-in zoom-in-95 duration-200 border border-gray-100">
                            <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">
                                정말 구독을 해지하시겠습니까?
                            </Dialog.Title>

                            <Dialog.Description className="text-gray-500 text-sm mb-4">
                                현재 <span className="font-semibold text-gray-700">{planDisplayName}</span> 플랜을 이용 중입니다.
                            </Dialog.Description>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                                <p className="text-sm font-medium text-orange-800 mb-2">
                                    ⚠️ 해지 시 다음 기능이 제한됩니다:
                                </p>
                                <ul className="space-y-1.5 text-sm text-orange-700">
                                    <li className="flex items-center gap-2">
                                        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        실시간 진단 티켓
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        주간 보고서 자동 발송
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        경쟁사 비교 분석
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        등록된 매장·키워드 관리
                                    </li>
                                </ul>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2 mb-4">
                                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <Dialog.Close asChild>
                                    <button
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                        유지하기
                                    </button>
                                </Dialog.Close>
                                <button
                                    onClick={handleCancel}
                                    disabled={isLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 shadow-md shadow-orange-100"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            처리 중...
                                        </>
                                    ) : (
                                        '구독 해지'
                                    )}
                                </button>
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>
        </div>
    )
}
