import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SubscriptionContent } from './SubscriptionContent'


// Mock dependencies
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: jest.fn(),
        back: jest.fn(),
    }),
}))

describe('SubscriptionContent Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    const defaultProps = {
        currentPlanId: 'free',
        remainingTicketsNaver: 0,
        remainingTicketsGoogle: 0,
        currentPeriodEnd: null,
        billingStatus: null,
        cardLast4: null,
        cardBrand: null,
        nextBillingDate: null,
    }

    it('renders the subscription page with toggle and plan cards', () => {
        render(<SubscriptionContent {...defaultProps} />)

        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

        // Check for Toggle
        expect(screen.getByTestId('billing-toggle')).toBeInTheDocument()

        // Check for Plan Cards
        expect(screen.getByTestId('plan-card-starter')).toBeInTheDocument()
        expect(screen.getByTestId('plan-card-pro')).toBeInTheDocument()
        expect(screen.getByTestId('plan-card-premium')).toBeInTheDocument()
    })

    it('toggles pricing between monthly and yearly', () => {
        render(<SubscriptionContent {...defaultProps} />)

        // Initial state: Yearly
        expect(screen.getByTestId('plan-price-starter')).toHaveTextContent('9,075원')

        // Click Toggle
        const toggleButton = screen.getByTestId('billing-toggle')
        fireEvent.click(toggleButton)

        // Expect Monthly price
        expect(screen.getByTestId('plan-price-starter')).toHaveTextContent('9,900원')
    })

    it('redirects to checkout page when a plan is selected', async () => {
        render(<SubscriptionContent {...defaultProps} />)

        // Find the button for 'starter' plan
        // We can use the testid we added to the price or card to find the container, then the button?
        // Or simply find by role "button" and name.
        // The button text is likely "스타터로 전환" or similar.
        // Let's use a flexible regex for "전환" or "시작하기" if strictly needed, 
        // but since we are mocking Plans, we know the text.
        // Actually, PlanCard logic: return `${plan.name}로 전환` or "업그레이드"
        // For 'starter', name is '스타터'. Text: '스타터로 전환'

        const subscribeButtons = screen.getAllByRole('button', { name: /전환|시작하기|업그레이드/i })
        const starterButton = subscribeButtons[0] // First one should be starter

        fireEvent.click(starterButton)

        // Expect redirection to checkout
        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/dashboard/subscription/checkout?plan=starter&billing=yearly')
        })
    })
})
