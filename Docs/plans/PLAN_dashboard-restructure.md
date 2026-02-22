# Implementation Plan: 대시보드 구조 개편

**Status**: 📋 Plan Created — Awaiting User Approval
**Started**: 2026-02-22
**Last Updated**: 2026-02-22
**Estimated Completion**: 2026-02-23
**Scope**: Medium (4 phases, ~8-12시간)

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
대시보드 페이지(`/dashboard`)의 섹션 순서와 구성을 재배치하여 사용자가 가장 중요한 정보(등록된 매장)를 먼저 확인하고, 거기서 바로 키워드와 경쟁사를 관리할 수 있도록 개선합니다.

### 변경 전 구조 (Before)
```
1. SubscriptionBanner (free 사용자)
2. DashboardHeader
3. DashboardMetricsToggle
   ├── 네이버/구글 토글 버튼
   ├── QuickStatsRow (관리중인 키워드 카드 + 등록된 경쟁사 카드)  ← 삭제 대상
   └── QuickInsightsRow (주간 리포트 요약)
4. 등록된 내 매장 (DashboardPlatformCard ×2)
5. SearchHistorySection (최근 진단 기록)
```

### 변경 후 구조 (After)
```
1. SubscriptionBanner (free 사용자) — 유지
2. DashboardHeader — 유지
3. 등록된 내 매장 (DashboardPlatformCard ×2, 키워드·경쟁사 수 통합)  ← 최상단 이동
   ├── "저장된 키워드: N개" 버튼 → 키워드 관리 모달
   └── "저장된 경쟁사: N곳" 버튼 → 경쟁사 관리 모달
4. 네이버/구글 토글 버튼 — 유지
5. 주간 리포트 요약 (QuickInsightsRow) — 유지 (토글로 플랫폼 전환)
6. 최근 진단 기록 (SearchHistorySection) — 유지
```

### Success Criteria
- [x] "등록된 내 매장" 섹션이 대시보드 본문 최상단에 위치함
- [x] 각 플랫폼 카드 안에 "저장된 키워드: N개" / "저장된 경쟁사: N곳" 버튼이 표시됨
- [x] 기존 `#키워드` 태그 인라인 표시가 제거됨 (버튼으로 대체)
- [x] "저장된 키워드: N개" 클릭 시 키워드 추가/삭제 모달 열림
- [x] "저장된 경쟁사: N곳" 클릭 시 경쟁사 추가/삭제 모달 열림
- [x] QuickStatsRow 카드 2장이 대시보드에서 제거됨
- [x] 네이버/구글 토글 → 주간 리포트 요약이 기존과 동일하게 동작함
- [x] 기존 설정 페이지(`/settings`)의 키워드/경쟁사 관리 기능 영향 없음

### User Impact
매장 관리, 키워드/경쟁사 확인이 대시보드 첫 화면에서 바로 가능해져 UX 개선. 설정 페이지 이동 없이 핵심 정보를 한눈에 파악.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 키워드/경쟁사 모달을 새로 생성 (settings 것과 별도) | settings의 `KeywordManager`/`CompetitorManager`는 full-page 컴포넌트로 모달에 넣기엔 구조가 맞지 않음. 단, **핵심 비즈니스 로직(API 호출, 유효성 검증)은 그대로 재사용** | 모달 UI 코드 약간 중복. 하지만 UX 최적화 가능 |
| `DashboardPlatformCard`에 props로 모달 트리거 추가 | 기존 카드 컴포넌트를 확장하여 키워드·경쟁사 버튼 표시. 카드 내부에서 모달을 직접 소유 | 카드 컴포넌트가 다소 비대해질 수 있음 |
| `QuickStatsRow` 삭제 대신 `DashboardMetricsToggle`에서 제거 | `QuickStatsRow` 파일은 유지하되 import에서만 제거. 다른 곳에서 사용 가능성 보존 | 미사용 파일 남음 (추후 정리) |
| Server Component(`page.tsx`)에서 데이터를 props로 전달 | `async-parallel` 패턴 적용: 모든 DB 쿼리를 서버에서 병렬 수행 후 클라이언트 컴포넌트에 전달 | 클라이언트에서 실시간 리프레시 시 `router.refresh()` 필요 |

