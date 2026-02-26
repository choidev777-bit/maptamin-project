'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import {
    STAGE_GRIDS,
    STAGE_META,
    getMarkerColor,
    getMarkerGlow,
    PLAYBACK_SEQUENCE,
    STAGE_DURATIONS,
} from './hero-animation-data'

/** 중심 좌표 (3,3)으로부터의 맨해튼 거리 → 스태거 딜레이 */
function staggerDelay(row: number, col: number): number {
    const dist = Math.abs(row - 3) + Math.abs(col - 3)
    return dist * 0.04
}

export default function HeroMapAnimation() {
    // 현재 재생 슬롯 인덱스 (PLAYBACK_SEQUENCE 내 위치)
    const [slotIndex, setSlotIndex] = useState(0)

    // 현재 스테이지 인덱스 (0=Stage1, 1=Stage2, 2=Stage3)
    const currentStageIndex = PLAYBACK_SEQUENCE[slotIndex]
    const currentGrid = STAGE_GRIDS[currentStageIndex]
    const currentMeta = STAGE_META[currentStageIndex]

    // 다음 슬롯으로 전환
    const advanceSlot = useCallback(() => {
        setSlotIndex((prev) => (prev + 1) % PLAYBACK_SEQUENCE.length)
    }, [])

    // 타이밍 기반 자동 전환
    useEffect(() => {
        const duration = STAGE_DURATIONS[slotIndex]
        const timer = setTimeout(advanceSlot, duration)
        return () => clearTimeout(timer)
    }, [slotIndex, advanceSlot])

    // 순위 텍스트 색상
    const rankColor = useMemo(() => {
        if (currentMeta.searchRank <= 5) return 'text-green-500'
        if (currentMeta.searchRank <= 10) return 'text-yellow-500'
        return 'text-red-500'
    }, [currentMeta.searchRank])

    return (
        <div className="w-full lg:w-1/2">
            <div className="relative mx-auto w-full max-w-lg">
                {/* 메인 카드 */}
                <div className="relative z-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_30px_60px_-12px_rgba(15,35,30,0.1)]">
                    {/* 상단 라벨 */}
                    <div className="flex flex-col gap-1 border-b border-gray-100 px-4 py-3">
                        {/* 내 매장 */}
                        <div className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 shrink-0 text-[#00C896]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="text-xs text-gray-400">내 매장:</span>
                            <span className="text-xs font-bold text-gray-900">맵타민네 카페</span>
                        </div>
                        {/* 분석 키워드 */}
                        <div className="flex items-center gap-1.5">
                            <svg className="h-3.5 w-3.5 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className="text-xs text-gray-400">분석 키워드:</span>
                            <span className="text-xs font-bold text-gray-900">근처 카페</span>
                        </div>
                    </div>

                    {/* 지도 영역 */}
                    <div className="relative aspect-square overflow-hidden">
                        {/* 지도 배경 이미지 */}
                        <Image
                            src="/images/hongdae-map.png"
                            alt="홍대 지역 지도"
                            fill
                            className="object-cover object-center"
                            priority
                            sizes="(max-width: 768px) 100vw, 512px"
                        />

                        {/* 오버레이 (지도 살짝 밝게) */}
                        <div className="absolute inset-0 bg-white/20" />

                        {/* 7×7 마커 그리드 */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`stage-${slotIndex}`}
                                    className="grid grid-cols-7 gap-2 p-4 sm:gap-3 sm:p-6"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {currentGrid.map((row, rowIdx) =>
                                        row.map((rank, colIdx) => {
                                            const isCenter = rowIdx === 3 && colIdx === 3
                                            return (
                                                <motion.div
                                                    key={`${rowIdx}-${colIdx}`}
                                                    data-testid={`marker-${rowIdx}-${colIdx}`}
                                                    className={`relative flex items-center justify-center rounded-full text-[10px] font-bold text-white sm:text-xs ${isCenter
                                                        ? 'h-7 w-7 overflow-visible ring-2 ring-blue-500 ring-offset-1 sm:h-9 sm:w-9'
                                                        : 'h-6 w-6 sm:h-8 sm:w-8'
                                                        }`}
                                                    style={{
                                                        backgroundColor: getMarkerColor(rank),
                                                        boxShadow: getMarkerGlow(rank),
                                                    }}
                                                    initial={{ scale: 0, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{
                                                        delay: staggerDelay(rowIdx, colIdx),
                                                        duration: 0.3,
                                                        ease: 'easeOut',
                                                    }}
                                                >
                                                    {rank}
                                                    {/* 중앙 마커에만 "내 매장" 말풍선 라벨 */}
                                                    {isCenter && (
                                                        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2">
                                                            <div className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-white px-2 py-1 text-[9px] font-bold text-gray-800 shadow-lg sm:px-2.5 sm:py-1 sm:text-[10px]">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                                내 매장
                                                            </div>
                                                            <div className="mx-auto h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-white drop-shadow-sm" />
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )
                                        })
                                    )}
                                </motion.div>
                            </AnimatePresence>

                        </div>
                    </div>

                    {/* 하단 검색 순위 표시 */}
                    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                        <div>
                            <div className="text-xs text-gray-400">
                                &ldquo;홍대 카페&rdquo; 검색 시 플레이스 순위
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-sm font-semibold text-gray-700">
                                    맵타민네 카페:
                                </span>
                                <span className={`text-lg font-extrabold ${rankColor}`}>
                                    {currentMeta.label}
                                </span>
                            </div>
                        </div>

                        {/* 스테이지 인디케이터 */}
                        <div className="flex gap-1.5">
                            {[0, 1, 2].map((stageIdx) => (
                                <div
                                    key={stageIdx}
                                    className={`h-2 w-2 rounded-full transition-colors duration-300 ${currentStageIndex === stageIdx
                                        ? 'bg-[#00C896]'
                                        : 'bg-gray-200'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
