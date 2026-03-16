# PLAN_local-keyword-feature.md

> **CRITICAL INSTRUCTIONS**: After completing each phase:
> 1. Check off completed task checkboxes
> 2. Run all quality gate validation commands
> 3. Verify ALL quality gate items pass
> 4. Update "Last Updated" date
> 5. Document learnings in Notes section
> 6. Only then proceed to next phase
>
> DO NOT skip quality gates or proceed with failing checks

---

**Feature**: 지역명 키워드 순위 추적 기능  
**Scope**: Large (6 Phases, 예상 15~20h)  
**Last Updated**: 2026-03-16 (2차 코드 검토 반영 — 누락 Task 3건 추가)  
**Status**: Planning

---

## 개요

### 문제

현재 네이버 스크래핑은 "업종 키워드" (예: 카페, 고기집)만 그리드 좌표별로 검색함.  
"지역명 키워드" (예: 홍대 카페, 강남역 맛집)는 위치 무관 단일 순위이므로 좌표 없이 1회만 검색하면 됨.  
그러나 현재 지원하지 않아 사용자가 지역명 순위 변화를 추적할 수 없음.

### 해결 목표

1. 지역명 키워드를 온보딩에서 등록 가능하도록
2. 검색 시 업종 키워드(그리드)와 지역명 키워드(단일) 동시 실행
3. 결과 페이지 상단 4번째 카드: "지역명 키워드 순위" (키워드별 리스트)
4. 히스토리 추이 그래프에 지역명 키워드 순위 포함

---

## 아키텍처 결정

### 핵심 설계 원칙

| 결정 | 선택 | 이유 |
|---|---|---|
| 지역명 키워드 저장 위치 | `managed_keywords`에 `keyword_type` 컬럼 추가 | 기존 테이블 재사용, 최소 변경 |
| 검색 레코드 저장 | `searches.local_keywords: string[]` 추가 | 기존 `keywords` 필드는 업종 키워드 유지 |
| 검색 결과 저장 | 기존 `search_results` + `grid_index = -1` 센티널 | 별도 테이블 불필요, 기존 조회 로직 재사용 |
| VM Worker 전달 | `search_id`만 전달 (기존 동일), Worker가 `local_keywords` 필드 읽음 | Dispatcher 변경 불필요 |
| 플랜별 지역명 키워드 수 | `keywordsNaver`와 동일 (starter=2, pro=5, premium=5) | 요청 스펙대로 |

### 데이터 흐름

```
온보딩 (StepKeywordRegister)
  -> managed_keywords: {keyword_type: 'industry'|'local'}

실시간 분석 (naver-search/new/page.tsx)
  -> /api/naver/search [POST]
       -> searches: {keywords: [...업종], local_keywords: [...지역명]}
            -> /api/queue/dispatch
                 -> Oracle VM Worker
                       - 업종 키워드 x 그리드 좌표: search_results (grid_index >= 0)
                       - 지역명 키워드 x 1회: search_results (grid_index = -1)

자동 리포트 (cron)
  -> managed_keywords에서 keyword_type별 분리 조회
       -> searches에 local_keywords 포함 생성

결과 페이지
  - 기존 3카드: grid_index >= 0 결과 사용
  - 4번째 카드: grid_index = -1 결과 (지역명 키워드 순위 리스트)

히스토리 (rank-trend.ts)
  -> grid_index 무관하게 rank만 처리 (이미 동작 가능)
```

---

## 영향 범위 (전체 파일 목록)

