'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Key, Plus, Trash2, X, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ManagedKeyword {
    id: string
    keyword: string
    platform: 'naver' | 'google'
    created_at: string
}

interface KeywordManageModalProps {
    isOpen: boolean
    onClose: () => void
    platform: 'naver' | 'google'
    maxKeywords: number
}

export function KeywordManageModal({ isOpen, onClose, platform, maxKeywords }: KeywordManageModalProps) {
    const router = useRouter()
    const [keywords, setKeywords] = useState<ManagedKeyword[]>([])
    const [loading, setLoading] = useState(true)
    const [newKeyword, setNewKeyword] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const platformName = platform === 'naver' ? '네이버' : '구글'
    const accentColor = platform === 'naver' ? '#00C896' : '#3b82f6'

    const fetchKeywords = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('managed_keywords')
            .select('id, keyword, platform, created_at')
            .eq('user_id', user.id)
            .eq('platform', platform)
            .order('created_at', { ascending: true })

        setKeywords(data || [])
        setLoading(false)
    }, [platform])

    useEffect(() => {
        if (isOpen) {
            fetchKeywords()
            setError(null)
            setNewKeyword('')
        }
    }, [isOpen, fetchKeywords])

    const addKeyword = async () => {
        const trimmed = newKeyword.trim()
        if (!trimmed) return

        setSaving(true)
        setError(null)

        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error: insertError } = await supabase
                .from('managed_keywords')
                .insert({
                    user_id: user.id,
                    keyword: trimmed,
                    platform,
                })

            if (insertError) {
                if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                    setError('이미 등록된 키워드입니다.')
                } else {
                    setError(insertError.message)
                }
            } else {
                setNewKeyword('')
                await fetchKeywords()
                router.refresh()
            }
        } catch {
            setError('키워드 추가 중 오류가 발생했습니다')
        } finally {
            setSaving(false)
        }
    }

    const deleteKeyword = async (id: string) => {
        setError(null)
        const supabase = createClient()
        const { error: deleteError } = await supabase
            .from('managed_keywords')
            .delete()
            .eq('id', id)

        if (deleteError) {
            setError(deleteError.message)
        } else {
            await fetchKeywords()
            router.refresh()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                            <Key className="w-4 h-4" style={{ color: accentColor }} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white">{platformName} 키워드 관리</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{keywords.length}/{maxKeywords}개 등록됨</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-5 mt-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Keyword List */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="space-y-3">
                            <div className="h-10 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                            <div className="h-10 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                        </div>
                    ) : keywords.length === 0 ? (
                        <div className="text-center py-8">
                            <Key className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                            <p className="text-sm text-gray-400 dark:text-slate-500">등록된 키워드가 없습니다</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">아래에서 키워드를 추가해보세요</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {keywords.map((kw) => (
                                <div
                                    key={kw.id}
                                    className="flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors"
                                    style={{
                                        backgroundColor: `${accentColor}08`,
                                        borderColor: `${accentColor}20`,
                                    }}
                                >
                                    <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{kw.keyword}</span>
                                    <button
                                        onClick={() => deleteKeyword(kw.id)}
                                        className="p-1 rounded transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        title="삭제"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Keyword Input */}
                {keywords.length < maxKeywords && (
                    <div className="p-5 border-t border-gray-100 dark:border-slate-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                                placeholder={platform === 'naver' ? '키워드 입력 (예: 강남 맛집)' : '키워드 입력 (예: best cafe)'}
                                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                                style={{ ['--tw-ring-color' as string]: accentColor } as React.CSSProperties}
                                disabled={saving}
                            />
                            <button
                                onClick={addKeyword}
                                disabled={!newKeyword.trim() || saving}
                                className="px-4 py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                style={{ backgroundColor: accentColor }}
                            >
                                <Plus className="w-4 h-4" />
                                추가
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
