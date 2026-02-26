# Implementation Plan: 히어로 섹션 3단계 순위 애니메이션

**Status**: 📋 Plan Review
**Started**: 2026-02-27
**Last Updated**: 2026-02-27
**Estimated Completion**: 2026-02-27

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
현재 히어로 섹션 우측의 **정적 도트 히트맵**을 **3단계 순위 애니메이션**으로 교체한다.

**스토리텔링 흐름**:
1. **Stage 1** (부족한 상태): 중심부만 초록, 외곽은 노랑/빨강 → "홍대 카페" 28위
2. **Stage 2** (개선 중): 초록 영역 확대 → "홍대 카페" 9위
3. **Stage 3** (상위 노출 달성): 거의 전부 초록 → "홍대 카페" 3위 🏆

각 단계는 약 4초 유지 후 부드럽게 전환되며, Stage 3 이후 다시 Stage 1로 루프한다.

**핵심 가치**: 소상공인 사장님이 맵타민을 사용하면 "지역명+업종 키워드" 검색 순위가 올라가는 과정을 직관적으로 이해할 수 있다.

### Success Criteria
- [ ] 히어로 섹션 우측에 홍대 지도 배경 이미지 + 7×7 마커 오버레이가 표시됨
- [ ] 3단계 (28위→9위→3위) 순위 변화가 자동으로 루프됨
- [ ] 각 마커에 순위 숫자가 표시되고, 색상이 순위에 따라 구분됨 (초록/노랑/빨강)
- [ ] "근처 카페 · 맵타민 카페" 상단 라벨 + "홍대 카페" 검색 순위 하단 표시
- [ ] 마커 전환 시 부드러운 애니메이션 적용 (fade + scale)
- [ ] 반응형 대응 (모바일/태블릿/데스크탑)
- [ ] 기존 랜딩페이지 다른 섹션에 영향 없음
- [ ] `npm run build` 성공

### User Impact
랜딩 페이지 방문자(소상공인 사장님)가 "맵타민을 쓰면 내 가게 순위가 올라간다"는 가치를 **별도 설명 없이 시각적으로 즉시 이해**할 수 있음.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 실제 네이버 지도 SDK 대신 스크린샷 이미지 사용 | 히어로에서 지도 SDK 로드는 과도 (API 키, 로딩 시간, 번들 크기). 스크린샷으로 충분히 실제감 표현 가능 | 지도 확대/이동 불가 (의도된 제약) |
| `motion` (Framer Motion v12) 사용 | 이미 `package.json`에 설치됨 (`"motion": "^12.34.3"`). 추가 설치 불필요. 선언적 애니메이션으로 복잡한 전환 쉽게 구현 | 순수 CSS 대비 약간의 JS 오버헤드 |
| `HeroSection.tsx` 내 우측 카드 영역만 교체 | 좌측 텍스트/CTA 영역은 그대로 유지. 우측만 새 컴포넌트로 교체하여 영향 최소화 | 없음 |
| 히어로 카드 → 별도 `HeroMapAnimation` 컴포넌트 분리 | 단일 책임 원칙. HeroSection은 레이아웃만, 애니메이션 로직은 별도 처리 | 파일 하나 추가 |
| 7×7 그리드 데이터를 상수 배열로 관리 | 3단계 × 49개 마커 데이터를 명시적으로 정의. 유지보수 용이 | 데이터 양이 많아 보이지만, 명확함 |
| `'use client'` 컴포넌트 | 애니메이션, setInterval/useState 등 클라이언트 기능 필요 | Server Component 불가 (의도됨) |

---

## 📦 Dependencies

### Required Before Starting
- [x] 홍대 지도 배경 이미지: `public/images/hongdae-map.png` (**AI 생성 일러스트**, 저작권 이슈 없음 ✅)

### External Dependencies
- `motion` (Framer Motion v12): **이미 설치됨** — 추가 설치 불필요
- 추가 패키지 없음

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: Write tests FIRST, then implement to make them pass

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥80% | 3단계 데이터 전환 로직, 색상 매핑 유틸 함수 |
| **Integration Tests** | 핵심 경로 | HeroMapAnimation 렌더링 + 단계 전환 확인 |
| **E2E Tests** | 생략 | 히어로 섹션은 정적 UI이므로 시각적 확인으로 대체 |