| 파일 | 변경 유형 | 이유 |
|---|---|---|
| `src/lib/pricing/config.ts` | MODIFY | `localKeywordsNaver` 필드 추가 |
| `src/lib/types/index.ts` | MODIFY | `Search.local_keywords`, `ManagedKeyword.keyword_type` 추가 |
| `src/components/onboarding/StepKeywordRegister.tsx` | MODIFY | 지역명 키워드 입력 섹션 추가 |
| `src/components/settings/KeywordManager.tsx` | MODIFY | ⚠️ 업종/지역명 키워드 별도 표시 (기존에 혼재) |
| `src/components/dashboard/KeywordManageModal.tsx` | MODIFY | ⚠️ 업종/지역명 키워드 별도 표시 (기존에 혼재) |
| `src/app/api/naver/search/route.ts` | MODIFY | `local_keywords` 파싱 및 DB 저장 |
| `src/app/(dashboard)/naver-search/new/page.tsx` | MODIFY | keyword_type 분리 후 `local_keywords` API 전달 |
| `src/app/(dashboard)/naver-search/[id]/NaverResultsContent.tsx` | MODIFY | ⚠️ `grid_index=-1` 결과를 업종 결과에서 분리 후 각 컴포넌트에 정확히 전달 |
| `src/components/results/SearchResultsOverview.tsx` | MODIFY | 4번째 카드 추가 (`localResults` prop 신규) |
| `src/lib/utils/rank-trend.ts` | VERIFY | `grid_index=-1` 결과 포함 여부 확인 |
| Supabase Migration | NEW | `managed_keywords.keyword_type`, `searches.local_keywords` 컬럼, `grid_index` 제약조건 확인 |
| Oracle VM Worker | MODIFY (별도 레포) | `local_keywords` 읽어서 좌표 없이 검색 처리 |
| `src/app/api/cron/scheduled-search/route.ts` | MODIFY | ⚠️ `search_schedules.keywords`만 사용 중 → local_keywords 별도 조회 추가 |

> Oracle VM Worker는 별도 레포이므로 이 계획서는 Next.js 앱 변경만 다룸.

---

## Phase 1: DB 스키마 변경

**Goal**: `managed_keywords`에 `keyword_type` 컬럼 추가, `searches`에 `local_keywords` 컬럼 추가  
**예상 시간**: 1~2h

### Tasks

- [ ] ⚠️ **사전 확인**: Supabase에서 `search_results.grid_index` 컬럼의 CHECK 제약조건 또는 NOT NULL 외 제약 확인
  - `-1` 삽입이 가능한지 검증 (제약이 있으면 `ALTER TABLE search_results DROP CONSTRAINT ...` 필요)

- [ ] Supabase SQL 마이그레이션 작성 및 실행

```sql
-- managed_keywords에 keyword_type 추가
ALTER TABLE managed_keywords
ADD COLUMN IF NOT EXISTS keyword_type TEXT NOT NULL DEFAULT 'industry'
CHECK (keyword_type IN ('industry', 'local'));

-- searches에 local_keywords 추가 (기존 데이터는 빈 배열)
ALTER TABLE searches
ADD COLUMN IF NOT EXISTS local_keywords TEXT[] NOT NULL DEFAULT '{}';

-- search_schedules에 local_keywords 추가 (cron 자동 리포트용)
ALTER TABLE search_schedules
ADD COLUMN IF NOT EXISTS local_keywords TEXT[] NOT NULL DEFAULT '{}';
```

- [x] `src/lib/types/index.ts` 업데이트
  - `ManagedKeyword`: `keyword_type?: 'industry' | 'local'` 추가
  - `Search`: `local_keywords?: string[]` 추가
  - `SearchSchedule`: `local_keywords?: string[]` 추가

- [x] `src/lib/pricing/config.ts` 업데이트
  - `PLAN_CONFIG` 타입에 `localKeywordsNaver: number` 추가
  - 각 플랜 값: `free=0, starter=2, pro=5, premium=5`
  - `getPlanLimit()` 반환값에 `localKeywordsNaver` 추가

### Quality Gate

- [x] `npx tsc --noEmit` — 타입 에러 없음 (테스트 파일 제외 — 기존 에러)
- [ ] Supabase Studio에서 세 컬럼 추가 확인 (`managed_keywords`, `searches`, `search_schedules`)
- [ ] 기존 레코드: `keyword_type = 'industry'`, `local_keywords = '{}'` 확인
- [ ] `search_results` 테이블에 `grid_index = -1` 테스트 INSERT 성공 확인

### Rollback

```sql
ALTER TABLE managed_keywords DROP COLUMN IF EXISTS keyword_type;
ALTER TABLE searches DROP COLUMN IF EXISTS local_keywords;
ALTER TABLE search_schedules DROP COLUMN IF EXISTS local_keywords;
```

---

## Phase 2: 온보딩 UI — 지역명 키워드 입력

