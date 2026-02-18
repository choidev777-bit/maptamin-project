'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Key, Plus, Trash2, Lock, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { canUpdateKeywords } from '@/lib/utils/subscription'

interface ManagedKeyword {
    id: string
    keyword: string
    platform: 'naver' | 'google'
    created_at: string
}

interface ManagedPlace {
    id: string
    platform: 'naver' | 'google'
    locked_until: string | null
}

interface Props {
    planId: 'free' | 'starter' | 'pro' | 'premium'
    maxNaverKeywords: number
    maxGoogleKeywords: number
    canGoogle: boolean
    onUpgradeClick: () => void
}

export function KeywordManager({ planId, maxNaverKeywords, maxGoogleKeywords, canGoogle, onUpgradeClick }: Props) {
    const router = useRouter()
    const [naverKeywords, setNaverKeywords] = useState<ManagedKeyword[]>([])
    const [googleKeywords, setGoogleKeywords] = useState<ManagedKeyword[]>([])
    const [naverPlace, setNaverPlace] = useState<ManagedPlace | null>(null)
    const [googlePlace, setGooglePlace] = useState<ManagedPlace | null>(null)
    const [loading, setLoading] = useState(true)
    const [newNaverKeyword, setNewNaverKeyword] = useState('')
    const [newGoogleKeyword, setNewGoogleKeyword] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch keywords
        const { data: keywords } = await supabase
            .from('managed_keywords')
            .select('id, keyword, platform, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })

        if (keywords) {
            setNaverKeywords(keywords.filter(k => k.platform === 'naver'))
            setGoogleKeywords(keywords.filter(k => k.platform === 'google'))
        }

        // Fetch places for lock status
        const { data: places } = await supabase
            .from('managed_places')
            .select('id, platform, locked_until')
            .eq('user_id', user.id)

        if (places) {
            setNaverPlace(places.find(p => p.platform === 'naver') || null)
            setGooglePlace(places.find(p => p.platform === 'google') || null)
        }

        setLoading(false)
    }

    const isPlatformLocked = (platform: 'naver' | 'google') => {
        const place = platform === 'naver' ? naverPlace : googlePlace
        return !canUpdateKeywords(place?.locked_until || null)
    }

    const getLockDate = (platform: 'naver' | 'google') => {
        const place = platform === 'naver' ? naverPlace : googlePlace
        return place?.locked_until ? new Date(place.locked_until) : null
    }

    const addKeyword = async (platform: 'naver' | 'google') => {
        if (isPlatformLocked(platform)) {
            setError(`${formatLockDate(getLockDate(platform)?.toISOString() || '')}까지 키워드를 변경할 수 없습니다`)
            return
        }

        const keyword = platform === 'naver' ? newNaverKeyword.trim() : newGoogleKeyword.trim()
        if (!keyword) return

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
                    keyword,
                    platform,
                    // locked_until removed
                })

            if (insertError) {
                setError(insertError.message)
            } else {
                if (platform === 'naver') setNewNaverKeyword('')
                else setNewGoogleKeyword('')
                fetchData()
                router.refresh()
            }
        } catch {
            setError('키워드 추가 중 오류가 발생했습니다')
        } finally {
            setSaving(false)
        }
    }

    const deleteKeyword = async (id: string, platform: 'naver' | 'google') => {
        if (isPlatformLocked(platform)) {
            setError(`${formatLockDate(getLockDate(platform)?.toISOString() || '')}까지 키워드를 변경할 수 없습니다`)
            return
        }

        const supabase = createClient()
        const { error: deleteError } = await supabase
            .from('managed_keywords')
            .delete()
            .eq('id', id)

        if (deleteError) {
            setError(deleteError.message)
        } else {
            fetchData()
            router.refresh()
        }
    }

    const formatLockDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-gray-600" />
                    키워드 관리
                </h2>
                <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-gray-100 rounded-lg" />
                    <div className="h-10 bg-gray-100 rounded-lg" />
                </div>
            </div>
        )
    }

    const naverLocked = isPlatformLocked('naver')
    const googleLocked = isPlatformLocked('google')

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Key className="w-5 h-5 text-gray-600" />
                키워드 관리
            </h2>
            <p className="text-sm text-gray-500 mb-6">순위를 추적할 검색 키워드를 등록하세요. 매장 등록 후 30일간 키워드 변경이 제한됩니다.</p>

            {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Naver Keywords */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            네이버 키워드
                        </h3>
                        {naverLocked && naverPlace?.locked_until && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                <Lock className="w-3 h-3" />
                                {formatLockDate(naverPlace.locked_until)}까지 변경 불가
                            </div>
                        )}
                    </div>
                    <span className="text-xs text-gray-400">
                        {naverKeywords.length}/{maxNaverKeywords}
                    </span>
                </div>

                <div className="space-y-2">
                    {naverKeywords.map((kw) => (
                        <div
                            key={kw.id}
                            className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-lg"
                        >
                            <span className="text-sm text-emerald-800 font-medium">{kw.keyword}</span>
                            <button
                                onClick={() => deleteKeyword(kw.id, 'naver')}
                                disabled={naverLocked}
                                className={`p-1 rounded transition-colors ${naverLocked
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                    }`}
                                title={naverLocked ? '잠금 기간 중에는 삭제할 수 없습니다' : '삭제'}
                            >
                                {naverLocked ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    ))}

                    {naverKeywords.length < maxNaverKeywords && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newNaverKeyword}
                                onChange={(e) => setNewNaverKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addKeyword('naver')}
                                placeholder={naverLocked ? "잠금 기간에는 추가할 수 없습니다" : "키워드 입력 (예: 강남 맛집)"}
                                disabled={naverLocked}
                                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                            />
                            <button
                                onClick={() => addKeyword('naver')}
                                disabled={!newNaverKeyword.trim() || saving || naverLocked}
                                className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                            >
                                {naverLocked ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                추가
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Google Keywords */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            구글 키워드
                        </h3>
                        {googleLocked && googlePlace?.locked_until && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                <Lock className="w-3 h-3" />
                                {formatLockDate(googlePlace.locked_until)}까지 변경 불가
                            </div>
                        )}
                    </div>
                    {canGoogle ? (
                        <span className="text-xs text-gray-400">
                            {googleKeywords.length}/{maxGoogleKeywords}
                        </span>
                    ) : (
                        <button
                            onClick={onUpgradeClick}
                            className="text-xs text-[#00C896] hover:text-[#00B386] font-medium"
                        >
                            Premium 업그레이드 →
                        </button>
                    )}
                </div>

                {canGoogle ? (
                    <div className="space-y-2">
                        {googleKeywords.map((kw) => (
                            <div
                                key={kw.id}
                                className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg"
                            >
                                <span className="text-sm text-blue-800 font-medium">{kw.keyword}</span>
                                <button
                                    onClick={() => deleteKeyword(kw.id, 'google')}
                                    disabled={googleLocked}
                                    className={`p-1 rounded transition-colors ${googleLocked
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                        }`}
                                    title={googleLocked ? '잠금 기간 중에는 삭제할 수 없습니다' : '삭제'}
                                >
                                    {googleLocked ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        ))}

                        {googleKeywords.length < maxGoogleKeywords && (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newGoogleKeyword}
                                    onChange={(e) => setNewGoogleKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addKeyword('google')}
                                    placeholder={googleLocked ? "잠금 기간에는 추가할 수 없습니다" : "키워드 입력 (예: best cafe near me)"}
                                    disabled={googleLocked}
                                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                                />
                                <button
                                    onClick={() => addKeyword('google')}
                                    disabled={!newGoogleKeyword.trim() || saving || googleLocked}
                                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                >
                                    {googleLocked ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    추가
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        className="flex flex-col items-center justify-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 cursor-pointer"
                        onClick={onUpgradeClick}
                    >
                        <Lock className="w-5 h-5 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-400">Premium 플랜에서 이용 가능</p>
                    </div>
                )}
            </div>
        </div>
    )
}
