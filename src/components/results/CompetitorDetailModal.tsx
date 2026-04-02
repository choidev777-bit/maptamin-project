'use client'

import { useCallback } from 'react'
import { X, MapPin } from 'lucide-react'
import { useReverseGeocode } from '@/hooks/useReverseGeocode'

type Verdict = 'WIN' | 'LOSE' | 'DRAW'

interface Props {
    isOpen: boolean
    onClose: () => void
    keyword: string
    gridLat: number
    gridLng: number
    myRank: number | null
    competitorRank: number | null
    competitorName: string
    verdict: Verdict
}

const VERDICT_CONFIG: Record<Verdict, { label: string; color: string; bg: string; text: string }> = {
    WIN: { label: '승리', color: '#22c55e', bg: 'bg-green-50', text: 'text-green-700' },
    LOSE: { label: '패배', color: '#ef4444', bg: 'bg-red-50', text: 'text-red-700' },
    DRAW: { label: '무승부', color: '#9ca3af', bg: 'bg-gray-50', text: 'text-gray-700' },
}

export function CompetitorDetailModal({
    isOpen,
    onClose,
    keyword,
    gridLat,
    gridLng,
    myRank,
    competitorRank,
    competitorName,
    verdict,
}: Props) {
    const handleBackdropClick = useCallback(() => onClose(), [onClose])

    // 훅은 항상 early return 전에 호출 (Rules of Hooks)
    const { district, isLoading: isLoadingDistrict } = useReverseGeocode(
        isOpen ? gridLat : null,
        isOpen ? gridLng : null
    )

    if (!isOpen) return null

    const config = VERDICT_CONFIG[verdict]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleBackdropClick}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div
                    className="px-6 py-4 text-white"
                    style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)` }}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg">{keyword}</h3>
                            <p className="text-white/70 text-sm flex items-center gap-1 mt-1">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                {isLoadingDistrict ? (
                                    <span className="animate-pulse">위치 확인 중...</span>
                                ) : district ? (
                                    <span>{district}</span>
                                ) : null}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body: Rank Comparison */}
                <div className="px-6 py-5 space-y-4">
                    {/* Verdict Badge */}
                    <div className="flex justify-center">
                        <span className={`px-4 py-1.5 rounded-full font-bold text-sm ${config.bg} ${config.text}`}>
                            {config.label}
                        </span>
                    </div>

                    {/* Rank Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* My Rank */}
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-blue-600 font-medium mb-1">내 매장</p>
                            <p className="text-3xl font-bold text-blue-900">
                                {myRank !== null ? `${myRank}위` : '-'}
                            </p>
                            {myRank === null && (
                                <p className="text-xs text-blue-400 mt-1">미노출</p>
                            )}
                        </div>

                        {/* Competitor Rank */}
                        <div className="bg-orange-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-orange-600 font-medium mb-1 truncate">{competitorName}</p>
                            <p className="text-3xl font-bold text-orange-900">
                                {competitorRank !== null ? `${competitorRank}위` : '-'}
                            </p>
                            {competitorRank === null && (
                                <p className="text-xs text-orange-400 mt-1">미노출</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    )
}
