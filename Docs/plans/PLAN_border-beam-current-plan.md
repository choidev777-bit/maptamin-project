# Implementation Plan: 이용 중인 플랜 BorderBeam 애니메이션 테두리

**Status**: ✅ Complete
**Started**: 2026-02-26
**Last Updated**: 2026-02-26
**Estimated Completion**: 2026-02-26

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
"현재 이용 중인 플랜" 카드의 까만 정적 테두리(`border-[#001011]`)를 Magic UI의 `BorderBeam` 컴포넌트로 교체하여, 빛이 카드 테두리를 따라 흐르는 프리미엄 애니메이션 효과를 적용합니다.

### 적용 대상 (총 2곳)
1. **`PlanCard.tsx`** — 대시보드에서 재사용되는 플랜 카드 (현재 플랜 강조)
2. **`SubscriptionContent.tsx`** — 구독 관리 페이지의 인라인 플랜 카드 (현재 플랜 강조)

> `PricingSection.tsx` — 랜딩 페이지 가격 카드는 `isCurrentPlan` 개념이 없으므로 제외 (로그인 전 페이지)

### Success Criteria
- [ ] `BorderBeam` 컴포넌트가 `src/components/ui/border-beam.tsx`에 생성됨
- [ ] `PlanCard.tsx`에서 `isCurrentPlan`일 때 까만 테두리 대신 BorderBeam 애니메이션이 표시됨
- [ ] `SubscriptionContent.tsx`에서 `isCurrent`일 때 까만 테두리 대신 BorderBeam 애니메이션이 표시됨
- [ ] 기존 테스트(`PlanCard.test.tsx`, `SubscriptionContent.test.tsx`) 모두 통과
- [ ] `npm run build` 성공
- [ ] 브라우저에서 시각적으로 빛이 흐르는 애니메이션 확인

### User Impact
- 현재 이용 중인 플랜이 시각적으로 더 프리미엄하게 강조됨
- 정적 까만 테두리 → 동적 빛 애니메이션으로 사용자 경험 향상
- 다른 플랜 카드와의 시각적 차별화 극대화

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `BorderBeam`을 `src/components/ui/border-beam.tsx`에 배치 | 기존 UI 프리미티브 패턴 유지 (`ui/button.tsx`, `ui/badge.tsx` 등과 동일 구조) | 없음 |
| `motion/react` 사용 (framer-motion이 아닌) | `motion` v12.34.3 이미 설치되어 있음. v12부터 `motion/react`가 공식 import 경로 | 없음 (이미 설치됨) |
| 카드 컨테이너에 `overflow-hidden` 불필요 | BorderBeam은 자체 CSS mask(`mask-clip: padding-box,border-box` + `mask-composite: intersect`)로 테두리 영역만 표시하므로 부모에 `overflow-hidden` 불필요. 카드는 이미 `relative` | 없음 |
| 브랜드 색상 `#00C896` 기반 그라데이션 사용 | 앱 전체 브랜드 색상과 일치. featured 플랜 테두리와 어울림 | 없음 |
| `isCurrentPlan`일 때만 BorderBeam 렌더링 | 불필요한 애니메이션 리소스 절약. 조건부 렌더링으로 성능 최적화 | 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `motion` 패키지 설치됨 (v12.34.3)
- [x] `clsx` + `tailwind-merge` 설치됨 (`cn` 유틸 존재)
- [x] Tailwind CSS v4 설치됨 (BorderBeam의 v4 문법 호환)

### External Dependencies
- `motion`: ^12.34.3 (이미 설치됨 ✅)
- 추가 설치 필요 없음

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: Write tests FIRST, then implement to make them pass

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | BorderBeam 컴포넌트 렌더링 | 컴포넌트가 올바른 props로 렌더링되는지 확인 |
| **Integration Tests** | PlanCard + BorderBeam 통합 | isCurrentPlan 조건에 따라 BorderBeam이 나타나고/사라지는지 |
| **Manual Tests** | 브라우저 시각 검증 | 빛 애니메이션이 정상 작동, 다른 카드에는 없음 |

