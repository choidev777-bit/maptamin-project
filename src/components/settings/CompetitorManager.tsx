'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Lock, MapPin, Search } from 'lucide-react'
import { PlaceSelectionModal } from '@/components/dashboard/PlaceSelectionModal'
import { ManagedCompetitor, Place } from '@/lib/types'

export function CompetitorManager() {
    const [competitors, setCompetitors] = useState<ManagedCompetitor[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [selectedPlatform, setSelectedPlatform] = useState<'naver' | 'google'>('naver')
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const fetchCompetitors = useCallback(async () => {
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

    const handleAddCompetitor = async (place: Place) => {
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
                    lng: place.lng
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                alert(error.error || '경쟁사 등록 실패')
                return
            }

            setIsAddModalOpen(false)
            fetchCompetitors()
        } catch (error) {
            console.error('Error adding competitor:', error)
            alert('오류가 발생했습니다.')
        }
    }

    const handleDelete = async (id: string, lockedUntil: string | null | undefined) => {
        if (lockedUntil && new Date(lockedUntil) > new Date()) {
            alert('30일 락 기간 중에는 삭제할 수 없습니다.')
            return
        }

        if (!confirm('정말 삭제하시겠습니까?')) return

        setIsDeleting(id)
        try {
            const res = await fetch(`/api/settings/competitors?id=${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const error = await res.json()
                alert(error.error || '삭제 실패')
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

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">경쟁사 관리</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        경쟁 업체의 순위를 추적하세요. (등록 후 30일간 변경 불가)
                    </p>
                </div>
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
            </div>

            {/* List */}
            <div className="space-y-4 mb-6">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-400">로딩 중...</div>
                ) : competitors.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">등록된 경쟁사가 없습니다.</p>
                    </div>
                ) : (
                    competitors.map((comp) => {
                        const isLocked = comp.locked_until && new Date(comp.locked_until) > new Date()
                        return (
                            <div key={comp.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${comp.platform === 'naver' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{comp.place_name}</h3>
                                        {comp.address && <p className="text-xs text-gray-500">{comp.address}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {isLocked && (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                            <Lock className="w-3 h-3" />
                                            <span>
                                                {new Date(comp.locked_until!).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDelete(comp.id, comp.locked_until)}
                                        disabled={!!isLocked || isDeleting === comp.id}
                                        className={`p-2 rounded-lg transition-colors ${isLocked
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                            }`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Add Button */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-gray-900 hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
                <Plus className="w-4 h-4" />
                경쟁사 추가하기
            </button>

            {/* Modal */}
            <PlaceSelectionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                platform={selectedPlatform}
                onConfirm={handleAddCompetitor}
                isCompetitor={true}
            />
        </div>
    )
}
