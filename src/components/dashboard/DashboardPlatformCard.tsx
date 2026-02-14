'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Search, Lock, Swords } from 'lucide-react'
import { PlaceSelectionModal } from './PlaceSelectionModal'

import { useState } from 'react'
import { Place } from '@/lib/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ManagedPlaceData {
    id: string
    place_id: string
    place_name: string
    locked_until: string | null
    keywords?: string[]
    address?: string
    lat?: number
    lng?: number
}



interface Props {
    platform: 'naver' | 'google'
    data: ManagedPlaceData | null
    competitorCount?: number
    firstCompetitorName?: string
}

export function DashboardPlatformCard({ platform, data, competitorCount = 0, firstCompetitorName }: Props) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleRegister = async (place: Place) => {
        // API Call
        const response = await fetch('/api/settings/my-shop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                platform,
                placeId: place.placeId,
                placeName: place.name,
                address: place.address,
                lat: place.lat,
                lng: place.lng
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to save settings')
        }

        // Refresh page to show updated state
        router.refresh()
    }

    const platformColor = platform === 'naver' ? 'text-emerald-600' : 'text-blue-600'
    const platformBg = platform === 'naver' ? 'bg-emerald-50' : 'bg-blue-50'
    const platformBorder = platform === 'naver' ? 'border-emerald-100' : 'border-blue-100'

    return (
        <>
            <Card className={`p-6 border overflow-hidden transition-all hover:shadow-md ${data ? 'bg-white border-gray-200' : `${platformBg} ${platformBorder}`}`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <MapPin className={`w-5 h-5 ${platformColor}`} />
                        <h3 className={`font-bold text-lg ${platform === 'naver' ? 'text-green-900' : 'text-blue-900'}`}>
                            {platform === 'naver' ? '네이버 플레이스' : '구글 비즈니스'}
                        </h3>
                    </div>
                    {data && (
                        <Badge variant="outline" className="flex items-center gap-1 text-gray-500">
                            {data.locked_until && (
                                <>
                                    <Lock className="w-3 h-3" />
                                    <span>설정됨</span>
                                </>
                            )}
                        </Badge>
                    )}
                </div>

                {!data ? (
                    // Empty State
                    <div className="text-center py-6">
                        <p className="text-gray-600 mb-4 text-sm">
                            {platform === 'naver' ? '네이버 지도' : '구글 지도'}에 등록된<br />사장님의 매장을 연결해주세요.
                        </p>
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className={platform === 'naver' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}
                        >
                            사장님의 매장을 선택해주세요
                        </Button>
                    </div>
                ) : (
                    // Selected State
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-xl font-bold text-gray-900 mb-1">{data.place_name}</h4>
                                <p className="text-sm text-gray-500 line-clamp-1">{data.address || '주소 정보 없음'}</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-xs text-gray-500 hover:text-gray-700 underline px-2 py-1"
                            >
                                변경
                            </button>
                        </div>

                        {data.locked_until ? (
                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">
                                <Lock className="w-3 h-3" />
                                <span>
                                    {new Date(data.locked_until).toLocaleDateString()}까지 변경 제한
                                    {/* (Allow update if data is incomplete) */}
                                    {(!data.lat || !data.lng) && <span className="font-bold ml-1">(주소 업데이트 필요)</span>}
                                </span>
                            </div>
                        ) : null}

                        {/* Competitor Info */}
                        <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-lg">
                            <Swords className="w-4 h-4 text-gray-400 shrink-0" />
                            {competitorCount === 0 ? (
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-sm text-gray-500">경쟁사 미등록</span>
                                    <Link href="/settings" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                                        등록하기 →
                                    </Link>
                                </div>
                            ) : competitorCount === 1 ? (
                                <span className="text-sm font-medium text-gray-700">vs {firstCompetitorName}</span>
                            ) : (
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-sm font-medium text-gray-700">경쟁사 {competitorCount}곳 등록됨</span>
                                    <Link href="/settings" className="text-xs text-gray-500 hover:text-gray-700">
                                        관리 →
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <Button
                                className={`w-full flex items-center justify-center gap-2 ${platform === 'naver' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                onClick={() => router.push(platform === 'naver' ? '/naver-search/new?mode=my-shop' : '/search/new?mode=my-shop')}
                            >
                                <Search className="w-4 h-4" />
                                순위 검색
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <PlaceSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                platform={platform}
                onConfirm={handleRegister}
            />
        </>
    )
}
