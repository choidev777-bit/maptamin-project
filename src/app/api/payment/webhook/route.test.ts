/**
 * @jest-environment node
 *
 * Webhook Handler Tests
 *
 * jest.resetModules + 동적 import 패턴 사용
 * (SWC transform에서 jest.mock hoisting이 정상 동작하지 않는 상황 대응)
 */

/* ──────────────────────────────────────────────
 * Types & State
 * ────────────────────────────────────────────── */

type DBResult = { data: unknown; error: unknown };

const tableResults: Record<string, {
    selectResults: DBResult[];
    insertResults: DBResult[];
    updateResults: DBResult[];
}> = {};

function resetTableResults() {
    for (const key of Object.keys(tableResults)) delete tableResults[key];
}

function setupTable(name: string, cfg: {
    selectResults?: DBResult[];
    insertResults?: DBResult[];
    updateResults?: DBResult[];
}) {
    tableResults[name] = {
        selectResults: cfg.selectResults || [],
        insertResults: cfg.insertResults || [],
        updateResults: cfg.updateResults || [],
    };
}

/* ──────────────────────────────────────────────
 * Global Mocks (module-level, pre jest.resetModules)
 * ────────────────────────────────────────────── */

const mockRpc = jest.fn();
const mockVerifyPayment = jest.fn();
const mockSchedulePayment = jest.fn();
const mockCreateClient = jest.fn();

function createFromImpl() {
    return (tableName: string) => {
        const t = tableResults[tableName] || { selectResults: [], insertResults: [], updateResults: [] };
        const sr = t.selectResults.shift() || { data: null, error: null };
        const singleFn = jest.fn().mockResolvedValue(sr);
        const eqFn: jest.Mock = jest.fn().mockImplementation(() => ({ single: singleFn, eq: eqFn }));
        const ir = t.insertResults.shift() || { data: {}, error: null };
        const insertSingle = jest.fn().mockResolvedValue(ir);
        const ur = t.updateResults.shift() || { error: null };
        const updateEq = jest.fn().mockResolvedValue(ur);
        return {
            select: jest.fn().mockReturnValue({ eq: eqFn }),
            insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: insertSingle }) }),
            update: jest.fn().mockReturnValue({ eq: updateEq }),
        };
    };
}

/* ──────────────────────────────────────────────
 * 동적 import helper
 * ────────────────────────────────────────────── */

async function importRoute() {
    // 매번 모듈을 새로 로드하여 mock이 정상 적용되도록 함
    jest.resetModules();

    // Jest 모듈 레지스트리에 mock 모듈 등록
    jest.doMock('@/lib/supabase/server', () => ({
        createClient: mockCreateClient,
    }));
    jest.doMock('@/lib/portone/server', () => ({
        verifyPayment: mockVerifyPayment,
    }));
    jest.doMock('@/lib/portone/billing', () => ({
        schedulePayment: mockSchedulePayment,
    }));

    const mod = await import('./route');
    return mod;
}

/* ──────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────── */