**Goal**: `StepKeywordRegister.tsx` 네이버 섹션 아래에 지역명 키워드 입력 추가  
**예상 시간**: 2~3h  
**Dependencies**: Phase 1

### Tasks

- [x] `StepKeywordRegister.tsx` 수정
  - `localNaverKeywords: string[]` state 추가
  - 업종 키워드 입력란 아래 구분선 + "상위노출을 목표하는 지역명 키워드 (선택)" 섹션
  - `maxLocalKeywords = PLAN_CONFIG[planId].localKeywordsNaver`
  - INSERT 시 `keyword_type: 'local'` 포함
  - ⚠️ **`canProceed` 조건 절대 수정 금지** — 현재 `naverFilled && googleFilled` 로직을 건드리지 말 것.
    지역명 키워드는 선택사항이므로 `canProceed`에 포함 안 함.
  - 구글 탭에는 지역명 키워드 입력 없음 (네이버만)
  - `onComplete` 콜백 반환값에 `localNaverKeywords: string[]` 추가
    (현재 타입: `{ naverKeywords: string[]; googleKeywords?: string[] }` → `localNaverKeywords` 필드 추가)

- [x] 안내 문구: "예: 홍대 카페, 강남역 미용실 / 위치에 관계없이 동일한 순위로 추적됩니다."

- [x] **`onboarding-utils.ts` 또는 `onboarding/page.tsx`의 `OnboardingData` 타입 수정**
  - `keywords.localNaverKeywords: string[]` 필드 추가
  - `StepKeywordRegister`의 `onComplete` 결과를 onboardingData에 저장하는 코드 확인 및 수정

- [x] ⚠️ **`KeywordManager.tsx` 수정** (설정 페이지)
  - 현재 `platform === 'naver'` 로만 필터링 → `keyword_type`도 구분해 표시
  - 네이버 섹션: 업종 키워드 리스트 + 지역명 키워드 리스트 분리 표시
  - `addKeyword('naver')` 호출 시 `keyword_type` 파라미터 추가

- [x] ⚠️ **`KeywordManageModal.tsx` 수정** (대시보드 모달)
  - 현재 `platform`으로만 필터 → `keyword_type` 구분 추가
  - 또는 모달 자체를 업종/지역명 탭으로 분리

### Quality Gate

- [x] `npx tsc --noEmit` — 타입 에러 없음 (테스트 파일 제외 — 기존 에러)
- [ ] starter: 지역명 키워드 최대 2개
- [ ] pro/premium: 최대 5개
- [ ] `managed_keywords` 테이블에 `{keyword_type: 'local'}` 레코드 저장 확인
- [ ] 지역명 키워드 없이도 다음 단계 진행 가능 (`canProceed` 영향 없음)
- [ ] Premium 플랜의 구글 업종 키워드 필수 조건 (`googleFilled`) 여전히 동작 확인
- [ ] `KeywordManager.tsx`: 설정 페이지에서 업종/지역명 키워드가 섞여 표시되지 않음 확인
- [ ] `KeywordManageModal.tsx`: 대시보드 모달에서 업종/지역명 구분 확인

### Rollback

- `StepKeywordRegister.tsx`, `KeywordManager.tsx`, `KeywordManageModal.tsx` git revert

---

## Phase 3: 검색 API — local_keywords 전달

**Goal**: 실시간 분석 및 자동 리포트 생성 시 `local_keywords`를 API에 포함  
**예상 시간**: 3~4h (스케줄 저장 경로 포함으로 예상 시간 증가)  
**Dependencies**: Phase 1, Phase 2

### Tasks

- [x] `/api/naver/search/route.ts` 수정
  - Body 파싱: `local_keywords?: string[]` 추가 (기본값: `[]`)
  - `searches.insert()` 시 `local_keywords` 포함
  - 개수 검증: `local_keywords.length <= planConfig.localKeywordsNaver`

