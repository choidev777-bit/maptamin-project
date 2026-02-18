import { PlanV2 } from '@/lib/types';

/**
 * v2 요금제 설정 (티켓 기반: starter / pro / premium)
 * @see Docs/update_plan.md
 */
export const PLAN_CONFIG: Record<string, {
    price: number;
    gridSize: number;
    ticketsNaver: number;
    ticketsGoogle: number;
    keywordsNaver: number;
    keywordsGoogle: number;
    competitorsNaver: number;
    competitorsGoogle: number;
    channels: 'none' | 'naver' | 'naver+google';
}> = {
    free: {
        price: 0,
        gridSize: 0,
        ticketsNaver: 0,
        ticketsGoogle: 0,
        keywordsNaver: 0,
        keywordsGoogle: 0,
        competitorsNaver: 0,
        competitorsGoogle: 0,
        channels: 'none',
    },
    starter: {
        price: 9900,
        gridSize: 3,
        ticketsNaver: 2,
        ticketsGoogle: 0,
        keywordsNaver: 2,
        keywordsGoogle: 0,
        competitorsNaver: 0,
        competitorsGoogle: 0,
        channels: 'naver',
    },
    pro: {
        price: 29000,
        gridSize: 5,
        ticketsNaver: 10,
        ticketsGoogle: 0,
        keywordsNaver: 5,
        keywordsGoogle: 0,
        competitorsNaver: 1,
        competitorsGoogle: 0,
        channels: 'naver',
    },
    premium: {
        price: 99000,
        gridSize: 7,
        ticketsNaver: 15,
        ticketsGoogle: 15,
        keywordsNaver: 5,
        keywordsGoogle: 5,
        competitorsNaver: 10,
        competitorsGoogle: 10,
        channels: 'naver+google',
    },
};

/** 플랜 제한값 조회 (기본값: starter) */
export function getPlanLimit(planId: string = 'starter') {
    const plan = PLAN_CONFIG[planId] || PLAN_CONFIG['starter'];
    return {
        gridSize: plan.gridSize,
        competitorsNaver: plan.competitorsNaver,
        competitorsGoogle: plan.competitorsGoogle,
        keywordsNaver: plan.keywordsNaver,
        keywordsGoogle: plan.keywordsGoogle,
        ticketsNaver: plan.ticketsNaver,
        ticketsGoogle: plan.ticketsGoogle,
        channels: plan.channels,
    };
}
