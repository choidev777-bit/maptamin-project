# Implementation Plan: 네이버 스크래퍼 안정성 강화

**Status**: 🔄 In Progress
**Started**: 2026-02-24
**Last Updated**: 2026-02-24
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
네이버 스크래퍼(`scraper_ex2.ts`)에서 간헐적으로 `__APOLLO_STATE__ 없음` 오류 발생.
`config.ts`에 방어 설정(`delayBetweenRequests`, `maxRetries`)이 정의되어 있지만 실제로 사용되지 않고 있음.
**요청 간 1초 딜레이**와 **빈 결과 재시도(1회)** 로직을 추가하여 안정성 강화.

### Success Criteria
- [ ] 각 요청 사이에 1초 딜레이가 적용됨
- [ ] 25개 Task 완료 후 빈 결과(results.length === 0)가 있으면 5초 대기 후 재시도
- [ ] 재시도 후에도 실패하면 기존대로 NULL 저장 (graceful degradation)
- [ ] 기존 테스트(`utils.test.ts`)가 깨지지 않음
- [ ] 로그에 딜레이/재시도 상태가 명확히 표시됨

### User Impact
- 스크래핑 총 소요 시간: 약 2분 → 약 2분 25초 (+25초)
- 빈 결과(지도에서 `-` 표시) 발생 확률 대폭 감소
- 네이버 rate limiting 위험 감소로 서비스 안정성 향상

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 요청 간 1초 딜레이 (config의 2초 대신) | 2초×25=50초는 과하고, 1초면 사람 수준의 간격 확보 | 총 25초 추가 소요, 하지만 허용 범위 |
| 마지막에 빈 결과만 재시도 (개별 Task 즉시 재시도 아님) | 자연스러운 시간차 확보, 코드 단순, 속도 영향 최소 | 재시도가 배치 끝에만 발생해서 실패 위치와 시간차가 큼 (오히려 장점) |
| config.ts의 `delayBetweenRequests`를 1000으로 변경 | 설정 파일과 실제 동작의 일관성 유지 | 기존 설정값(2000) 변경 |
| 재시도 최대 1회 | 1회면 충분 (간헐적 오류이므로), 과도한 재시도는 네이버 차단 위험 | 극히 드문 연속 실패 시 복구 불가 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `scraper_ex2.ts` 코드 분석 완료
- [x] `config.ts` 설정 분석 완료
- [x] `run-search.ts` 워커 분석 완료
- [x] 오류 로그 분석 완료

### External Dependencies
- 없음 (기존 코드 내부 수정만)

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: 기존 유틸리티 테스트 유지 + 새 로직 검증

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | 새 함수 100% | 딜레이, 재시도 로직 단위 검증 |
| **Manual Tests** | 실제 스크래핑 | GitHub Actions에서 수동 검색 실행하여 로그 확인 |

---

## 🚀 Implementation Phases

### Phase 1: config.ts 설정값 조정 + scraper_ex2.ts 딜레이 적용
**Goal**: 매 요청 사이에 1초 딜레이를 적용하여 네이버 rate limiting 위험 감소
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 1.1**: `config.ts`의 `delayBetweenRequests`를 `1000`(1초)으로 변경
  - File: `src/lib/naver/config.ts` (L21)
  - 변경: `delayBetweenRequests: 2000` → `delayBetweenRequests: 1000`

- [ ] **Task 1.2**: `scraper_ex2.ts`의 Task 루프에 딜레이 적용
  - File: `src/lib/naver/scraper_ex2.ts`
  - 변경 위치: `scrapeNaverBatch()` 함수의 for 루프 내부 (L196~258)
  - 상세:
    - `NAVER_SCRAPER_CONFIG.delayBetweenRequests`를 import하여 사용
    - 첫 번째 Task는 딜레이 없이 바로 시작
    - 두 번째 Task부터 이전 Task 완료 후 1초 대기
    - 로그: `[Scraper Ex2] ⏳ 1초 대기...` 추가

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 에러 없이 통과
- [ ] 기존 `npm test` (utils.test.ts 포함) 통과
- [ ] TypeScript 타입 에러 없음

**기능 확인**:
- [ ] 로그에 `⏳ 1초 대기...` 메시지가 Task 사이사이에 출력됨
- [ ] `NAVER_SCRAPER_CONFIG.delayBetweenRequests` 값이 실제 적용됨

---

