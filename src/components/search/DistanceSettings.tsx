'use client'

import { Ruler, MapPin } from 'lucide-react'

interface Props {
    distance: number
    unit: 'km' | 'mile'
    onDistanceChange: (distance: number) => void
    onUnitChange: (unit: 'km' | 'mile') => void
}

const DISTANCE_PRESETS = [
    { value: 0.1, label: '100m' },
    { value: 0.2, label: '200m' },
    { value: 0.3, label: '300m' },
    { value: 0.4, label: '400m' },
    { value: 0.5, label: '500m' },
    { value: 1, label: '1km' },
    { value: 2, label: '2km' },
    { value: 3, label: '3km' },
    { value: 5, label: '5km' },
]

export function DistanceSettings({ distance, unit, onDistanceChange, onUnitChange }: Props) {
    // Calculate total coverage (approximate radius)
    const coverageRadius = distance * 7 // For a 7x7 grid, farthest point is 3.5 * distance from center

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Ruler className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">그리드 포인트 간격</h3>
                    <p className="text-sm text-gray-500">측정 지점 사이의 거리를 설정하세요</p>
                </div>
            </div>

            {/* Distance Slider */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={distance}
                        onChange={(e) => onDistanceChange(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="w-24 text-right">
                        <span className="text-2xl font-bold text-blue-600">{distance}</span>
                        <span className="text-lg text-gray-500 ml-1">{unit}</span>
                    </div>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2">
                    {DISTANCE_PRESETS.map(preset => (
                        <button
                            key={preset.value}
                            onClick={() => onDistanceChange(preset.value)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${distance === preset.value
                                ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                                : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100'
                                }`}
                        >
                            {unit === 'mile'
                                ? `${(preset.value * 0.621371).toFixed(1)}mi`
                                : preset.label
                            }
                        </button>
                    ))}
                </div>
            </div>

            {/* Unit Toggle
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">단위:</span>
                <div className="flex rounded-xl overflow-hidden border-2 border-gray-200">
                    <button
                        onClick={() => onUnitChange('km')}
                        className={`px-6 py-2.5 text-sm font-medium transition-all ${unit === 'km'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        킬로미터 (km)
                    </button>
                    <button
                        onClick={() => onUnitChange('mile')}
                        className={`px-6 py-2.5 text-sm font-medium transition-all ${unit === 'mile'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                    >
                        마일 (mile)
                    </button>
                </div>
            </div>
            */}

            {/* Coverage Info */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-gray-900">
                            예상 측정 범위
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            비즈니스 위치에서 반경 약 <span className="font-semibold text-blue-600">
                                {coverageRadius.toFixed(1)} {unit}
                            </span>까지 측정됩니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
