import { PlanV2 } from '@/lib/types';

/**
 * v2 요금제 설정 (티켓 기반: starter / pro / premium)
 *
 * ⚠️ 가격 정책:
 * - price 는 **VAT(10%) 포함 최종 결제 금액**입니다.
 * - 별도 VAT 가산 없이 이 값 그대로 결제 및 표시에 사용합니다.
 * - 월간 결제만 지원합니다.
 *
 * @see Docs/update_plan.md
 * @see Docs/terms_of_service_draft.md 제20조 (환불)
 */
export const PLAN_CONFIG: Record<string, {
    name: string;
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
        name: '무료',
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
        name: '스타터',
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
        name: '프로',
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
        name: '프리미엄',
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

/** 플랜 이름 조회 (한국어) */
export function getPlanName(planId: string): string {
    return PLAN_CONFIG[planId]?.name || planId;
}

/** 결제 금액 조회 (VAT 포함, 월간 결제만 지원) */
export function getPlanPrice(planId: string): number {
    const plan = PLAN_CONFIG[planId];
    if (!plan) return 0;
    return plan.price;
}

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
