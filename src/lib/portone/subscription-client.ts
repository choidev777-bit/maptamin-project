/**
 * PortOne 구독 프론트엔드 헬퍼
 * - 빌링키 발급 (결제창 방식)
 *
 * ⚠️ 이 파일은 클라이언트(브라우저)에서만 사용합니다.
 *    Store ID와 Channel Key는 공개 키이므로 프론트에 노출되어도 안전합니다.
 *
 * @see PLAN_subscription_payment.md  Phase 4-2
 */

import * as PortOne from '@portone/browser-sdk/v2';
import type { PaymentMethod } from './types';

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

export interface IssueBillingKeyRequest {
    /** 구독할 플랜 ID (starter / pro / premium) */
    planId: string;
    /**
     * 결제 수단 (기본값: 'card')
     * - 'card': 신용/체크카드 (NHN KCP)
     * - 'kakaopay': 카카오페이 (billingKeyMethod: EASY_PAY)
     */
    paymentMethod?: PaymentMethod;
    /** 구매자 정보 */
    customer?: {
        fullName?: string;
        email?: string;
        phoneNumber?: string;
    };
    /**
     * 모바일 REDIRECTION 복귀 URL (카카오페이 선택 시 CheckoutContent에서 주입)
     * planId·email·termsAgreedAt을 쿼리파라미터로 포함하여 payment-return 페이지에서 처리
     */
    redirectUrl?: string;
}

export interface IssueBillingKeyResult {
    /** 발급 성공 여부 */
    success: boolean;
    /** PortOne 빌링키 (서버 전송용) */
    billingKey: string | null;
    /** 에러 메시지 (실패 시) */
    error?: string;
}

/* ──────────────────────────────────────────────
 * Constants
 * ────────────────────────────────────────────── */

const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '';
/** 정기결제(구독)용 채널 키 - NHN KCP */
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY || '';
/** 정기결제(구독)용 채널 키 - 카카오페이 */
const KAKAOPAY_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_KAKAOPAY_BILLING_CHANNEL_KEY || '';

/* ──────────────────────────────────────────────
 * Helper
 * ────────────────────────────────────────────── */

/**
 * 고유한 빌링키 발급 ID를 생성합니다.
 * 형식: `billing_{timestamp}_{random}`
 */
function generateIssueId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `billing_${timestamp}_${random}`;
}

/* ──────────────────────────────────────────────
 * Public API
 * ────────────────────────────────────────────── */

/**
 * PortOne 빌링키 발급 결제창을 띄워 카드를 등록합니다.
 *
 * @param request 빌링키 발급 요청 정보
 * @returns 빌링키 발급 결과 (성공 시 billingKey 포함)
 */
export async function requestBillingKey(
    request: IssueBillingKeyRequest
): Promise<IssueBillingKeyResult> {
    if (!STORE_ID || !CHANNEL_KEY) {
        return {
            success: false,
            billingKey: null,
            error: '결제 설정이 올바르지 않습니다. 관리자에게 문의해주세요.',
        };
    }

    const issueId = generateIssueId();
    const planName = request.planId === 'premium' ? '프리미엄' :
        request.planId === 'pro' ? '프로' : '스타터';
    const method = request.paymentMethod ?? 'card';
    const isKakaopay = method === 'kakaopay';

    try {
        const response = await PortOne.requestIssueBillingKey({
            storeId: STORE_ID,
            channelKey: isKakaopay ? KAKAOPAY_CHANNEL_KEY : CHANNEL_KEY,
            billingKeyMethod: isKakaopay ? 'EASY_PAY' : 'CARD',
            issueId,
            issueName: `맵타민 ${planName} 플랜 정기구독`,
            ...(request.redirectUrl && { redirectUrl: request.redirectUrl }),
            customer: request.customer
                ? {
                    fullName: request.customer.fullName,
                    email: request.customer.email,
                    phoneNumber: request.customer.phoneNumber,
                }
                : undefined,
        });

        // 사용자가 결제창을 닫거나 취소한 경우
        if (response?.code) {
            return {
                success: false,
                billingKey: null,
                error: response.message || '빌링키 발급이 취소되었습니다.',
            };
        }

        // 빌링키 발급 성공
        return {
            success: true,
            billingKey: response?.billingKey ?? null,
        };
    } catch (error) {
        return {
            success: false,
            billingKey: null,
            error: error instanceof Error ? error.message : '빌링키 발급 중 오류가 발생했습니다.',
        };
    }
}
