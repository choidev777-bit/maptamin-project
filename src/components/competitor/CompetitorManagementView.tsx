'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CompetitorSlotCard } from './CompetitorSlotCard'
import { PlaceSelectionModal } from '@/components/dashboard/PlaceSelectionModal'
import { ManagedCompetitor, Place } from '@/lib/types'
import { Loader2 } from 'lucide-react'

interface Props {
    platform: 'naver' | 'google'
    competitors: ManagedCompetitor[]
    maxSlots: number
    userId: string
}

export function CompetitorManagementView({ platform, competitors, maxSlots, userId }: Props) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Fill slots with competitors and nulls for empty
    const slots = Array(maxSlots).fill(null).map((_, i) => competitors[i] || null)

    const handleAddCompetitor = async (place: Place) => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/competitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform,
                    placeId: place.placeId,
                    placeName: place.name,
                    placeAddress: place.address,
                    placeLat: place.lat,
                    placeLng: place.lng
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to add competitor')
            }

            router.refresh()
            setIsModalOpen(false)
        } catch (error) {
            console.error(error)
            alert('경쟁사 추가에 실패했습니다. (슬롯 제한을 확인해주세요)')
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return

        try {
            const response = await fetch(`/api/competitors?id=${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) throw new Error('Failed to delete')
            router.refresh()
        } catch (error) {
            alert('삭제에 실패했습니다.')
        }
    }

    const handleSearch = (id: string) => {
        // Navigate to search page with pre-filled competitor ID
        // Assuming /naver-search/new accepts ?competitorId=...
        const searchPath = platform === 'naver' ? '/naver-search/new' : '/search/new'
        router.push(`${searchPath}?competitorId=${id}&mode=competitor`)
    }

    const handleHistory = (placeId: string, competitorId: string) => {
        const historyPath = platform === 'naver' ? '/naver-search/history' : '/search/history'
        router.push(`${historyPath}?placeId=${placeId}&competitorId=${competitorId}`)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        {platform === 'naver' ? '네이버' : '구글'} 경쟁사 관리
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        최대 {maxSlots}개의 경쟁사를 등록하고 순위를 추적하세요.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {slots.map((competitor, index) => (
                    <CompetitorSlotCard
                        key={competitor ? competitor.id : `empty-${index}`}
                        competitor={competitor}
                        platform={platform}
                        onSelect={() => !competitor && setIsModalOpen(true)}
                        onDelete={handleDelete}
                        onSearch={handleSearch}
                        onHistory={handleHistory}
                    />
                ))}
            </div>

            <PlaceSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                platform={platform}
                onConfirm={handleAddCompetitor}
                isCompetitor={true}
            />
        </div>
    )
}