### Test File Organization
```
src/components/landing/__tests__/
├── hero-animation-data.test.ts     ← 데이터/유틸 단위 테스트
└── HeroMapAnimation.test.tsx       ← 렌더링 통합 테스트
```

---

## 🚀 Implementation Phases

### Phase 1: 데이터 레이어 + 유틸리티 함수
**Goal**: 3단계 그리드 데이터, 색상 매핑 함수, 순위 텍스트 데이터를 정의하고 테스트
**Estimated Time**: 1-2 시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: 3단계 데이터 구조 검증 테스트
  - File(s): `src/components/landing/__tests__/hero-animation-data.test.ts`
  - Expected: Tests FAIL — 데이터 파일이 없으므로
  - Details:
    - 각 Stage가 7×7 (49개) 마커 데이터를 가지는지 검증
    - 순위 값이 1~20 범위인지 검증
    - 각 Stage의 검색 순위 텍스트가 존재하는지 검증
    - Stage 1→2→3 순으로 초록색 마커 비율이 증가하는지 검증

- [ ] **Test 1.2**: 색상 매핑 함수 테스트
  - File(s): `src/components/landing/__tests__/hero-animation-data.test.ts`
  - Expected: Tests FAIL — 함수가 없으므로
  - Details:
    - 순위 1~5 → 초록색 (`#22C55E`) 반환
    - 순위 6~10 → 노란색 (`#EAB308`) 반환
    - 순위 11+ → 빨간색 (`#EF4444`) 반환

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.3**: 데이터 + 유틸 파일 생성
  - File(s): `src/components/landing/hero-animation-data.ts`
  - Goal: Test 1.1, 1.2를 통과
  - Details:
    - `STAGE_DATA` 배열: 3개 스테이지, 각각 7×7 순위 숫자 배열
    - `STAGE_META` 배열: 각 스테이지의 "홍대 카페" 검색 순위 + 라벨 텍스트
    - `getMarkerColor(rank)` 함수: 순위 → 색상 코드 변환
    - `getMarkerGlow(rank)` 함수: 순위 → CSS boxShadow 반환

    **재생 순서: Stage 3 → 1 → 2 → 3 루프** (첫인상을 성공 상태로 시작)

    **Stage 1 데이터 (현실 — 부족한 상태)** 4초 유지:
    ```
    🔴🔴🔴🔴🔴🔴🔴
    🔴🟡🔴🟡🔴🔴🔴
    🔴🟡🟡🟢🟡🟡🔴
    🔴🟡🟢🟢🟡🔴🔴
    🔴🔴🟡🟢🟡🔴🔴
    🔴🔴🟡🔴🔴🔴🔴
    🔴🔴🟡🔴🔴🔴🔴
    → "홍대 카페" 검색 시 맵타민네 카페 순위: 28위
    ```

    **Stage 2 데이터 (개선 중)** 4초 유지:
    ```
    🔴🔴🔴🔴🟡🔴🔴
    🟡🟢🟡🟢🟡🔴🔴
    🟡🟢🟢🟢🟢🟢🔴
    🟡🟢🟢🟢🟢🔴🔴
    🟡🟡🟡🟢🟢🟢🔴
    🟡🟡🟡🔴🔴🔴🔴
    🟡🟡🟡🔴🔴🔴🔴
    → "홍대 카페" 검색 시 맵타민네 카페 순위: 9위
    ```

    **Stage 3 데이터 (상위 노출 달성)** 첫 재생 3초, 루프 후 5초 유지:
    ```
    🟡🟡🟡🟡🟢🟡🟡
    🟢🟢🟢🟢🟢🟡🟡
    🟢🟢🟢🟢🟢🟢🟡
    🟢🟢🟢🟢🟢🟡🟡
    🟢🟢🟢🟢🟢🟢🟡
    🟢🟢🟢🟢🟢🟡🟡
    🟢🟢🟢🟢🟡🟡🟡
    → "홍대 카페" 검색 시 맵타민네 카페 순위: 3위 🏆
    ```

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.4**: 리팩토링
  - Checklist:
    - [ ] 데이터 구조 타입 정의 (TypeScript interface)
    - [ ] JSDoc 주석 추가
    - [ ] 상수 명명 일관성 확인

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**TDD Compliance** (CRITICAL):
- [ ] **Red Phase**: Tests were written FIRST and initially failed
- [ ] **Green Phase**: Production code written to make tests pass
- [ ] **Refactor Phase**: Code improved while tests still pass
- [ ] **Coverage Check**: 데이터/유틸 함수 100% 커버

