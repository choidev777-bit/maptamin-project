'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Lock, Store, Search, Sparkles } from 'lucide-react'
import { PlaceSelectionModal } from '@/components/dashboard/PlaceSelectionModal'
import { ManagedPlace, Place } from '@/lib/types'
import { isPlaceLockExempt } from '@/lib/utils/subscription'

interface MyShopManagerProps {
    planId: string
}

export function MyShopManager({ planId }: MyShopManagerProps) {
    const lockExempt = isPlaceLockExempt(planId)
    const [myShops, setMyShops] = useState<ManagedPlace[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [selectedPlatform, setSelectedPlatform] = useState<'naver' | 'google'>('naver')
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const fetchMyShops = useCallback(async () => {
        setIsLoading(true) // Reset loading state on platform change
        try {
            const res = await fetch(`/api/settings/my-shop?platform=${selectedPlatform}`)
            const { data } = await res.json()
            setMyShops(data || [])
        } catch (error) {
            console.error('Failed to fetch my shops:', error)
        } finally {
            setIsLoading(false)
        }
    }, [selectedPlatform])

    useEffect(() => {
        fetchMyShops()
    }, [fetchMyShops])

    const handleRegisterMyShop = async (place: Place) => {
        // 기존 매장이 있고, 다른 매장으로 변경하는 경우 → 확인 모달
        if (currentShop && currentShop.place_id !== place.placeId) {
            const confirmed = confirm(
                '매장을 변경하면 기존 키워드와 경쟁사가 초기화됩니다.\n계속하시겠습니까?'
            )
            if (!confirmed) return
        }

        try {
            const res = await fetch('/api/settings/my-shop', {
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
                alert(error.error || '매장 등록 실패')
                return
            }

            setIsAddModalOpen(false)
            fetchMyShops()
        } catch (error) {
            console.error('Error adding shop:', error)
            alert('오류가 발생했습니다.')
        }
    }

    const handleDelete = async (id: string, lockedUntil: string | null | undefined) => {
        // 프리미엄 면제: 클라이언트 사이드 락 체크 건너뜀
        if (!lockExempt && lockedUntil && new Date(lockedUntil) > new Date()) {
            alert('30일 락 기간 중에는 삭제할 수 없습니다.')
            return
        }

        if (!confirm('정말 삭제하시겠습니까?')) return

        setIsDeleting(id)
        try {
            const res = await fetch(`/api/settings/my-shop?id=${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const error = await res.json()
                alert(error.error || '삭제 실패')
                return
            }

            fetchMyShops()
        } catch (error) {
            console.error('Error deleting:', error)
            alert('삭제 중 오류가 발생했습니다.')
        } finally {
            setIsDeleting(null)
        }
    }

    const currentShop = myShops.find(s => s.platform === selectedPlatform)

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">내 매장 관리</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {lockExempt
                            ? '순위를 추적할 사장님의 매장를 등록하세요. (프리미엄: 언제든 변경 가능)'
                            : '순위를 추적할 사장님의 매장를 등록하세요. (등록 후 30일간 변경 불가)'
                        }
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

            {/* Content */}
            <div className="space-y-4 mb-6">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-400">로딩 중...</div>
                ) : !currentShop ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm mb-4">등록된 매장가 없습니다.</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            매장 등록하기
                        </button>
                    </div>
                ) : (
                    (() => {
                        const isLocked = !lockExempt && currentShop.locked_until && new Date(currentShop.locked_until) > new Date()
                        return (
                            <div className="flex justify-between items-center p-4 border border-emerald-100 bg-emerald-50/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentShop.platform === 'naver' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        <Store className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{currentShop.place_name}</h3>
                                        {currentShop.address && <p className="text-xs text-gray-500">{currentShop.address}</p>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {isLocked && (
                                        <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                            <Lock className="w-3 h-3" />
                                            <span>
                                                {new Date(currentShop.locked_until!).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDelete(currentShop.id, currentShop.locked_until)}
                                        disabled={!!isLocked || isDeleting === currentShop.id}
                                        className={`p-2 rounded-lg transition-colors ${isLocked
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                            }`}
                                        title={isLocked ? "변경 제한 기간입니다" : "매장 삭제"}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })()
                )}
            </div>

            {/* Modal */}
            <PlaceSelectionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                platform={selectedPlatform}
                onConfirm={handleRegisterMyShop}
                isPlaceLockExempt={lockExempt}
            />
        </div>
    )
}
