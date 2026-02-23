# Implementation Plan: 진단 기록 페이지 + 네비게이터 업데이트

**Status**: 🔄 In Progress
**Started**: 2026-02-23
**Last Updated**: 2026-02-23
**Estimated Completion**: 2026-02-24

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
1. **진단 기록 페이지 (`/history`)**: 전체 검색 기록을 보여주는 전용 페이지 생성. 주간 리포트(weekly) 기반의 **평균 순위 변화 그래프**를 포함하며, 키워드 토글로 개별 키워드 추이를 확인 가능.
2. **네비게이터 업데이트**: DesktopNav / MobileNav에 "진단 기록" 링크 추가.
3. **대시보드 연동**: 기존 대시보드의 `SearchHistorySection`은 유지하되, "전체 보기" 링크로 `/history` 페이지 연결.

### Success Criteria
- [ ] `/history` 라우트가 정상 작동하며 SSR로 데이터 조회
- [ ] 주간 리포트 기반 평균 순위 변화 그래프가 키워드 토글과 함께 표시
- [ ] 전체 진단 기록 테이블이 필터(플랫폼) + 페이지네이션과 함께 표시
- [ ] DesktopNav / MobileNav에 "진단 기록" 링크 추가 완료
- [ ] 대시보드 SearchHistorySection에 "전체 보기 →" 링크가 `/history`로 연결
- [ ] 모바일/데스크탑 반응형 정상 동작
- [ ] 실시간/웰컴 리포트는 그래프 데이터에서 제외, 테이블에는 전체 표시

### User Impact
사용자가 키워드별 순위 변화 추이를 시각적으로 한눈에 확인할 수 있어, 비즈니스 의사결정에 도움이 됩니다. 또한, 전체 진단 기록을 전용 페이지에서 편리하게 관리할 수 있습니다.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| SSR-first: `page.tsx`는 Server Component | coding-rules §1.1 준수, DB 조회는 서버에서 수행 | Client 인터랙션(키워드 토글, 필터)은 별도 Client Component로 분리 |
| recharts 라이브러리 사용 (이미 설치됨) | 프로젝트에 이미 의존성 있음, React 친화적 | 번들 크기 고려 → `next/dynamic` lazy import |
| 그래프 데이터는 `report_type='weekly'`만 필터 | 유저 요청사항: 실시간 진단은 제외 | welcome 리포트도 제외 |
| 평균 순위 = 키워드별 전체 grid_point의 평균 rank | 그리드 전체 평균이 가장 대표성 있음 | best rank 대신 평균으로 변경 (기존 insights.ts와 다른 계산) |
| `/history` 라우트 (dashboard 그룹 내) | 기존 네비게이션 구조와 일관성 | `/dashboard/history` 대신 짧은 URL 사용 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `recharts` 패키지 설치됨 (package.json 확인)
- [x] 기존 `Search`, `SearchResult` 타입 정의됨 (`src/lib/types/index.ts`)
- [x] `calculateWeeklyInsights` 유틸 함수 존재 (`src/lib/utils/insights.ts`)

### External Dependencies
- `recharts`: 이미 설치됨 (LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis)
- `lucide-react`: 이미 설치됨 (아이콘)

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: 핵심 비즈니스 로직(순위 계산 유틸)을 먼저 테스트, UI는 수동 테스트

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥80% | 순위 트렌드 계산 유틸 함수 |
| **Manual Tests** | Critical paths | UI 렌더링, 반응형, 키워드 토글 |

---

## 🚀 Implementation Phases

### Phase 1: 순위 트렌드 계산 유틸 함수
**Goal**: 주간 리포트 데이터를 기반으로 키워드별 평균 순위 시계열 데이터를 계산하는 유틸 함수 생성
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: `calculateRankTrend` 유틸 함수 단위 테스트 작성
  - File: `src/lib/utils/__tests__/rank-trend.test.ts`
  - Test cases:
    - 주간 리포트 2건 이상 → 키워드별 시계열 배열 반환
    - 주간 리포트 1건 이하 → 빈 배열 반환
    - `report_type='realtime'` / `'welcome'`은 필터링되는지 확인
    - rank가 null인 grid_point는 평균 계산에서 제외
    - 출력 형태: `{ date: string, [keyword]: number }[]` (recharts 호환)

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.2**: `calculateRankTrend` 유틸 함수 구현
  - File: `src/lib/utils/rank-trend.ts`
  - Input: `searches: Search[]`, `searchResults: SearchResult[]`
  - Output: `{ date: string, [keyword]: number | null }[]`
  - Logic:
    1. `searches.filter(s => s.report_type === 'weekly' && s.status === 'completed')`
    2. 날짜순 정렬 (ascending)
    3. 각 search에 대해 keyword별 평균 순위 계산 (전체 grid_point rank의 평균)
    4. recharts 호환 형태로 변환

