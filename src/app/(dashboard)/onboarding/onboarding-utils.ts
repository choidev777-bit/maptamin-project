/**
 * 온보딩 유틸리티 함수
 * - getStepIds(): 플랜별 Step ID 목록 반환
 * - computeStartStep(): DB 데이터 기반 이탈 복구 시작 Step 인덱스 계산
 *
 * JSX 의존성 없는 순수 함수로 분리하여 유닛 테스트 용이하게 합니다.
 */

/* ---- 타입 ---- */

export interface Place {
    placeId: string
    name: string
    address: string
    lat: number
    lng: number
}

export interface GridData {
    naverGrid: { lat: number; lng: number; row: number; col: number; enabled: boolean }[]
    googleGrid?: { lat: number; lng: number; row: number; col: number; enabled: boolean }[]
    distance: number
    distanceUnit?: string
}

export interface ScheduleData {
    naverCrawlingDays: number[]
    googleCrawlingDay?: number | null
    naverCrawlingTime: string
    googleCrawlingTime?: string
    notifyImmediate: boolean
    phone?: string
}

export interface OnboardingData {
    store?: { naverPlace: Place; googlePlace?: Place }
    keywords?: { naverKeywords: string[]; googleKeywords?: string[]; localNaverKeywords?: string[] }
    competitors?: { competitors: Place[] }
    grid?: GridData
    schedule?: ScheduleData
}

export type PlanId = 'starter' | 'pro' | 'premium'

/* ---- Step 정의 ---- */

export type StepId = 'store' | 'keyword' | 'competitor' | 'grid' | 'schedule'

export interface StepDef {
    id: StepId
    label: string
}

/**
 * 플랜별 Step ID/Label 목록을 반환합니다.
 * - starter: 5 steps (store → keyword → grid → schedule → summary) — 경쟁사 Skip
 * - pro/premium: 6 steps (store → keyword → competitor → grid → schedule → summary)
 */
export function getSteps(planId: PlanId): StepDef[] {
    const steps: StepDef[] = [
        { id: 'store', label: '매장 등록' },
        { id: 'keyword', label: '키워드 등록' },
    ]

    if (planId !== 'starter') {
        steps.push({ id: 'competitor', label: '경쟁사 등록' })
    }

    steps.push(
        { id: 'grid', label: '좌표 설정' },
        { id: 'schedule', label: '스케줄 설정' },
    )

    return steps
}

/* ---- 이탈 복구 ---- */

/**
 * DB에서 가져온 기존 데이터를 기반으로 재진입 시 시작할 Step 인덱스를 계산합니다.
 *
 * 로직:
 * 1. managed_places가 없으면 → 0 (매장 등록)
 * 2. managed_keywords가 없으면 → 1 (키워드 등록)
 * 3. (pro/premium) managed_competitors가 없으면 → 2 (경쟁사 등록)
 * 4. search_schedules가 없으면 → grid Step (그리드+스케줄 아직 미완료)
 * 5. 모든 데이터 있음 → summary Step (확인 화면)
 */
export function computeStartStep(
    planId: PlanId,
    existingData: {
        hasPlaces: boolean
        hasKeywords: boolean
        hasCompetitors: boolean
        hasSchedules: boolean
    },
): number {
    const steps = getSteps(planId)

    // Step 0: 매장 등록
    if (!existingData.hasPlaces) return 0

    // Step 1: 키워드 등록
    if (!existingData.hasKeywords) return 1

    // Step 2 (pro/premium only): 경쟁사 등록
    if (planId !== 'starter' && !existingData.hasCompetitors) {
        return steps.findIndex(s => s.id === 'competitor')
    }

    // Grid step (로컬 state이므로 항상 재설정 필요)
    if (!existingData.hasSchedules) {
        return steps.findIndex(s => s.id === 'grid')
    }

    // 모든 데이터 있음 → 스케줄 설정 (마지막 단계)
    return steps.findIndex(s => s.id === 'schedule')
}
