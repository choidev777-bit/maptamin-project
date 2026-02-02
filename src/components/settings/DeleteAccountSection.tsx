'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

export function DeleteAccountSection() {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [confirmText, setConfirmText] = useState('')
    const [error, setError] = useState<string | null>(null)

    const handleDelete = async () => {
        if (confirmText !== 'delete') return;

        setIsLoading(true)
        setError(null)

        try {
            // 1. Call API to delete account and data
            const response = await fetch('/api/auth/delete-account', {
                method: 'DELETE',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete account')
            }

            // 2. Sign out locally to clear session immediately
            const supabase = createClient()
            await supabase.auth.signOut()

            // 3. Redirect to login
            router.push('/login?deleted=true')

        } catch (err: any) {
            console.error('Delete account error:', err)
            setError(err.message || '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
            setIsLoading(false)
        }
    }

    return (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 mt-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Danger Zone
                    </h2>
                    <p className="text-red-600 mt-1 text-sm">
                        계정을 삭제하면 모든 데이터(순위 추적 내역, 등록된 장소 등)가 영구적으로 삭제되며 복구할 수 없습니다.
                    </p>
                </div>

                <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
                    <Dialog.Trigger asChild>
                        <button className="whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                            <Trash2 className="w-4 h-4" />
                            계정 삭제
                        </button>
                    </Dialog.Trigger>

                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
                        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white rounded-xl shadow-2xl p-6 z-50 animate-in zoom-in-95 duration-200 border border-gray-100">
                            <Dialog.Title className="text-xl font-bold text-gray-900 mb-2">
                                정말 계정을 삭제하시겠습니까?
                            </Dialog.Title>

                            <Dialog.Description className="text-gray-500 text-sm mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                이 작업은 되돌릴 수 없습니다. 귀하의 모든 데이터가 서버에서 즉시 영구 삭제됩니다.
                            </Dialog.Description>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="confirm" className="text-sm font-medium text-gray-700 block">
                                        확인을 위해 아래 입력창에 <span className="font-bold text-red-600">delete</span>를 입력해주세요.
                                    </label>
                                    <input
                                        id="confirm"
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder="delete"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                        autoComplete="off"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-2">
                                    <Dialog.Close asChild>
                                        <button
                                            disabled={isLoading}
                                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                        >
                                            취소
                                        </button>
                                    </Dialog.Close>
                                    <button
                                        onClick={handleDelete}
                                        disabled={confirmText !== 'delete' || isLoading}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-100"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                삭제 중...
                                            </>
                                        ) : (
                                            '계정 영구 삭제'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>
        </div>
    )
}
