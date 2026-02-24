# Implementation Plan: 주간 리포트 엣지 케이스 방어

**Status**: ⏳ Pending
**Started**: 2026-02-24
**Last Updated**: 2026-02-24
**Estimated Completion**: 2026-02-24 (30분 이내)

---

## 📋 Overview

### Feature Description

주간 리포트 스케줄에서 발견된 3개의 엣지 케이스를 방어:
1. **같은 주 중복 발송**: 요일 변경으로 같은 ISO 주에 2번 발송 가능
2. **구독 만료 후 실행**: free 플랜 유저도 스케줄이 실행됨

### Success Criteria

- [ ] 같은 ISO 주(월~일) 안에서는 요일을 변경해도 중복 발송 안 됨
- [ ] free 플랜 유저의 스케줄은 실행되지 않음
- [ ] 금요일 실행 → 월요일로 변경 → 다음 주 월요일에는 정상 실행됨
- [ ] `npx next build` 성공

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| ISO 주차 비교 (날짜 동일 비교 대체) | "일주일에 한 번" = 같은 주 중복 방지 + 다음 주 허용 | 없음 (정확히 비즈니스 요구 반영) |
| 구독 체크를 cron API에 추가 | free 유저 리소스 낭비 방지 | 추가 DB 쿼리 1회 (가벼움) |

---

## 🚀 Implementation Phase

### Phase 1: ISO 주차 비교 + 구독 체크
**Goal**: 2개 파일의 스케줄 실행 조건 강화
**Estimated Time**: 20분
**Status**: ⏳ Pending

#### 수정 대상 파일 (2개)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `src/app/api/cron/scheduled-search/route.ts` | ISO 주차 비교 + 구독 체크 |
| 2 | `scripts/run-search.ts` | SCHEDULE 모드의 동일 로직 동기화 |

#### 핵심 로직 변경

**변경 전** (날짜 동일 비교):
```typescript
if (s.last_run_at) {
    const lastRunDate = s.last_run_at.slice(0, 10)
    if (lastRunDate === todayStr) return false  // 같은 날만 차단
}
```

**변경 후** (ISO 주차 비교):
```typescript
function getISOWeek(date: Date): string {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${d.getFullYear()}-W${weekNo}`
}

if (s.last_run_at) {
    const lastRunWeek = getISOWeek(new Date(s.last_run_at))
    const currentWeek = getISOWeek(new Date())
    if (lastRunWeek === currentWeek) return false  // 같은 주면 차단
}
```

**구독 체크 추가:**
```typescript
// 스케줄의 user_id 목록으로 구독 상태 일괄 조회
// plan_id === 'free'인 유저의 스케줄은 필터링
```

#### Tasks

- [ ] **Task 1.1**: `getISOWeek()` 유틸 함수 작성
- [ ] **Task 1.2**: `src/app/api/cron/scheduled-search/route.ts` 수정
  - `todayStr === lastRunDate` → `getISOWeek` 비교로 변경
  - 스케줄 처리 전 `user_subscriptions.plan_id` 조회 추가
  - `plan_id === 'free'`이면 skip
- [ ] **Task 1.3**: `scripts/run-search.ts` SCHEDULE 모드 동일 변경
- [ ] **Task 1.4**: `npx next build` 빌드 확인

#### 시나리오 검증 표

| 시나리오 | last_run | 현재 | ISO 주차 비교 | 결과 |
|---------|---------|------|-------------|------|
| 금→월 (3/6→3/9) | 10주차 | 11주차 | 다름 | ✅ 실행 |
| 화→수 (같은 주) | 10주차 | 10주차 | 같음 | ❌ SKIP |
| 화→화 (다음 주) | 10주차 | 11주차 | 다름 | ✅ 실행 |
| 같은 날 시간 변경 | 10주차 | 10주차 | 같음 | ❌ SKIP |
| free 플랜 유저 | - | - | - | ❌ SKIP |

#### Quality Gate ✋
- [ ] `npx next build` 성공
- [ ] 위 시나리오 표의 모든 케이스 코드 레벨 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ISO 주차 계산 오류 | Low | High | 표준 ISO 8601 알고리즘 사용 |
| 구독 조회 추가 DB 부하 | Low | Low | 유저 ID 기준 인덱스 + 소량 |

---

## 🔄 Rollback Strategy

`getISOWeek` 비교를 원래 날짜 비교로 되돌리면 됨.