function makeRequest(body: unknown): Request {
    return new Request('http://localhost/api/payment/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

/* ──────────────────────────────────────────────
 * Tests
 * ────────────────────────────────────────────── */

describe('POST /api/payment/webhook', () => {
    beforeEach(() => {
        mockVerifyPayment.mockReset();
        mockSchedulePayment.mockReset();
        mockRpc.mockReset();
        mockCreateClient.mockReset();
        mockCreateClient.mockResolvedValue({
            from: jest.fn().mockImplementation(createFromImpl()),
            rpc: mockRpc,
        });
        resetTableResults();
    });

    // ── 기본 필터링 ──

    it('BillingKey.Issued 이벤트는 무시하고 200 반환', async () => {
        const { POST } = await importRoute();
        const res = await POST(makeRequest({
            type: 'BillingKey.Issued',
            timestamp: '2026-02-19T14:00:00.000Z',
            data: { storeId: 's', billingKey: 'bk' },
        }));
        expect(res.status).toBe(200);
        expect((await res.json()).received).toBe(true);
        expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('구독 결제가 아닌(sub_ 접두사 없는) 결제는 무시', async () => {
        const { POST } = await importRoute();
        const res = await POST(makeRequest({
            type: 'Transaction.Paid',
            timestamp: '2026-02-19T14:00:00.000Z',
            data: { paymentId: 'ticket_123', storeId: 's' },
        }));
        expect(res.status).toBe(200);
        expect((await res.json()).skipped).toBe(true);
    });

    it('paymentId가 없으면 무시', async () => {
        const { POST } = await importRoute();
        const res = await POST(makeRequest({
            type: 'Transaction.Paid',
            timestamp: '2026-02-19T14:00:00.000Z',
            data: { storeId: 's' },
        }));
        expect(res.status).toBe(200);
        expect((await res.json()).skipped).toBe(true);
    });

    // ── Transaction.Paid ──

    it('이미 처리된 결제는 멱등하게 duplicate 반환', async () => {
        mockVerifyPayment.mockResolvedValueOnce({
            status: 'PAID', id: 'sub_pro_dup', amount: { total: 29000 },
        });
        setupTable('subscription_payment_history', {
            selectResults: [{ data: { payment_id: 'sub_pro_dup' }, error: null }],
        });

        const { POST } = await importRoute();
        const res = await POST(makeRequest({
            type: 'Transaction.Paid',
            timestamp: '2026-02-19T14:00:00.000Z',
            data: { paymentId: 'sub_pro_dup', storeId: 's', transactionId: 't' },
        }));
        expect(res.status).toBe(200);
        expect((await res.json()).duplicate).toBe(true);
    });

    it('Transaction.Paid 정상: 구독 활성화 + 다음달 예약', async () => {
        mockVerifyPayment.mockResolvedValueOnce({
            status: 'PAID', id: 'sub_pro_ok', amount: { total: 29000 }, currency: 'KRW',
        });
        setupTable('subscription_payment_history', {
            selectResults: [{ data: null, error: null }],
            insertResults: [{ data: {}, error: null }],
        });
        setupTable('subscription_billing', {
            selectResults: [{
                data: { user_id: 'u1', billing_key: 'bk1', plan_id: 'pro', retry_count: 0 },
                error: null,
            }],
            updateResults: [{ error: null }],
        });
        mockRpc.mockResolvedValueOnce({
            data: { success: true, tickets_naver: 10 }, error: null,
        });
        mockSchedulePayment.mockResolvedValueOnce({ schedule: { id: 'sn' } });

        const { POST } = await importRoute();
        const res = await POST(makeRequest({
            type: 'Transaction.Paid',
            timestamp: '2026-02-19T14:00:00.000Z',
            data: { paymentId: 'sub_pro_ok', storeId: 's', transactionId: 't' },
        }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.processed).toBe(true);
        expect(mockVerifyPayment).toHaveBeenCalledWith('sub_pro_ok');
        expect(mockRpc).toHaveBeenCalledWith('activate_subscription', expect.objectContaining({
            p_user_id: 'u1', p_plan_id: 'pro',
        }));
    });

    // ── Transaction.Failed ──

    it('Transaction.Failed: 재시도 카운트 증가 + past_due', async () => {
        mockVerifyPayment.mockResolvedValueOnce({
            status: 'FAILED', id: 'sub_pro_f1', amount: { total: 29000 },
        });
        setupTable('subscription_payment_history', {
            selectResults: [{ data: null, error: null }],
            insertResults: [{ data: {}, error: null }],
        });
        setupTable('subscription_billing', {
            selectResults: [{
                data: {
                    user_id: 'u2', billing_key: 'bk2', plan_id: 'pro',
                    retry_count: 0, next_payment_id: 'sub_pro_f1',
                },
                error: null,
            }],
            updateResults: [{ error: null }],
        });
        mockSchedulePayment.mockResolvedValueOnce({ schedule: { id: 'sr' } });

        const { POST } = await importRoute();
        const res = await POST(makeRequest({
            type: 'Transaction.Failed',
            timestamp: '2026-02-19T14:00:00.000Z',
            data: { paymentId: 'sub_pro_f1', storeId: 's', transactionId: 'tf' },
        }));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.failed).toBe(true);
        expect(body.retry).toBe(true);
        expect(mockSchedulePayment).toHaveBeenCalled();
    });

    // ── 에러 안전성 ──

    it('서버 에러 발생해도 항상 200 반환 (Webhook 안정성)', async () => {
        mockVerifyPayment.mockRejectedValueOnce(new Error('Network Error'));

        const { POST } = await importRoute();
        const res = await POST(makeRequest({
            type: 'Transaction.Paid',
            timestamp: '2026-02-19T14:00:00.000Z',
            data: { paymentId: 'sub_pro_err', storeId: 's' },
        }));
        expect(res.status).toBe(200);
    });
});
