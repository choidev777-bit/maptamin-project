/**
 * @jest-environment node
 *
 * 구독 해지 API 테스트
 * jest.doMock + 동적 import 패턴 사용 (SWC 호환)
 */

/* ──────────────────────────────────────────────
 * Global Mocks
 * ────────────────────────────────────────────── */

const mockCancelSchedule = jest.fn();
const mockDeleteBillingKey = jest.fn();

// Supabase mock helpers
const mockGetUser = jest.fn();
const mockSingleResult = jest.fn();
const mockUpdateResult = jest.fn();
const mockFrom = jest.fn();

function setupSupabaseMock() {
    // .from('table').select(...).eq(...).single()
    const eqFn = jest.fn().mockReturnValue({ single: mockSingleResult });
    const selectFn = jest.fn().mockReturnValue({ eq: eqFn });

    // .from('table').update({ ... }).eq(...)
    const updateEqFn = jest.fn().mockImplementation(() => mockUpdateResult());
    const updateFn = jest.fn().mockReturnValue({ eq: updateEqFn });

    mockFrom.mockReturnValue({
        select: selectFn,
        update: updateFn,
    });

    return {
        auth: { getUser: mockGetUser },
        from: mockFrom,
    };
}

const mockCreateClient = jest.fn();

/* ──────────────────────────────────────────────
 * Dynamic import helper
 * ────────────────────────────────────────────── */

async function importRoute() {
    jest.resetModules();

    jest.doMock('@/lib/supabase/server', () => ({
        createClient: mockCreateClient,
    }));
    jest.doMock('@/lib/portone/billing', () => ({
        cancelSchedule: mockCancelSchedule,
        deleteBillingKey: mockDeleteBillingKey,
    }));

    return await import('./route');
}

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function makeRequest(): Request {
    return new Request('http://localhost/api/payment/subscribe/cancel', {
        method: 'POST',
    });
}

/* ──────────────────────────────────────────────
 * Tests
 * ────────────────────────────────────────────── */

describe('POST /api/payment/subscribe/cancel', () => {
    beforeEach(() => {
        mockCancelSchedule.mockReset();
        mockDeleteBillingKey.mockReset();
        mockGetUser.mockReset();
        mockSingleResult.mockReset();
        mockUpdateResult.mockReset();
        mockFrom.mockReset();
        mockCreateClient.mockReset();

        // 기본: 인증된 사용자
        const supabaseMock = setupSupabaseMock();
        mockCreateClient.mockResolvedValue(supabaseMock);
        mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    });

    it('인증되지 않은 사용자는 401 반환', async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: null } });

        const { POST } = await importRoute();
        const res = await POST();
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.code).toBe('UNAUTHORIZED');
    });

    it('구독 정보가 없으면 404 반환', async () => {
        mockSingleResult.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

        const { POST } = await importRoute();
        const res = await POST();
        expect(res.status).toBe(404);

        const body = await res.json();
        expect(body.code).toBe('NO_SUBSCRIPTION');
    });

    it('이미 해지된 구독은 400 반환', async () => {
        mockSingleResult.mockResolvedValueOnce({
            data: { billing_key: 'bk1', status: 'canceled', next_payment_id: null },
            error: null,
        });

        const { POST } = await importRoute();
        const res = await POST();
        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.code).toBe('ALREADY_CANCELED');
    });

    it('활성 구독 해지 성공: 예약 취소 + 빌링키 삭제 + DB 업데이트', async () => {
        mockSingleResult.mockResolvedValueOnce({
            data: {
                billing_key: 'bk_test_123',
                next_payment_id: 'sub_pro_next',
                next_billing_date: '2026-03-19T00:00:00.000Z',
                plan_id: 'pro',
                status: 'active',
            },
            error: null,
        });
        mockCancelSchedule.mockResolvedValueOnce({});
        mockDeleteBillingKey.mockResolvedValueOnce({});
        mockUpdateResult.mockResolvedValueOnce({ error: null });

        const { POST } = await importRoute();
        const res = await POST();
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.effectiveUntil).toBe('2026-03-19T00:00:00.000Z');
        expect(mockCancelSchedule).toHaveBeenCalledWith(['sub_pro_next']);
        expect(mockDeleteBillingKey).toHaveBeenCalledWith('bk_test_123');
    });

    it('예약 취소 실패해도 해지는 계속 진행', async () => {
        mockSingleResult.mockResolvedValueOnce({
            data: {
                billing_key: 'bk_test_456',
                next_payment_id: 'sub_pro_fail',
                next_billing_date: '2026-03-19T00:00:00.000Z',
                plan_id: 'pro',
                status: 'active',
            },
            error: null,
        });
        mockCancelSchedule.mockRejectedValueOnce(new Error('Already canceled'));
        mockDeleteBillingKey.mockResolvedValueOnce({});
        mockUpdateResult.mockResolvedValueOnce({ error: null });

        const { POST } = await importRoute();
        const res = await POST();
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
    });

    it('past_due 상태에서도 해지 가능', async () => {
        mockSingleResult.mockResolvedValueOnce({
            data: {
                billing_key: 'bk_test_789',
                next_payment_id: null,
                next_billing_date: '2026-03-19T00:00:00.000Z',
                plan_id: 'starter',
                status: 'past_due',
            },
            error: null,
        });
        mockDeleteBillingKey.mockResolvedValueOnce({});
        mockUpdateResult.mockResolvedValueOnce({ error: null });

        const { POST } = await importRoute();
        const res = await POST();
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.success).toBe(true);
        // next_payment_id가 null이므로 cancelSchedule 미호출
        expect(mockCancelSchedule).not.toHaveBeenCalled();
    });

    it('DB 업데이트 실패하면 500 반환', async () => {
        mockSingleResult.mockResolvedValueOnce({
            data: {
                billing_key: 'bk_test_err',
                next_payment_id: 'sub_err',
                next_billing_date: '2026-03-19T00:00:00.000Z',
                plan_id: 'pro',
                status: 'active',
            },
            error: null,
        });
        mockCancelSchedule.mockResolvedValueOnce({});
        mockDeleteBillingKey.mockResolvedValueOnce({});
        mockUpdateResult.mockResolvedValueOnce({ error: { message: 'DB error' } });

        const { POST } = await importRoute();
        const res = await POST();
        expect(res.status).toBe(500);

        const body = await res.json();
        expect(body.code).toBe('DB_ERROR');
    });
});
