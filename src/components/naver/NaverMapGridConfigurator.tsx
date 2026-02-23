'use client'

import { useMemo, useCallback, useEffect, useRef } from 'react'
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
    onReset?: () => void
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
    const mapRef = useRef<any>(null)

    // Auto-fit bounds when points change
    useEffect(() => {
        if (!mapRef.current || pointsWithPosition.length === 0) return

        const map = mapRef.current

        let minLat = centerLat
        let maxLat = centerLat
        let minLng = centerLng
        let maxLng = centerLng

        pointsWithPosition.forEach(p => {
            if (p.lat < minLat) minLat = p.lat
            if (p.lat > maxLat) maxLat = p.lat
            if (p.lng < minLng) minLng = p.lng
            if (p.lng > maxLng) maxLng = p.lng
        })

        const bounds = new navermaps.LatLngBounds(
            new navermaps.LatLng(minLat, minLng),
            new navermaps.LatLng(maxLat, maxLng)
        )

        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    }, [navermaps, centerLat, centerLng, pointsWithPosition])

    return (
        <NaverMap
            ref={mapRef}
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
    onReset,
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

    const enabledCount = selectedPoints.filter(p => p.enabled).length

    if (!clientId) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">Naver Maps Client ID가 설정되지 않았습니다.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E5F9F4] rounded-lg flex items-center justify-center">
                        <Grid3X3 className="w-5 h-5 text-[#00C896]" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">좌표 위치 선택</h3>
                        <p className="text-sm text-gray-500">지도에서 순위를 분석할 좌표를 선택하세요</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-bold text-[#00C896]">{enabledCount}</span>
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
                            ? 'border-[#00C896] bg-[#E5F9F4] text-[#00A87D]'
                            : 'border-gray-200 hover:border-[#00C896]/50 hover:bg-[#E5F9F4]/50 text-gray-700'
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
            <div className="mt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-gray-600 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#00C896] flex items-center justify-center">
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
