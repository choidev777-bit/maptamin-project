# Implementation Plan: 스크래퍼 ROOT_QUERY 기반 추출 방식 전환

**Status**: 🔄 In Progress
**Started**: 2026-03-02
**Last Updated**: 2026-03-02
**Estimated Completion**: 2026-03-02

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
현재 `extractPlacesFromApolloState()` 함수는 `__APOLLO_STATE__` 객체의 **모든 key를 플랫하게 순회**하며 `ListSummary:`가 포함된 항목을 전부 수집합니다.

이 방식은 메인 검색 결과(70개)와 "새로 오픈했어요" 섹션 전용 항목(8~9개)을 구분하지 못합니다.
현재는 `newOpening === true` 필터로 "새로 오픈" 항목을 차단하고 있지만, "달콤붕어살롱"처럼 **메인 22위에 실제로 존재하면서 동시에 newOpening: true인 매장**이 순위에서 누락되는 버그가 있습니다.

**해결**: `ROOT_QUERY` 내의 메인 리스트(`items` 배열)를 순서대로 따라가는 방식으로 전환합니다.

### Problem Statement (증거 기반)
- `__APOLLO_STATE__`에 `RestaurantListSummary:2008482723` (달콤붕어살롱) 항목이 1개 존재
- 해당 항목의 `newOpening: true`, `adDescription: undefined`
- 현재 L130의 `if (value.newOpening === true) continue;`로 인해 메인 22위 매장이 제외됨
- `ROOT_QUERY`에는 2개의 리스트가 존재:
  - `restaurantList({display:70, ...})` → 메인 70개 (달콤붕어살롱 = 22위)
  - `restaurantList({filterOpening:true, ...})` → "새로 오픈" 9개

### Success Criteria
- [ ] 메인 리스트에 있으면서 `newOpening: true`인 매장이 정상 순위로 잡힘
- [ ] "새로 오픈했어요" 섹션 전용 매장들은 순위에 포함되지 않음
- [ ] 기존 테스트(`scraper_ex2.retry.test.ts`) 전부 통과
- [ ] 음식점(restaurantList) 외 다른 카테고리(hairshopList, placeList 등)도 정상 동작
- [ ] 광고 항목(`adDescription`)은 여전히 제외됨
- [ ] `ROOT_QUERY`를 사용할 수 없는 fallback 상황에서도 동작

### User Impact
네이버 "새로 오픈" 배지가 달린 매장도 실제 순위에 있으면 정확한 순위가 잡히므로, 사용자에게 더 정확한 히트맵 데이터를 제공합니다.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `ROOT_QUERY.items[].__ref`를 순서대로 resolve하여 순위 결정 | Apollo Cache의 정규화된 구조를 활용. items 배열 자체가 네이버의 순위 순서를 보장함 | ROOT_QUERY 구조가 변경되면 코드 수정 필요 |
| 카테고리별 리스트 키 동적 탐색 (`*List(` 패턴) | 업종별로 `restaurantList`, `hairshopList`, `placeList` 등 키 이름이 다름. 하드코딩 불가 | 예상 못한 새 카테고리 가능성 (낮음) |
| `filterOpening` 포함 키는 명시적 제외 | "새로 오픈했어요" 리스트를 근본적으로 차단 | 없음 |
| `newOpening` 필터 제거 | ROOT_QUERY 방식에서는 메인 리스트에 있는 항목만 추출하므로 불필요 | 없음 |
| ROOT_QUERY 접근 실패 시 기존 flat scan으로 fallback | `window.__APOLLO_STATE__`가 없거나 정규식으로 추출한 경우 ROOT_QUERY 키가 없을 수 있음 | fallback 시 기존 newOpening 버그가 여전히 존재할 수 있으나, 데이터 없는 것보다 나음 |

---

## 📦 Dependencies

### Required Before Starting
- [ ] 기존 코드 동작 확인 (`npm test` 통과 상태)
- [ ] 네이버 플레이스 Apollo State 구조 사전 검증 완료 (2026-03-02 확인됨)

### External Dependencies
- 변경 없음 (기존 Playwright, 네이버 API 그대로)

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: Write tests FIRST, then implement to make them pass

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥90% | `extractPlacesFromApolloState()` 함수의 추출 로직 |
| **Integration Tests** | 핵심 경로 | 기존 retry 테스트가 새 로직과 호환되는지 |

### Test File Organization
```
src/lib/naver/
├── __tests__/
│   ├── scraper_ex2.extraction.test.ts    ← 🆕 새 테스트 파일
│   └── scraper_ex2.retry.test.ts         ← 기존 (수정 필요)
```

---

## 🚀 Implementation Phases