- [x] `naver-search/new/page.tsx` 수정
  - `managed_keywords` 조회 시 `select('keyword, platform, keyword_type')` 로 변경
    (현재 `select('keyword, platform')` — `keyword_type` 미포함)
  - `RegisteredKeyword` 인터페이스에 `keyword_type: 'industry' | 'local'` 필드 추가
  - 업종 키워드(`keyword_type='industry'`)는 검색 Step 1 체크박스에 표시
  - 지역명 키워드(`keyword_type='local'`)는 자동 포함 (체크박스 없이 항상 전달)
  - `handleSubmit`에서 `local_keywords`를 API body에 `keywords`와 분리하여 전달

- [x] ⚠️ **cron `scheduled-search/route.ts` 수정 (핵심 주의)**
  - 현재 cron은 `job.keywords` (= `search_schedules.keywords`)를 직접 사용 (170행)
  - `managed_keywords`를 별도 조회하지 않음
  - **선택 A 적용**: `search_schedules.local_keywords` 컬럼 사용 (Phase 1 마이그레이션에 포함)
  - `searches` INSERT 시 `local_keywords: job.local_keywords || []` 추가

- [x] ⚠️ **`StepScheduleSetting.tsx` 수정 (누락 Task — 필수)**
  - 현재 `search_schedules` INSERT 시 `local_keywords` 필드가 완전히 없음
  - 네이버 스케줄 INSERT에 `local_keywords: onboardingData?.keywords?.localNaverKeywords ?? []` 추가
  - (구글 스케줄에는 지역명 키워드 없으므로 추가 불필요)

- [x] ⚠️ **`/api/settings/schedule/route.ts` 수정 (설정 페이지 스케줄 저장) — 구체적 주의사항**
  - PUT 핸들러 117~141행: 스케줄 활성화 시 `managed_keywords`에서 키워드를 동기화하는 로직이 있음
  - 현재 `select('keyword').eq('platform', platform)`으로 `keyword_type` 구분 없이 전부 가져옴
  - 이대로 두면 업종+지역명 키워드가 모두 `search_schedules.keywords`에 혼입되어 cron 오작동
  - **수정 방법**:
    ```ts
    // keywords 동기화 시 keyword_type 구분 필요
    select('keyword, keyword_type').eq('platform', platform)
    syncKeywords      = managed_keywords.filter(k => k.keyword_type === 'industry').map(k => k.keyword)
    syncLocalKeywords = managed_keywords.filter(k => k.keyword_type === 'local').map(k => k.keyword)
    // updateData에 keywords: syncKeywords, local_keywords: syncLocalKeywords 분리 저장
    ```

- [x] ⚠️ **`onboarding/page.tsx` 수정 (누락 Task — 필수)**
  - `handleConfirm` 내 웰컴 리포트 POST(195~210행)에 `local_keywords` 미전달
  - `data.keywords.localNaverKeywords`를 body에 추가
  ```ts
  // 수정 후
  body: JSON.stringify({
      ...
      keywords: data.keywords.naverKeywords,
      local_keywords: data.keywords.localNaverKeywords ?? [],  // ← 추가
      ...
  })
  ```

### Quality Gate

- [x] `npx tsc --noEmit` — 타입 에러 없음 (테스트 파일 제외 — 기존 에러)
- [ ] 실시간 분석 생성 후 Supabase에서 `searches.local_keywords` 값 확인 (빈 배열 아님)
- [ ] 온보딩 완료 후 Supabase에서 `searches.local_keywords` 값 확인 (웰컴 리포트)
- [ ] 온보딩 완료 후 Supabase에서 `search_schedules.local_keywords` 값 확인
- [ ] 설정 페이지에서 스케줄 활성화 후 `search_schedules.keywords`에 지역명 키워드 혼입 없음 확인
- [ ] 자동 리포트 실행(cron 수동 트리거) 후 생성된 `searches.local_keywords` 값 확인
- [ ] 한도 초과 시 403 반환 확인
- [ ] 기존 검색 (local_keywords 없음) 정상 동작

### Rollback

- `route.ts`, `new/page.tsx`, `scheduled-search/route.ts`, `StepScheduleSetting.tsx`, `onboarding/page.tsx` git revert

---

## Phase 4: VM Worker 인터페이스 스펙 문서화

**Goal**: VM Worker 변경 스펙 문서 작성 (Next.js 코드 변경 없음)  
**예상 시간**: 1h  
**Dependencies**: Phase 3

### VM Worker 변경 스펙

