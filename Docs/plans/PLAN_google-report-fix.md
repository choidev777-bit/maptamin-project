# Implementation Plan: 구글 리포트 복원 (실시간 + 웰컴 + 정기)

**Status**: 🔄 In Progress
**Started**: 2026-02-24
**Last Updated**: 2026-02-24
**Estimated Completion**: 2026-02-25

---

**⚠️ CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date above
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ **DO NOT skip quality gates or proceed with failing checks**

> [!CAUTION]
> 네이버 실시간 진단, 웰컴 리포트, 정기 리포트 기능은 절대 망가뜨리지 않는다.
> 네이버 관련 파일(`/api/naver/*`, `scraper_ex2.ts`, `NaverMapGridConfigurator.tsx` 등)은 수정하지 않는다.

---

## 📋 Overview

### Feature Description

프리미엄 유저의 구글 리포트 3가지가 모두 망가져 있음:
1. **실시간 진단**: `/process` 호출이 주석 처리됨 + GitHub Actions에서 구글 미지원
2. **웰컴 리포트**: 온보딩에서 search 생성 → GitHub Actions dispatch → `run-search.ts`에서 구글 미지원
3. **정기 리포트**: CRON이 search 생성 → dispatch → `run-search.ts`에서 구글 미지원

### 전략 (선택지 A)

| 시나리오 | 실행 위치 | 방식 |
|---------|----------|------|
| 구글 실시간 진단 | **Vercel** | `/api/search/[id]/process` 직접 호출 복원 |
| 구글 웰컴 리포트 | **Vercel** | 온보딩에서 `/process` fire-and-forget 호출 |
| 구글 정기 리포트 | **GitHub Actions** | `run-search.ts`에 DataForSEO 분기 추가 |

### Success Criteria

- [ ] 프리미엄 유저가 구글 실시간 진단을 수행하면 DataForSEO 결과가 정상 저장됨
- [ ] 프리미엄 유저 온보딩 완료 시 구글 웰컴 리포트가 생성됨
- [ ] CRON에 의해 구글 정기 리포트가 자동 생성됨
- [ ] 네이버 실시간/웰컴/정기 리포트가 기존과 동일하게 작동함
- [ ] 검색 실패 시 티켓 환불이 정상 작동함 (레거시 `user_credits` → RPC `refund_ticket` 교체)
- [ ] `npx next build` 성공

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 실시간/웰컴은 Vercel, 정기만 GitHub Actions | DataForSEO는 REST API이므로 프록시 불필요 + Vercel에서 빠르게 처리 가능 | 구글 처리 경로가 2개(Vercel + Actions)로 분산 |
| 실시간에서 GitHub dispatch 건너뛰기 | 이중 처리 방지 + Actions 분 절약 | `/api/search/route.ts`에 분기 로직 추가 필요 |
| 웰컴에서 `keepalive: true` fire-and-forget | 페이지 이동 후에도 서버 처리 보장 | 클라이언트에서 처리 완료 여부를 알 수 없음 (대시보드에서 확인) |
| `refundCredits()` → `supabase.rpc('refund_ticket')` 교체 | 레거시 `user_credits` 테이블 참조 제거 | 없음 (순수 개선) |
| `maxDuration = 60` 추가 | Premium 7×7 그리드(~50초)를 Vercel에서 처리하기 위해 필요 | 없음 |

---

## 📦 Dependencies

### 사용자 수동 작업 (코딩 전)
- [x] GitHub Repository Secrets에 `DATAFORSEO_LOGIN` 추가 (완료)
- [x] GitHub Repository Secrets에 `DATAFORSEO_PASSWORD` 추가 (완료)
- [ ] Vercel 환경변수에 `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` 설정 확인 (Settings → Environment Variables)

### 외부 Dependencies
- DataForSEO API (이미 사용 중, `src/lib/dataforseo/client.ts` 존재)
- Supabase RPC: `refund_ticket` (이미 존재, Phase 4에서 service role 지원 추가)

---

## 🚀 Implementation Phases

### Phase 1: 구글 실시간 진단 복원 (Vercel)
**Goal**: 대시보드에서 구글 실시간 진단을 시작하면 DataForSEO → 결과 저장 → 결과 페이지에서 확인 가능
**Estimated Time**: 1시간
**Status**: 🔄 In Progress

#### 수정 대상 파일 (3개)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `src/app/api/search/route.ts` | 구글 search는 GitHub dispatch 완전 제거 |
| 2 | `src/app/api/search/[id]/process/route.ts` | `maxDuration = 60` 추가 + 실패 시 티켓 환불 |
| 3 | `src/app/(dashboard)/search/new/page.tsx` | `/process` 호출 주석 해제 |

