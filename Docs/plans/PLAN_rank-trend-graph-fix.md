# Implementation Plan: 순위 변화 그래프 매장·키워드 필터링

**Status**: 🔄 In Progress
**Started**: 2026-02-23
**Last Updated**: 2026-02-23
**Estimated Completion**: 2026-02-23

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
순위 변화 그래프에 2가지 버그를 수정합니다:
1. **매장 변경 시 이전 매장 데이터 혼합** — 현재 매장의 `place_id`로 주간 리포트를 필터링
2. **키워드 변경 시 과거 키워드 토글 소실** — `managed_keywords` 대신 실제 그래프 데이터에서 키워드 추출

### Success Criteria
- [ ] 매장을 변경해도 이전 매장의 그래프가 표시되지 않음
- [ ] 과거에 사용했던 키워드도 토글 버튼으로 표시됨
- [ ] 기존 기능(플랫폼 토글, 날짜 병합, 필터링)이 정상 작동

### User Impact
사용자가 매장을 변경하거나 키워드를 수정해도 그래프가 정확한 데이터만 보여줌.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `managed_places.place_id`로 주간 리포트 필터링 | 매장별 데이터 분리가 명확함 | 이전 매장 이력을 보려면 별도 기능 필요 |
| `extractKeywordsFromTrend()`으로 키워드 추출 | 항상 그래프와 토글이 일치 | `managed_keywords`와 무관해져서 정렬 순서가 달라질 수 있음 |
| `user_id` 필터 추가 (보안 강화) | 현재 searches 쿼리에 `user_id` 조건 없음 | 없음 (무조건 추가해야 함) |

---

## 📦 Dependencies

### Required Before Starting
- [x] `HistoryPage` 서버 컴포넌트 구조 확인 완료
- [x] `calculateRankTrend()` 유틸리티 확인 완료
- [x] ERD 확인 — `managed_places.place_id`와 `searches.place_id` 필드 존재 확인

### External Dependencies
- 없음 (기존 패키지만 사용)

---

## 🚀 Implementation Phases

### Phase 1: SSR 데이터 필터링 수정 (`history/page.tsx`)
**Goal**: 현재 매장의 주간 리포트만 가져오고, 키워드를 trendData에서 추출
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 수정 사항 적용**

- [ ] **Task 1.1**: `managed_places` 조회 추가
  - File: `src/app/(dashboard)/history/page.tsx`
  - 현재 `Promise.all`에 `managed_places` SELECT 추가
  - 네이버/구글 각각의 현재 매장 `place_id` 획득

- [ ] **Task 1.2**: 주간 리포트 필터에 `place_id` 조건 추가
  - File: `src/app/(dashboard)/history/page.tsx`
  - 현재 코드:
    ```tsx
    searches.filter(s => s.report_type === 'weekly' && s.status === 'completed')
    ```
  - 수정 후:
    ```tsx
    searches.filter(s =>
        s.report_type === 'weekly' &&
        s.status === 'completed' &&
        s.place_id === currentPlaceId  // 매장 필터 추가
    )
    ```

- [ ] **Task 1.3**: `searches` 쿼리에 `user_id` 조건 추가 (보안)
  - File: `src/app/(dashboard)/history/page.tsx`
  - 현재 코드:
    ```tsx
    supabase.from('searches').select('*').is('deleted_at', null)
    ```
  - 수정 후:
    ```tsx
    supabase.from('searches').select('*').eq('user_id', user.id).is('deleted_at', null)
    ```

- [ ] **Task 1.4**: 키워드 목록을 `extractKeywordsFromTrend()`으로 교체
  - File: `src/app/(dashboard)/history/page.tsx`
  - 현재 코드:
    ```tsx
    const naverKeywords = keywordsData?.filter(k => k.platform === 'naver').map(k => k.keyword) || []
    ```
  - 수정 후:
    ```tsx
    import { extractKeywordsFromTrend } from '@/lib/utils/rank-trend'
    const naverKeywords = extractKeywordsFromTrend(naverTrend)
    const googleKeywords = extractKeywordsFromTrend(googleTrend)
    ```
  - 더 이상 `managed_keywords` 조회가 불필요하므로 `Promise.all`에서 제거

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**Build & Tests**:
- [ ] `npx next build` 에러 없이 성공
- [ ] `/history` 페이지 정상 로딩 (데이터 있을 때 / 없을 때)

**Functionality**:
- [ ] 그래프에 현재 매장 데이터만 표시되는지 확인
- [ ] 키워드 토글 버튼이 trendData 기반으로 표시되는지 확인
- [ ] 플랫폼 토글 (네이버/구글) 정상 작동

**Validation Commands**:
```bash
npx next build
```

---

### Phase 2: 네이버/구글 별도 매장 필터 + 안전장치
**Goal**: 플랫폼별로 다른 매장이 등록되어 있을 경우 각각 올바르게 필터링
**Estimated Time**: 20분
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 플랫폼별 분리 필터링**

- [ ] **Task 2.1**: 네이버/구글 각각 `place_id` 분리
  - File: `src/app/(dashboard)/history/page.tsx`
  - 네이버 매장과 구글 매장의 `place_id`가 다를 수 있으므로 각각 필터링:
    ```tsx
    const naverPlaceId = naverPlace?.place_id
    const googlePlaceId = googlePlace?.place_id

    const naverSearches = searches.filter(s =>
        s.platform === 'naver' &&
        (!naverPlaceId || s.place_id === naverPlaceId)  // 매장 없으면 전체
    )
    const googleSearches = searches.filter(s =>
        s.platform === 'google' &&
        (!googlePlaceId || s.place_id === googlePlaceId)
    )
    ```

- [ ] **Task 2.2**: 매장 미등록 시 안전장치
  - `managed_places`가 비어있으면 (신규 유저) → 모든 주간 리포트 표시 (필터 없음)
  - `place_id`가 null이어도 크래시 안 나도록 방어 코드

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npx next build` 에러 없이 성공
- [ ] 매장이 등록된 유저: 현재 매장 데이터만 표시
- [ ] 매장이 미등록된 유저: 빈 그래프 (안내 메시지) 정상 표시
- [ ] 네이버/구글 탭 전환 시 각 플랫폼 데이터 정상 표시

**Validation Commands**:
```bash
npx next build
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| `managed_places`가 비어있는 유저 | Medium | Medium | `place_id` null 체크로 전체 데이터 표시 fallback |
| `searches.place_id` 값이 null인 레거시 데이터 | Low | Low | null인 경우 필터에서 제외하지 않음 |
| `extractKeywordsFromTrend()`가 빈 배열 반환 | Low | Low | 기존 `trendData.length >= 2` 체크가 이미 안전장치 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `history/page.tsx`를 이전 상태로 복원 (git checkout)
- 다른 파일 변경 없음

### If Phase 2 Fails
- Phase 1 코드에서 `place_id` 필터만 제거하면 원래 동작으로 복귀

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
| Phase 2 | 20분 | - | - |
| **Total** | 50분 | - | - |

---

## 📝 수정 대상 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/app/(dashboard)/history/page.tsx` | managed_places 조회, place_id 필터, user_id 보안, 키워드 추출 방식 변경 |

> **참고**: `rank-trend.ts`, `RankTrendChart.tsx`, `HistoryPageContent.tsx`는 변경 없음

---

**Plan Status**: 🔄 Ready for Approval
**Next Action**: 사용자 승인 후 Phase 1 구현 시작
**Blocked By**: 사용자 승인