### Test File Organization
```
src/components/
├── ui/
│   └── border-beam.tsx              ← 새 컴포넌트
├── dashboard/
│   ├── PlanCard.tsx                  ← 수정
│   ├── PlanCard.test.tsx             ← 기존 테스트 유지 + 보강
│   ├── SubscriptionContent.tsx      ← 수정
│   └── SubscriptionContent.test.tsx ← 기존 테스트 유지
```

---

## 🚀 Implementation Phases

### Phase 1: BorderBeam UI 컴포넌트 생성
**Goal**: `src/components/ui/border-beam.tsx` 컴포넌트를 생성하여 독립적으로 동작하는 BorderBeam 애니메이션 컴포넌트를 만든다
**Estimated Time**: 0.5시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: PlanCard 기존 테스트가 모두 통과하는지 확인 (기준점 확립)
  - File(s): `src/components/dashboard/PlanCard.test.tsx`
  - Expected: 기존 테스트 모두 PASS (현재 상태 확인)
  - Details: `npm test -- PlanCard` 실행

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.2**: `BorderBeam` 컴포넌트 생성
  - File(s): `src/components/ui/border-beam.tsx`
  - Goal: 사용자가 제공한 BorderBeam 코드를 프로젝트 구조에 맞게 배치
  - Details:
    - `motion/react`에서 `motion`, `MotionStyle`, `Transition` import
    - `@/lib/utils`에서 `cn` import
    - Props: `size`, `duration`, `delay`, `colorFrom`, `colorTo`, `transition`, `className`, `style`, `reverse`, `initialOffset`, `borderWidth`
    - 빛이 카드 테두리를 따라 흐르는 애니메이션 구현

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.3**: 코드 품질 확인
  - Files: `src/components/ui/border-beam.tsx`
  - Goal: TypeScript 타입 안전성, JSDoc 주석 확인
  - Checklist:
    - [ ] TypeScript 에러 없음
    - [ ] Props 인터페이스에 JSDoc 주석 유지
    - [ ] export 방식 확인 (named export)

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` 성공 (또는 `npm run dev`에서 에러 없음)
- [ ] 기존 테스트 모두 통과: `npm test`
- [ ] 새 컴포넌트 import 가능 확인

**Code Quality**:
- [ ] TypeScript 에러 없음
- [ ] `border-beam.tsx` 파일이 올바르게 export됨

**Validation Commands**:
```bash
npm test -- PlanCard
npm run build
```

---

### Phase 2: PlanCard.tsx에 BorderBeam 적용
**Goal**: `isCurrentPlan`일 때 까만 정적 테두리를 제거하고 BorderBeam 애니메이션으로 교체
**Estimated Time**: 0.5시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 2.1**: PlanCard에 `isCurrentPlan`일 때 `overflow-hidden` 클래스가 있는지 확인하는 테스트 보강
  - File(s): `src/components/dashboard/PlanCard.test.tsx`
  - Expected: 기존 테스트 PASS + 새 테스트 확인
  - Details:
    - `isCurrentPlan`일 때 카드 컨테이너에 `overflow-hidden` 클래스 존재 확인
    - `isCurrentPlan`일 때 `border-[#001011]` 클래스 대신 새 스타일 적용 확인

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 2.2**: `PlanCard.tsx` 수정
  - File(s): `src/components/dashboard/PlanCard.tsx`
  - Goal: isCurrentPlan일 때 BorderBeam 적용
  - Details:
    - `import { BorderBeam } from '@/components/ui/border-beam'` 추가
    - 카드 컨테이너 className 변경:
      - Before: `'border-2 border-[#001011] bg-white shadow-lg'`
      - After: `'border border-gray-200 bg-white shadow-lg'`
        (BorderBeam이 테두리 역할을 하므로 정적 진한 테두리 제거, 연한 기본 테두리 유지)
        (⚠️ `overflow-hidden` 불필요 — BorderBeam 자체 CSS mask가 클리핑 처리)
    - `{isCurrentPlan && <BorderBeam ... />}` 조건부 렌더링 추가
    - BorderBeam props:
      - `duration={6}`
      - `size={200}`
      - `colorFrom="#00C896"` (브랜드 초록)
      - `colorTo="#00E5A0"` (밝은 초록)
      - `borderWidth={2}`

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 2.3**: 코드 정리
  - Files: `src/components/dashboard/PlanCard.tsx`
  - Goal: 불필요한 코드 제거, 가독성 개선
  - Checklist:
    - [ ] 제거된 `border-[#001011]` 관련 코드 확인
    - [ ] 주석 업데이트
    - [ ] 렌더링 순서 확인 (BorderBeam은 카드 내용 뒤에 위치)

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 3 until ALL checks pass**

**Build & Tests**:
- [ ] `npm test -- PlanCard` 모두 통과
- [ ] `npm run build` 성공

**Manual Testing**:
- [ ] 브라우저에서 플랜 카드가 보이는 페이지 확인
- [ ] "현재 이용 중인 플랜"에 빛 애니메이션 테두리가 깔끔하게 표시됨
- [ ] 다른 플랜 카드에는 BorderBeam이 없음
- [ ] 카드 내부 콘텐츠 정상 표시 확인
- [ ] ※ 뱃지 잘림 우려 없음 — `!isCurrentPlan` 조건으로 현재 플랜 카드에 뱃지 미표시

**Validation Commands**:
```bash
npm test -- PlanCard
npm run build
```

---

### Phase 3: SubscriptionContent.tsx에 BorderBeam 적용
**Goal**: 구독 관리 페이지 인라인 플랜 카드에도 동일한 BorderBeam 효과 적용
**Estimated Time**: 0.5시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 3.1**: SubscriptionContent 기존 테스트 통과 확인
  - File(s): `src/components/dashboard/SubscriptionContent.test.tsx`
  - Expected: 기존 테스트 모두 PASS
  - Details: `npm test -- SubscriptionContent` 실행

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 3.2**: `SubscriptionContent.tsx` 수정
  - File(s): `src/components/dashboard/SubscriptionContent.tsx`
  - Goal: `isCurrent`일 때 BorderBeam 적용
  - Details:
    - `import { BorderBeam } from '@/components/ui/border-beam'` 추가
    - 플랜 카드 그리드 (Line 778~782) className 변경:
      - Before: `'border-2 border-[#001011] shadow-lg'`
      - After: `'border border-gray-200 shadow-lg'`
        (⚠️ `overflow-hidden` 불필요 — BorderBeam 자체 CSS mask가 클리핑 처리)
    - `{isCurrent && <BorderBeam ... />}` 조건부 렌더링 추가 (각 플랜 카드 `</div>` 직전)
    - PlanCard.tsx와 동일한 BorderBeam props 사용

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 3.3**: 코드 정리 및 일관성 확인
  - Files: `src/components/dashboard/SubscriptionContent.tsx`
  - Goal: PlanCard.tsx와 동일한 패턴 유지
  - Checklist:
    - [ ] BorderBeam props가 PlanCard.tsx와 일관성 유지
    - [ ] `border-[#001011]` 완전 제거 확인
    - [ ] 불필요한 주석 정리

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed until ALL checks pass**

**Build & Tests**:
- [ ] `npm test -- SubscriptionContent` 모두 통과
- [ ] `npm test` 전체 테스트 통과
- [ ] `npm run build` 성공

**Manual Testing**:
- [ ] `/dashboard/subscription` 페이지에서 "이용 플랜 변경" 섹션 확인
- [ ] 현재 플랜 카드에 BorderBeam 애니메이션 표시
- [ ] 다른 플랜 카드에는 BorderBeam 없음
- [ ] 하단 버튼("현재 이용 중인 플랜") 정상 표시
- [ ] ※ 뱃지 잘림 우려 없음 — `!isCurrent` 조건으로 현재 플랜 카드에 뱃지 미표시
- [ ] 모바일/데스크톱 반응형 레이아웃 정상

**Validation Commands**:
```bash
npm test -- SubscriptionContent
npm test
npm run build
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Tailwind v4 문법 호환성 (`mask-[...]`, `bg-linear-to-l` 등) | Low | High | Tailwind v4가 이미 설치되어 있어 호환됨. 빌드 테스트로 확인 |
| `offset-path: rect()` 브라우저 호환성 | Low | Low | Chrome/Edge 116+, Firefox 117+, Safari 17.2+ (모두 2023년 하반기~). SaaS 대시보드 사용자 대부분 최신 브라우저. 구형 브라우저에서는 애니메이션 미표시 (기능 파괴 아님) |
| `motion` 애니메이션 성능 (3개 카드 동시 렌더링) | Low | Low | `isCurrentPlan`인 카드만 1개 렌더링하므로 성능 영향 최소 |
| 기존 테스트 깨짐 (DOM 구조 변경) | Low | Medium | `data-testid` 기반 테스트이므로 DOM 구조 변경에 영향 적음 |
| ~~뱃지 잘림~~ | N/A | N/A | `!isCurrentPlan` 조건으로 현재 플랜 카드에 뱃지 미표시이므로 비이슈 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
**Steps to revert**:
- 삭제: `src/components/ui/border-beam.tsx`
- 다른 파일 변경 없음

### If Phase 2 Fails
**Steps to revert**:
- `PlanCard.tsx` Line 52~53을 원래로 복원:
  ```tsx
  ? 'border-2 border-[#001011] bg-white shadow-lg'
  ```
- `BorderBeam` import 및 렌더링 코드 제거

### If Phase 3 Fails
**Steps to revert**:
- `SubscriptionContent.tsx` Line 781을 원래로 복원:
  ```tsx
  ${isCurrent ? 'border-2 border-[#001011] shadow-lg' : ...}
  ```
- `BorderBeam` import 및 렌더링 코드 제거

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ✅ 100%
- **Phase 2**: ✅ 100%
- **Phase 3**: ✅ 100%

**Overall Progress**: 100% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 0.5 hours | - | - |
| Phase 2 | 0.5 hours | - | - |
| Phase 3 | 0.5 hours | - | - |
| **Total** | 1.5 hours | - | - |

---

## 📝 Notes & Learnings

### Implementation Notes
- ~~`overflow-hidden` 필요~~ → **불필요**: BorderBeam 컴포넌트가 자체 CSS mask(`mask-clip: padding-box,border-box` + `mask-composite: intersect`)로 테두리 영역만 표시하므로 부모에 `overflow-hidden` 불필요
- ~~뱃지 잘림 우려~~ → **비이슈**: `!isCurrentPlan` / `!isCurrent` 조건으로 현재 플랜 카드에 뱃지가 표시되지 않음
- `offset-path: rect()` CSS 속성은 Chrome/Edge 116+, Firefox 117+, Safari 17.2+에서 지원. 구형 브라우저에서는 빛 애니메이션이 동작하지 않을 수 있으나 기능 파괴 아님

### 코드 변경 요약

**변경 파일 목록:**
| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/components/ui/border-beam.tsx` | 🆕 신규 생성 | BorderBeam 애니메이션 컴포넌트 |
| `src/components/dashboard/PlanCard.tsx` | ✏️ 수정 | isCurrentPlan 테두리 → BorderBeam |
| `src/components/dashboard/SubscriptionContent.tsx` | ✏️ 수정 | isCurrent 테두리 → BorderBeam |

---

## 📚 References

### Documentation
- [Magic UI BorderBeam](https://magicui.design/docs/components/border-beam) — 원본 컴포넌트 레퍼런스
- [Motion (framer-motion) v12](https://motion.dev/) — 애니메이션 라이브러리 문서

### Source Code References
- `PlanCard.tsx` Line 52~53: 현재 까만 테두리 코드
- `SubscriptionContent.tsx` Line 780~781: 현재 까만 테두리 코드
- `PricingSection.tsx`: 랜딩 가격 카드 (isCurrentPlan 개념 없어 제외)

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [x] All phases completed with quality gates passed
- [x] `npm test` 전체 테스트 통과
- [x] `npm run build` 성공
- [x] 브라우저에서 BorderBeam 애니메이션 정상 확인 (PlanCard + SubscriptionContent)
- [x] 모바일/데스크톱 반응형 정상
- [x] 뱃지/오버플로우 이슈 없음
- [x] Plan document archived for future reference

---

**Plan Status**: ✅ Complete
**Next Action**: None
**Blocked By**: None