⚠️ **수정 금지**: `src/app/api/naver/search/route.ts` (네이버는 기존 그대로)

#### Tasks

- [ ] **Task 1.1**: `src/app/api/search/route.ts` 수정
  - **모든 구글 search**(실시간+웰컴)에서 GitHub Actions dispatch를 완전 제거
  - 이유: 실시간은 클라이언트가 `/process` 호출, 웰컴은 온보딩에서 fire-and-forget `/process` 호출
  - 정기 리포트의 구글 search는 `api/cron/scheduled-search` → `api/queue/dispatch` 경로이므로 이 API와 무관
  
  **변경 전** (97~146줄):
  ```typescript
  // 4. Trigger GitHub Action (Async Processing)
  // → 무조건 GitHub dispatch
  ```
  
  **변경 후**:
  ```typescript
  // 4. 실시간 구글 진단: GitHub dispatch 건너뛰기 (클라이언트가 /process 호출)
  //    웰컴/주간 구글 리포트: GitHub dispatch 유지 (백그라운드 처리)
  const isRealtimeGoogle = !isWelcome
  
  if (!isRealtimeGoogle && ghRepo && ghPat) {
      // 기존 GitHub dispatch 로직 (웰컴 리포트용)
  }
  ```

- [ ] **Task 1.2**: `src/app/api/search/[id]/process/route.ts` 수정
  - 파일 상단에 `export const maxDuration = 60` 추가
  - catch 블록에 **실패 시 티켓 환불** 로직 추가:
    ```typescript
    // 실패 시 티켓 환불 (웰컴 리포트는 무료이므로 제외)
    if (search.report_type !== 'welcome') {
        await supabase.rpc('refund_ticket', { p_platform: 'google' })
    }
    ```
  - 기존 DataForSEO 로직은 수정하지 않음 (이미 정상 작동)

- [ ] **Task 1.3**: `src/app/(dashboard)/search/new/page.tsx` (315줄) — `/process` 호출 주석 해제
  ```typescript
  const { searchId } = await createResponse.json()
  
  // DataForSEO 처리 (Vercel 서버리스에서 실행)
  const processResponse = await fetch(`/api/search/${searchId}/process`, {
     method: 'POST',
  })
  
  router.push(`/search/${searchId}`)
  ```
  사용자가 ~30~50초 로딩 후 결과 페이지로 바로 이동

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npx next build` 성공
- [ ] 네이버 실시간 진단 API (`/api/naver/search`) 코드 변경 없음 확인

**Manual Testing**:
- [ ] 구글 실시간 진단: `/search/new` → 키워드 선택 → 그리드 설정 → 진단 시작 → 결과 표시 확인
- [ ] 네이버 실시간 진단: 기존과 동일하게 작동하는지 확인

---

### Phase 2: 구글 웰컴 리포트 복원 (Vercel)
**Goal**: 프리미엄 유저 온보딩 완료 시 구글 웰컴 리포트가 백그라운드에서 생성됨
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### 수정 대상 파일 (1개)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `src/app/(dashboard)/onboarding/page.tsx` | 구글 웰컴 search 생성 후 `/process` fire-and-forget 호출 추가 |

#### Tasks

- [ ] **Task 2.1**: `onboarding/page.tsx`의 `handleConfirm()` 수정 (220~249줄)
  - 구글 웰컴 search 생성 성공 후 (`gSearchId` 획득), `/process`를 fire-and-forget으로 호출
  - `keepalive: true` 옵션 적용 (페이지 이동 후에도 요청 유지 보장)
  - 기존 `window.location.href = '/dashboard'` 이동은 그대로 유지
  
  **추가 코드** (248줄 부근, `gSearchId` 획득 직후):
  ```typescript
  // 구글 웰컴 리포트 백그라운드 처리 (fire-and-forget)
  if (gSearchId) {
      fetch(`/api/search/${gSearchId}/process`, {
          method: 'POST',
          keepalive: true,
      }).catch(e => console.error('Google welcome process failed:', e))
  }
  ```
  
  - ⚠️ `await` 없이 호출 (비동기 fire-and-forget)
  - `keepalive: true`로 페이지 이동 시에도 브라우저가 요청을 유지

- [ ] **Task 2.2**: `/api/search/route.ts`의 웰컴 리포트 분기 확인
  - Phase 1에서 실시간만 dispatch 건너뛰도록 수정했으므로, 웰컴은 여전히 GitHub dispatch가 발생
  - 그런데 `/process`도 호출하면 이중 처리 위험
  - **→ 웰컴도 GitHub dispatch를 건너뛰도록 수정** (Vercel `/process`로 통일)
  - 결과적으로: `/api/search/route.ts`에서 **모든 구글 search**(실시간+웰컴)는 GitHub dispatch를 건너뜀
  
  Phase 1의 Task 1.1 수정 재검토:
  ```typescript
  // 구글은 Vercel에서 처리하므로 GitHub dispatch 불필요
  // (정기 리포트는 CRON API → dispatch 경로를 타므로 이 API와 무관)
  if (ghRepo && ghPat) {
      // 구글 검색은 dispatch 건너뛰기 (Vercel /process에서 처리)
      // 이 코드 블록은 실행되지 않음 — 구글 search는 이 route에서만 생성
  }
  ```
  
  ⚠️ **결론**: 구글 search는 이 `/api/search` route에서만 생성되므로, 여기서 dispatch를 모두 제거해도 됨.
  정기 리포트의 구글 search는 `api/cron/scheduled-search`에서 별도로 생성 → `api/queue/dispatch` 경유 → GitHub Actions.

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npx next build` 성공
- [ ] 네이버 웰컴 리포트 코드 변경 없음 확인 (handleConfirm 내 네이버 부분 미수정)

