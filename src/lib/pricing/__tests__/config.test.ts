/**
 * PLAN_CONFIG placeLock 필드 검증 테스트
 * 프리미엄 플랜은 placeLock=false (30일 락 면제)
 * 스타터/프로는 placeLock=true (30일 락 적용)
 */

import { PLAN_CONFIG } from '../config';

describe('PLAN_CONFIG.placeLock', () => {
    it('free 플랜은 placeLock=false (매장 등록 자체 불가)', () => {
        expect(PLAN_CONFIG['free'].placeLock).toBe(false);
    });

    it('starter 플랜은 placeLock=true (30일 락 적용)', () => {
        expect(PLAN_CONFIG['starter'].placeLock).toBe(true);
    });

    it('pro 플랜은 placeLock=true (30일 락 적용)', () => {
        expect(PLAN_CONFIG['pro'].placeLock).toBe(true);
    });

    it('premium 플랜은 placeLock=false (30일 락 면제)', () => {
        expect(PLAN_CONFIG['premium'].placeLock).toBe(false);
    });

    it('모든 플랜에 placeLock 필드가 존재해야 함', () => {
        Object.keys(PLAN_CONFIG).forEach((planId) => {
            expect(PLAN_CONFIG[planId]).toHaveProperty('placeLock');
            expect(typeof PLAN_CONFIG[planId].placeLock).toBe('boolean');
        });
    });
});
