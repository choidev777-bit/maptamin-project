'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, Plus, Trash2, X, AlertCircle, Users } from 'lucide-react'
import { PlaceSelectionModal } from './PlaceSelectionModal'
import { useRouter } from 'next/navigation'
import { Place, ManagedCompetitor } from '@/lib/types'

interface CompetitorManageModalProps {
    isOpen: boolean
    onClose: () => void
    platform: 'naver' | 'google'
    maxCompetitors: number
}

export function CompetitorManageModal({ isOpen, onClose, platform, maxCompetitors }: CompetitorManageModalProps) {
    const router = useRouter()
    const [competitors, setCompetitors] = useState<ManagedCompetitor[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isPlaceModalOpen, setIsPlaceModalOpen] = useState(false)

    const platformName = platform === 'naver' ? '네이버' : '구글'
    const accentColor = platform === 'naver' ? '#00C896' : '#3b82f6'

    const fetchCompetitors = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/settings/competitors?platform=${platform}`)
            const json = await res.json()
            if (res.ok) {
                setCompetitors(json.data || [])
            } else {
                setError(json.error || '경쟁사 목록을 불러올 수 없습니다')
            }
        } catch {
            setError('경쟁사 목록 로딩 중 오류가 발생했습니다')
        } finally {
            setLoading(false)
        }
    }, [platform])

    useEffect(() => {
        if (isOpen) {
            fetchCompetitors()
            setError(null)
        }
    }, [isOpen, fetchCompetitors])

    const handleRegisterCompetitor = async (place: Place) => {
        setError(null)
        try {
            const res = await fetch('/api/settings/competitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform,
                    placeId: place.placeId,
                    placeName: place.name,
                    address: place.address,
                    lat: place.lat,
                    lng: place.lng,
                }),
            })

            if (!res.ok) {
                const json = await res.json()
                setError(json.error || '경쟁사 등록에 실패했습니다')
            } else {
                await fetchCompetitors()
                router.refresh()
            }
        } catch {
            setError('경쟁사 등록 중 오류가 발생했습니다')
        }
    }

    const handleDelete = async (id: string) => {
        setError(null)
        try {
            const res = await fetch(`/api/settings/competitors?id=${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const json = await res.json()
                setError(json.error || '경쟁사 삭제에 실패했습니다')
            } else {
                await fetchCompetitors()
                router.refresh()
            }
        } catch {
            setError('경쟁사 삭제 중 오류가 발생했습니다')
        }
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

                {/* Modal Content */}
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-3 sm:mx-4 max-h-[85vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}15` }}>
                                <Eye className="w-4 h-4" style={{ color: accentColor }} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">{platformName} 경쟁사 관리</h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400">{competitors.length}/{maxCompetitors}곳 등록됨</p>
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

                    {/* Competitor List */}
                    <div className="flex-1 overflow-y-auto p-5">
                        {loading ? (
                            <div className="space-y-3">
                                <div className="h-14 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                                <div className="h-14 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                            </div>
                        ) : competitors.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                                <p className="text-sm text-gray-400 dark:text-slate-500">등록된 경쟁사가 없습니다</p>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">아래 버튼으로 경쟁사를 추가해보세요</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {competitors.map((comp) => (
                                    <div
                                        key={comp.id}
                                        className="flex items-center justify-between px-3 py-3 rounded-lg border transition-colors"
                                        style={{
                                            backgroundColor: `${accentColor}08`,
                                            borderColor: `${accentColor}20`,
                                        }}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{comp.place_name}</p>
                                            {comp.address && (
                                                <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{comp.address}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(comp.id)}
                                            className="p-1.5 ml-2 rounded transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add Competitor Button */}
                    {competitors.length < maxCompetitors && (
                        <div className="p-5 border-t border-gray-100 dark:border-slate-700">
                            <button
                                onClick={() => setIsPlaceModalOpen(true)}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-lg transition-colors ${platform === 'naver' ? 'bg-[#00C896] hover:bg-[#00B386]' : 'bg-blue-500 hover:bg-blue-600'}`}
                            >
                                <Plus className="w-4 h-4" />
                                경쟁사 추가
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Place Selection Modal (nested) */}
            <PlaceSelectionModal
                isOpen={isPlaceModalOpen}
                onClose={() => setIsPlaceModalOpen(false)}
                platform={platform}
                onConfirm={handleRegisterCompetitor}
                isCompetitor={true}
            />
        </>
    )
}
