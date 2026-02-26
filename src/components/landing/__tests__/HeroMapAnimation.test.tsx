import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HeroMapAnimation from '../HeroMapAnimation'

// Motion 라이브러리 모킹 (테스트 환경에서 애니메이션 불필요)
jest.mock('motion/react', () => ({
    motion: {
        div: React.forwardRef(({ children, ...props }: any, ref: any) => (
            <div ref={ref} {...props}>{children}</div>
        )),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Next.js Image 모킹
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => {
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        return <img {...props} />
    },
}))

describe('HeroMapAnimation', () => {
    it('should render 49 (7×7) grid markers', () => {
        render(<HeroMapAnimation />)
        const markers = screen.getAllByTestId(/^marker-/)
        expect(markers).toHaveLength(49)
    })

    it('should display the keyword label "근처 카페"', () => {
        render(<HeroMapAnimation />)
        expect(screen.getByText(/근처 카페/)).toBeInTheDocument()
    })

    it('should display the store name "맵타민네 카페"', () => {
        render(<HeroMapAnimation />)
        const elements = screen.getAllByText(/맵타민네 카페/)
        expect(elements.length).toBeGreaterThanOrEqual(1)
    })

    it('should display the "홍대 카페" search rank text', () => {
        render(<HeroMapAnimation />)
        expect(screen.getByText(/홍대 카페/)).toBeInTheDocument()
    })

    it('should display the "내 매장" label on center marker', () => {
        render(<HeroMapAnimation />)
        expect(screen.getByText('내 매장')).toBeInTheDocument()
    })

    it('should display rank numbers inside markers', () => {
        render(<HeroMapAnimation />)
        // Stage 3 is shown first — center should have rank 1
        const markers = screen.getAllByTestId(/^marker-/)
        // At least some markers should contain digit text
        const withDigits = markers.filter((m) => /\d/.test(m.textContent || ''))
        expect(withDigits.length).toBeGreaterThan(0)
    })
})
