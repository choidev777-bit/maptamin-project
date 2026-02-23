/**
 * 온보딩 유틸리티 유닛 테스트
 *
 * Test 1.0: 접근 제어 가드 (fetchPlan 레벨 — 여기서는 computeStartStep 관련 로직만 테스트 가능)
 * Test 1.1: getSteps() — 플랜별 Step 구조
 * Test 1.2: computeStartStep() — 이탈 복구 로직
 */

import { getSteps, computeStartStep, type PlanId, type StepDef } from './onboarding-utils'

/* ====== Test 1.1: getSteps() ====== */

describe('getSteps()', () => {
    it('starter 플랜은 4개 Step (경쟁사 Skip)', () => {
        const steps = getSteps('starter')
        expect(steps).toHaveLength(4)
        expect(steps.map(s => s.id)).toEqual([
            'store',
            'keyword',
            'grid',
            'schedule',
        ])
    })

    it('pro 플랜은 5개 Step (경쟁사 포함)', () => {
        const steps = getSteps('pro')
        expect(steps).toHaveLength(5)
        expect(steps.map(s => s.id)).toEqual([
            'store',
            'keyword',
            'competitor',
            'grid',
            'schedule',
        ])
    })

    it('premium 플랜은 5개 Step (경쟁사 포함)', () => {
        const steps = getSteps('premium')
        expect(steps).toHaveLength(5)
        expect(steps.map(s => s.id)).toEqual([
            'store',
            'keyword',
            'competitor',
            'grid',
            'schedule',
        ])
    })

    it('모든 Step에는 id와 label이 존재', () => {
        const plans: PlanId[] = ['starter', 'pro', 'premium']
        for (const planId of plans) {
            const steps = getSteps(planId)
            for (const step of steps) {
                expect(step.id).toBeTruthy()
                expect(step.label).toBeTruthy()
            }
        }
    })
})

/* ====== Test 1.2: computeStartStep() ====== */

describe('computeStartStep()', () => {
    const allEmpty = {
        hasPlaces: false,
        hasKeywords: false,
        hasCompetitors: false,
        hasSchedules: false,
    }

    describe('starter 플랜', () => {
        it('모든 데이터 비어있음 → Step 0 (매장)', () => {
            expect(computeStartStep('starter', allEmpty)).toBe(0)
        })

        it('매장만 있음 → Step 1 (키워드)', () => {
            expect(computeStartStep('starter', {
                ...allEmpty,
                hasPlaces: true,
            })).toBe(1)
        })

        it('매장 + 키워드 있음 → Step 2 (그리드) — starter는 경쟁사 Skip', () => {
            const result = computeStartStep('starter', {
                ...allEmpty,
                hasPlaces: true,
                hasKeywords: true,
            })
            // starter의 steps: store(0), keyword(1), grid(2), schedule(3)
            expect(result).toBe(2)
            expect(getSteps('starter')[result].id).toBe('grid')
        })

        it('매장 + 키워드 + 스케줄 있음 → 마지막 Step (스케줄)', () => {
            const result = computeStartStep('starter', {
                hasPlaces: true,
                hasKeywords: true,
                hasCompetitors: false,
                hasSchedules: true,
            })
            expect(getSteps('starter')[result].id).toBe('schedule')
        })
    })

    describe('pro 플랜', () => {
        it('모든 데이터 비어있음 → Step 0 (매장)', () => {
            expect(computeStartStep('pro', allEmpty)).toBe(0)
        })

        it('매장만 있음 → Step 1 (키워드)', () => {
            expect(computeStartStep('pro', {
                ...allEmpty,
                hasPlaces: true,
            })).toBe(1)
        })

        it('매장 + 키워드 있음 → Step 2 (경쟁사)', () => {
            const result = computeStartStep('pro', {
                ...allEmpty,
                hasPlaces: true,
                hasKeywords: true,
            })
            expect(result).toBe(2)
            expect(getSteps('pro')[result].id).toBe('competitor')
        })

        it('매장 + 키워드 + 경쟁사 있음 → Step 3 (그리드)', () => {
            const result = computeStartStep('pro', {
                ...allEmpty,
                hasPlaces: true,
                hasKeywords: true,
                hasCompetitors: true,
            })
            expect(result).toBe(3)
            expect(getSteps('pro')[result].id).toBe('grid')
        })

        it('모든 데이터 있음 → 마지막 Step (스케줄)', () => {
            const result = computeStartStep('pro', {
                hasPlaces: true,
                hasKeywords: true,
                hasCompetitors: true,
                hasSchedules: true,
            })
            expect(getSteps('pro')[result].id).toBe('schedule')
        })
    })

    describe('premium 플랜', () => {
        it('모든 데이터 비어있음 → Step 0 (매장)', () => {
            expect(computeStartStep('premium', allEmpty)).toBe(0)
        })

        it('모든 데이터 있음 → 마지막 Step (스케줄)', () => {
            const result = computeStartStep('premium', {
                hasPlaces: true,
                hasKeywords: true,
                hasCompetitors: true,
                hasSchedules: true,
            })
            expect(getSteps('premium')[result].id).toBe('schedule')
        })
    })
})