**Build & Tests**:
- [ ] `npm test -- --testPathPattern="hero-animation-data"` 전부 통과
- [ ] `npm run build` 성공

**Validation Commands**:
```bash
npm test -- --testPathPattern="hero-animation-data"
npm run build
```

---

### Phase 2: HeroMapAnimation 컴포넌트 구현
**Goal**: 지도 배경 위에 7×7 마커 그리드를 렌더링하고, 3단계 자동 전환 애니메이션을 구현
**Estimated Time**: 2-3 시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 2.1**: HeroMapAnimation 렌더링 테스트
  - File(s): `src/components/landing/__tests__/HeroMapAnimation.test.tsx`
  - Expected: Tests FAIL — 컴포넌트가 없으므로
  - Details:
    - 컴포넌트가 49개(7×7)의 마커를 렌더링하는지 확인
    - "근처 카페" 키워드 라벨이 표시되는지 확인
    - "맵타민 카페" 가게 이름이 표시되는지 확인
    - "홍대 카페" 검색 순위 텍스트가 표시되는지 확인
    - 중심 마커(3,3)에 "내 매장" 표시가 있는지 확인

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 2.2**: HeroMapAnimation 컴포넌트 생성
  - File(s): `src/components/landing/HeroMapAnimation.tsx`
  - Goal: Test 2.1을 통과
  - Details:
    - `'use client'` 클라이언트 컴포넌트
    - 외부 구조:
      ```
      ┌─ 상단 라벨 ──────────────────────────┐
      │  📍 근처 카페 · 맵타민 카페           │
      ├─────────────────────────────────────-─┤
      │  ┌─ 지도 배경 이미지 ──────────────┐  │
      │  │                                 │  │
      │  │   7×7 순위 마커 오버레이        │  │
      │  │   (각 마커: 순위 숫자 + 색상)   │  │
      │  │                                 │  │
      │  │   중심에 "내 매장" 라벨          │  │
      │  │                                 │  │
      │  └─────────────────────────────────┘  │
      ├───────────────────────────────────────┤
      │  "홍대 카페" 검색 시                  │
      │  맵타민 카페 순위: 28위 → 9위 → 3위   │
      └───────────────────────────────────────┘
      ```
    - `useState`로 현재 스테이지 인덱스 관리 (0, 1, 2)
    - **재생 순서: [2, 0, 1, 2] (Stage 3→1→2→3)** — 성공 상태로 시작
    - **타이밍: Stage 3 첫 3초, Stage 1 4초, Stage 2 4초, Stage 3 루프 5초**
    - `useEffect` + `setTimeout` 체인으로 스테이지 전환
    - `motion` (AnimatePresence, motion.div)으로 마커 전환 애니메이션:
      - 각 마커: `scale: [0, 1]` + `opacity: [0, 1]`
      - 스태거 딜레이: 중심부터 외곽으로 퍼져나가는 방사형 딜레이
    - 스테이지 인디케이터 (하단 점 3개, 현재 스테이지 하이라이트)

- [ ] **Task 2.3**: 마커 디자인 구현
  - Details:
    - 마커 크기: `w-8 h-8` (데스크탑), `w-6 h-6` (모바일)
    - 마커 내부: 순위 숫자 (font-bold, text-white)
    - 마커 배경: `getMarkerColor(rank)` 결과, rounded-full
    - 마커 글로우: `getMarkerGlow(rank)` boxShadow
    - 중심 마커 (3,3): 파란 테두리 + "내 매장" 라벨 (기존 디자인 유지)

- [ ] **Task 2.4**: 하단 순위 표시 구현
  - Details:
    - "홍대 카페" 검색 시 → 카운트업/다운 애니메이션으로 순위 숫자 전환
    - Stage 1: "28위" (빨간색)
    - Stage 2: "9위" (노란색)  
    - Stage 3: "3위 🏆" (초록색)
    - 가게 이름: **"맵타민네 카페"** ("맵타민 카페" 아님)

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 2.5**: 리팩토링
  - Checklist:
    - [ ] 서브 컴포넌트 분리 (GridMarker, StageIndicator 등 필요시)
    - [ ] CSS 클래스 정리 (Tailwind 유틸리티 일관성)
    - [ ] 불필요한 리렌더링 방지 (useMemo, useCallback)
    - [ ] 접근성 (aria-label 등)

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 3 until ALL checks pass**

