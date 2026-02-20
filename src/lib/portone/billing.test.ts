/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Mock fetch globally ──
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// ── Set env before import ──
process.env.PORTONE_API_SECRET = 'test-api-secret';

import {
    payWithBillingKey,
    schedulePayment,
    cancelSchedule,
    getBillingKeyInfo,
    deleteBillingKey,
} from './billing';

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function mockResponse(status: number, body: unknown) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    } as Response;
}

/* ──────────────────────────────────────────────
 * payWithBillingKey
 * ────────────────────────────────────────────── */

describe('payWithBillingKey', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('정상 빌링키 결제 시 결과를 반환한다', async () => {
        const mockResult = {
            payment: {
                status: 'PAID',
                id: 'payment-123',
                amount: { total: 29000 },
            },
        };
        mockFetch.mockResolvedValueOnce(mockResponse(200, mockResult));

        const result = await payWithBillingKey({
            paymentId: 'sub_test_123',
            billingKey: 'billing-key-abc',
            orderName: '프로 플랜 월간 구독',
            amount: 29000,
            currency: 'KRW',
        });

        expect(result).toEqual(mockResult);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('/payments/sub_test_123/billing-key');
        expect(options?.method).toBe('POST');
        expect(JSON.parse(options?.body as string)).toMatchObject({
            billingKey: 'billing-key-abc',
            orderName: '프로 플랜 월간 구독',
            amount: { total: 29000 },
            currency: 'KRW',
        });
    });

    it('billingKey가 비어있으면 에러를 throw한다', async () => {
        await expect(
            payWithBillingKey({
                paymentId: 'sub_test_123',
                billingKey: '',
                orderName: '테스트',
                amount: 29000,
                currency: 'KRW',
            })
        ).rejects.toThrow('billingKey는 필수입니다.');
    });

    it('paymentId가 비어있으면 에러를 throw한다', async () => {
        await expect(
            payWithBillingKey({
                paymentId: '',
                billingKey: 'billing-key-abc',
                orderName: '테스트',
                amount: 29000,
                currency: 'KRW',
            })
        ).rejects.toThrow('paymentId는 필수입니다.');
    });

    it('금액이 0 이하이면 에러를 throw한다', async () => {
        await expect(
            payWithBillingKey({
                paymentId: 'sub_test_123',
                billingKey: 'billing-key-abc',
                orderName: '테스트',
                amount: 0,
                currency: 'KRW',
            })
        ).rejects.toThrow('결제 금액은 0보다 커야 합니다.');
    });

    it('PortOne API 에러 시 에러를 throw한다', async () => {
        mockFetch.mockResolvedValueOnce(
            mockResponse(404, { type: 'BillingKeyNotFoundError', message: '빌링키를 찾을 수 없습니다.' })
        );

        await expect(
            payWithBillingKey({
                paymentId: 'sub_test_123',
                billingKey: 'invalid-key',
                orderName: '테스트',
                amount: 29000,
                currency: 'KRW',
            })
        ).rejects.toThrow('빌링키 결제 실패');
    });
});

/* ──────────────────────────────────────────────
 * schedulePayment
 * ────────────────────────────────────────────── */

describe('schedulePayment', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('정상 예약 결제 등록 시 결과를 반환한다', async () => {
        const mockResult = {
            schedule: { id: 'schedule-123', status: 'SCHEDULED' },
        };
        mockFetch.mockResolvedValueOnce(mockResponse(200, mockResult));

        const timeToPay = '2026-03-19T14:00:00+09:00';
        const result = await schedulePayment({
            paymentId: 'sub_next_123',
            billingKey: 'billing-key-abc',
            orderName: '프로 플랜 월간 구독',
            amount: 29000,
            currency: 'KRW',
            timeToPay,
        });

        expect(result).toEqual(mockResult);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('/payments/sub_next_123/schedule');
        const body = JSON.parse(options?.body as string);
        expect(body.timeToPay).toBe(timeToPay);
        expect(body.payment.billingKey).toBe('billing-key-abc');
    });

    it('timeToPay가 비어있으면 에러를 throw한다', async () => {
        await expect(
            schedulePayment({
                paymentId: 'sub_next_123',
                billingKey: 'billing-key-abc',
                orderName: '테스트',
                amount: 29000,
                currency: 'KRW',
                timeToPay: '',
            })
        ).rejects.toThrow('timeToPay는 필수입니다.');
    });

    it('이미 존재하는 스케줄이면 에러를 throw한다', async () => {
        mockFetch.mockResolvedValueOnce(
            mockResponse(409, { type: 'PaymentScheduleAlreadyExistsError', message: '이미 예약된 결제' })
        );

        await expect(
            schedulePayment({
                paymentId: 'sub_next_123',
                billingKey: 'billing-key-abc',
                orderName: '테스트',
                amount: 29000,
                currency: 'KRW',
                timeToPay: '2026-03-19T14:00:00+09:00',
            })
        ).rejects.toThrow('결제 예약 실패');
    });
});

/* ──────────────────────────────────────────────
 * cancelSchedule
 * ────────────────────────────────────────────── */

describe('cancelSchedule', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('정상 예약 결제 취소 시 결과를 반환한다', async () => {
        const mockResult = {
            revokedScheduleIds: ['schedule-123'],
        };
        mockFetch.mockResolvedValueOnce(mockResponse(200, mockResult));

        const result = await cancelSchedule(['schedule-123']);

        expect(result).toEqual(mockResult);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('/payment-schedules');
        expect(options?.method).toBe('DELETE');
    });

    it('scheduleIds가 비어있으면 에러를 throw한다', async () => {
        await expect(cancelSchedule([])).rejects.toThrow(
            '취소할 스케줄 ID가 필요합니다.'
        );
    });
});

/* ──────────────────────────────────────────────
 * getBillingKeyInfo
 * ────────────────────────────────────────────── */

describe('getBillingKeyInfo', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('빌링키 정보를 조회한다', async () => {
        const mockResult = {
            billingKeyInfo: {
                billingKey: 'billing-key-abc',
                status: 'ISSUED',
                methods: [{ card: { name: '신한카드', number: '****1234' } }],
            },
        };
        mockFetch.mockResolvedValueOnce(mockResponse(200, mockResult));

        const result = await getBillingKeyInfo('billing-key-abc');
        expect(result).toEqual(mockResult);
    });

    it('billingKey가 비어있으면 에러를 throw한다', async () => {
        await expect(getBillingKeyInfo('')).rejects.toThrow(
            'billingKey는 필수입니다.'
        );
    });
});

/* ──────────────────────────────────────────────
 * deleteBillingKey
 * ────────────────────────────────────────────── */

describe('deleteBillingKey', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    it('빌링키를 삭제한다', async () => {
        const mockResult = { deletedAt: '2026-02-19T14:00:00+09:00' };
        mockFetch.mockResolvedValueOnce(mockResponse(200, mockResult));

        const result = await deleteBillingKey('billing-key-abc');
        expect(result).toEqual(mockResult);

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toContain('/billing-keys/billing-key-abc');
        expect(options?.method).toBe('DELETE');
    });

    it('billingKey가 비어있으면 에러를 throw한다', async () => {
        await expect(deleteBillingKey('')).rejects.toThrow(
            'billingKey는 필수입니다.'
        );
    });
});
