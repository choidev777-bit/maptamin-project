'use client'

import { useState, useCallback } from 'react'
import { Grid3X3 } from 'lucide-react'

interface GridPoint {
    row: number
    col: number
    enabled: boolean
}

interface Props {
    selectedPoints: GridPoint[]
    onPointsChange: (points: GridPoint[]) => void
    maxPoints?: number
}

const PRESETS = [
    { size: 3, label: '3×3', points: 9 },
    { size: 5, label: '5×5', points: 25 },
    { size: 7, label: '7×7', points: 49 },
]

export function GridConfigurator({ selectedPoints, onPointsChange, maxPoints = 49 }: Props) {
    const gridSize = 15
    const halfGrid = Math.floor(gridSize / 2)
    const [isDragging, setIsDragging] = useState(false)
    const [dragMode, setDragMode] = useState<'enable' | 'disable'>('enable')

    const isPointEnabled = useCallback((row: number, col: number) => {
        return selectedPoints.some(p => p.row === row && p.col === col && p.enabled)
    }, [selectedPoints])

    const togglePoint = useCallback((row: number, col: number, forceState?: boolean) => {
        const isCenter = row === 0 && col === 0
        if (isCenter) return // Center is always the business location

        const existingIndex = selectedPoints.findIndex(p => p.row === row && p.col === col)
        const currentlyEnabled = existingIndex >= 0 && selectedPoints[existingIndex].enabled
        const newState = forceState !== undefined ? forceState : !currentlyEnabled

        if (existingIndex >= 0) {
            const updated = [...selectedPoints]
            updated[existingIndex] = { ...updated[existingIndex], enabled: newState }
            onPointsChange(updated)
        } else if (newState) {
            const enabledCount = selectedPoints.filter(p => p.enabled).length
            if (enabledCount < maxPoints) {
                onPointsChange([...selectedPoints, { row, col, enabled: true }])
            }
        }
    }, [selectedPoints, onPointsChange, maxPoints])

    const applyPreset = useCallback((size: number) => {
        const newPoints: GridPoint[] = []
        const presetHalf = Math.floor(size / 2)

        for (let row = -presetHalf; row <= presetHalf; row++) {
            for (let col = -presetHalf; col <= presetHalf; col++) {
                newPoints.push({ row, col, enabled: true })
            }
        }
        onPointsChange(newPoints)
    }, [onPointsChange])

    const clearAll = useCallback(() => {
        // Keep only center point
        onPointsChange([{ row: 0, col: 0, enabled: true }])
    }, [onPointsChange])

    const handleMouseDown = (row: number, col: number) => {
        const isCenter = row === 0 && col === 0
        if (isCenter) return

        const currentlyEnabled = isPointEnabled(row, col)
        setDragMode(currentlyEnabled ? 'disable' : 'enable')
        setIsDragging(true)
        togglePoint(row, col)
    }

    const handleMouseEnter = (row: number, col: number) => {
        if (!isDragging) return
        togglePoint(row, col, dragMode === 'enable')
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const enabledCount = selectedPoints.filter(p => p.enabled).length

    return (
        <div className="space-y-6" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Grid3X3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">그리드 포인트 선택</h3>
                        <p className="text-sm text-gray-500">클릭하거나 드래그하여 측정 지점을 선택하세요</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{enabledCount}</p>
                    <p className="text-sm text-gray-500">/ {maxPoints} 지점</p>
                </div>
            </div>

            {/* Preset Buttons */}
            <div className="flex gap-3">
                {PRESETS.map(preset => (
                    <button
                        key={preset.size}
                        onClick={() => applyPreset(preset.size)}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium ${enabledCount === preset.points
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                            }`}
                    >
                        <span className="text-lg">{preset.label}</span>
                        <span className="block text-xs text-gray-500 mt-0.5">{preset.points}개 지점</span>
                    </button>
                ))}
                <button
                    onClick={clearAll}
                    className="py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50/50 text-gray-700 transition-all"
                >
                    <span className="text-sm">초기화</span>
                </button>
            </div>

            {/* Grid Canvas */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 overflow-x-auto">
                <div
                    className="inline-grid gap-1 select-none"
                    style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
                >
                    {Array.from({ length: gridSize }).map((_, rowIndex) =>
                        Array.from({ length: gridSize }).map((_, colIndex) => {
                            const row = rowIndex - halfGrid
                            const col = colIndex - halfGrid
                            const isCenter = row === 0 && col === 0
                            const isEnabled = isPointEnabled(row, col) || isCenter

                            return (
                                <button
                                    key={`${row}-${col}`}
                                    onMouseDown={() => handleMouseDown(row, col)}
                                    onMouseEnter={() => handleMouseEnter(row, col)}
                                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all duration-150 ${isCenter
                                            ? 'bg-blue-600 border-blue-600 cursor-default shadow-lg shadow-blue-600/30'
                                            : isEnabled
                                                ? 'bg-orange-500 border-orange-500 hover:bg-orange-400 cursor-pointer shadow-md shadow-orange-500/20'
                                                : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
                                        }`}
                                    title={isCenter ? '비즈니스 위치 (중심)' : `(${row}, ${col})`}
                                />
                            )
                        })
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-600" />
                    <span>비즈니스 위치</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500" />
                    <span>측정 지점</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300" />
                    <span>비활성</span>
                </div>
            </div>
        </div>
    )
}
