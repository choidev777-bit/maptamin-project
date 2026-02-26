import {
    STAGE_GRIDS,
    STAGE_META,
    getMarkerColor,
    getMarkerGlow,
    PLAYBACK_SEQUENCE,
    STAGE_DURATIONS,
} from '../hero-animation-data'

describe('hero-animation-data', () => {
    describe('STAGE_GRIDS', () => {
        it('should have exactly 3 stages', () => {
            expect(STAGE_GRIDS).toHaveLength(3)
        })

        it('each stage should have a 7×7 grid (49 values)', () => {
            STAGE_GRIDS.forEach((stage, idx) => {
                expect(stage).toHaveLength(7)
                stage.forEach((row) => {
                    expect(row).toHaveLength(7)
                })
            })
        })

        it('all rank values should be between 1 and 20', () => {
            STAGE_GRIDS.forEach((stage) => {
                stage.forEach((row) => {
                    row.forEach((rank) => {
                        expect(rank).toBeGreaterThanOrEqual(1)
                        expect(rank).toBeLessThanOrEqual(20)
                    })
                })
            })
        })

        it('Stage 1 should have the fewest green markers (rank ≤ 5)', () => {
            const countGreen = (grid: number[][]) =>
                grid.flat().filter((rank) => rank <= 5).length

            const greens = STAGE_GRIDS.map(countGreen)
            expect(greens[0]).toBeLessThan(greens[1])
            expect(greens[1]).toBeLessThan(greens[2])
        })
    })

    describe('STAGE_META', () => {
        it('should have exactly 3 entries', () => {
            expect(STAGE_META).toHaveLength(3)
        })

        it('each entry should have searchRank and label', () => {
            STAGE_META.forEach((meta) => {
                expect(meta).toHaveProperty('searchRank')
                expect(meta).toHaveProperty('label')
                expect(typeof meta.searchRank).toBe('number')
                expect(typeof meta.label).toBe('string')
            })
        })

        it('search rank should decrease from Stage 1 to Stage 3 (lower = better)', () => {
            expect(STAGE_META[0].searchRank).toBeGreaterThan(STAGE_META[1].searchRank)
            expect(STAGE_META[1].searchRank).toBeGreaterThan(STAGE_META[2].searchRank)
        })
    })

    describe('getMarkerColor', () => {
        it('should return green (#22C55E) for rank 1-5', () => {
            for (let rank = 1; rank <= 5; rank++) {
                expect(getMarkerColor(rank)).toBe('#22C55E')
            }
        })

        it('should return yellow (#EAB308) for rank 6-10', () => {
            for (let rank = 6; rank <= 10; rank++) {
                expect(getMarkerColor(rank)).toBe('#EAB308')
            }
        })

        it('should return red (#EF4444) for rank 11+', () => {
            for (const rank of [11, 12, 15, 20]) {
                expect(getMarkerColor(rank)).toBe('#EF4444')
            }
        })
    })

    describe('getMarkerGlow', () => {
        it('should return a CSS boxShadow string', () => {
            const glow = getMarkerGlow(1)
            expect(typeof glow).toBe('string')
            expect(glow).toContain('0 0')
        })

        it('should return different glows for different rank ranges', () => {
            const greenGlow = getMarkerGlow(3)
            const yellowGlow = getMarkerGlow(7)
            const redGlow = getMarkerGlow(12)
            expect(greenGlow).not.toBe(yellowGlow)
            expect(yellowGlow).not.toBe(redGlow)
        })
    })

    describe('PLAYBACK_SEQUENCE', () => {
        it('should start with Stage 3 (index 2)', () => {
            expect(PLAYBACK_SEQUENCE[0]).toBe(2)
        })

        it('should follow pattern: 3 → 1 → 2 → 3', () => {
            expect(PLAYBACK_SEQUENCE).toEqual([2, 0, 1, 2])
        })
    })

    describe('STAGE_DURATIONS', () => {
        it('should have durations matching playback sequence length', () => {
            expect(STAGE_DURATIONS).toHaveLength(PLAYBACK_SEQUENCE.length)
        })

        it('all durations should be positive numbers (in ms)', () => {
            STAGE_DURATIONS.forEach((duration) => {
                expect(duration).toBeGreaterThan(0)
            })
        })
    })
})
