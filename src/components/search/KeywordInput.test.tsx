import { render, screen, fireEvent } from '@testing-library/react'
import { KeywordInput } from './KeywordInput'
import '@testing-library/jest-dom'

describe('KeywordInput Integration', () => {
    const mockOnChange = jest.fn()

    beforeEach(() => {
        mockOnChange.mockClear()
    })

    it('should render initial keywords', () => {
        render(
            <KeywordInput
                keywords={['강남 맛집', '홍대 카페']}
                onChange={mockOnChange}
            />
        )

        expect(screen.getByDisplayValue('강남 맛집')).toBeInTheDocument()
        expect(screen.getByDisplayValue('홍대 카페')).toBeInTheDocument()
    })

    it('should call onChange when typing', () => {
        render(
            <KeywordInput
                keywords={['']}
                onChange={mockOnChange}
            />
        )

        const input = screen.getByPlaceholderText(/키워드 입력/i)
        fireEvent.change(input, { target: { value: '새로운 키워드' } })

        expect(mockOnChange).toHaveBeenCalledWith(['새로운 키워드'])
    })

    it('should add new keyword input when add button clicked', () => {
        render(
            <KeywordInput
                keywords={['키워드1']}
                onChange={mockOnChange}
                maxKeywords={3}
            />
        )

        const addButton = screen.getByText(/키워드 추가/i)
        fireEvent.click(addButton)

        expect(mockOnChange).toHaveBeenCalledWith(['키워드1', ''])
    })

    it('should remove keyword input when remove button clicked', () => {
        // Need at least 2 keywords to show remove button
        render(
            <KeywordInput
                keywords={['키워드1', '키워드2']}
                onChange={mockOnChange}
            />
        )

        // Find remove buttons (using closest accessible role or title)
        const removeButtons = screen.getAllByTitle('삭제')
        fireEvent.click(removeButtons[0])

        expect(mockOnChange).toHaveBeenCalledWith(['키워드2'])
    })

    it('should hide add button when maxKeywords reached', () => {
        render(
            <KeywordInput
                keywords={['1', '2', '3']}
                onChange={mockOnChange}
                maxKeywords={3}
            />
        )

        expect(screen.queryByText(/키워드 추가/i)).not.toBeInTheDocument()
    })
})
