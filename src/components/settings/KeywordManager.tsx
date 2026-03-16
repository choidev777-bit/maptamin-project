'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Key, Plus, Trash2, Lock, AlertCircle, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ManagedKeyword {
    id: string
    keyword: string
    platform: 'naver' | 'google'
    keyword_type: 'industry' | 'local'
    created_at: string
}

interface Props {
    planId: 'free' | 'starter' | 'pro' | 'premium'
    maxNaverKeywords: number
    maxGoogleKeywords: number
    maxLocalNaverKeywords: number
    canGoogle: boolean
    onUpgradeClick: () => void
}

export function KeywordManager({ planId, maxNaverKeywords, maxGoogleKeywords, maxLocalNaverKeywords, canGoogle, onUpgradeClick }: Props) {
    const router = useRouter()
    const [naverKeywords, setNaverKeywords] = useState<ManagedKeyword[]>([])
    const [googleKeywords, setGoogleKeywords] = useState<ManagedKeyword[]>([])
    const [localNaverKeywords, setLocalNaverKeywords] = useState<ManagedKeyword[]>([])
    const [loading, setLoading] = useState(true)
    const [newNaverKeyword, setNewNaverKeyword] = useState('')
    const [newGoogleKeyword, setNewGoogleKeyword] = useState('')
    const [newLocalNaverKeyword, setNewLocalNaverKeyword] = useState('')
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

        const { data: keywords } = await supabase
            .from('managed_keywords')
            .select('id, keyword, platform, keyword_type, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true })

        if (keywords) {
            setNaverKeywords(keywords.filter(k => k.platform === 'naver' && (k.keyword_type === 'industry' || !k.keyword_type)))
            setGoogleKeywords(keywords.filter(k => k.platform === 'google'))
            setLocalNaverKeywords(keywords.filter(k => k.platform === 'naver' && k.keyword_type === 'local'))
        }

        setLoading(false)
    }

    const addKeyword = async (platform: 'naver' | 'google', keywordType: 'industry' | 'local' = 'industry') => {
        let keyword: string
        if (keywordType === 'local') {
            keyword = newLocalNaverKeyword.trim()
        } else {
            keyword = platform === 'naver' ? newNaverKeyword.trim() : newGoogleKeyword.trim()
        }
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
                    keyword_type: keywordType,
                })

            if (insertError) {
                if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
                    setError('이미 등록된 키워드입니다.')
                } else {
                    setError(insertError.message)
                }
            } else {
                if (keywordType === 'local') setNewLocalNaverKeyword('')
                else if (platform === 'naver') setNewNaverKeyword('')
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

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
                키워드 관리
            </h2>
            <p className="text-sm text-gray-500 mb-6">순위를 분석할 검색 키워드를 등록하세요.</p>

            {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Naver 업종 Keywords */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            네이버 업종 키워드
                        </h3>
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
                                className="p-1 rounded transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50"
                                title="삭제"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}

                    {naverKeywords.length < maxNaverKeywords && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newNaverKeyword}
                                onChange={(e) => setNewNaverKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addKeyword('naver', 'industry')}
                                placeholder="키워드 입력"
                                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                            <button
                                onClick={() => addKeyword('naver', 'industry')}
                                disabled={!newNaverKeyword.trim() || saving}
                                className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" />
                                추가
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Naver 지역명 Keywords */}
            {maxLocalNaverKeywords > 0 && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                                네이버 지역명 키워드
                            </h3>
                        </div>
                        <span className="text-xs text-gray-400">
                            {localNaverKeywords.length}/{maxLocalNaverKeywords}
                        </span>
                    </div>

                    <div className="space-y-2">
                        {localNaverKeywords.map((kw) => (
                            <div
                                key={kw.id}
                                className="flex items-center justify-between px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg"
                            >
                                <span className="text-sm text-amber-800 font-medium">{kw.keyword}</span>
                                <button
                                    onClick={() => deleteKeyword(kw.id, 'naver')}
                                    className="p-1 rounded transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    title="삭제"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        {localNaverKeywords.length < maxLocalNaverKeywords && (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newLocalNaverKeyword}
                                    onChange={(e) => setNewLocalNaverKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addKeyword('naver', 'local')}
                                    placeholder="예: 홍대 카페, 강남역 미용실"
                                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                />
                                <button
                                    onClick={() => addKeyword('naver', 'local')}
                                    disabled={!newLocalNaverKeyword.trim() || saving}
                                    className="px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    추가
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Google Keywords */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            구글 키워드
                        </h3>
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
                            프리미엄 업그레이드 →
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
                                    className="p-1 rounded transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    title="삭제"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        {googleKeywords.length < maxGoogleKeywords && (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newGoogleKeyword}
                                    onChange={(e) => setNewGoogleKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addKeyword('google', 'industry')}
                                    placeholder="키워드 입력"
                                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    onClick={() => addKeyword('google', 'industry')}
                                    disabled={!newGoogleKeyword.trim() || saving}
                                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
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
                        <p className="text-sm text-gray-400">프리미엄 플랜에서 이용 가능</p>
                    </div>
                )}
            </div>
        </div>
    )
}