### Phase 1: 사전 데이터 검증 및 테스트 작성
**Goal**: ROOT_QUERY 구조에서 광고 포함 여부를 검증하고, 새 추출 로직에 대한 실패 테스트를 먼저 작성
**Estimated Time**: 1.5시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: `extractPlacesFromApolloState()`에 대한 유닛 테스트 작성
  - File(s): `src/lib/naver/__tests__/scraper_ex2.extraction.test.ts`
  - Expected: Tests FAIL (red) - 아직 ROOT_QUERY 로직이 없으므로
  - Test Cases:
    1. **일반 케이스**: ROOT_QUERY에 메인 리스트 items가 있을 때, items 순서대로 매장 추출 확인
    2. **newOpening 매장 포함**: `newOpening: true`이면서 메인 리스트에 있는 매장이 정상 포함되는지
    3. **"새로 오픈" 섹션 전용 매장 제외**: `filterOpening` 키의 리스트에만 존재하는 매장이 결과에 없는지
    4. **광고 필터링**: `adDescription`이 있는 항목은 여전히 제외되는지
    5. **카테고리 가변성**: `restaurantList`, `hairshopList`, `placeList` 등 다양한 키 이름 처리
    6. **ROOT_QUERY 없음 (fallback)**: ROOT_QUERY가 없는 경우 기존 flat scan 로직으로 fallback
    7. **빈 items 배열**: ROOT_QUERY items가 빈 배열인 경우

- [ ] **Test 1.2**: 브라우저에서 ROOT_QUERY 메인 리스트에 광고(`adDescription`) 항목이 포함되는지 실데이터 검증
  - 방법: 브라우저 JavaScript 실행으로 ROOT_QUERY items 중 adDescription이 있는 항목 카운트
  - 결과에 따라 **Task 2.3**의 광고 필터 위치가 달라짐

**🟢 GREEN: (Phase 2에서 수행)**

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

- [ ] 테스트 파일 생성 완료 및 all tests FAIL (Red 상태 확인)
- [ ] 광고 포함 여부 실데이터 검증 완료
- [ ] 기존 테스트(`scraper_ex2.retry.test.ts`) 여전히 통과

**Validation Commands**:
```bash
npx jest src/lib/naver/__tests__/scraper_ex2.extraction.test.ts --no-coverage
npx jest src/lib/naver/__tests__/scraper_ex2.retry.test.ts --no-coverage
```

---

### Phase 2: 핵심 추출 로직 변경
**Goal**: `extractPlacesFromApolloState()` 함수를 ROOT_QUERY 기반으로 전환하여 Phase 1의 모든 테스트 통과
**Estimated Time**: 1.5시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 2.1**: `extractPlacesFromApolloState()` 함수 수정
  - File(s): `src/lib/naver/scraper_ex2.ts` (L117~143)
  - 변경 내용:
    1. `apolloState['ROOT_QUERY']` 접근
    2. ROOT_QUERY의 모든 키 중 `List(`를 포함하면서 `filterOpening`은 포함하지 않는 키 탐색 (메인 리스트 찾기)
    3. 해당 키의 `items` 배열에서 `__ref` 순서대로 apolloState에서 실제 데이터 resolve
    4. `adDescription` 필터는 유지
    5. `newOpening` 필터는 **제거**
    6. rank는 items 배열 인덱스 기반으로 부여 (광고 제외 후 재번호 매김)

- [ ] **Task 2.2**: ROOT_QUERY가 없거나 items를 찾지 못할 경우 fallback 구현
  - ROOT_QUERY 없음 → 기존 flat scan 로직 실행 (newOpening 필터 포함 유지)
  - 로그 메시지로 fallback 여부 구분 가능하게 처리
  - 이 fallback은 정규식 추출 경로(L84~96)에서 주로 발생할 것으로 예측

- [ ] **Task 2.3**: 기존 retry 테스트(`scraper_ex2.retry.test.ts`) 호환성 확보
  - File(s): `src/lib/naver/__tests__/scraper_ex2.retry.test.ts`
  - 기존 `APOLLO_STATE_SUCCESS` 목(mock) 데이터에 `ROOT_QUERY`가 없음 → fallback 경로로 통과하거나, mock 데이터에 ROOT_QUERY 구조 추가 필요
  - **최소 침습 원칙**: 기존 mock이 fallback으로 자연스럽게 통과하면 수정 불필요. 그렇지 않으면 mock 데이터만 최소 수정

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 2.4**: 코드 정리
  - `newOpening` 관련 주석 업데이트 (왜 제거했는지 이력 주석)
  - 함수 JSDoc 업데이트
  - 불필요해진 코드 제거

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 3 until ALL checks pass**

**TDD Compliance** (CRITICAL):
- [ ] **Green Phase**: Phase 1의 모든 테스트가 통과
- [ ] **Coverage**: `extractPlacesFromApolloState()` 커버리지 ≥90%

**Build & Tests**:
- [ ] 프로젝트 빌드 에러 없음 (`npm run build`)
- [ ] 전체 테스트 통과 (`npm test`)
- [ ] 새 테스트 통과 (`npx jest scraper_ex2.extraction`)
- [ ] 기존 retry 테스트 통과 (`npx jest scraper_ex2.retry`)

**Validation Commands**:
```bash
npm test -- --no-coverage
npm run build
npx jest src/lib/naver/ --coverage
```

**Manual Test Checklist**:
- [ ] "빵" 키워드로 네이버 List API 호출 → 달콤붕어살롱이 22위 근처에 잡히는지 확인
- [ ] "새로 오픈했어요" 섹션 전용 매장이 결과에 없는지 확인

