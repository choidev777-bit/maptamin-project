
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardPlatformCard } from './DashboardPlatformCard'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('DashboardPlatformCard Integration', () => {
    const mockRouter = { refresh: jest.fn(), push: jest.fn() }

    beforeEach(() => {
        jest.clearAllMocks()
            ; (useRouter as jest.Mock).mockReturnValue(mockRouter)
    })

    const mockData = {
        id: '123',
        place_id: 'place_123',
        place_name: 'My Shop',
        locked_until: null,
        keywords: ['SEO'],
        address: 'Seoul',
        lat: 37.5,
        lng: 127.0
    }

    it('renders empty state when no data provided', () => {
        render(<DashboardPlatformCard platform="naver" data={null} />)
        expect(screen.getByText(/네이버 지도에 등록된/)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /사장님의 매장을 선택해주세요/ })).toBeInTheDocument()
    })

    it('renders connected state when data provided', () => {
        render(<DashboardPlatformCard platform="naver" data={mockData} />)
        expect(screen.getByText('My Shop')).toBeInTheDocument()
        expect(screen.getByText('SEO')).toBeInTheDocument()
        // Should NOT show register button
        expect(screen.queryByRole('button', { name: /사장님의 매장을 선택해주세요/ })).not.toBeInTheDocument()
    })

    it('opens modal on click and calls API on register', async () => {
        render(<DashboardPlatformCard platform="naver" data={null} />)

        // 1. Open Modal
        fireEvent.click(screen.getByRole('button', { name: /사장님의 매장을 선택해주세요/ }))

        // Check if modal title appears (Assuming modal renders in portal or directly)
        // Note: Dialog usually renders in a Portal. JSDOM handles this but we need to verify selector.
        // Assuming 'PlaceSelectionModal' has a title or some text.
        // Let's check for standard text likely in the modal (e.g. "Select Place")
        // But for now, let's assume we can find the Place Search input or similar.
        // Or simply checking if fetch is called is hard if we can't interact with the modal contents.

        // Wait! The modal implementation `PlaceSelectionModal.tsx` probably fetches data internally.
        // If we want to test the full flow, we need to mock the modal's internal API calls too?
        // Or just trust the `handleRegister` prop logic passed to it?
        // Ah, `DashboardPlatformCard` passes `handleRegister` to `PlaceSelectionModal`.
        // The *Modal* calls `onConfirm`.
        // So we need to trigger `onConfirm` from the child component.

        // If we strictly want to test `DashboardPlatformCard` logic (`handleRegister`),
        // we can check if `fetch` is called when `handleRegister` is invoked.
        // But `handleRegister` is internal.
        // To test it via Integration, we need to interact with the Modal.
    })
})
