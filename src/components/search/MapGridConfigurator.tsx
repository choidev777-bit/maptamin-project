'use client'

import { useMemo, useCallback } from 'react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { MapPin, Grid3X3 } from 'lucide-react'

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
    onReset?: () => void
}

const PRESETS = [
    { size: 3, label: '3×3', points: 9 },
    { size: 5, label: '5×5', points: 25 },
    { size: 7, label: '7×7', points: 49 },
]

// Calculate lat/lng for a grid point
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

// Grid marker component with custom styling
function GridMarker({
    isEnabled,
    isCenter,
    onClick,
}: {
    isEnabled: boolean
    isCenter: boolean
    onClick?: () => void
}) {
    if (isCenter) {
        return (
            <div
                className="w-8 h-8 rounded-full border-[3px] border-white flex items-center justify-center cursor-default bg-gradient-to-br from-green-500 to-green-600"
                style={{
                    boxShadow: '0 2px 10px rgba(34, 197, 94, 0.5)'
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3" fill="#22c55e"></circle>
                </svg>
            </div>
        )
    }

    return (
        <div
            onClick={onClick}
            className={`w-6 h-6 rounded-full border-2 border-white cursor-pointer transition-all duration-200 hover:scale-110 ${isEnabled
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : 'bg-gray-400 opacity-60 hover:opacity-100'
                }`}
            style={{
                boxShadow: isEnabled
                    ? '0 2px 8px rgba(59, 130, 246, 0.4)'
                    : '0 1px 4px rgba(0,0,0,0.2)',
            }}
        />
    )
}

// Map bounds controller
function MapBoundsController({
    points,
    centerLat,
    centerLng,
}: {
    points: Array<{ lat: number; lng: number }>
    centerLat: number
    centerLng: number
}) {
    const map = useMap()

    useMemo(() => {
        if (!map || points.length === 0) return

        const bounds = new google.maps.LatLngBounds()

        // Include all grid points
        points.forEach(point => {
            bounds.extend({ lat: point.lat, lng: point.lng })
        })

        // Include center
        bounds.extend({ lat: centerLat, lng: centerLng })

        // Add padding
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    }, [map, points, centerLat, centerLng])

    return null
}

export function MapGridConfigurator({
    centerLat,
    centerLng,
    selectedPoints,
    onPointsChange,
    gridDistance,
    maxPoints = 49,
    onReset,
}: Props) {
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

    const enabledCount = selectedPoints.filter(p => p.enabled).length

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Grid3X3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">좌표 위치 선택</h3>
                        <p className="text-sm text-gray-500">지도에서 순위를 분석할 좌표를 선택하세요</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold text-blue-500">{enabledCount}</span>
                    <span className="ml-1 text-sm font-medium text-gray-500">개 좌표 선택됨</span>
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
                            : 'border-gray-200 hover:border-blue-400/50 hover:bg-blue-50/50 text-gray-700'
                            }`}
                    >
                        <span className="text-lg">{preset.label}</span>
                        <span className="block text-xs text-gray-500 mt-0.5">{preset.points}개 좌표</span>
                    </button>
                ))}
                <button
                    onClick={onReset}
                    className="py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50/50 text-gray-700 transition-all cursor-pointer"
                >
                    <span className="text-sm">초기화</span>
                </button>
            </div>

            {/* Map */}
            <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg" style={{ height: '400px' }}>
                <Map
                    defaultCenter={{ lat: centerLat, lng: centerLng }}
                    defaultZoom={14}
                    mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID'}
                    gestureHandling="greedy"
                    disableDefaultUI={true}
                    style={{ width: '100%', height: '100%' }}
                >
                    {/* Auto-fit bounds */}
                    <MapBoundsController
                        points={pointsWithPosition}
                        centerLat={centerLat}
                        centerLng={centerLng}
                    />

                    {/* Grid point markers */}
                    {pointsWithPosition.map(point => {
                        const isCenter = point.row === 0 && point.col === 0
                        return (
                            <AdvancedMarker
                                key={`${point.row}-${point.col}`}
                                position={{ lat: point.lat, lng: point.lng }}
                                onClick={() => !isCenter && togglePoint(point.row, point.col)}
                            >
                                <GridMarker
                                    isEnabled={point.enabled}
                                    isCenter={isCenter}
                                />
                            </AdvancedMarker>
                        )
                    })}
                </Map>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <MapPin className="w-3 h-3 text-white" />
                    </div>
                    <span>매장 위치</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
                    <span>분석 위치</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white opacity-60" />
                    <span>비활성</span>
                </div>
            </div>

            {/* Hint */}
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-xs text-amber-700 leading-relaxed">
                    <span className="font-semibold">추천:</span> 산, 강, 바다 등 사람이 검색하지 않는 지역의 좌표는 클릭하여 비활성화하세요.
                </p>
            </div>
        </div>
    )
}
