'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface Props {
    selectedDays: number[]
    onChange: (days: number[]) => void
}

const DAYS = [
    { value: 0, label: '일' },
    { value: 1, label: '월' },
    { value: 2, label: '화' },
    { value: 3, label: '수' },
    { value: 4, label: '목' },
    { value: 5, label: '금' },
    { value: 6, label: '토' },
]

export function DaySelector({ selectedDays, onChange }: Props) {
    const toggleDay = (dayValue: number) => {
        if (selectedDays.includes(dayValue)) {
            // Remove
            onChange(selectedDays.filter(d => d !== dayValue).sort())
        } else {
            // Add
            onChange([...selectedDays, dayValue].sort())
        }
    }

    // Helper to select all or workdays
    const selectWorkdays = () => onChange([1, 2, 3, 4, 5])
    const selectEveryday = () => onChange([0, 1, 2, 3, 4, 5, 6])

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">요일 선택</label>
                <div className="flex gap-2 text-xs">
                    <button onClick={selectWorkdays} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">평일</button>
                    <button onClick={selectEveryday} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded">매일</button>
                </div>
            </div>

            <div className="flex gap-2">
                {DAYS.map((day) => {
                    const isSelected = selectedDays.includes(day.value)
                    const isWeekend = day.value === 0 || day.value === 6

                    return (
                        <button
                            key={day.value}
                            onClick={() => toggleDay(day.value)}
                            className={cn(
                                "flex-1 h-10 rounded-lg text-sm font-medium transition-all",
                                isSelected
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                                !isSelected && isWeekend && "text-red-500"
                            )}
                        >
                            {day.label}
                        </button>
                    )
                })}
            </div>
            {selectedDays.length === 0 && (
                <p className="text-xs text-red-500 mt-1">최소 하루 이상 선택해주세요.</p>
            )}
        </div>
    )
}