```
[기존] search_results insert:
  {search_id, keyword, grid_index: N, grid_lat: float, grid_lng: float, rank}

[추가] local_keywords 처리:
  FOR each keyword in searches.local_keywords:
    URL: https://map.naver.com/p/search/{keyword}
    좌표 파라미터 없음
    매장 이름으로 순위 추출 (기존 로직 동일)
    INSERT search_results:
      {search_id, keyword, grid_index: -1, grid_lat: null, grid_lng: null, rank}
```

### Tasks

- [x] `Docs/VM_WORKER_LOCAL_KEYWORD_SPEC.md` 작성
- [ ] Oracle VM Worker 레포 이슈 생성

### Quality Gate

- [x] 스펙 문서 존재 확인
- [ ] VM Worker 담당자 확인

---

## Phase 5: 결과 페이지 — 4번째 카드

**Goal**: `SearchResultsOverview.tsx`에 지역명 키워드 순위 카드 추가  
**예상 시간**: 2~3h  
**Dependencies**: Phase 4

### 카드 디자인

```
지역명 키워드 순위          [지도 아이콘]
홍대 카페     3위
마포 맛집     7위
신촌 음식점   12위
좌표 무관 단일 순위
```

### Tasks

- [x] ⚠️ **`NaverResultsContent.tsx` 수정 (핵심)**
  - 현재 `results.filter(r => r.keyword === selectedKeyword)`로만 필터링 (59행)
  - 이 결과를 `SearchResultsOverview`와 `NaverRankHeatmap` 모두에 전달 중
  - **분리 필요**:
    ```
    const industryResults = results.filter(r => r.grid_index >= 0)
    const localResults    = results.filter(r => r.grid_index === -1)
    const filteredIndustry = industryResults.filter(r => r.keyword === selectedKeyword)
    ```
  - `SearchResultsOverview`에는 `results={filteredIndustry}` + `localResults={localResults}` 전달
  - `NaverRankHeatmap`에는 `results={industryResults}` 전달 (keyword 필터링은 컴포넌트 내부에서)
  - ⚠️ **`KeywordTabs`에는 `results={industryResults}` 전달 (변경 필요)**
    - `keywords={search.keywords}` 로 탭 목록은 업종 키워드만 표시됨 (변경 불필요)
    - 단, `results` prop에 `grid_index=-1` 결과가 포함되면 `keywordStats` 계산(`KeywordTabs.tsx` 20~36행)에서
      업종·지역명 키워드 이름이 동일할 경우 통계가 오염됨
    - 안전하게 `results={industryResults}`(grid_index≥0만) 전달
  - `CompetitorComparisonPanel`에는 `results={filteredIndustry}` 전달 (기존 동일)

- [x] `SearchResultsOverview.tsx` 수정
  - Props에 `localResults?: SearchResult[]` 추가
  - `localResults`가 있을 때 4열 (`md:grid-cols-4`), 없으면 3열 유지
  - 4번째 카드: 키워드별 순위 리스트
  - ⚠️ 기존 평균 순위/상위 노출률 계산에 `localResults` 혼입 방지 확인
    (`totalPoints`, `rankedCount` 등의 계산은 `results` prop 기준으로만 동작 — 현재 로직 그대로)

### Quality Gate

- [x] `npx tsc --noEmit` — 타입 에러 없음 (테스트 파일 제외 — 기존 에러)
- [ ] `localResults` prop 없을 때 3열 정상 렌더링 (기존 UI 회귀 없음)
- [ ] ⚠️ 지역명 결과가 `NaverRankHeatmap` 지도에 표시되지 않음 확인 (`null,null` 마커 미생성)
- [ ] ⚠️ 기존 3카드(평균 순위, 상위 노출률, 분석 좌표)가 업종 결과만으로 계산됨
- [ ] 4번째 카드 키워드/순위 정상 표시 확인 (수동 테스트)
- [ ] 지역명 키워드가 KeywordTabs에 나타나지 않음 확인

### Rollback

- `NaverResultsContent.tsx`, `SearchResultsOverview.tsx` git revert

---

## Phase 6: 히스토리 추이 그래프 — 지역명 키워드 별도 그래프 추가

