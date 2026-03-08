'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Minus, Plus, Lock, ShoppingCart, CreditCard, Ticket, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { canAccessPlatform, getPlanDisplayName } from '@/lib/utils/subscription'
import { TICKET_PRICE, calculateTicketPrice, formatPrice } from '@/lib/pricing/ticket-price'
import { requestTicketPayment } from '@/lib/portone/client'
import { PaymentMethodSelector } from '@/components/ui/PaymentMethodSelector'
import type { PaymentMethod } from '@/lib/portone/types'

interface Props {
    planId: string
    remainingTicketsNaver: number
    remainingTicketsGoogle: number
}

type Platform = 'naver' | 'google'

export function TicketShopContent({
    planId,
    remainingTicketsNaver,
    remainingTicketsGoogle,
}: Props) {
    const router = useRouter()
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>('naver')
    const [quantity, setQuantity] = useState(1)
    const [isPurchasing, setIsPurchasing] = useState(false)
    const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card')

    const hasGoogle = canAccessPlatform(planId, 'google')
    const planName = getPlanDisplayName(planId)
    const totalPrice = calculateTicketPrice(quantity)

    const handleQuantityChange = (value: number) => {
        setQuantity(prev => Math.max(1, prev + value))
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10)
        if (!isNaN(val) && val >= 1) {
            setQuantity(val)
        } else if (e.target.value === '') {
            setQuantity(1)
        }
    }

    const handlePurchase = async () => {
        setIsPurchasing(true);
        setResultMessage(null);

        try {
            // 1. 포트원 결제 요청 (프론트엔드)
            // client.ts의 requestTicketPayment가 Store ID, Channel Key, Payment ID 등을 내부적으로 처리함
            const paymentResult = await requestTicketPayment({
                platform: selectedPlatform,
                quantity,
                totalAmount: calculateTicketPrice(quantity),
                paymentMethod: selectedPaymentMethod,
            });

            if (!paymentResult.success || !paymentResult.paymentId) {
                throw new Error(paymentResult.error || '결제가 취소되었습니다.');
            }

            // 2. 결제 검증 요청 (백엔드)
            const response = await fetch('/api/payment/ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentId: paymentResult.paymentId,
                    platform: selectedPlatform,
                    quantity,
                }),
            });

            const verifyData = await response.json();

            if (!response.ok || !verifyData.success) {
                throw new Error(verifyData.error || '결제 검증에 실패했습니다. 고객센터에 문의해주세요.');
            }

            // 3. 성공 처리 & 페이지 이동
            router.refresh(); // 데이터(티켓 수) 갱신
            router.replace(`/dashboard/shop/result?quantity=${quantity}&amount=${calculateTicketPrice(quantity)}&platform=${selectedPlatform}`);

        } catch (error: any) {
            console.error('Payment Error:', error);
            setResultMessage({
                type: 'error',
                text: error.message || '결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            });
        } finally {
            setIsPurchasing(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* 뒤로가기 + 헤더 */}
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    돌아가기
                </button>
                <h1 className="text-2xl font-bold text-gray-900">실시간 진단 티켓 구매</h1>
                <p className="text-gray-500 mt-1">
                    현재 <span className="font-semibold text-gray-700">{planName}</span> 플랜
                </p>
            </div>

            {/* 상품 설명 */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">실시간 진단 티켓이란?</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                    정기 리포트(주 1회) 외에, 지금 당장 내 매장 순위가 궁금할 때 사용하는 즉시 조회 기능입니다. 소진 시 추가 구매가 가능합니다. (1,500원/장)
                </p>
            </div>

            {/* 현재 보유 티켓 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-gray-400" />
                    현재 보유 티켓
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">N</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">네이버</p>
                            <p className="text-lg font-bold text-green-600">{remainingTicketsNaver}장</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-3 p-3 rounded-lg border ${hasGoogle ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${hasGoogle ? 'bg-blue-500' : 'bg-gray-300'}`}>
                            <span className="text-white text-xs font-bold">G</span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">구글</p>
                            {hasGoogle ? (
                                <p className="text-lg font-bold text-blue-600">{remainingTicketsGoogle}장</p>
                            ) : (
                                <p className="text-xs font-medium text-gray-400">프리미엄 전용</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 플랫폼 선택 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">구매할 티켓 종류</h2>
                <div className="grid grid-cols-2 gap-3">
                    {/* 네이버 탭 */}
                    <button
                        onClick={() => setSelectedPlatform('naver')}
                        className={`relative p-4 rounded-xl border-2 transition-all ${selectedPlatform === 'naver'
                            ? 'border-green-500 bg-green-50 shadow-md shadow-green-100'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPlatform === 'naver' ? 'bg-green-500' : 'bg-gray-200'
                                }`}>
                                <span className={`text-sm font-bold ${selectedPlatform === 'naver' ? 'text-white' : 'text-gray-500'
                                    }`}>N</span>
                            </div>
                            <span className={`text-sm font-semibold ${selectedPlatform === 'naver' ? 'text-green-700' : 'text-gray-600'
                                }`}>네이버 티켓</span>
                        </div>
                        {selectedPlatform === 'naver' && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                            </div>
                        )}
                    </button>

                    {/* 구글 탭 */}
                    <button
                        onClick={() => hasGoogle && setSelectedPlatform('google')}
                        disabled={!hasGoogle}
                        className={`relative p-4 rounded-xl border-2 transition-all ${!hasGoogle
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                            : selectedPlatform === 'google'
                                ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                    >
                        <div className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!hasGoogle
                                ? 'bg-gray-200'
                                : selectedPlatform === 'google' ? 'bg-blue-500' : 'bg-gray-200'
                                }`}>
                                <span className={`text-sm font-bold ${!hasGoogle
                                    ? 'text-gray-400'
                                    : selectedPlatform === 'google' ? 'text-white' : 'text-gray-500'
                                    }`}>G</span>
                            </div>
                            <span className={`text-sm font-semibold ${!hasGoogle
                                ? 'text-gray-400'
                                : selectedPlatform === 'google' ? 'text-blue-700' : 'text-gray-600'
                                }`}>구글 티켓</span>
                        </div>

                        {/* 잠금 표시 */}
                        {!hasGoogle && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 text-gray-400">
                                <Lock className="w-3.5 h-3.5" />
                            </div>
                        )}

                        {/* 선택 표시 */}
                        {hasGoogle && selectedPlatform === 'google' && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                            </div>
                        )}
                    </button>
                </div>

                {!hasGoogle && (
                    <p className="text-xs text-gray-400 mt-2 text-center">
                        구글 티켓은 프리미엄 플랜에서만 구매 가능합니다.
                    </p>
                )}
            </div>

            {/* 결제 수단 선택 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    결제 수단
                </h2>
                <PaymentMethodSelector
                    value={selectedPaymentMethod}
                    onChange={setSelectedPaymentMethod}
                />
            </div>

            {/* 수량 선택 + 금액 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">수량 선택</h2>

                {/* 수량 컨트롤 */}
                <div className="flex items-center justify-center gap-4 mb-6">
                    <button
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                        className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="수량 줄이기"
                    >
                        <Minus className="w-5 h-5" />
                    </button>

                    <input
                        type="number"
                        value={quantity}
                        onChange={handleInputChange}
                        min={1}
                        className="w-24 h-12 text-center text-2xl font-bold text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:border-[#00C896] focus:ring-2 focus:ring-[#00C896]/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="구매 수량"
                    />

                    <button
                        onClick={() => handleQuantityChange(1)}
                        className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
                        aria-label="수량 늘리기"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>

                {/* 가격 계산 */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>
                            {selectedPlatform === 'naver' ? '네이버' : '구글'} 티켓 × {quantity}장
                        </span>
                        <span>장당 {formatPrice(TICKET_PRICE)}원</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                        <span className="text-sm font-semibold text-gray-700">합계</span>
                        <span className="text-2xl font-bold text-gray-900">
                            {formatPrice(totalPrice)}
                            <span className="text-sm font-normal text-gray-500 ml-1">원</span>
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-right">VAT 포함</p>
                </div>
            </div>

            {/* 결과 메시지 */}
            {resultMessage && (
                <div
                    className={`flex items-center gap-2 p-4 rounded-xl mb-4 ${resultMessage.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                        }`}
                >
                    {resultMessage.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium">{resultMessage.text}</p>
                </div>
            )}

            {/* 결제 버튼 */}
            <button
                onClick={handlePurchase}
                disabled={isPurchasing}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-[#00C896] text-white font-bold text-lg rounded-xl hover:bg-[#00B386] transition-colors shadow-lg shadow-[#00C896]/25 active:scale-[0.98] transform disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
                {isPurchasing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        결제 진행 중...
                    </>
                ) : (
                    <>
                        <CreditCard className="w-5 h-5" />
                        {formatPrice(totalPrice)}원 결제하기
                    </>
                )}
            </button>

            {/* 안내 텍스트 */}
            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
                서비스 제공 기간: 결제 즉시 사용 가능
                <br />
                미사용 티켓은 구매 후 7일 이내 환불 가능합니다. (사용한 티켓 제외)
                <br />
                자세한 내용은{' '}
                <a href="/terms" className="underline hover:text-gray-600">
                    이용약관
                </a>
                을 확인해주세요.
            </p>
        </div>
    )
}
