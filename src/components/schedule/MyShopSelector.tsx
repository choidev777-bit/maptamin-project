'use client'

import { useEffect, useState } from 'react'
import { ManagedPlace } from '@/lib/types'
import { MapPin, Loader2, Store } from 'lucide-react'

interface Props {
    platform: 'naver' | 'google'
    onSelect: (place: ManagedPlace) => void
    selectedPlace?: ManagedPlace | null
}

export function MyShopSelector({ platform, onSelect, selectedPlace }: Props) {
    const [shops, setShops] = useState<ManagedPlace[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch my shops on mount
    useEffect(() => {
        async function fetchShops() {
            try {
                const res = await fetch('/api/settings/my-shop')
                if (!res.ok) throw new Error('Failed to fetch shops')

                const data = await res.json()
                // Filter by platform
                const filtered = (data.data || []).filter(
                    (p: ManagedPlace) => p.platform === platform
                )
                setShops(filtered)
            } catch (err: any) {
                console.error(err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchShops()
    }, [platform])

    if (loading) {
        return (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="text-gray-600">내 매장 불러오는 중...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600">오류: {error}</p>
            </div>
        )
    }

    if (shops.length === 0) {
        return (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <Store className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="font-medium text-amber-800">
                    등록된 {platform === 'naver' ? '네이버' : '구글'} 매장가 없습니다
                </p>
                <p className="text-sm text-amber-600 mt-1">
                    설정 &gt; 내 매장 관리에서 먼저 매장를 등록해주세요.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {shops.map(shop => {
                const isSelected = selectedPlace?.id === shop.id
                return (
                    <button
                        key={shop.id}
                        onClick={() => onSelect(shop)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                    >
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-500' : 'bg-gray-100'}`}>
                            <MapPin className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                {shop.place_name || '이름 없음'}
                            </p>
                            <p className="text-sm text-gray-500 truncate mt-0.5">
                                {shop.address || '주소 정보 없음'}
                            </p>
                        </div>
                        {isSelected && (
                            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                                선택됨
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
