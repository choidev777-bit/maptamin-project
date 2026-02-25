# Implementation Plan: 구독 페이지 CTA 동적 텍스트 수정

**Status**: ⏳ Pending
**Started**: 2026-02-25
**Last Updated**: 2026-02-25
**Estimated Completion**: 2026-02-25
**Scope**: Small (2 phases, ~1시간)

---

**⚠️ CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date above
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ **DO NOT skip quality gates or proceed with failing checks**

---

## 📋 Overview

### Feature Description
`/dashboard/subscription` 페이지의 플랜 카드 CTA 버튼 텍스트가 사용자의 현재 플랜과 관계없이 **하드코딩**되어 있음.

**현재 동작 (버그)**:
- 스타터: 항상 "다운그레이드" (고정)
- 프로: 항상 "업그레이드" (고정)
- 프리미엄: 항상 "업그레이드" (고정)

**예시 문제**: 무료 사용자가 보면 스타터도 업그레이드인데 "다운그레이드"로 표시됨.

**원인**: `SubscriptionContent.tsx`의 `PLANS` 배열에 `cta` 필드가 하드코딩됨 (line 67, 87, 107).
이미 `PlanCard.tsx`에 `getButtonText()` 함수로 동적 CTA 로직이 있지만, `SubscriptionContent.tsx`에서는 `PlanCard` 컴포넌트를 사용하지 않고 인라인으로 카드를 렌더링 중.

### Success Criteria
- [ ] 무료 사용자: 3개 플랜 모두 "시작하기" 표시
- [ ] 스타터 사용자: 스타터 "현재 이용 중", 프로/프리미엄 "업그레이드"
- [ ] 프로 사용자: 스타터 "다운그레이드", 프로 "현재 이용 중", 프리미엄 "업그레이드"
- [ ] 프리미엄 사용자: 스타터/프로 "다운그레이드", 프리미엄 "현재 이용 중"
- [ ] 빌드 성공
- [ ] 기존 테스트 통과

### User Impact
PG 심사관 및 실 사용자가 올바른 CTA 텍스트를 보게 됨. 특히 무료 사용자가 혼동 없이 구독을 시작할 수 있음.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `SubscriptionContent.tsx` 내에 CTA 로직 직접 추가 | `PlanCard.tsx`의 `getButtonText()` 로직을 재사용하되, `SubscriptionContent`가 `PlanCard` 컴포넌트를 사용하지 않는 구조이므로 동일한 로직을 헬퍼 함수로 추출 | 약간의 중복, 하지만 기존 렌더링 구조 유지 |
| `PLANS` 배열에서 `cta` 필드 제거하지 않음 | `PlanCardData` 타입이 다른 곳에서도 사용될 수 있음. `cta`를 fallback으로 유지하되 동적 계산 우선 | `PlanCardData` 인터페이스 호환 유지 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `PlanCard.tsx`의 기존 `getButtonText()` 로직 분석 완료

### External Dependencies
- 없음 (순수 프론트엔드 로직 변경)

---

## 🚀 Implementation Phases

### Phase 1: CTA 동적 텍스트 로직 구현
**Goal**: `SubscriptionContent.tsx`의 플랜 카드 CTA가 `currentPlanId` 기반으로 동적으로 결정
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: 테스트 작성**
- [ ] **Test 1.1**: CTA 텍스트 동적 계산 테스트
  - File(s): `src/components/dashboard/SubscriptionContent.test.tsx`
  - 테스트 시나리오:
    - 무료 사용자(`currentPlanId='free'`): 3개 플랜 모두 "시작하기" 또는 "구독하기"
    - 프로 사용자(`currentPlanId='pro'`): 스타터 "다운그레이드", 프리미엄 "업그레이드"
  - Expected: Tests FAIL (현재 하드코딩이므로 무료 사용자 테스트 실패)

**🟢 GREEN: 구현**
- [ ] **Task 1.2**: `SubscriptionContent.tsx`에 `getCta()` 헬퍼 추가
  - File(s): `src/components/dashboard/SubscriptionContent.tsx`
  - 로직 (`PlanCard.tsx`의 `getButtonText()`와 동일 패턴):
    ```typescript
    const getCta = (planId: string): string => {
        const planOrder: Record<string, number> = { free: 0, starter: 1, pro: 2, premium: 3 }
        const currentOrder = planOrder[currentPlanId] || 0
        const targetOrder = planOrder[planId] || 0

        if (currentOrder === 0) return '시작하기'          // 무료 → 구독 시작
        if (targetOrder > currentOrder) return '업그레이드'  // 상위 플랜
        if (targetOrder < currentOrder) return '다운그레이드' // 하위 플랜
        return '현재 이용 중'                               // 동일 플랜 (isCurrent로 이미 처리)
    }
    ```

- [ ] **Task 1.3**: 렌더링부 수정 — `{plan.cta}` → `{getCta(plan.id)}`
  - File(s): `src/components/dashboard/SubscriptionContent.tsx`
  - 변경 위치: line 713 `{plan.cta}` → `{getCta(plan.id)}`

