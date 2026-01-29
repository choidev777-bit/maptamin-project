import { GridPoint } from '@/lib/types';

export class CostCalculator {
    /**
     * Calculates the point cost for a search.
     * Core Logic: 1 Point per keyword per ACTIVE grid point.
     *
     * @param keywords List of keywords
     * @param gridPoints List of grid points
     * @returns Total point cost
     */
    static calculate(keywords: string[], gridPoints: GridPoint[]): number {
        if (!keywords || keywords.length === 0) return 0;
        if (!gridPoints || gridPoints.length === 0) return 0;

        const activePoints = gridPoints.filter((p) => p.enabled).length;
        return keywords.length * activePoints;
    }

    /**
     * Estimates cost based on grid structure (e.g., 3x3)
     */
    static estimate(keywordsCount: number, gridSize: number): number {
        return keywordsCount * (gridSize * gridSize);
    }
}