**🔵 REFACTOR**
- [ ] **Task 1.3**: 타입 정의 및 JSDoc 추가
  - `RankTrendDataPoint` 인터페이스 exports

#### Quality Gate ✋
- [ ] `npm test` 통과
- [ ] `npm run build` 오류 없음
- [ ] 타입 체크 통과

---

### Phase 2: 진단 기록 페이지 (Server Component + Client Components)
**Goal**: `/history` 라우트 생성, SSR 데이터 조회, 그래프 + 기록 테이블 UI 완성
**Estimated Time**: 2-3시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**
- [ ] **Task 2.1**: History 페이지 Server Component 생성
  - File: `src/app/(dashboard)/history/page.tsx`
  - SSR 데이터 조회:
    - `user_subscriptions` → plaid 확인
    - `searches` → 전체 (deleted_at IS NULL)
    - `search_results` → weekly search IDs에 해당하는 것만
    - `managed_keywords` → 키워드 목록 (그래프 키워드 토글용)
  - Props로 Client Components에 전달
  - **Vercel Best Practice**: `async-parallel` — `Promise.all`로 병렬 조회

- [ ] **Task 2.2**: `RankTrendChart` Client Component 생성
  - File: `src/components/history/RankTrendChart.tsx`
  - `'use client'` 선언
  - **Vercel Best Practice**: `bundle-dynamic-imports` — recharts를 `next/dynamic`으로 lazy import
  - Props: `trendData: RankTrendDataPoint[]`, `keywords: string[]`
  - UI 구성:
    - 키워드 토글 버튼 그룹 (활성/비활성 토글)
    - `ResponsiveContainer` > `LineChart`
    - X축: 날짜 (MM/DD 형식)
    - Y축: 순위 (역방향 — 1이 위, 20이 아래)
    - 각 키워드별 다른 색상 Line
    - Custom Tooltip (날짜, 키워드, 순위 표시)
  - 반응형: 모바일에서도 스크롤 없이 표시

- [ ] **Task 2.3**: `HistoryFilterBar` Client Component 생성
  - File: `src/components/history/HistoryFilterBar.tsx`
  - 플랫폼 필터 (전체 / 네이버 / 구글)
  - 리포트 타입 필터 (전체 / 주간 / 실시간 / 웰컴)

- [ ] **Task 2.4**: `HistoryTable` Client Component 생성
  - File: `src/components/history/HistoryTable.tsx`
  - 기존 `SearchHistorySection` 스타일 재활용 (테이블 + 페이지네이션)
  - 추가 기능: 필터 적용, 더 많은 결과 표시 (PAGE_SIZE = 10)
  - 각 행: 상태 뱃지, 매장명, 플랫폼, 리포트 유형, 검색 일시, 상세 조회 링크

- [ ] **Task 2.5**: 네이버/구글 플랫폼 토글 (그래프 전환)
  - `RankTrendChart`와 연동
  - 기존 `DashboardMetricsToggle` 패턴 참고 (네이버/구글 토글)

#### Quality Gate ✋
- [ ] `/history` 라우트 브라우저에서 정상 렌더링
- [ ] 주간 리포트 데이터로 그래프 표시 확인
- [ ] 키워드 토글 동작 확인
- [ ] 필터 동작 확인
- [ ] 모바일 반응형 확인
- [ ] `npm run build` 오류 없음

---

### Phase 3: 네비게이터 업데이트 + 대시보드 연동
**Goal**: DesktopNav/MobileNav에 "진단 기록" 링크 추가, 대시보드에서 "전체 보기" 연결
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**
- [ ] **Task 3.1**: `DesktopNav` 업데이트
  - File: `src/components/layout/DesktopNav.tsx`
  - "대시보드"와 "내 순위 검색" 사이에 "진단 기록" 링크 추가
  - Icon: `History` (lucide-react, 이미 MobileNav에서 import됨)
  - href: `/history`

- [ ] **Task 3.2**: `MobileNav` 업데이트
  - File: `src/components/layout/MobileNav.tsx`
  - `navItems` 배열에 `{ href: '/history', label: '진단 기록', icon: History }` 추가
  - "대시보드"와 "내 순위 검색" 사이에 배치

- [ ] **Task 3.3**: 대시보드 `SearchHistorySection` 헤더에 "전체 보기" 링크 추가
  - File: `src/components/dashboard/SearchHistorySection.tsx`
  - 기존 "최근 진단 기록" 헤더 옆에 `<Link href="/history">전체 보기 →</Link>` 추가
  - 기존 `DeleteAllButton` 옆에 배치

#### Quality Gate ✋
- [ ] 데스크탑 네비게이터에 "진단 기록" 링크 표시 확인
- [ ] 모바일 네비게이터에 "진단 기록" 링크 표시 확인
- [ ] 네비게이터 링크 클릭 시 `/history`로 정상 이동
- [ ] 대시보드 "전체 보기" 클릭 시 `/history`로 이동
- [ ] `npm run build` 오류 없음