**Manual Testing**:
- [ ] 프리미엄 유저 온보딩 완료 → 대시보드 이동 → 잠시 후 구글 검색 결과 생성 확인
- [ ] 네이버 웰컴 리포트도 동시에 정상 작동하는지 확인

---

### Phase 3: 구글 정기 리포트 복원 (GitHub Actions)
**Goal**: CRON에 의해 생성된 구글 search가 `run-search.ts`에서 DataForSEO로 처리됨
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### 수정 대상 파일 (3개)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `scripts/run-search.ts` | `processSearch()`에 구글(DataForSEO) 분기 추가 |
| 2 | `.github/workflows/manual-dispatch.yml` | `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` 환경변수 추가 |
| 3 | `.github/workflows/cron.yml` | 동일 환경변수 추가 |

#### Tasks

- [ ] **Task 3.1**: `scripts/run-search.ts`의 `processSearch()` 함수 수정 (210~351줄)
  - `else if (search.platform === 'google')` 분기 추가
  - `fetchMapRankBatch` import: `import { fetchMapRankBatch, MapRankTask } from '../src/lib/dataforseo/client'`
  - DataForSEO 결과를 `search_results` 테이블에 저장 (기존 `/process` route와 동일한 스키마)
  
  **핵심 구현**:
  ```typescript
  } else if (search.platform === 'google') {
      // DataForSEO API 호출
      const tasks: MapRankTask[] = []
      let gridIndex = 0
      for (const point of gridPoints) {
          if (point.enabled !== false) {
              for (const keyword of keywords) {
                  tasks.push({
                      keyword,
                      lat: point.lat,
                      lng: point.lng,
                      gridIndex,
                      targetPlaceId: search.place_id,
                  })
              }
          }
          gridIndex++
      }
      
      results = (await fetchMapRankBatch(tasks, 10)).map(r => ({
          keyword: r.keyword,
          gridIndex: r.gridIndex,
          lat: r.lat,
          lng: r.lng,
          targetRank: r.rank,
          results: r.competitors.map(c => ({
              businessName: c.name,
              rank: c.rank,
              naverPlaceId: c.placeId,
          })),
      }))
  }
  ```
  
  - ⚠️ 구글 결과의 `competitors` 필드 매핑이 네이버와 다를 수 있음 → `search_results` 스키마 확인 필요
  - 기존 네이버 코드는 절대 수정하지 않음

- [ ] **Task 3.2**: `.github/workflows/manual-dispatch.yml` 환경변수 추가
  ```yaml
  DATAFORSEO_LOGIN: ${{ secrets.DATAFORSEO_LOGIN }}
  DATAFORSEO_PASSWORD: ${{ secrets.DATAFORSEO_PASSWORD }}
  ```