---

### Phase 3: 실서비스 수동 검증
**Goal**: 실제 네이버 검색으로 다양한 업종/키워드에서 ROOT_QUERY 기반 추출이 정상 동작하는지 확인
**Estimated Time**: 0.5시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 3.1**: 음식점 키워드 실테스트
  - 브라우저에서 "빵" (restaurant 카테고리) 검색 → ROOT_QUERY 구조 및 결과 확인
  - 달콤붕어살롱이 정상 순위로 포함되는지 확인

- [ ] **Task 3.2**: 다른 업종 키워드 실테스트 (가능하면)
  - "미용실", "필라테스" 등 다른 카테고리로 검색하여 `hairshopList`, `placeList` 등에서도 ROOT_QUERY 방식이 의도대로 작동하는지 확인
  - ROOT_QUERY 키 이름 패턴이 예상과 일치하는지 확인

- [ ] **Task 3.3**: "새로 오픈" 매장이 없는 키워드로도 테스트
  - "새로 오픈했어요" 섹션이 없는 검색 결과에서도 정상 동작 확인 (빈 filterOpening 리스트 or 아예 없음)

#### Quality Gate ✋

**⚠️ STOP: Complete all manual verifications**

- [ ] 최소 2개 다른 카테고리에서 정상 동작 확인
- [ ] 로그에서 fallback 없이 ROOT_QUERY 경로 통과 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| ROOT_QUERY 구조가 카테고리마다 다름 | **High** | Medium | 동적 키 탐색 (`*List(` 패턴). Phase 3에서 다중 카테고리 검증 |
| ROOT_QUERY 내에 광고 항목이 items에 포함됨 | Medium | Low | Phase 1 Test 1.2에서 사전 검증. `adDescription` 필터 유지 |
| 네이버가 Apollo Cache 구조 변경 | Low | **High** | fallback 로직으로 기존 flat scan 유지 (데이터 손실 방지) |
| 정규식 fallback 경로에서 ROOT_QUERY 없음 | **High** | Low | fallback 시 기존 로직 그대로 사용 (newOpening 필터 포함) |
| 기존 retry 테스트 mock과 새 로직 비호환 | Medium | Medium | mock에 ROOT_QUERY 없으면 fallback 경로 타므로 자연스럽게 호환 예정 |

---

## 🔄 Rollback Strategy

### If Phase 2 Fails
**Steps to revert**:
- `git checkout -- src/lib/naver/scraper_ex2.ts` 로 원복
- 새로 만든 테스트 파일은 유지 (향후 재시도용)

### If Phase 3에서 실서비스 문제 발견
**Steps to revert**:
- Phase 2 rollback과 동일
- 발견된 문제를 Notes에 기록 후 재계획

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
| Phase 1 | 1.5 hours | - | - |
| Phase 2 | 1.5 hours | - | - |
| Phase 3 | 0.5 hours | - | - |
| **Total** | 3.5 hours | - | - |

---

## 📝 Notes & Learnings

### Key Observations (사전 조사)
- `__APOLLO_STATE__`에서 "달콤붕어살롱"은 `RestaurantListSummary:2008482723` 단일 객체로 존재
- `newOpening: true`, `adDescription: undefined` (광고 아님)
- ROOT_QUERY에는 2개 리스트 존재: `display:70` (메인) vs `filterOpening:true` ("새로 오픈")
- 달콤붕어살롱은 양쪽 리스트 모두에서 참조됨 (Apollo 캐시 정규화 특성)
- 8개의 "새로 오픈" 전용 매장은 메인 70개 리스트에는 없음

### 수정 범위 (Surgical Change 원칙)
- **수정 파일**: `src/lib/naver/scraper_ex2.ts` (1개 파일, 1개 함수)
- **신규 파일**: `src/lib/naver/__tests__/scraper_ex2.extraction.test.ts` (테스트)
- **수정 가능 파일**: `src/lib/naver/__tests__/scraper_ex2.retry.test.ts` (mock 데이터 호환성에 따라)
- 그 외 파일 변경 **없음**

---

## 📚 References

### 관련 파일
- [scraper_ex2.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/naver/scraper_ex2.ts) — 수정 대상 함수 L117~143
- [config.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/naver/config.ts) — maxResults: 70 설정
- [types.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/naver/types.ts) — NaverPlaceResult 인터페이스
- [utils.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/naver/utils.ts) — isBusinessMatch 함수
- [retry test](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/naver/__tests__/scraper_ex2.retry.test.ts) — 기존 테스트

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All phases completed with quality gates passed
- [ ] 기존 retry 테스트 전부 통과
- [ ] 새 extraction 테스트 전부 통과
- [ ] 최소 2개 업종 카테고리에서 수동 검증 완료
- [ ] `npm run build` 성공
- [ ] Plan document archived for future reference

---

**Plan Status**: ⏳ Pending Approval
**Next Action**: 사용자 승인 후 Phase 1 시작
**Blocked By**: None
