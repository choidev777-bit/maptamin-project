'use client'

import { Card } from '@/components/ui/card'
import { Plus, Search, Map, Trash2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ManagedCompetitor } from '@/lib/types'

interface Props {
    competitor: ManagedCompetitor | null
    platform: 'naver' | 'google'
    onSelect: () => void
    onDelete: (id: string) => void
    onSearch: (id: string) => void
    onHistory: (placeId: string, competitorId: string) => void
}

export function CompetitorSlotCard({ competitor, platform, onSelect, onDelete, onSearch, onHistory }: Props) {
    const isNaver = platform === 'naver'
    const accentColor = isNaver ? 'text-emerald-600' : 'text-blue-600'
    const hoverBorder = isNaver ? 'hover:border-emerald-300' : 'hover:border-blue-300'

    if (!competitor) {
        return (
            <Card
                className={`h-48 flex flex-col items-center justify-center border-dashed border-2 cursor-pointer transition-all hover:bg-gray-50 ${hoverBorder}`}
                onClick={onSelect}
            >
                <div className={`p-3 rounded-full bg-gray-100 mb-3 ${isNaver ? 'group-hover:bg-emerald-50' : 'group-hover:bg-blue-50'}`}>
                    <Plus className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                </div>
                <p className="font-medium text-gray-500">경쟁사 추가</p>
            </Card>
        )
    }

    return (
        <Card className="h-48 p-4 flex flex-col justify-between group relative overflow-hidden transition-all hover:shadow-md">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h4 className="font-bold text-gray-900 line-clamp-1">{competitor.place_name}</h4>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-1">{competitor.address || '주소 정보 없음'}</p>
                    </div>

                </div>
            </div>

            <div className="flex gap-2 mt-auto">
                <Button
                    className={`flex-1 ${isNaver ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    onClick={() => onSearch(competitor.id)}
                    size="sm"
                >
                    <Search className="w-4 h-4 mr-1" />
                    순위 분석
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onHistory(competitor.place_id, competitor.id)}
                    title="검색 기록"
                >
                    <History className="w-4 h-4" />
                </Button>
                {/* Delete */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => onDelete(competitor.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </Card>
    )
}
