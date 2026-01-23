'use client'

import { useMemo, useCallback } from 'react'
import { NavermapsProvider, Container as MapDiv, NaverMap, Marker, useNavermaps } from 'react-naver-maps'
import { MapPin, Grid3X3 } from 'lucide-react'

// ========================================
// Types
// ========================================
interface GridPoint {
    row: number
    col: number
    enabled: boolean
}

interface Props {
    centerLat: number
    centerLng: number
    selectedPoints: GridPoint[]
    onPointsChange: (points: GridPoint[]) => void
    gridDistance: number // in km
    maxPoints?: number
}

const PRESETS = [
    { size: 3, label: '3×3', points: 9 },
    { size: 5, label: '5×5', points: 25 },
    { size: 7, label: '7×7', points: 49 },
]

// ========================================
// Utility Functions
// ========================================
function calculatePointPosition(
    centerLat: number,
    centerLng: number,
    row: number,
    col: number,
    distanceKm: number
): { lat: number; lng: number } {
    const latDegreePerKm = 1 / 111.32
    const lngDegreePerKm = 1 / (111.32 * Math.cos(centerLat * Math.PI / 180))

    return {
        lat: centerLat + (row * distanceKm * latDegreePerKm),
        lng: centerLng + (col * distanceKm * lngDegreePerKm),
    }
}

// ========================================
// Inner Map Component (uses hooks)
// ========================================
interface MapContentProps {
    centerLat: number
    centerLng: number
    pointsWithPosition: Array<GridPoint & { lat: number; lng: number }>
    togglePoint: (row: number, col: number) => void
}

function MapContent({ centerLat, centerLng, pointsWithPosition, togglePoint }: MapContentProps) {
    const navermaps = useNavermaps()

    return (
        <NaverMap
            defaultCenter={new navermaps.LatLng(centerLat, centerLng)}
            defaultZoom={14}
            zoomControl={true}
            zoomControlOptions={{
                position: navermaps.Position.TOP_RIGHT
            }}
        >
            {pointsWithPosition.map((point) => {
                const isCenter = point.row === 0 && point.col === 0

                return (
                    <Marker
                        key={`${point.row}-${point.col}`}
                        position={new navermaps.LatLng(point.lat, point.lng)}
                        icon={{
                            content: isCenter
                                ? `<div style="
                                    width: 32px;
                                    height: 32px;
                                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                                    border: 3px solid white;
                                    border-radius: 50%;
                                    box-shadow: 0 2px 10px rgba(34, 197, 94, 0.5);
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3" fill="#22c55e"></circle>
                                    </svg>
                                </div>`
                                : `<div style="
                                    width: 24px;
                                    height: 24px;
                                    background: ${point.enabled
                                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                    : '#9ca3af'
                                };
                                    border: 2px solid white;
                                    border-radius: 50%;
                                    box-shadow: ${point.enabled
                                    ? '0 2px 8px rgba(59, 130, 246, 0.4)'
                                    : '0 1px 4px rgba(0,0,0,0.2)'
                                };
                                    opacity: ${point.enabled ? '1' : '0.6'};
                                    cursor: pointer;
                                "></div>`,
                            anchor: isCenter
                                ? new navermaps.Point(16, 16)
                                : new navermaps.Point(12, 12)
                        }}
                        onClick={isCenter ? undefined : () => togglePoint(point.row, point.col)}
                    />
                )
            })}
        </NaverMap>
    )
}

// ========================================
// Main Component
// ========================================
export function NaverMapGridConfigurator({
    centerLat,
    centerLng,
    selectedPoints,
    onPointsChange,
    gridDistance,
    maxPoints = 49,
}: Props) {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID

    // Calculate positions for all points
    const pointsWithPosition = useMemo(() => {
        return selectedPoints.map(point => ({
            ...point,
            ...calculatePointPosition(centerLat, centerLng, point.row, point.col, gridDistance),
        }))
    }, [selectedPoints, centerLat, centerLng, gridDistance])

    // Toggle a point
    const togglePoint = useCallback((row: number, col: number) => {
        const existingIndex = selectedPoints.findIndex(p => p.row === row && p.col === col)

        if (existingIndex >= 0) {
            const updated = [...selectedPoints]
            updated[existingIndex] = { ...updated[existingIndex], enabled: !updated[existingIndex].enabled }
            onPointsChange(updated)
        } else {
            const enabledCount = selectedPoints.filter(p => p.enabled).length
            if (enabledCount < maxPoints) {
                onPointsChange([...selectedPoints, { row, col, enabled: true }])
            }
        }
    }, [selectedPoints, onPointsChange, maxPoints])

    // Apply preset
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

    // Clear all (keep only center)
    const clearAll = useCallback(() => {
        onPointsChange([{ row: 0, col: 0, enabled: true }])
    }, [onPointsChange])

    const enabledCount = selectedPoints.filter(p => p.enabled).length

    if (!clientId) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">Naver Maps Client ID가 설정되지 않았습니다.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Grid3X3 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">그리드 포인트 선택</h3>
                        <p className="text-sm text-gray-500">지도에서 측정 지점을 선택하세요</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">{enabledCount}</p>
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
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-gray-700'
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

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg">
                <NavermapsProvider ncpKeyId={clientId}>
                    <MapDiv style={{ width: '100%', height: '400px' }}>
                        <MapContent
                            centerLat={centerLat}
                            centerLng={centerLng}
                            pointsWithPosition={pointsWithPosition}
                            togglePoint={togglePoint}
                        />
                    </MapDiv>
                </NavermapsProvider>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <MapPin className="w-3 h-3 text-white" />
                    </div>
                    <span>비즈니스 위치</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
                    <span>측정 지점</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white opacity-60" />
                    <span>비활성</span>
                </div>
            </div>
        </div>
    )
}
