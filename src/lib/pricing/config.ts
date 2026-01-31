import { Plan } from '@/lib/types';

export const PLAN_CONFIG: Record<string, Omit<Plan, 'id' | 'name' | 'monthly_points' | 'max_grid_size' | 'limits'> & {
    price: number,
    points: number,
    limits: { place: number, competitor: number, gridSize: number }
}> = {
    light: {
        price: 19900,
        points: 1000,
        limits: { place: 1, competitor: 0, gridSize: 3 }
    },
    basic: {
        price: 59000,
        points: 5000,
        limits: { place: 1, competitor: 3, gridSize: 5 }
    },
    pro: {
        price: 99000,
        points: 12000,
        limits: { place: 3, competitor: 10, gridSize: 7 }
    }
};

// Helper to get limit safely
export function getPlanLimit(planId: string = 'light') {
    const plan = PLAN_CONFIG[planId] || PLAN_CONFIG['light'];
    return plan.limits;
}
