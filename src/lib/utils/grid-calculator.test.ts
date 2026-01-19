import {
    calculateGridPoints,
    generateGridPointsFromTemplate,
    milesToKm,
    kmToMiles,
    getEnabledPointsCount,
} from './grid-calculator'

describe('grid-calculator', () => {
    describe('calculateGridPoints', () => {
        it('should return correct number of points for 3x3 grid', () => {
            const points = calculateGridPoints(37.5665, 126.9780, 3, 1)
            expect(points).toHaveLength(9) // 3x3 = 9
        })

        it('should return correct number of points for 5x5 grid', () => {
            const points = calculateGridPoints(37.5665, 126.9780, 5, 1)
            expect(points).toHaveLength(25) // 5x5 = 25
        })

        it('should have center point at row=0, col=0', () => {
            const points = calculateGridPoints(37.5665, 126.9780, 3, 1)
            const centerPoint = points.find(p => p.row === 0 && p.col === 0)

            expect(centerPoint).toBeDefined()
            expect(centerPoint?.lat).toBeCloseTo(37.5665, 4)
            expect(centerPoint?.lng).toBeCloseTo(126.9780, 4)
        })

        it('should have all points enabled by default', () => {
            const points = calculateGridPoints(37.5665, 126.9780, 3, 1)
            expect(points.every(p => p.enabled)).toBe(true)
        })
    })

    describe('generateGridPointsFromTemplate', () => {
        it('should generate points with correct lat/lng', () => {
            const template = [
                { row: 0, col: 0, enabled: true },
                { row: 1, col: 0, enabled: true },
            ]
            const points = generateGridPointsFromTemplate(37.5665, 126.9780, template, 1)

            expect(points).toHaveLength(2)
            expect(points[0].lat).toBeCloseTo(37.5665, 4)
            expect(points[1].lat).toBeGreaterThan(37.5665) // 1km north
        })

        it('should preserve enabled status from template', () => {
            const template = [
                { row: 0, col: 0, enabled: true },
                { row: 0, col: 1, enabled: false },
            ]
            const points = generateGridPointsFromTemplate(37.5665, 126.9780, template, 1)

            expect(points[0].enabled).toBe(true)
            expect(points[1].enabled).toBe(false)
        })
    })

    describe('milesToKm', () => {
        it('should convert 1 mile to approximately 1.609 km', () => {
            expect(milesToKm(1)).toBeCloseTo(1.60934, 3)
        })

        it('should convert 0 miles to 0 km', () => {
            expect(milesToKm(0)).toBe(0)
        })

        it('should convert 10 miles correctly', () => {
            expect(milesToKm(10)).toBeCloseTo(16.0934, 3)
        })
    })

    describe('kmToMiles', () => {
        it('should convert 1 km to approximately 0.621 miles', () => {
            expect(kmToMiles(1)).toBeCloseTo(0.621, 2)
        })

        it('should convert 0 km to 0 miles', () => {
            expect(kmToMiles(0)).toBe(0)
        })

        it('should be inverse of milesToKm', () => {
            const originalMiles = 5
            const km = milesToKm(originalMiles)
            expect(kmToMiles(km)).toBeCloseTo(originalMiles, 5)
        })
    })

    describe('getEnabledPointsCount', () => {
        it('should return count of enabled points', () => {
            const points = [
                { row: 0, col: 0, lat: 0, lng: 0, enabled: true },
                { row: 0, col: 1, lat: 0, lng: 0, enabled: false },
                { row: 1, col: 0, lat: 0, lng: 0, enabled: true },
            ]
            expect(getEnabledPointsCount(points)).toBe(2)
        })

        it('should return 0 for empty array', () => {
            expect(getEnabledPointsCount([])).toBe(0)
        })

        it('should return 0 when all points are disabled', () => {
            const points = [
                { row: 0, col: 0, lat: 0, lng: 0, enabled: false },
                { row: 0, col: 1, lat: 0, lng: 0, enabled: false },
            ]
            expect(getEnabledPointsCount(points)).toBe(0)
        })
    })
})
