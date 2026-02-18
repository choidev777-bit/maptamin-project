/**
 * subscription.ts 유틸리티 함수 단위 테스트
 */

// PLAN_CONFIG를 모킹하지 않고 실제 값으로 테스트

import {
    isSubscribed,
    canAccessPlatform,
    getMaxGridSize,
    getAllowedGridSizes,
    canManageCompetitors,
    getMaxKeywords,
    getMaxCompetitors,
    getRequiredPlanForPlatform,
    getRequiredPlanForCompetitors,
    getPlanDisplayName,
} from './subscription';

describe('isSubscribed', () => {
    it('free 플랜은 미구독', () => {
        expect(isSubscribed('free')).toBe(false);
    });

    it('starter 플랜은 구독 중', () => {
        expect(isSubscribed('starter')).toBe(true);
    });

    it('pro 플랜은 구독 중', () => {
        expect(isSubscribed('pro')).toBe(true);
    });

    it('premium 플랜은 구독 중', () => {
        expect(isSubscribed('premium')).toBe(true);
    });
});

describe('canAccessPlatform', () => {
    describe('free 플랜', () => {
        it('네이버 접근 불가', () => {
            expect(canAccessPlatform('free', 'naver')).toBe(false);
        });
        it('구글 접근 불가', () => {
            expect(canAccessPlatform('free', 'google')).toBe(false);
        });
    });

    describe('starter 플랜', () => {
        it('네이버 접근 가능', () => {
            expect(canAccessPlatform('starter', 'naver')).toBe(true);
        });
        it('구글 접근 불가', () => {
            expect(canAccessPlatform('starter', 'google')).toBe(false);
        });
    });

    describe('pro 플랜', () => {
        it('네이버 접근 가능', () => {
            expect(canAccessPlatform('pro', 'naver')).toBe(true);
        });
        it('구글 접근 불가', () => {
            expect(canAccessPlatform('pro', 'google')).toBe(false);
        });
    });

    describe('premium 플랜', () => {
        it('네이버 접근 가능', () => {
            expect(canAccessPlatform('premium', 'naver')).toBe(true);
        });
        it('구글 접근 가능', () => {
            expect(canAccessPlatform('premium', 'google')).toBe(true);
        });
    });

    describe('알 수 없는 플랜', () => {
        it('접근 불가', () => {
            expect(canAccessPlatform('unknown', 'naver')).toBe(false);
        });
    });
});

describe('getMaxGridSize', () => {
    it('free → 0', () => {
        expect(getMaxGridSize('free')).toBe(0);
    });
    it('starter → 3', () => {
        expect(getMaxGridSize('starter')).toBe(3);
    });
    it('pro → 5', () => {
        expect(getMaxGridSize('pro')).toBe(5);
    });
    it('premium → 7', () => {
        expect(getMaxGridSize('premium')).toBe(7);
    });
});

describe('getAllowedGridSizes', () => {
    it('free → 빈 배열', () => {
        expect(getAllowedGridSizes('free')).toEqual([]);
    });
    it('starter → [3]', () => {
        expect(getAllowedGridSizes('starter')).toEqual([3]);
    });
    it('pro → [3, 5]', () => {
        expect(getAllowedGridSizes('pro')).toEqual([3, 5]);
    });
    it('premium → [3, 5, 7]', () => {
        expect(getAllowedGridSizes('premium')).toEqual([3, 5, 7]);
    });
});

describe('canManageCompetitors', () => {
    it('free → 불가', () => {
        expect(canManageCompetitors('free')).toBe(false);
    });
    it('starter → 불가 (0개)', () => {
        expect(canManageCompetitors('starter')).toBe(false);
    });
    it('pro → 가능', () => {
        expect(canManageCompetitors('pro')).toBe(true);
    });
    it('premium → 가능', () => {
        expect(canManageCompetitors('premium')).toBe(true);
    });
});

describe('getMaxKeywords', () => {
    it('starter 네이버 → 2', () => {
        expect(getMaxKeywords('starter', 'naver')).toBe(2);
    });
    it('pro 네이버 → 5', () => {
        expect(getMaxKeywords('pro', 'naver')).toBe(5);
    });
    it('premium 구글 → 5', () => {
        expect(getMaxKeywords('premium', 'google')).toBe(5);
    });
    it('starter 구글 → 0', () => {
        expect(getMaxKeywords('starter', 'google')).toBe(0);
    });
});

describe('getMaxCompetitors', () => {
    it('starter 네이버 → 0', () => {
        expect(getMaxCompetitors('starter', 'naver')).toBe(0);
    });
    it('pro 네이버 → 1', () => {
        expect(getMaxCompetitors('pro', 'naver')).toBe(1);
    });
    it('premium 네이버 → 10', () => {
        expect(getMaxCompetitors('premium', 'naver')).toBe(10);
    });
    it('premium 구글 → 10', () => {
        expect(getMaxCompetitors('premium', 'google')).toBe(10);
    });
});

describe('getRequiredPlanForPlatform', () => {
    it('구글 → Premium', () => {
        expect(getRequiredPlanForPlatform('google')).toBe('Premium');
    });
    it('네이버 → Starter', () => {
        expect(getRequiredPlanForPlatform('naver')).toBe('Starter');
    });
});

describe('getRequiredPlanForCompetitors', () => {
    it('경쟁사 → Pro', () => {
        expect(getRequiredPlanForCompetitors()).toBe('Pro');
    });
});

describe('getPlanDisplayName', () => {
    it('free → 무료', () => {
        expect(getPlanDisplayName('free')).toBe('무료');
    });
    it('starter → Starter', () => {
        expect(getPlanDisplayName('starter')).toBe('Starter');
    });
    it('premium → Premium', () => {
        expect(getPlanDisplayName('premium')).toBe('Premium');
    });
    it('알 수 없는 플랜 → 원본 반환', () => {
        expect(getPlanDisplayName('unknown')).toBe('unknown');
    });
});
