'use client'

/**
 * 결제 수단 선택 컴포넌트 (카드 / 카카오페이)
 *
 * CheckoutContent(구독)와 TicketShopContent(티켓)에서 공통으로 사용합니다.
 */

import { CreditCard, Check } from 'lucide-react'
import type { PaymentMethod } from '@/lib/portone/types'

interface Props {
    value: PaymentMethod
    onChange: (method: PaymentMethod) => void
}

export function PaymentMethodSelector({ value, onChange }: Props) {
    return (
        <div className="space-y-3">
            {/* 신용/체크카드 */}
            <button
                type="button"
                onClick={() => onChange('card')}
                className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    value === 'card'
                        ? 'border-primary/60 bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                        <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">신용/체크카드</p>
                        <p className="text-sm text-gray-500">한국 발행 모든 카드 지원</p>
                    </div>
                </div>
                {value === 'card' && (
                    <Check className="w-5 h-5 text-primary shrink-0" />
                )}
            </button>

            {/* 카카오페이 */}
            <button
                type="button"
                onClick={() => onChange('kakaopay')}
                className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                    value === 'kakaopay'
                        ? 'border-primary/60 bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
            >
                <div className="flex items-center gap-3">
                    {/* 카카오 말풍선 아이콘 (단순 SVG) */}
                    <div className="p-2 bg-[#FEE500] rounded-lg shadow-sm">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                d="M12 3C7.03 3 3 6.36 3 10.5c0 2.65 1.71 4.98 4.31 6.35l-.96 3.57 3.92-2.59C10.71 17.94 11.35 18 12 18c4.97 0 9-3.36 9-7.5S16.97 3 12 3z"
                                fill="#3A1D1D"
                            />
                        </svg>
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">카카오페이</p>
                        <p className="text-sm text-gray-500">카카오페이 간편결제</p>
                    </div>
                </div>
                {value === 'kakaopay' && (
                    <Check className="w-5 h-5 text-primary shrink-0" />
                )}
            </button>
        </div>
    )
}
