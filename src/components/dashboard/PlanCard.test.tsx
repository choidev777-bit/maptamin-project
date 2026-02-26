import { render, screen, fireEvent } from '@testing-library/react'
import { PlanCard } from './PlanCard'

const MOCK_PLAN = {
    id: 'test-plan',
    name: '테스트 플랜',
    tagline: '테스트용 태그',
    monthly: '10,000원',
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

    it('renders plan details correctly', () => {
        render(
            <PlanCard
                plan={MOCK_PLAN}
                currentPlanId="free"
                onSelect={handleSelect}
            />
        )

        expect(screen.getByText('테스트 플랜')).toBeInTheDocument()
        expect(screen.getByText('테스트용 태그')).toBeInTheDocument()
        expect(screen.getByText('10,000원')).toBeInTheDocument()
        expect(screen.getByText('/월')).toBeInTheDocument()
    })

    it('renders features list correctly', () => {
        render(
            <PlanCard
                plan={MOCK_PLAN}
                currentPlanId="free"
                onSelect={handleSelect}
            />
        )

        expect(screen.getByText('기능 1')).toBeInTheDocument()
        expect(screen.getByText('기능 2')).toBeInTheDocument()
    })

    it('calls onSelect when CTA button is clicked', () => {
        render(
            <PlanCard
                plan={MOCK_PLAN}
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