### Phase 2: 빈 결과 재시도 로직 구현
**Goal**: 배치 완료 후 빈 결과가 있으면 5초 대기 후 해당 좌표만 재시도 (1회)
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 2.1**: `scrapeNaverBatch()` 함수에 빈 결과 재시도 로직 추가
  - File: `src/lib/naver/scraper_ex2.ts`
  - 변경 위치: for 루프 종료 후, `finally` 전
  - 상세 로직:
    ```
    1. 전체 results에서 빈 결과 필터링:
       failedResults = results.filter(r => r.results.length === 0)
    
    2. failedResults가 있으면:
       a. 로그: "[Scraper Ex2] ⚠️ {N}개 빈 결과 발견. 5초 후 재시도..."
       b. 5초 대기 (delay(5000))
       c. failedResults 각각에 대해 fetchListApiResults 재호출
       d. 재시도 성공 시 → 기존 results 배열의 해당 인덱스를 치환
       e. 재시도 실패 시 → 기존 빈 결과 유지 (변경 없음)
       f. 로그: "[Scraper Ex2] 🔄 재시도 결과: {성공}개 복구, {실패}개 유지"
    
    3. failedResults가 없으면:
       로그 없이 통과 (99%의 경우)
    ```

- [ ] **Task 2.2**: 재시도 시에도 Task 간 1초 딜레이 적용
  - 재시도 Task가 여러 개일 경우에도 동일하게 1초 간격

**🔵 REFACTOR: 정리**
- [ ] **Task 2.3**: 로그 메시지 정리 및 일관성 확인
  - 기존 로그 형식(`[Scraper Ex2] ✅/❌/⚠️/🔄`)과 통일
  - 배치 최종 요약 로그에 재시도 정보 추가

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 에러 없이 통과
- [ ] 기존 `npm test` 통과
- [ ] TypeScript 타입 에러 없음

**기능 확인**:
- [ ] 빈 결과 발생 시 재시도 로그가 정상 출력됨
- [ ] 재시도 성공 시 results 배열이 올바르게 업데이트됨
- [ ] 빈 결과가 없는 경우 추가 로그 없이 정상 종료됨

---

### Phase 3: 최종 검증 (수동 테스트)
**Goal**: GitHub Actions에서 실제 스크래핑 실행하여 딜레이 + 재시도 동작 확인
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 3.1**: 코드 push 후 GitHub Actions에서 수동 검색 실행
- [ ] **Task 3.2**: 로그 확인
  - 확인 항목:
    - Task 간 1초 딜레이 로그 출력 여부
    - 총 소요 시간이 기존 대비 약 25초 증가했는지
    - (오류 발생 시) 재시도 로그가 정상 출력되는지
- [ ] **Task 3.3**: DB 결과 확인 (Supabase에서 search_results의 rank NULL 여부)

#### Quality Gate ✋

**Manual Testing**:
- [ ] 스크래핑 정상 완료
- [ ] 모든 grid_point에 rank 값이 존재 (NULL 없음 — 또는 재시도로 복구됨)
- [ ] 로그에 딜레이 메시지 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| 1초 딜레이로도 네이버 차단 발생 | Low | Medium | `config.ts`에서 딜레이 값만 올리면 됨 (코드 변경 없이 설정만) |
| 재시도 로직 버그로 무한루프 | Low | High | 재시도 최대 1회로 하드코딩, for 루프 사용 |
| 재시도가 전체 시간을 너무 늘림 | Low | Low | 빈 결과 수가 보통 0~1개이므로 추가 시간 5~7초 수준 |
| GitHub Actions 타임아웃 | Very Low | Medium | 기존 2분 → 최대 약 2분 35초, GHA 타임아웃(10분)보다 훨씬 짧음 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `config.ts`의 `delayBetweenRequests` 원복 (2000)
- `scraper_ex2.ts`에서 딜레이 호출 라인 제거

### If Phase 2 Fails
- 재시도 로직 블록 전체 제거 (Phase 1의 딜레이는 유지)

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%

**Overall Progress**: 0% complete

### 수정 대상 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/lib/naver/config.ts` | `delayBetweenRequests: 2000` → `1000` |
| `src/lib/naver/scraper_ex2.ts` | 딜레이 적용 + 빈 결과 재시도 로직 |

> ⚠️ `run-search.ts` (워커)는 수정하지 않음 — 스크래퍼 내부에서 모두 처리

---

## 📝 Notes & Learnings

### Implementation Notes
- (구현 중 추가 예정)

---

**Plan Status**: 🔄 리뷰 대기중
**Next Action**: 사용자 승인 후 Phase 1부터 구현 시작
**Blocked By**: 사용자 승인
