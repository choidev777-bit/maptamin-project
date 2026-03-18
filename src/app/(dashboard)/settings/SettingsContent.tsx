'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Calendar, LogOut, Settings, Zap, Lock, Key, Loader2, Pencil, X, Check } from 'lucide-react'
import Image from 'next/image'
import * as Dialog from '@radix-ui/react-dialog'
import { MyShopManager } from '@/components/settings/MyShopManager'
import { CompetitorManager } from '@/components/settings/CompetitorManager'
import { KeywordManager } from '@/components/settings/KeywordManager'
import { UpgradePrompt } from '@/components/dashboard/UpgradePrompt'
import { isSubscribed, canManageCompetitors, canAccessPlatform, getRequiredPlanForCompetitors } from '@/lib/utils/subscription'
import { EmailInput, isValidEmail } from '@/components/ui/EmailInput'

interface UserInfo {
    email: string
    name: string
    avatarUrl: string | null
    createdAt: string
    notificationEmail: string
}

interface Props {
    user: UserInfo
    planStats: {
        plan: 'free' | 'starter' | 'pro' | 'premium'
        limitCompetitorNaver: number
        limitCompetitorGoogle: number
        limitKeywordsNaver: number
        limitKeywordsGoogle: number
        limitLocalKeywordsNaver: number
        maxSearchesPerDay: number
    }
}

