/**
 * PortOne 티켓 결제 클라이언트 테스트 (TDD)
 *
 * 테스트 대상: src/lib/portone/client.ts
 *
 * 검증 항목:
 *   - card 선택 → KCP 채널 키 + payMethod 'CARD'
 *   - kakaopay 선택 → 카카오페이 채널 키 + payMethod 'EASY_PAY'
 *   - paymentMethod 미지정 → 기본값 card
 */

// PortOne browser SDK 모킹 (브라우저 전용 SDK라 jest 환경에서 직접 실행 불가)
const mockRequestPayment = jest.fn()
jest.mock('@portone/browser-sdk/v2', () => ({
    requestPayment: (...args: unknown[]) => mockRequestPayment(...args),
}))

const MOCK_KCP_TICKET_KEY = 'channel-key-kcp-ticket-test'
const MOCK_KAKAOPAY_TICKET_KEY = 'channel-key-kakaopay-ticket-test'
const MOCK_CLIENT_STORE_ID = 'store-test-12345'
const originalClientEnv = process.env

beforeEach(() => {
    jest.resetModules()
    mockRequestPayment.mockReset()
    process.env = {
        ...originalClientEnv,
        NEXT_PUBLIC_PORTONE_STORE_ID: MOCK_CLIENT_STORE_ID,
        NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY: MOCK_KCP_TICKET_KEY,
        NEXT_PUBLIC_PORTONE_KAKAOPAY_TICKET_CHANNEL_KEY: MOCK_KAKAOPAY_TICKET_KEY,
    }
})

afterAll(() => {
    process.env = originalClientEnv
})

async function importClient() {
    return await import('./client')
}

describe('requestTicketPayment - 결제 수단 분기', () => {
    it('[card] KCP 채널 키와 payMethod CARD를 사용해야 한다', async () => {
        const { requestTicketPayment } = await importClient()

        mockRequestPayment.mockResolvedValueOnce({ paymentId: 'ticket_123' })

        await requestTicketPayment({
            platform: 'naver',
            quantity: 2,
            totalAmount: 3000,
            paymentMethod: 'card',
        })

        expect(mockRequestPayment).toHaveBeenCalledWith(
            expect.objectContaining({
                channelKey: MOCK_KCP_TICKET_KEY,
                payMethod: 'CARD',
            })
        )
    })

    it('[kakaopay] 카카오페이 채널 키와 payMethod EASY_PAY를 사용해야 한다', async () => {
        const { requestTicketPayment } = await importClient()

        mockRequestPayment.mockResolvedValueOnce({ paymentId: 'ticket_456' })

        await requestTicketPayment({
            platform: 'naver',
            quantity: 1,
            totalAmount: 1500,
            paymentMethod: 'kakaopay',
        })

        expect(mockRequestPayment).toHaveBeenCalledWith(
            expect.objectContaining({
                channelKey: MOCK_KAKAOPAY_TICKET_KEY,
                payMethod: 'EASY_PAY',
            })
        )
    })

    it('[kakaopay] redirectUrl을 포함해야 한다', async () => {
        const { requestTicketPayment } = await importClient()

        mockRequestPayment.mockResolvedValueOnce({ paymentId: 'ticket_789' })

        await requestTicketPayment({
            platform: 'google',
            quantity: 3,
            totalAmount: 4500,
            paymentMethod: 'kakaopay',
        })

        expect(mockRequestPayment).toHaveBeenCalledWith(
            expect.objectContaining({
                redirectUrl: expect.stringContaining('/dashboard/shop/payment-return'),
            })
        )
    })

    it('[default] paymentMethod 미지정 시 card로 동작해야 한다', async () => {
        const { requestTicketPayment } = await importClient()

        mockRequestPayment.mockResolvedValueOnce({ paymentId: 'ticket_000' })

        await requestTicketPayment({
            platform: 'naver',
            quantity: 1,
            totalAmount: 1500,
            // paymentMethod 미지정
        })

        expect(mockRequestPayment).toHaveBeenCalledWith(
            expect.objectContaining({
                channelKey: MOCK_KCP_TICKET_KEY,
                payMethod: 'CARD',
            })
        )
    })

    it('[card] card 선택 시 redirectUrl을 포함하지 않아야 한다', async () => {
        const { requestTicketPayment } = await importClient()

        mockRequestPayment.mockResolvedValueOnce({ paymentId: 'ticket_001' })

        await requestTicketPayment({
            platform: 'naver',
            quantity: 1,
            totalAmount: 1500,
            paymentMethod: 'card',
        })

        const callArg = mockRequestPayment.mock.calls[0][0]
        expect(callArg.redirectUrl).toBeUndefined()
    })
})
