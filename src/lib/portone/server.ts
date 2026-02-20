/**
 * PortOne 서버 측 유틸리티
 * - 결제 검증 (verifyPayment)
 * - 결제 취소 (cancelPayment)
 * - 금액 검증 (validatePaymentAmount)
 *
 * ⚠️ 이 파일은 서버(API Route)에서만 사용합니다.
 *    프론트엔드(브라우저)에서 import하지 마세요. (API Secret 노출 위험)
 */

const PORTONE_API_BASE = 'https://api.portone.io';

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

/** PortOne 결제 조회 응답에서 사용하는 주요 필드 */
export interface PortOnePaymentData {
    status: string;
    id?: string;
    amount: { total: number };
    currency: string;
    orderName?: string;
    receiptUrl?: string;
}

/** PortOne 결제 취소 응답 */
export interface PortOneCancelResult {
    cancellation: {
        status: string;
        id: string;
        totalAmount: number;
    };
}

/** PortOne API 에러 응답 */
interface PortOneApiError {
    type: string;
    message: string;
}

/* ──────────────────────────────────────────────
 * Internal Helpers
 * ────────────────────────────────────────────── */

/**
 * PORTONE_API_SECRET 환경 변수를 읽어 반환합니다.
 * 설정되지 않은 경우 에러를 throw합니다.
 */
function getApiSecret(): string {
    const secret = process.env.PORTONE_API_SECRET;
    if (!secret) {
        throw new Error(
            'PORTONE_API_SECRET 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.'
        );
    }
    return secret;
}

/**
 * PortOne REST API 공통 헤더를 생성합니다.
 */
function buildHeaders(apiSecret: string): Record<string, string> {
    return {
        Authorization: `PortOne ${apiSecret}`,
        'Content-Type': 'application/json',
    };
}

/* ──────────────────────────────────────────────
 * Public API
 * ────────────────────────────────────────────── */

/**
 * PortOne REST API로 결제 단건 조회
 * @see https://developers.portone.io/api/rest-v2/payment
 *
 * @param paymentId 결제 건 아이디 (requestPayment 시 전달한 paymentId)
 * @returns 결제 상세 정보 (status, amount, currency 등)
 * @throws paymentId가 비어있거나, API Secret 미설정, 네트워크 오류, API 에러
 */
export async function verifyPayment(paymentId: string): Promise<PortOnePaymentData> {
    if (!paymentId) {
        throw new Error('paymentId는 필수입니다.');
    }

    const apiSecret = getApiSecret();
    const url = `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(apiSecret),
    });

    if (!response.ok) {
        const errorBody: PortOneApiError = await response.json();
        throw new Error(
            `PortOne 결제 조회 실패 (${response.status}): ${errorBody.message || errorBody.type}`
        );
    }

    return response.json();
}

/**
 * PortOne REST API로 결제 취소 (환불)
 * @see https://developers.portone.io/api/rest-v2/payment
 *
 * @param paymentId 결제 건 아이디
 * @param reason 취소 사유 (필수)
 * @returns 취소 결과
 * @throws paymentId/reason이 비어있거나, API 에러
 */
export async function cancelPayment(
    paymentId: string,
    reason: string
): Promise<PortOneCancelResult> {
    if (!paymentId) {
        throw new Error('paymentId는 필수입니다.');
    }
    if (!reason) {
        throw new Error('취소 사유는 필수입니다.');
    }

    const apiSecret = getApiSecret();
    const url = `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}/cancel`;

    const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(apiSecret),
        body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
        const errorBody: PortOneApiError = await response.json();
        throw new Error(
            `PortOne 결제 취소 실패 (${response.status}): ${errorBody.message || errorBody.type}`
        );
    }

    return response.json();
}

/**
 * 결제 데이터의 상태와 금액을 검증합니다.
 *
 * @param paymentData PortOne에서 조회한 결제 데이터
 * @param expectedAmount 기대 금액 (서버에서 계산한 금액)
 * @returns 결제 상태가 PAID이고 금액이 일치하면 true
 */
export function validatePaymentAmount(
    paymentData: Pick<PortOnePaymentData, 'status' | 'amount'>,
    expectedAmount: number
): boolean {
    if (paymentData.status !== 'PAID') {
        return false;
    }
    return paymentData.amount.total === expectedAmount;
}
