'use client'

import { ManagedCompetitor } from '@/lib/types'
import { ChevronDown, Users, Shield } from 'lucide-react'

interface Props {
    competitors: ManagedCompetitor[]
    selectedId: string | null
    onSelect: (placeId: string) => void
    maxCompetitors: number
}

export function CompetitorSelector({ competitors, selectedId, onSelect, maxCompetitors }: Props) {
    // No competitors registered
    if (competitors.length === 0) {
        return (
            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="p-2 bg-gray-100 rounded-lg">
                    <Users className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-700">경쟁사 비교 분석</p>
                    <p className="text-xs text-gray-500">
                        설정에서 경쟁사를 등록하면 비교 분석을 볼 수 있습니다.
                    </p>
                </div>
            </div>
        )
    }

    const selectedCompetitor = competitors.find(c => c.place_id === selectedId)

    // Pro plan (1 competitor): No dropdown, just display name
    if (maxCompetitors <= 1) {
        return (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
                <div className="p-2 bg-emerald-100 rounded-lg">
                    <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <p className="text-xs text-emerald-600 font-medium">경쟁사 비교</p>
                    <p className="text-sm font-bold text-emerald-900">
                        vs {selectedCompetitor?.place_name || competitors[0]?.place_name}
                    </p>
                </div>
            </div>
        )
    }

    // Premium plan (≤10 competitors): Dropdown selector
    return (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
            <div className="p-2 bg-emerald-100 rounded-lg">
                <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
                <p className="text-xs text-emerald-600 font-medium mb-1">경쟁사 비교</p>
                <div className="relative">
                    <select
                        value={selectedId || ''}
                        onChange={(e) => onSelect(e.target.value)}
                        className="w-full appearance-none bg-white border border-emerald-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        {competitors.map((c) => (
                            <option key={c.place_id} value={c.place_id}>
                                {c.place_name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                </div>
            </div>
        </div>
    )
}