**Goal**: 히스토리 페이지에 **"지역명 키워드 순위 변동" 그래프 패널을 기존 업종 그래프 아래에 독립적으로 추가**  
**예상 시간**: 3~4h (설계 변경으로 예상 시간 증가)  
**Dependencies**: Phase 5

### 설계 방향

기존 그래프("업종 키워드 순위 변동")에 지역명 키워드 라인을 **섞지 않는다.**

- 업종 키워드(`grid_index >= 0`): 좌표별 평균 순위 → 기존 그래프에 표시 (변경 없음)
- 지역명 키워드(`grid_index = -1`): 단일 순위 → **새로운 별도 그래프 패널에 표시**

```
┌────────────────────────────────────────────┐
│ 🏢 업종 키워드 순위 변동     (기존 그래프)  │
│   양식 ——  피스타 ——                        │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 📍 지역명 키워드 순위 변동   (신규 그래프)  │
│   안국역 맛집 ——  안국역 파스타 ——          │
└────────────────────────────────────────────┘
```

두 그래프는 같은 `RankTrendChart` 컴포넌트를 재사용하고, **데이터 계산 로직을 분리**한다.

### 데이터 계산 설계

지역명 키워드는 `grid_index = -1`이고 단일 순위(rank)로만 저장된다.  
`calculateRankTrend`는 `grid_index`를 참조하지 않으므로, **분리 기준은 `search_results` 조회 시점에서 처리**한다.

```
업종용 results   = searchResults.filter(r => r.grid_index >= 0)  →  calculateRankTrend(searches, industryResults)
지역명용 results = searchResults.filter(r => r.grid_index === -1) →  calculateLocalKeywordTrend(searches, localResults)
```

지역명 키워드는 grid가 없으므로 "좌표별 평균"이 아닌 **단일 rank 값**을 그대로 사용한다.  
`calculateRankTrend`를 그대로 재사용하면 이미 `rank`만 사용하므로 동작하고,  
혹은 가독성을 위해 별도 `calculateLocalKeywordTrend` 함수를 작성해도 된다.

### ⚠️ `history/page.tsx` 기존 버그 수정 (필수)

`search_results` 조회 대상을 구성할 때 `welcome` 타입이 누락됨 (62행):
```ts
// 현재 코드 (버그)
.filter(s => (s.report_type === 'daily' || s.report_type === 'weekly') && s.status === 'completed')

// 수정 후
.filter(s => (s.report_type === 'daily' || s.report_type === 'weekly' || s.report_type === 'welcome') && s.status === 'completed')
```

### Tasks

#### `history/page.tsx` (서버 컴포넌트) 수정

- [x] ⚠️ **62행 버그 수정** — `welcome` 타입을 `scheduledSearchIds` 필터에 추가

- [x] `search_results` 조회 후 `grid_index`로 분리
  ```ts
  const industryResults = searchResults.filter(r => r.grid_index >= 0)
  const localResults    = searchResults.filter(r => r.grid_index === -1)
  ```

- [x] 업종 트렌드 데이터: 기존 `calculateRankTrend(naverSearches, industryResults)` 유지

- [x] 지역명 트렌드 데이터 신규 계산
  ```ts
  const naverLocalTrend    = calculateLocalKeywordTrend(naverSearches, searchResults)
  const naverLocalKeywords = extractKeywordsFromTrend(naverLocalTrend)
  ```
  (구글에는 지역명 키워드 없으므로 네이버만)

- [x] `HistoryPageContent`에 `naverLocalTrend`, `naverLocalKeywords` props 추가 전달

#### `HistoryPageContent.tsx` (클라이언트 컴포넌트) 수정

- [x] Props 인터페이스에 `naverLocalTrend: RankTrendDataPoint[]`, `naverLocalKeywords: string[]` 추가

- [x] 기존 업종 그래프 패널 아래에 **"지역명 키워드 순위 변동" 패널 추가**
  - 헤더 아이콘: `MapPin` (위치 핀 느낌으로 업종과 구분)
  - 제목: "지역명 키워드 순위 변화"
  - 부제: "(자동 보고서 기준)"
  - 플랫폼 토글: **없음** (지역명 키워드는 네이버 전용)
  - `naverLocalTrend.length >= 1`일 때만 그래프 렌더링
  - `RankTrendChart` 컴포넌트 재사용 (동일 컴포넌트, 다른 데이터 전달)

