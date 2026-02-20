import { render, screen, fireEvent } from '@testing-library/react'
import { PlanCard } from './PlanCard'

// Mock getPlanDisplayName if needed, or just rely on it if it's simple.
// For now, let's assume we pass necessary props directly or the component uses the utility.
// If the component uses the utility, we might want to mock it to keep unit tests isolated,
// but for a pure UI component, maybe passing all display strings as props is better?
// Looking at UpgradePageContent.tsx, it uses getPlanDisplayName internally for the button logic?
// actually UpgradePageContent uses getPlanDisplayName for CURRENT plan name in the header,
// but for the card itself, it seems to rely on the `plan` object properties.
// Let's design PlanCard to take a `plan` object and `isYearly` prop.

const MOCK_PLAN = {
    id: 'test-plan',
    name: '테스트 플랜',
    tagline: '테스트용 태그',
    monthly: '10,000원',
    yearly: '9,000원',
    yearlyTotal: '연 108,000원',
    featured: false,
    features: [
        { text: '기능 1', included: true },
        { text: '기능 2', included: false },
    ],
    cta: '시작하기',
    ctaStyle: 'solid' as const,
}

describe('PlanCard', () => {
    const handleSelect = jest.fn()

    beforeEach(() => {
        handleSelect.mockClear()
    })

    it('renders plan details correctly in monthly view', () => {
        render(
            <PlanCard
                plan={MOCK_PLAN}
                isYearly={false}
                currentPlanId="free"
                onSelect={handleSelect}
            />
        )

        expect(screen.getByText('테스트 플랜')).toBeInTheDocument()
        expect(screen.getByText('테스트용 태그')).toBeInTheDocument()
        expect(screen.getByText('10,000원')).toBeInTheDocument()
        expect(screen.getByText('/월')).toBeInTheDocument()
        // verify yearly total is NOT shown
        expect(screen.queryByText('연 108,000원')).not.toBeInTheDocument()
    })

    it('renders plan details correctly in yearly view', () => {
        render(
            <PlanCard
                plan={MOCK_PLAN}
                isYearly={true}
                currentPlanId="free"
                onSelect={handleSelect}
            />
        )

        expect(screen.getByText('9,000원')).toBeInTheDocument()
        expect(screen.getByText('(연 108,000원)')).toBeInTheDocument()
    })

    it('renders features list correctly', () => {
        render(
            <PlanCard
                plan={MOCK_PLAN}
                isYearly={false}
                currentPlanId="free"
                onSelect={handleSelect}
            />
        )

        expect(screen.getByText('기능 1')).toBeInTheDocument()
        expect(screen.getByText('기능 2')).toBeInTheDocument()
        // We could verify icons too if we want to be strict, but text is good enough for now
    })

    it('calls onSelect when CTA button is clicked', () => {
        render(
            <PlanCard
                plan={MOCK_PLAN}
                isYearly={false}
                currentPlanId="free"
                onSelect={handleSelect}
            />
        )

        const button = screen.getByRole('button', { name: /테스트 플랜로 전환/i })
        fireEvent.click(button)
        expect(handleSelect).toHaveBeenCalledWith('test-plan')
    })

    it('disables button if it is the current plan', () => {
        render(
            <PlanCard
                plan={MOCK_PLAN}
                isYearly={false}
                currentPlanId="test-plan"
                onSelect={handleSelect}
            />
        )

        const button = screen.getByRole('button', { name: /현재 이용 중/i })
        expect(button).toBeDisabled()
        fireEvent.click(button)
        expect(handleSelect).not.toHaveBeenCalled()
    })
})
