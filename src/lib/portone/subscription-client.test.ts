/**
 * PortOne 구독 빌링키 클라이언트 테스트 (TDD)
 *
 * 테스트 대상: src/lib/portone/subscription-client.ts
 *
 * 검증 항목:
 *   - card → KCP 채널 키 + billingKeyMethod 'CARD'
 *   - paymentMethod 미지정 → 기본값 card
 */

const mockRequestIssueBillingKey = jest.fn()
jest.mock('@portone/browser-sdk/v2', () => ({
    requestIssueBillingKey: (...args: unknown[]) => mockRequestIssueBillingKey(...args),
}))

const MOCK_KCP_BILLING_KEY = 'channel-key-kcp-billing-test'
const MOCK_SUB_STORE_ID = 'store-test-12345'
const originalSubEnv = process.env

beforeEach(() => {
    jest.resetModules()
    mockRequestIssueBillingKey.mockReset()
    process.env = {
        ...originalSubEnv,
        NEXT_PUBLIC_PORTONE_STORE_ID: MOCK_SUB_STORE_ID,
        NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY: MOCK_KCP_BILLING_KEY,
    }
})

afterAll(() => {
    process.env = originalSubEnv
})

async function importSubscriptionClient() {
    return await import('./subscription-client')
}

describe('requestBillingKey - 카드 결제', () => {
    it('[card] KCP 채널 키와 billingKeyMethod CARD를 사용해야 한다', async () => {
        const { requestBillingKey } = await importSubscriptionClient()

        mockRequestIssueBillingKey.mockResolvedValueOnce({ billingKey: 'billing_abc' })

        await requestBillingKey({ planId: 'pro' })

        expect(mockRequestIssueBillingKey).toHaveBeenCalledWith(
            expect.objectContaining({
                channelKey: MOCK_KCP_BILLING_KEY,
                billingKeyMethod: 'CARD',
            })
        )
    })

    it('[card] issueName이 포함되어야 한다', async () => {
        const { requestBillingKey } = await importSubscriptionClient()

        mockRequestIssueBillingKey.mockResolvedValueOnce({ billingKey: 'billing_jkl' })

        await requestBillingKey({ planId: 'pro' })

        expect(mockRequestIssueBillingKey).toHaveBeenCalledWith(
            expect.objectContaining({
                issueName: expect.stringContaining('프로'),
            })
        )
    })
})