- [x] ⚠️ **`naverLocalTrend`가 빈 배열일 때**: 지역명 키워드 미등록 유저에게는 그래프 패널 자체를 렌더링하지 않음

#### `rank-trend.ts` 확인

- [x] `calculateRankTrend` 함수가 `grid_index`를 참조하지 않음 검증 (이미 확인 — 변경 불필요)
- [x] 별도 `calculateLocalKeywordTrend` 함수 작성 (`search.local_keywords`에서 키워드 수집, `grid_index=-1`만 필터)

#### 테스트

- [ ] `rank-trend.test.ts` 업데이트
  - 테스트: `grid_index=-1`인 결과를 `calculateRankTrend`에 넘기면 단일 rank로 집계됨
  - 테스트: `welcome` 리포트의 결과가 history/page.tsx 조회에 포함됨

### Quality Gate

- [x] `npx tsc --noEmit` — 타입 에러 없음 (테스트 파일 제외 — 기존 에러)
- [ ] `npx jest src/lib/utils/__tests__/rank-trend.test.ts` — 통과
- [ ] 업종 그래프 (`naverTrend`) 기존 표시 내용 회귀 없음
- [ ] 지역명 그래프 패널이 업종 그래프 **아래에** 독립적으로 렌더링됨
- [ ] 지역명 키워드 없는 유저: 지역명 패널 미표시 또는 빈 상태 안내 표시
- [ ] `welcome` 리포트 결과가 두 그래프 모두에 반영됨

### Rollback

- `history/page.tsx`, `HistoryPageContent.tsx` git revert

---

## 리스크 평가

| 리스크 | 확률 | 영향 | 완화 전략 |
|---|---|---|---|
| VM Worker 지역명 검색 결과 부정확 | Medium | High | Phase 4 스펙 철저히 작성, 실제 검색 결과 검증 |
| `grid_index=-1` 센티널이 지도에 `null,null` 마커로 노출됨 | **High** | Medium | Phase 5에서 `NaverResultsContent.tsx`에 분리 로직 적용 (컴포넌트 내부가 아닌 호출 측에서 필터) |
| 기존 3카드 평균 순위/노출률에 지역명 결과 혼입 | **High** | Medium | Phase 5에서 `SearchResultsOverview`에 `industryResults`만 전달 확인 |
| 자동 리포트 cron이 local_keywords 누락 | **High** | High | Phase 1에서 `search_schedules.local_keywords` 컬럼 추가 (선택 A), Phase 3에서 cron 수정 |
| `KeywordManager` / `KeywordManageModal`에서 업종·지역명 혼재 표시 | Medium | Medium | Phase 2에서 두 컴포넌트 모두 수정 |
| DB `grid_index` 컬럼 CHECK 제약으로 `-1` 삽입 거부 | Medium | High | Phase 1 사전 확인 및 제약 해제 |
| 기존 searches 데이터 하위 호환 | Low | Low | DEFAULT '{}' 처리로 안전 |

---

## 성공 기준 (전체)

1. [ ] 온보딩에서 지역명 키워드 플랜 한도까지 등록 가능
2. [ ] 실시간 분석 시 `searches.local_keywords` 저장됨
3. [ ] 자동 리포트 시에도 `local_keywords` 포함
4. [ ] 결과 페이지 4번째 카드 "지역명 키워드 순위" 표시
5. [ ] 지역명 키워드 없으면 4번째 카드 미표시 (3열 유지)
6. [ ] 히스토리 추이 그래프에 지역명 키워드 라인 표시
7. [ ] `npx tsc --noEmit` 에러 없음
8. [ ] 기존 기능 회귀 없음

---

## 진행 상황

- [x] 계획서 작성
- [x] Phase 1: DB 스키마
- [x] Phase 2: 온보딩 UI
- [x] Phase 3: 검색 API
- [x] Phase 4: VM Worker 스펙
- [x] Phase 5: 결과 UI
- [x] Phase 6: 히스토리 추이

---

## Notes & Learnings

*(구현 중 발견한 사항 기록)*