- [ ] **Task 1.4**: `ctaStyle` 동적 결정 (선택사항)
  - 현재 `ctaStyle`도 하드코딩됨 (starter: ghost, pro: solid, premium: ghost)
  - 최상위 추천 플랜에 solid 적용하는 것은 유지하되, 업그레이드 버튼에 solid 스타일이 적용되도록 검토
  - 변경 범위에 따라 이 태스크는 skip 가능

**🔵 REFACTOR: 정리**
- [ ] **Task 1.5**: `PLANS` 배열의 `cta` 필드 정리
  - `cta` 필드는 더 이상 렌더링에 사용되지 않으므로:
    - Option A: `PLANS`에서 `cta` 값을 빈 문자열이나 의미 없는 값으로 변경 (타입 호환 유지)
    - Option B: `PlanCardData` 인터페이스에서 `cta`를 optional로 변경
  - 다른 곳에서 `PlanCardData.cta`를 사용하는지 확인 후 결정

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**Build & Tests**:
- [ ] **Build**: `npm run build` 성공
- [ ] **All Tests Pass**: `npm test` 통과

**Code Quality**:
- [ ] **Type Safety**: TypeScript 타입 에러 없음

**Manual Testing**:
- [ ] 무료 사용자: 스타터/프로/프리미엄 모두 "시작하기" 표시
- [ ] 유료 사용자: 현재 플랜 "현재 이용 중", 상위 "업그레이드", 하위 "다운그레이드"

**Validation Commands**:
```bash
npm run build
npm test
```

---

### Phase 2: PlanCard 컴포넌트 통합 검토 + 문서
**Goal**: `PlanCard.tsx`와 `SubscriptionContent.tsx`의 CTA 로직 중복 최소화 + 문서 업데이트
**Estimated Time**: 15분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: CTA 로직 공통 유틸로 추출 (선택사항)
  - `PlanCard.tsx`의 `getButtonText()`와 `SubscriptionContent.tsx`의 `getCta()`가 동일 로직
  - 공통 함수로 추출할지, 현재 구조 유지할지 판단
  - 추출 시: `src/lib/utils/plan-cta.ts`에 `getPlanCta(currentPlanId, targetPlanId): string`

- [ ] **Task 2.2**: 계획서 완료 체크
  - 이 계획서의 체크박스 모두 업데이트

#### Quality Gate ✋

- [ ] 빌드 성공
- [ ] 테스트 통과
- [ ] 무료/스타터/프로/프리미엄 각 유저 케이스에서 올바른 CTA 표시 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| `PlanCardData.cta` 제거 시 다른 곳에서 참조 | Low | Medium | grep으로 사전 확인 |
| `ctaStyle` 하드코딩이 시각적 문제 유발 | Low | Low | Phase 1에서 검토, 필요시 동적 처리 |
| `currentPlanId`가 예상치 못한 값 | Low | Medium | `planOrder`에 없는 키는 0(free)으로 fallback |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
**Steps to revert**:
- `SubscriptionContent.tsx`: `getCta()` 함수 제거, line 713을 `{plan.cta}`로 복원
- 1분 이내 복구 가능

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 30분 | - | - |
| Phase 2 | 15분 | - | - |
| **Total** | 45분 | - | - |

---

## 📝 Notes & Learnings

### 사전 조사 (2026-02-25)
- `SubscriptionContent.tsx` line 50-109: `PLANS` 배열에 `cta` 하드코딩
- `PlanCard.tsx` line 33-47: `getButtonText()` 동적 CTA 로직 이미 존재
- `SubscriptionContent.tsx`는 `PlanCard` 컴포넌트를 사용하지 않고 직접 인라인 렌더링 (line 631-719)
- `planOrder` 기준: free=0, starter=1, pro=2, premium=3

### billingStatus 검증 완료 (2026-02-25)
- `page.tsx` line 38: `currentPlanId={subscription?.plan_id || 'free'}` → DB 없으면 'free'
- 구독 해지 시: `api/subscription/cancel/route.ts` → `.update({ plan_id: 'free' })`
- 환불 시: `api/payment/subscribe/refund/route.ts` → `plan_id: 'free'`
- 만료 크론: `api/cron/expire-subscriptions/route.ts` → `plan_id를 free로 다운그레이드`
- **결론: 모든 구독 종료 경로에서 plan_id='free'로 리셋됨 → `currentPlanId` 기반 로직으로 충분**

---

## 📚 References

### 관련 파일
- `src/components/dashboard/SubscriptionContent.tsx` — 메인 수정 대상
- `src/components/dashboard/PlanCard.tsx` — 기존 동적 CTA 로직 참고
- `src/components/dashboard/SubscriptionContent.test.tsx` — 테스트 파일

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] 모든 Phase quality gate 통과
- [ ] 무료/스타터/프로/프리미엄 각 상태에서 CTA 정상 표시
- [ ] 빌드 + 테스트 통과

---

**Plan Status**: ⏳ Pending
**Next Action**: Phase 1 — CTA 동적 텍스트 로직 구현
**Blocked By**: None