### Vercel/React 최적화 적용 원칙
- **`async-parallel`**: `page.tsx`에서 독립적인 Supabase 쿼리들을 `Promise.all()`로 병렬 실행
- **`server-serialization`**: 클라이언트 컴포넌트에 전달하는 데이터를 최소화 (필요한 필드만)
- **`bundle-dynamic-imports`**: 키워드/경쟁사 모달을 `next/dynamic`으로 lazy-load (모달은 사용 빈도 낮음)
- **`rerender-memo`**: 모달 내부의 리스트 아이템을 React.memo로 감싸 불필요한 리렌더 방지

---

## 📦 Dependencies

### Required Before Starting
- [x] 기존 키워드 API 존재: `managed_keywords` 테이블 직접 접근 (Supabase client)
- [x] 기존 경쟁사 API 존재: `/api/settings/competitors` (GET/POST/DELETE)
- [x] `PlaceSelectionModal` 존재: 경쟁사 등록용 장소 검색 모달 재사용 가능

### External Dependencies
- 없음 (새 패키지 설치 불필요)

---

## 🚀 Implementation Phases

### Phase 1: 대시보드 레이아웃 재배치
**Goal**: 대시보드 섹션 순서 변경 + QuickStatsRow 제거
**Estimated Time**: 1-2시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현**
- [x] **Task 1.1**: `page.tsx` 레이아웃 순서 변경
  - File: `src/app/(dashboard)/dashboard/page.tsx`
  - 변경 내용:
    1. "등록된 내 매장" 섹션을 `DashboardMetricsToggle` 위로 이동
    2. 기존 props는 유지 (`keywords`, `competitorCount`는 이미 전달 중)
  - ⚠️ Protected Zone 파일 수정 없음

- [x] **Task 1.2**: `DashboardMetricsToggle`에서 `QuickStatsRow` 제거
  - File: `src/components/dashboard/DashboardMetricsToggle.tsx`
  - 변경 내용:
    1. `QuickStatsRow` import 및 렌더링 제거
    2. 토글 버튼 + `QuickInsightsRow`만 남김
    3. Props 인터페이스에서 `keywordsCount`, `competitorsCount` 제거

**🔵 REFACTOR: 정리**
- [x] **Task 1.3**: 불필요한 props 정리
  - Files: `DashboardMetricsToggle.tsx`, `page.tsx`
  - `naverData`/`googleData`에서 `keywordsCount`, `competitorsCount` 제거 (insights만 유지)

#### Quality Gate ✋
- [x] `npm run build` 성공
- [x] 대시보드 접속 시 매장 카드가 상단, 토글+주간 리포트가 하단에 표시
- [x] 기존 "관리중인 키워드" / "등록된 경쟁사" 별도 카드 미노출 확인
- [x] 기존 기능 (매장 변경, 순위 검색, 진단 기록 목록) 정상 동작

---

### Phase 2: DashboardPlatformCard에 키워드/경쟁사 수 표시 및 버튼 추가
**Goal**: 카드 내부에 키워드/경쟁사 정보 표시 + 모달 트리거 버튼 배치
**Estimated Time**: 2-3시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현**
- [x] **Task 2.1**: `DashboardPlatformCard` 확장
  - File: `src/components/dashboard/DashboardPlatformCard.tsx`
  - 변경 내용 (Active State에 추가):
    1. **기존 `#키워드` 태그 인라인 표시 제거** (136-144행의 keywords.map 렌더링 삭제)
    2. 대신 `"저장된 키워드: {keywords.length}개"` 클릭 버튼 추가 (기존 `keywords: string[]` props의 `.length` 활용)
    3. `"저장된 경쟁사: {competitorCount}곳"` 클릭 버튼 추가 (기존 `competitorCount` props 활용)
    4. **새 Props 추가 불필요** — 기존 `keywords`와 `competitorCount`가 이미 전달 중
  - UI 디자인:
    ```
    ┌─────────────────────────────┐
    │ [N] 연동됨                   │
    │ 매장이름                     │
    │ 주소                         │
    │                              │
    │ 📌 저장된 키워드: 3개  >      │  ← 클릭 가능 버튼 (keywords.length)
    │ 👀 저장된 경쟁사: 1곳  >      │  ← 클릭 가능 버튼 (competitorCount)
    │                              │
    │ [정보 변경]  [순위 검색]       │
    └─────────────────────────────┘
    ```

