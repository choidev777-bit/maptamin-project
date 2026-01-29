
import { CostCalculator } from '../cost-calculator';
import { GridPoint } from '@/lib/types';

describe('CostCalculator', () => {
    describe('calculate', () => {
        it('should return 0 if keywords list is empty', () => {
            const points: GridPoint[] = [{ lat: 0, lng: 0, enabled: true }];
            expect(CostCalculator.calculate([], points)).toBe(0);
        });

        it('should return 0 if grid points list is empty', () => {
            expect(CostCalculator.calculate(['keyword'], [])).toBe(0);
        });

        it('should calculate cost correctly: keywords * active points', () => {
            const keywords = ['k1', 'k2'];
            const points: GridPoint[] = [
                { lat: 0, lng: 0, enabled: true },
                { lat: 0, lng: 0, enabled: true },
                { lat: 0, lng: 0, enabled: true },
            ];
            // 2 keywords * 3 points = 6
            expect(CostCalculator.calculate(keywords, points)).toBe(6);
        });

        it('should ignore disabled grid points', () => {
            const keywords = ['k1'];
            const points: GridPoint[] = [
                { lat: 0, lng: 0, enabled: true },
                { lat: 0, lng: 0, enabled: false }, // disabled
                { lat: 0, lng: 0, enabled: true },
            ];
            // 1 keyword * 2 active points = 2
            expect(CostCalculator.calculate(keywords, points)).toBe(2);
        });
    });

    describe('estimate', () => {
        it('should estimate based on grid size (N x N)', () => {
            // 2 keywords, 3x3 grid (9 points) => 18
            expect(CostCalculator.estimate(2, 3)).toBe(18);
        });

        it('should return 0 if no keywords', () => {
            expect(CostCalculator.estimate(0, 5)).toBe(0);
        });
    });
});