- [ ] **Task 3.3**: `.github/workflows/cron.yml` 환경변수 추가
  ```yaml
  DATAFORSEO_LOGIN: ${{ secrets.DATAFORSEO_LOGIN }}
  DATAFORSEO_PASSWORD: ${{ secrets.DATAFORSEO_PASSWORD }}
  ```

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npx next build` 성공
- [ ] 네이버 크롤링 코드 변경 없음 확인

**Manual Testing**:
- [ ] GitHub Actions 수동 트리거 (`workflow_dispatch`) → 구글 스케줄 있으면 처리되는지 확인
- [ ] 네이버 정기 리포트도 동일하게 작동하는지 확인

---

### Phase 4: 레거시 환불 함수 교체 + RPC 업데이트
**Goal**: `run-search.ts`의 `refundCredits()`를 RPC 기반으로 교체 + `refund_ticket` RPC에 service role 지원 추가
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### 수정 대상

| # | 대상 | 변경 내용 |
|---|------|----------|
| 1 | `scripts/run-search.ts` | `refundCredits()` → `refundTicket()` 교체 |
| 2 | Supabase SQL (사용자 수동 실행) | `refund_ticket` RPC에 `p_user_id` 파라미터 추가 |

#### Tasks

- [ ] **Task 4.1**: `refund_ticket` RPC 함수 업데이트 SQL 준비
  - 사용자가 Supabase SQL Editor에서 실행할 SQL 작성
  - `auth.uid()` 대신 `COALESCE(auth.uid(), p_user_id)` 사용
  - 기존 클라이언트 호출(`p_platform`만 전달)은 그대로 호환

- [ ] **Task 4.2**: `refundCredits()` → `refundTicket()` 교체
  ```typescript
  async function refundTicket(userId: string, platform: 'naver' | 'google') {
      try {
          const { error } = await supabase.rpc('refund_ticket', {
              p_user_id: userId,
              p_platform: platform,
          })
          if (error) throw error
          console.log(`[Worker] Refunded 1 ${platform} ticket for user ${userId}.`)
      } catch (err) {
          console.error(`[Worker] Ticket refund failed for user ${userId}:`, err)
      }
  }
  ```

- [ ] **Task 4.3**: `processSearch()`에서 호출부 변경
  ```typescript
  await refundTicket(search.user_id, search.platform || 'naver')
  ```

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npx next build` 성공
- [ ] 사용자가 SQL을 Supabase에서 실행 완료

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DataForSEO 결과 스키마가 `search_results` 테이블과 불일치 | Medium | High | `/api/search/[id]/process` route의 매핑 로직을 그대로 복사 |
| `refund_ticket` RPC의 service role 호출 시 파라미터 차이 | Medium | Medium | RPC 함수 코드 또는 Supabase Dashboard에서 시그니처 확인 |
| Vercel maxDuration 60초에도 Premium 일부 케이스 타임아웃 | Low | Medium | DataForSEO concurrency를 15로 올리는 옵션 |
| 네이버 기능 회귀 | Low | High | 네이버 관련 파일 일절 수정 안 함 + 빌드/수동 테스트로 검증 |
| 이중 처리 (dispatch + /process) | Medium | High | `/api/search/route.ts`에서 구글 dispatch 완전 제거 |

---

## 🔄 Rollback Strategy

### Phase 1 실패 시
- `/api/search/route.ts` 원복 (GitHub dispatch 복원)
- `/api/search/[id]/process/route.ts`에서 `maxDuration` 제거
- `search/new/page.tsx` 원복 (주석 유지)

### Phase 2 실패 시
- `onboarding/page.tsx` 원복 (fire-and-forget 코드 제거)
- Phase 1 상태는 유지 가능 (독립적)

### Phase 3 실패 시
- `run-search.ts`에서 구글 분기 제거, `'not fully supported'` 복원
- workflow yml 환경변수 제거
- Phase 1, 2는 유지 가능 (독립적)

### Phase 4 실패 시
- `refundCredits()` 원복
- 단, 이미 레거시 테이블이 없으므로 원복해도 환불 안 됨 — 별도 대응 필요

---

## 📊 Progress Tracking

- **Phase 1**: 🔄 In Progress
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%
- **Phase 4**: ⏳ 0%

**Overall Progress**: 5%

---

## 📝 Notes & Learnings

### 수정 대상 파일 총 정리 (7개)

| # | 파일 | Phase |
|---|------|-------|
| 1 | `src/app/api/search/route.ts` | 1, 2 |
| 2 | `src/app/api/search/[id]/process/route.ts` | 1 |
| 3 | `src/app/(dashboard)/search/new/page.tsx` | 1 |
| 4 | `src/app/(dashboard)/onboarding/page.tsx` | 2 |
| 5 | `scripts/run-search.ts` | 3, 4 |
| 6 | `.github/workflows/manual-dispatch.yml` | 3 |
| 7 | `.github/workflows/cron.yml` | 3 |

### 수정하면 안 되는 파일
- `src/app/api/naver/search/route.ts`
- `src/lib/naver/scraper_ex2.ts`
- `src/components/naver-search/*`
- `src/app/(dashboard)/naver-search/*`

### 사용자 수동 작업 (코딩 전)
1. GitHub Secrets에 `DATAFORSEO_LOGIN` 추가
2. GitHub Secrets에 `DATAFORSEO_PASSWORD` 추가

---

**Plan Status**: 🔄 In Progress
**Next Action**: Phase 1 구현 중
**Blocked By**: None