- [x] **Task 2.2**: ~~`page.tsx`에서 새 props 전달 연결~~ → **불필요 (삭제)**
  - `keywords`와 `competitorCount`는 이미 `page.tsx`에서 전달 중이므로 추가 작업 없음

#### Quality Gate ✋
- [x] `npm run build` 성공
- [x] 카드에 "저장된 키워드: N개" / "저장된 경쟁사: N곳" 표시 확인
- [x] 버튼 클릭 시 아직 모달 미구현이므로 console.log 또는 no-op 확인
- [x] 기존 "정보 변경" / "순위 검색" 버튼 정상 동작 유지

---

### Phase 3: 키워드 관리 모달 생성
**Goal**: 대시보드에서 키워드 추가/삭제가 가능한 모달 구현
**Estimated Time**: 2-3시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현**
- [x] **Task 3.1**: `KeywordManageModal` 컴포넌트 생성
  - File: `src/components/dashboard/KeywordManageModal.tsx` (새 파일)
  - Props:
    ```ts
    interface KeywordManageModalProps {
      isOpen: boolean
      onClose: () => void
      platform: 'naver' | 'google'
      planId: string
      maxKeywords: number
    }
    ```
  - 기능:
    1. 모달 오픈 시 Supabase에서 해당 플랫폼 키워드 목록 fetch
    2. 키워드 목록 표시 (각 항목에 삭제 버튼)
    3. 하단 입력창 + "추가" 버튼 (한도 미만일 때만 표시)
    4. 추가/삭제 후 `router.refresh()` 호출
  - 참조: `src/components/settings/KeywordManager.tsx`의 `addKeyword`, `deleteKeyword` 로직
  - 최적화: `next/dynamic`으로 lazy-load

- [x] **Task 3.2**: `DashboardPlatformCard`에 모달 연결
  - File: `src/components/dashboard/DashboardPlatformCard.tsx`
  - "저장된 키워드: N개" 버튼 클릭 시 `KeywordManageModal` 열기

- [x] **Task 3.3**: `page.tsx`에서 모달에 필요한 추가 props 전달
  - File: `src/app/(dashboard)/dashboard/page.tsx`
  - 변경 내용:
    1. `getPlanLimit` 함수를 `@/lib/pricing/config`에서 import
    2. `const limits = getPlanLimit(planId)` 호출하여 한도 값 계산
    3. `planId`, `maxKeywords` (= `limits.keywordsNaver` / `limits.keywordsGoogle`) 를 각 카드에 전달
  - ⚠️ `getPlanLimit`은 이미 `/api/settings/competitors/route.ts`에서 동일하게 사용 중

#### Quality Gate ✋
- [x] `npm run build` 성공
- [x] "저장된 키워드: N개" 클릭 → 모달 열림, 키워드 목록 표시
- [x] 모달에서 키워드 추가 → 목록 갱신, 카드 수 업데이트
- [x] 모달에서 키워드 삭제 → 목록 갱신, 카드 수 업데이트
- [x] 한도 초과 시 입력창 미표시 확인
- [x] 설정 페이지(`/settings`)의 키워드 관리 기능 정상 동작 (영향 없음)

---

### Phase 4: 경쟁사 관리 모달 생성
**Goal**: 대시보드에서 경쟁사 추가/삭제가 가능한 모달 구현
**Estimated Time**: 2-3시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현**
- [x] **Task 4.1**: `CompetitorManageModal` 컴포넌트 생성
  - File: `src/components/dashboard/CompetitorManageModal.tsx` (새 파일)
  - Props:
    ```ts
    interface CompetitorManageModalProps {
      isOpen: boolean
      onClose: () => void
      platform: 'naver' | 'google'
      maxCompetitors: number
    }
    ```
  - 기능:
    1. 모달 오픈 시 `/api/settings/competitors?platform={platform}` GET으로 목록 fetch
    2. 경쟁사 목록 표시 (각 항목에 삭제 버튼)
    3. "경쟁사 추가" 버튼 → 기존 `PlaceSelectionModal` 재사용
    4. 추가: `/api/settings/competitors` POST
    5. 삭제: `/api/settings/competitors?id={id}` DELETE
    6. 추가/삭제 후 `router.refresh()` 호출
  - 참조: `src/components/settings/CompetitorManager.tsx`의 로직
  - 최적화: `next/dynamic`으로 lazy-load

