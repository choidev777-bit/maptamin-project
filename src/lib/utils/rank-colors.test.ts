import {
    getRankColor,
    getRankBgClass,
    getRankLabel,
    getRankCategory,
} from './rank-colors'

describe('rank-colors', () => {
    describe('getRankColor', () => {
        it('should return gray for null rank', () => {
            expect(getRankColor(null)).toBe('#888888')
        })

        it('should return green for rank 1-3', () => {
            expect(getRankColor(1)).toBe('#22c55e')
            expect(getRankColor(2)).toBe('#22c55e')
            expect(getRankColor(3)).toBe('#22c55e')
        })

        it('should return light green for rank 4-6', () => {
            expect(getRankColor(4)).toBe('#84cc16')
            expect(getRankColor(6)).toBe('#84cc16')
        })

        it('should return orange for rank 7-10', () => {
            expect(getRankColor(7)).toBe('#f97316')
            expect(getRankColor(10)).toBe('#f97316')
        })

        it('should return red for rank 11-15', () => {
            expect(getRankColor(11)).toBe('#ef4444')
            expect(getRankColor(15)).toBe('#ef4444')
        })

        it('should return dark red for rank > 15', () => {
            expect(getRankColor(16)).toBe('#991b1b')
            expect(getRankColor(100)).toBe('#991b1b')
        })
    })

    describe('getRankBgClass', () => {
        it('should return gray for null rank', () => {
            expect(getRankBgClass(null)).toBe('bg-gray-400')
        })

        it('should return green class for top ranks', () => {
            expect(getRankBgClass(1)).toBe('bg-green-500')
            expect(getRankBgClass(3)).toBe('bg-green-500')
        })

        it('should return lime class for ranks 4-6', () => {
            expect(getRankBgClass(4)).toBe('bg-lime-500')
            expect(getRankBgClass(6)).toBe('bg-lime-500')
        })

        it('should return orange class for ranks 7-10', () => {
            expect(getRankBgClass(7)).toBe('bg-orange-500')
            expect(getRankBgClass(10)).toBe('bg-orange-500')
        })

        it('should return red class for ranks 11-15', () => {
            expect(getRankBgClass(11)).toBe('bg-red-500')
            expect(getRankBgClass(15)).toBe('bg-red-500')
        })

        it('should return dark red class for ranks > 15', () => {
            expect(getRankBgClass(16)).toBe('bg-red-800')
        })
    })

    describe('getRankLabel', () => {
        it('should return "-" for null rank', () => {
            expect(getRankLabel(null)).toBe('-')
        })

        it('should return rank as string', () => {
            expect(getRankLabel(1)).toBe('1')
            expect(getRankLabel(10)).toBe('10')
            expect(getRankLabel(100)).toBe('100')
        })
    })

    describe('getRankCategory', () => {
        it('should return "순위권 외" for null rank', () => {
            expect(getRankCategory(null)).toBe('순위권 외')
        })

        it('should return "최상위" for ranks 1-3', () => {
            expect(getRankCategory(1)).toBe('최상위')
            expect(getRankCategory(3)).toBe('최상위')
        })

        it('should return "상위" for ranks 4-6', () => {
            expect(getRankCategory(4)).toBe('상위')
            expect(getRankCategory(6)).toBe('상위')
        })

        it('should return "중위" for ranks 7-10', () => {
            expect(getRankCategory(7)).toBe('중위')
            expect(getRankCategory(10)).toBe('중위')
        })

        it('should return "하위" for ranks 11-15', () => {
            expect(getRankCategory(11)).toBe('하위')
            expect(getRankCategory(15)).toBe('하위')
        })

        it('should return "최하위" for ranks > 15', () => {
            expect(getRankCategory(16)).toBe('최하위')
            expect(getRankCategory(100)).toBe('최하위')
        })
    })
})
