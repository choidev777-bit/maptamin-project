'use client'

import { SearchResult, Competitor } from '@/lib/types'
import { getRankColor, getRankBgClass } from '@/lib/utils/rank-colors'
import { X, MapPin, Trophy, Medal, Award } from 'lucide-react'
import { useReverseGeocode } from '@/hooks/useReverseGeocode'

interface Props {
    isOpen: boolean
    onClose: () => void
    result: SearchResult
}

export function RankDetailModal({ isOpen, onClose, result }: Props) {
    // 훅은 항상 early return 전에 호출 (Rules of Hooks)
    const { district, isLoading: isLoadingDistrict } = useReverseGeocode(
        isOpen ? result.grid_lat : null,
        isOpen ? result.grid_lng : null
    )

    if (!isOpen) return null

    const competitors = (result.competitors || []) as Competitor[]
    const top10 = competitors.slice(0, 10)

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
        if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
        if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
        return null
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gray-900 px-6 py-4 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg">{result.keyword}</h3>
                            <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
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

                {/* Your Rank */}
                <div className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-600">내 순위</span>
                        <div className="flex items-center gap-2">
                            {result.rank !== null ? (
                                <>
                                    <span
                                        className="px-3 py-1 rounded-full text-white font-bold"
                                        style={{ backgroundColor: getRankColor(result.rank) }}
                                    >
                                        {result.rank}위
                                    </span>
                                </>
                            ) : (
                                <span className="px-3 py-1 rounded-full bg-gray-400 text-white">
                                    순위권 외
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Competitor List */}
                <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: '400px' }}>
                    <h4 className="text-sm font-semibold text-gray-500 mb-3">상위 10개 결과</h4>

                    {top10.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">결과 없음</p>
                    ) : (
                        <ul className="space-y-2">
                            {top10.map((competitor, index) => (
                                <li
                                    key={competitor.place_id || index}
                                    className={`flex items-center gap-3 p-3 rounded-xl ${competitor.place_id === result.search_id ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                                        }`}
                                >
                                    {/* Rank */}
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                                        style={{ backgroundColor: getRankColor(competitor.rank) }}
                                    >
                                        {competitor.rank}
                                    </div>

                                    {/* Icon */}
                                    <div className="flex-shrink-0">
                                        {getRankIcon(competitor.rank)}
                                    </div>

                                    {/* Name */}
                                    <span className="flex-1 font-medium text-gray-800 truncate">
                                        {competitor.name || '(이름 없음)'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
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