**TDD Compliance** (CRITICAL):
- [ ] **Red Phase**: Tests were written FIRST and initially failed
- [ ] **Green Phase**: Production code written to make tests pass
- [ ] **Refactor Phase**: Code improved while tests still pass

**Build & Tests**:
- [ ] `npm test -- --testPathPattern="HeroMapAnimation"` 전부 통과
- [ ] `npm run build` 성공
- [ ] 기존 테스트 전부 통과 (`npm test`)

**Manual Test Checklist**:
- [ ] `localhost:3000/` 접속 → 히어로 우측에 지도 + 마커 표시
- [ ] 4초마다 Stage 1→2→3 전환 확인
- [ ] Stage 3 이후 다시 Stage 1로 루프 확인
- [ ] 마커 색상 변화 (빨→노→초) 확인
- [ ] 하단 순위 텍스트 "28위 → 9위 → 3위" 전환 확인

**Validation Commands**:
```bash
npm test -- --testPathPattern="HeroMapAnimation"
npm test
npm run build
```

---

### Phase 3: HeroSection 통합 + 반응형 + 마무리
**Goal**: HeroMapAnimation을 HeroSection에 통합하고, 반응형/성능/최종 디자인 완성
**Estimated Time**: 1-2 시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 3.1**: HeroSection 통합 렌더링 테스트
  - File(s): `src/components/landing/__tests__/HeroMapAnimation.test.tsx` (추가)
  - Expected: Tests FAIL — 기존 HeroSection이 아직 HeroMapAnimation을 사용하지 않음
  - Details:
    - HeroSection 내에 HeroMapAnimation이 렌더링되는지 확인
    - 기존 좌측 텍스트 (빨간색만 초록색으로) 가 여전히 표시되는지 확인
    - CTA 버튼이 여전히 동작하는지 확인

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 3.2**: HeroSection.tsx 수정
  - File(s): `src/components/landing/HeroSection.tsx`
  - Goal: Test 3.1을 통과
  - Details:
    - 기존 우측 카드 영역 (라인 80~185) 전체를 `<HeroMapAnimation />` 으로 교체
    - 기존 `DOT_COLORS`, `glowStyle()` 함수 제거 (더 이상 필요 없음)
    - **HeroSection은 Server Component로 유지** (HeroMapAnimation만 Client Component)
    - 좌측 텍스트/CTA 영역은 **그대로 유지**
    - HeroSection 자체는 가능한 한 간결하게 유지

- [ ] **Task 3.3**: 반응형 디자인 조정
  - Details:
    - **모바일** (< lg): 지도 카드가 텍스트 아래에 표시 (기존 레이아웃 유지)
    - **모바일** (< sm): 마커 크기 축소 (`w-5 h-5`), 간격 축소
    - **태블릿** (sm~lg): 중간 크기
    - **데스크탑** (lg+): 풀사이즈
    - 지도 이미지: `object-cover` + `object-center`로 비율 유지

- [ ] **Task 3.4**: 성능 최적화
  - Details:
    - 지도 이미지: Next.js `<Image>` 사용 (lazy loading, responsive)
    - 애니메이션: `will-change: transform` 힌트
    - 뷰포트 밖에서는 애니메이션 일시정지 (Intersection Observer)

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 3.5**: 최종 정리
  - Checklist:
    - [ ] 사용하지 않는 import 제거
    - [ ] 기존 DOT_COLORS, glowStyle 코드 제거 확인
    - [ ] 코드 포매팅 일관성
    - [ ] console.log 등 디버그 코드 제거

#### Quality Gate ✋

**⚠️ STOP: Feature is NOT complete until ALL checks pass**

**TDD Compliance** (CRITICAL):
- [ ] **Red Phase**: Tests written FIRST
- [ ] **Green Phase**: Minimal implementation
- [ ] **Refactor Phase**: Clean up while green

**Build & Tests**:
- [ ] `npm test` 전체 통과
- [ ] `npm run build` 성공
- [ ] 기존 테스트 전부 통과 (회귀 없음)

