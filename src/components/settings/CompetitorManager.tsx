'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { PlaceSelectionModal } from '@/components/dashboard/PlaceSelectionModal'
import { ManagedCompetitor, Place } from '@/lib/types'

interface Props {
    planId: 'free' | 'starter' | 'pro' | 'premium'
    maxNaverCompetitors: number
    maxGoogleCompetitors: number
}

export function CompetitorManager({ planId, maxNaverCompetitors, maxGoogleCompetitors }: Props) {
    const [competitors, setCompetitors] = useState<ManagedCompetitor[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [selectedPlatform, setSelectedPlatform] = useState<'naver' | 'google'>('naver')
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const isPremium = planId === 'premium'
    const maxForPlatform = selectedPlatform === 'naver' ? maxNaverCompetitors : maxGoogleCompetitors

    const fetchCompetitors = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/settings/competitors?platform=${selectedPlatform}`)
            const { data } = await res.json()
            setCompetitors(data || [])
        } catch (error) {
            console.error('Failed to fetch competitors:', error)
        } finally {
            setIsLoading(false)
        }
    }, [selectedPlatform])

    useEffect(() => {
        fetchCompetitors()
    }, [fetchCompetitors])

    const handleRegisterCompetitor = async (place: Place) => {
        try {
            const res = await fetch('/api/settings/competitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: selectedPlatform,
                    placeId: place.placeId,
                    placeName: place.name,
                    address: place.address,
                    lat: place.lat,
                    lng: place.lng,
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                alert('경쟁사를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.')
                return
            }

            setIsAddModalOpen(false)
            fetchCompetitors()
        } catch (error) {
            console.error('Error adding competitor:', error)
            alert('오류가 발생했습니다.')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        setIsDeleting(id)
        try {
            const res = await fetch(`/api/settings/competitors?id=${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const error = await res.json()
                alert('경쟁사 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
                return
            }

            fetchCompetitors()
        } catch (error) {
            console.error('Error deleting:', error)
            alert('삭제 중 오류가 발생했습니다.')
        } finally {
            setIsDeleting(null)
        }
    }

    // Starter 플랜은 렌더링 안 함
    if (planId === 'starter') return null

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">경쟁사 관리</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        비교 분석할 경쟁 매장를 등록하세요.
                    </p>
                </div>

                {/* 플랫폼 탭 (Premium만 구글 탭 표시) */}
                {isPremium ? (
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setSelectedPlatform('naver')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${selectedPlatform === 'naver'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            네이버
                        </button>
                        <button
                            onClick={() => setSelectedPlatform('google')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${selectedPlatform === 'google'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            구글
                        </button>
                    </div>
                ) : (
                    <span className="text-sm text-gray-400 font-medium">
                        {competitors.length}/{maxForPlatform === -1 ? '∞' : maxForPlatform}
                    </span>
                )}
            </div>

            {/* 슬롯 카운터 (Premium에서 탭 아래) */}
            {isPremium && (
                <p className="text-sm text-gray-400 font-medium mb-4">
                    등록 {competitors.length}/{maxForPlatform === -1 ? '∞' : maxForPlatform}
                </p>
            )}

            {/* Content */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-400">로딩 중...</div>
                ) : competitors.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm mb-4">등록된 경쟁사가 없습니다.</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            경쟁사 등록하기
                        </button>
                    </div>
                ) : (
                    <>
                        {competitors.map((comp, index) => (
                            <div
                                key={comp.id}
                                className="flex justify-between items-center p-4 border border-gray-100 bg-gray-50/50 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{comp.place_name}</h3>
                                        {comp.address && <p className="text-xs text-gray-500">{comp.address}</p>}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(comp.id)}
                                    disabled={isDeleting === comp.id}
                                    className="p-2 rounded-lg transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    title="경쟁사 삭제"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {/* 추가 버튼 (슬롯 남아있을 때만) */}
                        {(maxForPlatform === -1 || competitors.length < maxForPlatform) && (
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                경쟁사 추가 ({competitors.length}/{maxForPlatform === -1 ? '∞' : maxForPlatform})
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Modal */}
            <PlaceSelectionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                platform={selectedPlatform}
                onConfirm={handleRegisterCompetitor}
                isCompetitor={true}
            />
        </div>
    )
}