- [x] **Task 4.2**: `DashboardPlatformCard`에 모달 연결
  - File: `src/components/dashboard/DashboardPlatformCard.tsx`
  - "저장된 경쟁사: N곳" 버튼 클릭 시 `CompetitorManageModal` 열기

- [x] **Task 4.3**: `page.tsx`에서 모달에 필요한 추가 props 전달
  - File: `src/app/(dashboard)/dashboard/page.tsx`
  - `maxCompetitors` 데이터를 카드에 전달

**🔵 REFACTOR: 최종 정리**
- [x] **Task 4.4**: 전체 정리
  - `QuickStatsRow` import 완전 제거 재확인
  - 불필요한 주석 정리
  - 타입 일관성 확인

#### Quality Gate ✋
- [x] `npm run build` 성공
- [x] "저장된 경쟁사: N곳" 클릭 → 모달 열림, 경쟁사 목록 표시
- [x] 모달에서 경쟁사 추가 → 장소 검색 모달 연동 → 등록 → 목록 갱신
- [x] 모달에서 경쟁사 삭제 → 목록 갱신, 카드 수 업데이트
- [x] 한도 초과 시 추가 버튼 미표시 확인
- [x] 설정 페이지(`/settings`)의 경쟁사 관리 기능 정상 동작 (영향 없음)
- [x] 전체 대시보드 최종 동작 테스트

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| `DashboardPlatformCard` 변경으로 기존 매장 변경 기능에 영향 | Low | High | 기존 기능(정보 변경, 순위 검색) 버튼은 동일한 위치·로직 유지 |
| 키워드/경쟁사 모달에서 데이터 동기화 문제 | Medium | Medium | 모달 close 시 `router.refresh()`로 서버 데이터 재로드 |
| 모달 내부 PlaceSelectionModal 중첩 이슈 | Low | Medium | z-index 레이어링 확인, portal 기반 렌더링 |
| `page.tsx` props 전달 복잡도 증가 | Medium | Low | 플랫폼별 데이터를 객체로 묶어서 전달. 향후 context로 전환 가능 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `page.tsx`의 레이아웃 순서를 원래대로 복원
- `DashboardMetricsToggle`에서 `QuickStatsRow` import 복원

### If Phase 2 Fails
- `DashboardPlatformCard`에서 추가된 props/버튼 제거, Phase 1 완료 상태로 복원

### If Phase 3 Fails
- `KeywordManageModal.tsx` 신규 파일 삭제
- `DashboardPlatformCard`에서 모달 트리거 제거

### If Phase 4 Fails
- `CompetitorManageModal.tsx` 신규 파일 삭제
- `DashboardPlatformCard`에서 모달 트리거 제거

---

## 📊 수정 대상 파일 요약

| 파일 | 작업 | Phase |
|------|------|-------|
| `src/app/(dashboard)/dashboard/page.tsx` | 레이아웃 순서 변경 + props 추가 | 1, 2, 3, 4 |
| `src/components/dashboard/DashboardMetricsToggle.tsx` | QuickStatsRow 제거 + props 정리 | 1 |
| `src/components/dashboard/DashboardPlatformCard.tsx` | 키워드/경쟁사 버튼 추가 + 모달 연결 | 2, 3, 4 |
| `src/components/dashboard/KeywordManageModal.tsx` | **신규 생성** | 3 |
| `src/components/dashboard/CompetitorManageModal.tsx` | **신규 생성** | 4 |

### ⛔ 수정하지 않는 파일
- `src/lib/types/index.ts` (Protected Zone)
- `src/lib/supabase/*` (Protected Zone)
- `src/middleware.ts` (Protected Zone)
- `src/components/settings/KeywordManager.tsx` (영향 없음, 기존 유지)
- `src/components/settings/CompetitorManager.tsx` (영향 없음, 기존 유지)
- `src/app/api/settings/competitors/route.ts` (기존 API 재사용)

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ✅ 100%
- **Phase 2**: ✅ 100%
- **Phase 3**: ✅ 100%
- **Phase 4**: ✅ 100%

**Overall Progress**: 100% complete

### Validation Commands
```bash
# Build
npm run build

# Lint
npm run lint

# 기존 테스트
npm test

# Dev 서버에서 수동 확인
npm run dev
```

---

## 📝 Notes & Learnings
_(구현 진행 시 기록)_

---

**Plan Status**: ✅ Completed
**Next Action**: All tasks finished successfully
**Blocked By**: None