**Manual Test Checklist**:
- [ ] `localhost:3000/` — 히어로 섹션 전체가 정상 동작
- [ ] 모바일 뷰 (Chrome DevTools 375px) — 레이아웃 깨짐 없음
- [ ] 태블릿 뷰 (768px) — 정상
- [ ] 데스크탑 뷰 (1440px) — 정상
- [ ] CTA 버튼 클릭 → /login 이동 정상
- [ ] 3단계 애니메이션 루프 2회 이상 확인
- [ ] 다른 랜딩 섹션 (Pricing, Feature 등) 영향 없음
- [ ] 페이지 로딩 속도 체감상 변화 없음

**Validation Commands**:
```bash
npm test
npm run build
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| 홍대 지도 이미지 미제공 | Low | High | 사용자에게 이미 요청 완료. 대안: placeholder gradient 배경 사용 |
| Motion 라이브러리 SSR 이슈 | Low | Medium | `'use client'` + dynamic import 로 해결 |
| 7×7 마커가 모바일에서 너무 작을 수 있음 | Medium | Medium | 반응형 크기 조정 + 그리드 간격 축소. 최소 5×5로 fallback 가능 |
| 지도 이미지 로딩 지연 | Low | Low | Next.js Image 최적화 + priority 속성 |
| 기존 HeroSection 레이아웃 깨짐 | Low | High | 좌측 영역은 전혀 수정하지 않음. 우측만 컴포넌트 교체 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
**Steps to revert**:
- Delete: `src/components/landing/hero-animation-data.ts`
- Delete: `src/components/landing/__tests__/hero-animation-data.test.ts`
- 기존 코드에 영향 없음 (새 파일만 추가)

### If Phase 2 Fails
**Steps to revert**:
- Delete: `src/components/landing/HeroMapAnimation.tsx`
- Delete: `src/components/landing/__tests__/HeroMapAnimation.test.tsx`
- Phase 1 파일은 유지 가능 (독립적)

### If Phase 3 Fails
**Steps to revert**:
- `HeroSection.tsx`를 git에서 원래 버전으로 복원
- Phase 1, 2 파일은 유지 가능 (독립적)
- `git checkout -- src/components/landing/HeroSection.tsx`

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 1-2 hours | - | - |
| Phase 2 | 2-3 hours | - | - |
| Phase 3 | 1-2 hours | - | - |
| **Total** | 4-7 hours | - | - |

---

## 📝 Notes & Learnings

### Implementation Notes
- 맵타민의 핵심 비즈니스 로직 이해 필수: "근처 카페" 검색 순위 그리드 개선 → "홍대 카페" 검색 상위 노출
- 네이버 플레이스 SEO 구성 요소: 유사도, 인기도, 거리, 정보의 충실성
- 참고: https://new.smartplace.naver.com/help/policy?menu=abuse&tab=smartplace

### File Map (생성/수정 파일 요약)
```
[NEW] src/components/landing/hero-animation-data.ts       ← 3단계 데이터 + 유틸
[NEW] src/components/landing/HeroMapAnimation.tsx          ← 애니메이션 컴포넌트
[NEW] src/components/landing/__tests__/hero-animation-data.test.ts
[NEW] src/components/landing/__tests__/HeroMapAnimation.test.tsx
[MOD] src/components/landing/HeroSection.tsx               ← 우측 영역 교체
[DONE] public/images/hongdae-map.png                       ← AI 생성 일러스트 (저작권 ✅)
```

---

## 📚 References

### Documentation
- [Motion (Framer Motion v12)](https://motion.dev/)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [네이버 플레이스 SEO 정책](https://new.smartplace.naver.com/help/policy?menu=abuse&tab=smartplace)

### Existing Codebase
- `src/components/landing/HeroSection.tsx` — 현재 히어로 (수정 대상)
- `src/components/results/` — 실제 결과 페이지 마커 디자인 참고
- `src/app/page.tsx` — 랜딩 페이지 루트

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All phases completed with quality gates passed
- [ ] Full integration testing performed
- [ ] 3단계 애니메이션이 자연스럽게 루프됨
- [ ] 반응형 (모바일~데스크탑) 정상 동작
- [ ] `npm run build` 성공
- [ ] 기존 랜딩 페이지 섹션에 영향 없음
- [ ] 사용자에게 최종 확인 받음

---

**Plan Status**: 📋 Plan Review
**Next Action**: 사용자 승인 대기
**Blocked By**: 홍대 지도 이미지 (`public/images/hongdae-map.png`) 파일 저장
