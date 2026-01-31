'use client'

import React from 'react'
import { Wallet, Info } from 'lucide-react'

interface Props {
    costPerRun: number
    monthlyCost: number
}

export function CostPreviewCard({ costPerRun, monthlyCost }: Props) {
    return (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-2xl p-6">
            <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">예상 비용 안내</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                            <p className="text-sm text-gray-500 mb-1">1회 실행 시</p>
                            <p className="text-xl font-bold text-gray-900">
                                {costPerRun.toLocaleString()} <span className="text-sm font-normal text-gray-500">포인트</span>
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm ring-1 ring-blue-500/10">
                            <p className="text-sm text-gray-500 mb-1">월 예상 비용 (약 4주)</p>
                            <p className="text-xl font-bold text-blue-600">
                                {monthlyCost.toLocaleString()} <span className="text-sm font-normal text-gray-500">포인트</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
                        <Info className="w-4 h-4" />
                        <p>선택하신 요일과 횟수에 따라 실제 비용은 달라질 수 있습니다.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