export function SettingsContent({ user, planStats }: Props) {
    const router = useRouter()
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const [upgradePrompt, setUpgradePrompt] = useState<{ message: string; requiredPlan: string } | null>(null)

    const subscribed = isSubscribed(planStats.plan)
    const canCompetitors = canManageCompetitors(planStats.plan)
    const canGoogle = canAccessPlatform(planStats.plan, 'google')

    // 이메일 수정 state
    const [editingEmail, setEditingEmail] = useState(false)
    const [emailValue, setEmailValue] = useState(user.notificationEmail)
    const [emailSaving, setEmailSaving] = useState(false)
    const [emailMessage, setEmailMessage] = useState<string | null>(null)

    // 회원탈퇴 state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const handleLogout = async () => {
        setIsLoggingOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'delete') return
        setIsDeleting(true)
        setDeleteError(null)
        try {
            const response = await fetch('/api/auth/delete-account', { method: 'DELETE' })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || '계정 삭제에 실패했습니다.')
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/login?deleted=true')
        } catch (err: any) {
            console.error('Delete account error:', err)
            setDeleteError(err.message || '알 수 없는 오류가 발생했습니다.')
            setIsDeleting(false)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    const handleSaveEmail = async () => {
        if (!emailValue || !isValidEmail(emailValue)) {
            setEmailMessage('유효한 이메일을 입력해주세요.')
            return
        }
        setEmailSaving(true)
        setEmailMessage(null)
        try {
            const response = await fetch('/api/settings/email', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailValue }),
            })
            const data = await response.json()
            if (!response.ok) {
                setEmailMessage(data.error || '이메일 변경에 실패했습니다.')
            } else {
                setEmailMessage('알림 이메일이 변경되었습니다.')
                setEditingEmail(false)
                router.refresh()
            }
        } catch {
            setEmailMessage('이메일 변경 중 오류가 발생했습니다.')
        } finally {
            setEmailSaving(false)
        }
    }

    const planDisplayName = {
        free: '무료',
        starter: '스타터',
        pro: '프로',
        premium: '프리미엄',
    }[planStats.plan]

    const planBgClass = {
        free: 'bg-gray-200',
        starter: 'bg-gray-200',
        pro: 'bg-blue-600',
        premium: 'bg-gradient-to-r from-yellow-400 to-orange-500',
    }[planStats.plan]

    const planIconClass = {
        free: 'text-gray-500',
        starter: 'text-gray-500',
        pro: 'text-white',
        premium: 'text-white',
    }[planStats.plan]

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-gray-600" />
                    설정
                </h1>
                <p className="text-gray-600 mt-1">계정 정보 및 구독 관리</p>
            </div>

            {/* Profile Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">프로필</h2>

                <div className="flex items-center gap-4">
                    {user.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt="Profile"
                            width={64}
                            height={64}
                            className="rounded-full"
                        />
                    ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                        </div>
                    )}

                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{user.name}</h3>
                        <div className="mt-1">
                            {editingEmail ? (
                                <div className="space-y-2">
                                    <EmailInput
                                        value={emailValue}
                                        onChange={setEmailValue}
                                        label=""
                                    />
                                    {emailMessage && (
                                        <p className={`text-xs ${emailMessage.includes('실패') || emailMessage.includes('오류') || emailMessage.includes('유효') ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {emailMessage}
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveEmail}
                                            disabled={emailSaving}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#00C896] text-white rounded-lg hover:bg-[#00B386] transition-colors disabled:opacity-50"
                                        >
                                            {emailSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                            저장
                                        </button>
                                        <button
                                            onClick={() => { setEditingEmail(false); setEmailValue(user.notificationEmail); setEmailMessage(null) }}
                                            disabled={emailSaving}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                            취소
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Mail className="w-4 h-4" />
                                        {user.notificationEmail || user.email || '이메일 없음'}
                                    </p>
                                    <button
                                        onClick={() => setEditingEmail(true)}
                                        className="text-xs text-gray-400 hover:text-[#00C896] transition-colors"
                                        title="이메일 수정"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(user.createdAt)} 가입
                        </p>
                    </div>
                </div>
            </div>


            {/* My Shop Management */}
            <div className="mb-6">
                {subscribed ? (
                    <MyShopManager planId={planStats.plan} />
                ) : (
                    <div
                        className="relative bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer"
                        onClick={() => setUpgradePrompt({ message: '매장 관리는 구독 후 이용할 수 있습니다.', requiredPlan: '스타터' })}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-gray-400">내 매장 관리</h2>
                            <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400">구독하여 매장을 등록하세요</p>
                    </div>
                )}
            </div>

            {/* Keyword Management */}
            <div className="mb-6">
                {subscribed ? (
                    <KeywordManager
                        planId={planStats.plan}
                        maxNaverKeywords={planStats.limitKeywordsNaver}
                        maxGoogleKeywords={planStats.limitKeywordsGoogle}
                        maxLocalNaverKeywords={planStats.limitLocalKeywordsNaver ?? 0}
                        canGoogle={canGoogle}
                        onUpgradeClick={() => setUpgradePrompt({ message: '구글 키워드 관리는 프리미엄 플랜에서 이용 가능합니다.', requiredPlan: '프리미엄' })}
                    />
                ) : (
                    <div
                        className="relative bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer"
                        onClick={() => setUpgradePrompt({ message: '키워드 관리는 구독 후 이용할 수 있습니다.', requiredPlan: '스타터' })}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-gray-400">키워드 관리</h2>
                            <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400">구독하여 키워드를 등록하세요</p>
                    </div>
                )}
            </div>

            {/* Competitor Management */}
            <div className="mb-6">
                {canCompetitors ? (
                    <CompetitorManager planId={planStats.plan} maxNaverCompetitors={planStats.limitCompetitorNaver} maxGoogleCompetitors={planStats.limitCompetitorGoogle} />
                ) : (
                    <div
                        className="relative bg-white rounded-2xl border border-gray-200 p-6 cursor-pointer"
                        onClick={() => setUpgradePrompt({ message: '경쟁사 분석은 프로 플랜부터 이용 가능합니다.', requiredPlan: getRequiredPlanForCompetitors() })}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-lg font-semibold text-gray-400">경쟁사 관리</h2>
                            <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400">프로 플랜부터 경쟁사를 등록하고 비교할 수 있습니다</p>
                    </div>
                )}
            </div>

            {/* Actions Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">계정</h2>

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-600 rounded-xl font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 border border-gray-200"
                >
                    <LogOut className="w-5 h-5" />
                    {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
            </div>

            <div className="mt-2 text-right">
                <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <Dialog.Trigger asChild>
                        <button className="text-sm text-red-500 hover:text-red-600 hover:underline transition-colors">
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
                                    <label htmlFor="confirm-delete" className="text-sm font-medium text-gray-700 block">
                                        확인을 위해 아래 입력창에 <span className="font-bold text-red-600">delete</span>를 입력해주세요.
                                    </label>
                                    <input
                                        id="confirm-delete"
                                        type="text"
                                        value={deleteConfirmText}
                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                        placeholder="delete"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                                        autoComplete="off"
                                    />
                                </div>

                                {deleteError && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                                        {deleteError}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-2">
                                    <Dialog.Close asChild>
                                        <button
                                            disabled={isDeleting}
                                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                        >
                                            취소
                                        </button>
                                    </Dialog.Close>
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deleteConfirmText !== 'delete' || isDeleting}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isDeleting ? (
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

            {/* Upgrade Prompt Modal */}
            {upgradePrompt && (
                <UpgradePrompt
                    message={upgradePrompt.message}
                    requiredPlan={upgradePrompt.requiredPlan}
                    onClose={() => setUpgradePrompt(null)}
                />
            )}
        </div>
    )
}
