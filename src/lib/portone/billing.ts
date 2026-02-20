/**
 * PortOne 빌링키 결제 · 예약 결제 서버 유틸리티
 * - 빌링키 결제 (payWithBillingKey)
 * - 예약 결제 등록 (schedulePayment)
 * - 예약 결제 취소 (cancelSchedule)
 * - 빌링키 정보 조회 (getBillingKeyInfo)
 * - 빌링키 삭제 (deleteBillingKey)
 *
 * ⚠️ 이 파일은 서버(API Route)에서만 사용합니다.
 *    프론트엔드(브라우저)에서 import하지 마세요. (API Secret 노출 위험)
 *
 * @see PLAN_subscription_payment.md  Phase 4-1
 */

const PORTONE_API_BASE = 'https://api.portone.io';

/* ──────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────── */

/** 빌링키 결제 요청 파라미터 */
export interface BillingKeyPaymentParams {
    paymentId: string;
    billingKey: string;
    orderName: string;
    amount: number;
    currency: string;
    /** 웹훅 수신 URL (선택) */
    noticeUrls?: string[];
}

/** 예약 결제 등록 파라미터 */
export interface SchedulePaymentParams extends BillingKeyPaymentParams {
    /** 결제 예정 시각 (ISO 8601) */
    timeToPay: string;
}

/** PortOne API 에러 응답 */
interface PortOneApiError {
    type: string;
    message: string;
}

/* ──────────────────────────────────────────────
 * Internal Helpers
 * ────────────────────────────────────────────── */

function getApiSecret(): string {
    const secret = process.env.PORTONE_API_SECRET;
    if (!secret) {
        throw new Error(
            'PORTONE_API_SECRET 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.'
        );
    }
    return secret;
}

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
 * 빌링키로 단건 결제를 실행합니다.
 *
 * @see PortOne V2 API: POST /payments/{paymentId}/billing-key
 * @param params 빌링키 결제 파라미터
 * @returns 결제 결과
 */
export async function payWithBillingKey(
    params: BillingKeyPaymentParams
): Promise<unknown> {
    const { paymentId, billingKey, orderName, amount, currency, noticeUrls } = params;

    if (!paymentId) throw new Error('paymentId는 필수입니다.');
    if (!billingKey) throw new Error('billingKey는 필수입니다.');
    if (!orderName) throw new Error('orderName은 필수입니다.');
    if (amount <= 0) throw new Error('결제 금액은 0보다 커야 합니다.');

    const apiSecret = getApiSecret();
    const url = `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}/billing-key`;

    const body: Record<string, unknown> = {
        billingKey,
        orderName,
        amount: { total: amount },
        currency,
    };

    if (noticeUrls && noticeUrls.length > 0) {
        body.noticeUrls = noticeUrls;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(apiSecret),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody: PortOneApiError = await response.json();
        throw new Error(
            `빌링키 결제 실패 (${response.status}): ${errorBody.message || errorBody.type}`
        );
    }

    return response.json();
}

/**
 * 예약 결제를 등록합니다. (PortOne 서버에서 timeToPay 시점에 자동 결제)
 *
 * @see PortOne V2 API: POST /payments/{paymentId}/schedule
 * @param params 예약 결제 파라미터
 * @returns 예약 결과
 */
export async function schedulePayment(
    params: SchedulePaymentParams
): Promise<unknown> {
    const { paymentId, billingKey, orderName, amount, currency, timeToPay, noticeUrls } = params;

    if (!paymentId) throw new Error('paymentId는 필수입니다.');
    if (!billingKey) throw new Error('billingKey는 필수입니다.');
    if (!timeToPay) throw new Error('timeToPay는 필수입니다.');
    if (amount <= 0) throw new Error('결제 금액은 0보다 커야 합니다.');

    const apiSecret = getApiSecret();
    const url = `${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}/schedule`;

    const payment: Record<string, unknown> = {
        billingKey,
        orderName,
        amount: { total: amount },
        currency,
    };

    if (noticeUrls && noticeUrls.length > 0) {
        payment.noticeUrls = noticeUrls;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: buildHeaders(apiSecret),
        body: JSON.stringify({ payment, timeToPay }),
    });

    if (!response.ok) {
        const errorBody: PortOneApiError = await response.json();
        throw new Error(
            `결제 예약 실패 (${response.status}): ${errorBody.message || errorBody.type}`
        );
    }

    return response.json();
}

/**
 * 예약 결제를 취소합니다.
 *
 * @see PortOne V2 API: DELETE /payment-schedules
 * @param scheduleIds 취소할 스케줄 ID 배열
 * @returns 취소 결과
 */
export async function cancelSchedule(
    scheduleIds: string[]
): Promise<unknown> {
    if (!scheduleIds || scheduleIds.length === 0) {
        throw new Error('취소할 스케줄 ID가 필요합니다.');
    }

    const apiSecret = getApiSecret();
    const url = `${PORTONE_API_BASE}/payment-schedules`;

    const response = await fetch(url, {
        method: 'DELETE',
        headers: buildHeaders(apiSecret),
        body: JSON.stringify({ scheduleIds }),
    });

    if (!response.ok) {
        const errorBody: PortOneApiError = await response.json();
        throw new Error(
            `예약 결제 취소 실패 (${response.status}): ${errorBody.message || errorBody.type}`
        );
    }

    return response.json();
}

/**
 * 빌링키 정보를 조회합니다.
 *
 * @see PortOne V2 API: GET /billing-keys/{billingKey}
 * @param billingKey 조회할 빌링키
 * @returns 빌링키 상세 정보
 */
export async function getBillingKeyInfo(
    billingKey: string
): Promise<unknown> {
    if (!billingKey) throw new Error('billingKey는 필수입니다.');

    const apiSecret = getApiSecret();
    const url = `${PORTONE_API_BASE}/billing-keys/${encodeURIComponent(billingKey)}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: buildHeaders(apiSecret),
    });

    if (!response.ok) {
        const errorBody: PortOneApiError = await response.json();
        throw new Error(
            `빌링키 조회 실패 (${response.status}): ${errorBody.message || errorBody.type}`
        );
    }

    return response.json();
}

/**
 * 빌링키를 삭제합니다. (구독 취소 시 사용)
 *
 * @see PortOne V2 API: DELETE /billing-keys/{billingKey}
 * @param billingKey 삭제할 빌링키
 * @returns 삭제 결과
 */
export async function deleteBillingKey(
    billingKey: string
): Promise<unknown> {
    if (!billingKey) throw new Error('billingKey는 필수입니다.');

    const apiSecret = getApiSecret();
    const url = `${PORTONE_API_BASE}/billing-keys/${encodeURIComponent(billingKey)}`;

    const response = await fetch(url, {
        method: 'DELETE',
        headers: buildHeaders(apiSecret),
    });

    if (!response.ok) {
        const errorBody: PortOneApiError = await response.json();
        throw new Error(
            `빌링키 삭제 실패 (${response.status}): ${errorBody.message || errorBody.type}`
        );
    }

    return response.json();
}
