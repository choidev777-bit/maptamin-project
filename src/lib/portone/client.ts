/**
 * PortOne 프론트엔드 결제 요청 헬퍼
 * - 브라우저에서 결제창을 띄우는 함수
 *
 * ⚠️ 이 파일은 클라이언트(브라우저)에서만 사용합니다.
 *    Store ID와 Channel Key는 공개 키이므로 프론트에 노출되어도 안전합니다.
 */

import * as PortOne from '@portone/browser-sdk/v2';

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

export type Platform = 'naver' | 'google';

export interface TicketPaymentRequest {
    /** 구매 플랫폼 (naver / google) */
    platform: Platform;
    /** 구매 수량 */
    quantity: number;
    /** 결제 총 금액 (원, ticket-price.ts로 미리 계산) */
    totalAmount: number;
    /** 구매자 정보 */
    customer?: {
        fullName?: string;
        email?: string;
        phoneNumber?: string;
    };
}

export interface TicketPaymentResult {
    /** 결제 성공 여부 */
    success: boolean;
    /** PortOne 결제 ID (검증 시 사용) */
    paymentId: string | null;
    /** 에러 메시지 (실패 시) */
    error?: string;
}

/* ──────────────────────────────────────────────
 * Constants
 * ────────────────────────────────────────────── */

const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '';
/** 일반결제(티켓 구매)용 채널 키 */
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY || '';

/* ──────────────────────────────────────────────
 * Helper
 * ────────────────────────────────────────────── */

/**
 * 고유한 결제 ID를 생성합니다.
 * 형식: `ticket_{timestamp}_{random}`
 */
function generatePaymentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `ticket_${timestamp}_${random}`;
}

/**
 * 플랫폼에 따른 주문명을 생성합니다.
 */
function buildOrderName(platform: Platform, quantity: number): string {
    const platformName = platform === 'naver' ? '네이버' : '구글';
    return `${platformName} 실시간 진단 티켓 ${quantity}장`;
}

/* ──────────────────────────────────────────────
 * Public API
 * ────────────────────────────────────────────── */

/**
 * PortOne 결제창을 띄워 티켓 구매를 진행합니다.
 *
 * @param request 결제 요청 정보
 * @returns 결제 결과 (성공 시 paymentId 포함, 사용자 취소 시 success: false)
 */
export async function requestTicketPayment(
    request: TicketPaymentRequest
): Promise<TicketPaymentResult> {
    if (!STORE_ID || !CHANNEL_KEY) {
        return {
            success: false,
            paymentId: null,
            error: '결제 설정이 올바르지 않습니다. 관리자에게 문의해주세요.',
        };
    }

    const paymentId = generatePaymentId();
    const orderName = buildOrderName(request.platform, request.quantity);

    try {
        const response = await PortOne.requestPayment({
            storeId: STORE_ID,
            channelKey: CHANNEL_KEY,
            paymentId,
            orderName,
            totalAmount: request.totalAmount,
            currency: 'CURRENCY_KRW',
            payMethod: 'CARD',
            customer: request.customer
                ? {
                    fullName: request.customer.fullName,
                    email: request.customer.email,
                    phoneNumber: request.customer.phoneNumber,
                }
                : undefined,
        });

        // 사용자가 결제창을 닫거나 취소한 경우
        if (response?.code === 'FAILURE_TYPE_PG') {
            return {
                success: false,
                paymentId: null,
                error: '결제가 실패했습니다. 다시 시도해주세요.',
            };
        }

        // 사용자가 결제창을 닫은 경우
        if (response?.code) {
            return {
                success: false,
                paymentId: null,
                error: response.message || '결제가 취소되었습니다.',
            };
        }

        // 결제 성공 (서버 검증 필요)
        return {
            success: true,
            paymentId,
        };
    } catch (error) {
        return {
            success: false,
            paymentId: null,
            error: error instanceof Error ? error.message : '결제 중 오류가 발생했습니다.',
        };
    }
}
