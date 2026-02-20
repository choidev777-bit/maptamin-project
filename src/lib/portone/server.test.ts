/**
 * PortOne 서버 유틸리티 테스트
 * TDD RED Phase: 이 테스트들은 server.ts 구현 전에 작성되어 처음에는 FAIL.
 */

// global fetch를 모킹
const mockFetch = jest.fn();
global.fetch = mockFetch;

// 환경 변수 모킹
const MOCK_API_SECRET = 'test-api-secret-key-12345';
const originalEnv = process.env;

beforeEach(() => {
    jest.resetModules();
    mockFetch.mockReset();
    process.env = { ...originalEnv, PORTONE_API_SECRET: MOCK_API_SECRET };
});

afterAll(() => {
    process.env = originalEnv;
});

// 동적 import로 각 테스트에서 환경 변수 반영
async function importServer() {
    return await import('./server');
}

describe('verifyPayment', () => {
    it('should return payment data when payment is valid (PAID)', async () => {
        const { verifyPayment } = await importServer();

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                status: 'PAID',
                id: 'payment-abc123',
                amount: { total: 6000 },
                currency: 'KRW',
                orderName: '네이버 실시간 진단 티켓 4장',
            }),
        });

        const result = await verifyPayment('payment-abc123');

        expect(result.status).toBe('PAID');
        expect(result.amount.total).toBe(6000);
        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.portone.io/payments/payment-abc123',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    Authorization: `PortOne ${MOCK_API_SECRET}`,
                }),
            })
        );
    });

    it('should throw error when paymentId is empty', async () => {
        const { verifyPayment } = await importServer();

        await expect(verifyPayment('')).rejects.toThrow('paymentId는 필수입니다');
    });

    it('should throw error when API Secret is not configured', async () => {
        process.env = { ...originalEnv, PORTONE_API_SECRET: undefined };

        // 모듈 캐시 초기화 후 재 import
        jest.resetModules();
        const { verifyPayment } = await import('./server');

        await expect(verifyPayment('payment-abc123')).rejects.toThrow('PORTONE_API_SECRET');
    });

    it('should throw error when PortOne API returns error', async () => {
        const { verifyPayment } = await importServer();

        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({
                type: 'PAYMENT_NOT_FOUND',
                message: '결제 건이 존재하지 않습니다.',
            }),
        });

        await expect(verifyPayment('payment-invalid')).rejects.toThrow();
    });

    it('should throw error when network fails', async () => {
        const { verifyPayment } = await importServer();

        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(verifyPayment('payment-abc123')).rejects.toThrow('Network error');
    });
});

describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
        const { cancelPayment } = await importServer();

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                cancellation: {
                    status: 'SUCCEEDED',
                    id: 'cancel-xyz789',
                    totalAmount: 6000,
                },
            }),
        });

        const result = await cancelPayment('payment-abc123', '고객 환불 요청');

        expect(result.cancellation.status).toBe('SUCCEEDED');
        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.portone.io/payments/payment-abc123/cancel',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: `PortOne ${MOCK_API_SECRET}`,
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({ reason: '고객 환불 요청' }),
            })
        );
    });

    it('should throw error when paymentId is empty', async () => {
        const { cancelPayment } = await importServer();

        await expect(cancelPayment('', '사유')).rejects.toThrow('paymentId는 필수입니다');
    });

    it('should throw error when reason is empty', async () => {
        const { cancelPayment } = await importServer();

        await expect(cancelPayment('payment-abc123', '')).rejects.toThrow('취소 사유는 필수입니다');
    });

    it('should throw error when PortOne API returns cancel error', async () => {
        const { cancelPayment } = await importServer();

        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 409,
            json: async () => ({
                type: 'PAYMENT_ALREADY_CANCELLED',
                message: '이미 취소된 결제입니다.',
            }),
        });

        await expect(cancelPayment('payment-abc123', '환불')).rejects.toThrow();
    });
});

describe('validatePaymentAmount', () => {
    it('should return true when amount matches', async () => {
        const { validatePaymentAmount } = await importServer();

        const paymentData = { status: 'PAID', amount: { total: 6000 }, currency: 'KRW' };
        expect(validatePaymentAmount(paymentData, 6000)).toBe(true);
    });

    it('should return false when amount does not match', async () => {
        const { validatePaymentAmount } = await importServer();

        const paymentData = { status: 'PAID', amount: { total: 3000 }, currency: 'KRW' };
        expect(validatePaymentAmount(paymentData, 6000)).toBe(false);
    });

    it('should return false when status is not PAID', async () => {
        const { validatePaymentAmount } = await importServer();

        const paymentData = { status: 'FAILED', amount: { total: 6000 }, currency: 'KRW' };
        expect(validatePaymentAmount(paymentData, 6000)).toBe(false);
    });
});
