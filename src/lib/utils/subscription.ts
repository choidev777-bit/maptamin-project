import { PLAN_CONFIG } from '@/lib/pricing/config';

/**
 * 구독 상태 확인 헬퍼 함수들
 * 플랜별 기능 접근 제어에 사용
 */

/** 유료 구독 여부 확인 */
export function isSubscribed(planId: string): boolean {
    return planId !== 'free';
}

/** 플랫폼 접근 가능 여부 */
export function canAccessPlatform(planId: string, platform: 'naver' | 'google'): boolean {
    const config = PLAN_CONFIG[planId];
    if (!config) return false;

    if (config.channels === 'none') return false;
    if (platform === 'naver') return config.channels === 'naver' || config.channels === 'naver+google';
    if (platform === 'google') return config.channels === 'naver+google';

    return false;
}

/** 플랜별 최대 그리드 크기 */
export function getMaxGridSize(planId: string): number {
    const config = PLAN_CONFIG[planId];
    if (!config) return 0;
    return config.gridSize;
}

/** 허용된 그리드 크기 목록 (3, 5, 7 중) */
export function getAllowedGridSizes(planId: string): number[] {
    const maxSize = getMaxGridSize(planId);
    const allSizes = [3, 5, 7];
    return allSizes.filter(size => size <= maxSize);
}

/** 경쟁사 관리 가능 여부 */
export function canManageCompetitors(planId: string): boolean {
    const config = PLAN_CONFIG[planId];
    if (!config) return false;
    return (config.competitorsNaver + config.competitorsGoogle) > 0;
}

/** 플랜별 최대 키워드 수 */
export function getMaxKeywords(planId: string, platform: 'naver' | 'google'): number {
    const config = PLAN_CONFIG[planId];
    if (!config) return 0;
    return platform === 'naver' ? config.keywordsNaver : config.keywordsGoogle;
}

/** 플랜별 최대 경쟁사 수 */
export function getMaxCompetitors(planId: string, platform: 'naver' | 'google'): number {
    const config = PLAN_CONFIG[planId];
    if (!config) return 0;
    return platform === 'naver' ? config.competitorsNaver : config.competitorsGoogle;
}

/** 업그레이드가 필요한 최소 플랜 이름 반환 */
export function getRequiredPlanForPlatform(platform: 'naver' | 'google'): string {
    if (platform === 'google') return 'Premium';
    return 'Starter';
}

/** 업그레이드가 필요한 최소 플랜 (경쟁사 기능) */
export function getRequiredPlanForCompetitors(): string {
    return 'Pro';
}

/** 플랜 표시 이름 */
export function getPlanDisplayName(planId: string): string {
    const names: Record<string, string> = {
        free: '무료',
        starter: 'Starter',
        pro: 'Pro',
        premium: 'Premium',
    };
    return names[planId] || planId;
}
/** 키워드 변경 가능 여부 확인 (가게 잠금 기준) */
export function canUpdateKeywords(lockedUntil: string | null): boolean {
    if (!lockedUntil) return true;
    return new Date() > new Date(lockedUntil);
}
