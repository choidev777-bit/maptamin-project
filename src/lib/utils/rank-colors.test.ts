import {
    getRankColor,
    getRankBgClass,
    getRankLabel,
    getRankCategory,
} from './rank-colors'

describe('rank-colors', () => {
    describe('getRankColor (naver - default)', () => {
        it('should return red for null rank', () => {
            expect(getRankColor(null)).toBe('#ef4444')
        })

        it('should return green for rank 1-5', () => {
            expect(getRankColor(1)).toBe('#22c55e')
            expect(getRankColor(3)).toBe('#22c55e')
            expect(getRankColor(5)).toBe('#22c55e')
        })

        it('should return yellow for rank 6-10', () => {
            expect(getRankColor(6)).toBe('#eab308')
            expect(getRankColor(10)).toBe('#eab308')
        })

        it('should return red for rank > 10', () => {
            expect(getRankColor(11)).toBe('#ef4444')
            expect(getRankColor(100)).toBe('#ef4444')
        })
    })

    describe('getRankColor (google)', () => {
        it('should return green for rank 1-3', () => {
            expect(getRankColor(1, 'google')).toBe('#22c55e')
            expect(getRankColor(3, 'google')).toBe('#22c55e')
        })

        it('should return yellow for rank 4-10', () => {
            expect(getRankColor(4, 'google')).toBe('#eab308')
            expect(getRankColor(5, 'google')).toBe('#eab308')
            expect(getRankColor(10, 'google')).toBe('#eab308')
        })

        it('should return red for rank > 10', () => {
            expect(getRankColor(11, 'google')).toBe('#ef4444')
            expect(getRankColor(100, 'google')).toBe('#ef4444')
        })
    })

    describe('getRankBgClass (naver - default)', () => {
        it('should return red for null rank', () => {
            expect(getRankBgClass(null)).toBe('bg-red-500')
        })

        it('should return green class for ranks 1-5', () => {
            expect(getRankBgClass(1)).toBe('bg-green-500')
            expect(getRankBgClass(5)).toBe('bg-green-500')
        })

        it('should return yellow class for ranks 6-10', () => {
            expect(getRankBgClass(6)).toBe('bg-yellow-500')
            expect(getRankBgClass(10)).toBe('bg-yellow-500')
        })

        it('should return red class for ranks > 10', () => {
            expect(getRankBgClass(11)).toBe('bg-red-500')
        })
    })

    describe('getRankBgClass (google)', () => {
        it('should return green class for ranks 1-3', () => {
            expect(getRankBgClass(1, 'google')).toBe('bg-green-500')
            expect(getRankBgClass(3, 'google')).toBe('bg-green-500')
        })

        it('should return yellow class for ranks 4-10', () => {
            expect(getRankBgClass(4, 'google')).toBe('bg-yellow-500')
            expect(getRankBgClass(10, 'google')).toBe('bg-yellow-500')
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

    describe('getRankCategory (naver - default)', () => {
        it('should return "순위권 외" for null rank', () => {
            expect(getRankCategory(null)).toBe('순위권 외')
        })

        it('should return "상위" for ranks 1-5', () => {
            expect(getRankCategory(1)).toBe('상위')
            expect(getRankCategory(5)).toBe('상위')
        })

        it('should return "중위" for ranks 6-10', () => {
            expect(getRankCategory(6)).toBe('중위')
            expect(getRankCategory(10)).toBe('중위')
        })

        it('should return "하위" for ranks > 10', () => {
            expect(getRankCategory(11)).toBe('하위')
        })
    })

    describe('getRankCategory (google)', () => {
        it('should return "상위" for ranks 1-3', () => {
            expect(getRankCategory(1, 'google')).toBe('상위')
            expect(getRankCategory(3, 'google')).toBe('상위')
        })

        it('should return "중위" for ranks 4-10', () => {
            expect(getRankCategory(4, 'google')).toBe('중위')
            expect(getRankCategory(10, 'google')).toBe('중위')
        })

        it('should return "하위" for ranks > 10', () => {
            expect(getRankCategory(11, 'google')).toBe('하위')
        })
    })
})
