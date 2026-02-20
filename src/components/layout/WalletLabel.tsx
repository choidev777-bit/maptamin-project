'use client';

// 'use client'; // Already at top

import { Ticket, Lock, ShoppingCart, ArrowUpCircle } from 'lucide-react';
// import { createClient } from '@/lib/supabase/client'; // Removed
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isSubscribed, getPlanDisplayName, canAccessPlatform } from '@/lib/utils/subscription';
import { PLAN_CONFIG } from '@/lib/pricing/config';
import * as Dialog from '@radix-ui/react-dialog';

export interface SubscriptionInfo {
    remaining_tickets_naver: number;
    remaining_tickets_google: number;
    plan_id: string;
}

interface Props {
    subscription: SubscriptionInfo | null;
}

export function WalletLabel({ subscription }: Props) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    // subInfo derived directly from prop
    const subInfo = subscription;

    // loading state is no longer needed as data comes from server component
    // If subscription is null (e.g. error or not loaded yet?), we can show placeholder or nothing
    // But DashboardLayout fetches it before rendering, so it should be available or null if no record.

    if (!subInfo) return null;

    const subscribed = isSubscribed(subInfo.plan_id);

    // 미구독 사용자: 기존 "구독 필요" 버튼 유지
    if (!subscribed) {
        return (
            <button
                onClick={() => router.push('/dashboard/subscription')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full border border-gray-200 hover:bg-gray-200 transition-colors"
            >
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">구독 필요</span>
            </button>
        );
    }

    const naverTickets = subInfo.remaining_tickets_naver || 0;
    const googleTickets = subInfo.remaining_tickets_google || 0;
    const hasGoogle = canAccessPlatform(subInfo.plan_id, 'google');
    const planConfig = PLAN_CONFIG[subInfo.plan_id];
    const planName = getPlanDisplayName(subInfo.plan_id);

    return (
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
            {/* 트리거: 분리 표시된 티켓 뱃지 */}
            <Dialog.Trigger asChild>
                <button
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                    aria-label="티켓 상세 보기"
                >
                    <Ticket className="w-4 h-4 flex-shrink-0" />
                    {hasGoogle ? (
                        <>
                            <span className="text-xs font-semibold">N {naverTickets}</span>
                            <span className="text-emerald-300 text-xs">|</span>
                            <span className="text-xs font-semibold">G {googleTickets}</span>
                        </>
                    ) : (
                        <span className="text-sm font-semibold">{naverTickets}장</span>
                    )}
                </button>
            </Dialog.Trigger>

            {/* 팝업: 티켓 상세 정보 */}
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in" />
                <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 z-50 animate-in zoom-in-95 duration-200 border border-gray-100">
                    <Dialog.Title className="text-lg font-bold text-gray-900 mb-1">
                        실시간 진단 티켓
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-5">
                        현재 <span className="font-semibold text-gray-700">{planName}</span> 플랜
                    </Dialog.Description>

                    {/* 티켓 잔량 카드 */}
                    <div className="space-y-3 mb-6">
                        {/* 네이버 티켓 */}
                        <div className="flex items-center justify-between p-3.5 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">N</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">네이버 티켓</p>
                                    <p className="text-xs text-gray-500">
                                        월 {planConfig?.ticketsNaver || 0}장 제공
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-green-600">{naverTickets}</p>
                                <p className="text-xs text-gray-400">잔여</p>
                            </div>
                        </div>

                        {/* 구글 티켓 (프리미엄만) */}
                        {hasGoogle && (
                            <div className="flex items-center justify-between p-3.5 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">G</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">구글 티켓</p>
                                        <p className="text-xs text-gray-500">
                                            월 {planConfig?.ticketsGoogle || 0}장 제공
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-blue-600">{googleTickets}</p>
                                    <p className="text-xs text-gray-400">잔여</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="space-y-2.5">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/dashboard/shop');
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00C896] text-white font-semibold rounded-lg hover:bg-[#00B386] transition-colors shadow-md shadow-[#00C896]/20"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            추가 구매하기
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                router.push('/dashboard/subscription');
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-600 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <ArrowUpCircle className="w-4 h-4" />
                            플랜 업그레이드
                        </button>
                    </div>

                    {/* 닫기 버튼 (X) */}
                    <Dialog.Close asChild>
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="닫기"
                        >
                            ✕
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