---

### Phase 4: 문서 업데이트
**Goal**: architecture_data_flow.md, component_tree.md 등 문서에 새 기능 반영
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 4.1**: `architecture_data_flow.md` 업데이트
  - 새 섹션: "Feature: History Page (진단 기록)"
  - 데이터 흐름: SSR → searches/search_results/managed_keywords SELECT
  - File Index에 `/history` 추가

- [ ] **Task 4.2**: `component_tree.md` 업데이트
  - 새 섹션: "History (/history)" 추가
  - Component Directory Index 업데이트 (history/ 디렉토리 추가)
  - layout/ 디렉토리 컴포넌트 설명 업데이트 (nav 변경 반영)

- [ ] **Task 4.3**: 네비게이터 변경 사항 반영
  - DesktopNav / MobileNav 설명에 "진단 기록" 링크 추가 반영

#### Quality Gate ✋
- [ ] 문서가 현재 코드와 일치하는지 확인
- [ ] 모든 새 파일이 File Index에 포함

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| recharts 번들 크기 증가 | Medium | Medium | `next/dynamic`으로 lazy import, SSR false 처리 |
| 주간 리포트 데이터 부족 (2건 미만) | High (신규 유저) | Low | 데이터 부족 시 "주간 리포트가 2회 이상 누적되면 그래프가 표시됩니다" 안내 표시 |
| 대량 검색 기록 시 SSR 성능 | Low | Medium | 최근 50건 리포트 제한 + pagination은 Client-side |
| Y축 순위 역방향 표시 혼동 | Low | Low | Y축 reversed + "1위가 위" 라벨 표시 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `src/lib/utils/rank-trend.ts` 삭제
- 테스트 파일 삭제

### If Phase 2 Fails
- `src/app/(dashboard)/history/` 디렉토리 삭제
- `src/components/history/` 디렉토리 삭제

### If Phase 3 Fails
- DesktopNav.tsx, MobileNav.tsx, SearchHistorySection.tsx git revert
- 가장 간단한 revert (3개 파일의 소량 변경)

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%
- **Phase 4**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 1시간 | - | - |
| Phase 2 | 2-3시간 | - | - |
| Phase 3 | 30분 | - | - |
| Phase 4 | 30분 | - | - |
| **Total** | 4-5시간 | - | - |

---

## 📝 Notes & Learnings

### 파일 구조 (최종)
```
src/
├── app/(dashboard)/history/
│   └── page.tsx                          # SSR Server Component
├── components/history/
│   ├── RankTrendChart.tsx                 # 순위 변화 그래프 (Client)
│   ├── HistoryFilterBar.tsx              # 필터 바 (Client)
│   └── HistoryTable.tsx                  # 전체 기록 테이블 (Client)
├── lib/utils/
│   ├── rank-trend.ts                     # 트렌드 계산 유틸
│   └── __tests__/rank-trend.test.ts      # 단위 테스트
└── components/layout/
    ├── DesktopNav.tsx                    # 수정: "진단 기록" 링크 추가
    └── MobileNav.tsx                     # 수정: "진단 기록" 링크 추가
```

### 핵심 데이터 흐름
```
/history (SSR)
│
├── SELECT searches (deleted_at IS NULL, order by created_at DESC)
├── SELECT search_results (WHERE search_id IN weekly_search_ids)
├── SELECT managed_keywords (user_id)
│
├── calculateRankTrend(searches, searchResults)
│   └── filter: report_type='weekly' && status='completed'
│   └── output: { date, keyword1_avg, keyword2_avg, ... }[]
│
└── Render:
    ├── RankTrendChart (Client) → recharts LineChart
    ├── HistoryFilterBar (Client) → platform/type filter
    └── HistoryTable (Client) → paginated table
```

---

## 📚 References

### Documentation
- [architecture_data_flow.md](../../Docs/important_files/architecture_data_flow.md)
- [component_tree.md](../../Docs/important_files/component_tree.md)
- [erd_design.md](../../Docs/important_files/erd_design.md)
- [coding-rules.md](../../Docs/important_files/coding-rules.md)
- [Recharts LineChart API](https://recharts.org/en-US/api/LineChart)

### Vercel Best Practices Applied
- `async-parallel`: Promise.all for SSR data fetching
- `bundle-dynamic-imports`: recharts lazy import via next/dynamic
- `server-serialization`: 최소 필요 데이터만 Client에 전달

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All phases completed with quality gates passed
- [ ] Full integration testing performed
- [ ] Documentation updated (architecture_data_flow.md, component_tree.md)
- [ ] Bundle size impact verified (recharts dynamic import)
- [ ] Mobile responsiveness tested
- [ ] Accessibility: 그래프에 적절한 aria-label 추가
- [ ] Plan document archived

---

**Plan Status**: ⏳ Pending User Approval
**Next Action**: 유저 승인 후 Phase 1 시작
**Blocked By**: None
