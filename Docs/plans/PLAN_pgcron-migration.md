# Implementation Plan: pg_cron으로 정시 스케줄 트리거 마이그레이션

**Status**: ⏳ Pending
**Started**: 2026-02-24
**Last Updated**: 2026-02-24
**Estimated Completion**: 2026-02-24 (1시간 이내)

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

GitHub Actions cron의 20~50분 지연 문제를 해결하기 위해, Supabase pg_cron + pg_net으로 정시 트리거를 구현한다. GitHub Actions 자체(크롤링 실행)는 그대로 유지하되, **트리거 방식만** 변경한다.

### 현재 플로우 (문제)

```
GitHub Actions cron (매시 정각 예정이나 20~50분 지연)
→ run-search.ts SCHEDULE 실행
→ DB에서 스케줄 조회 → 크롤링 → 알림톡
```

### 수정 후 플로우

```
Supabase pg_cron (정확히 매시 정각)
→ pg_net으로 Vercel API 호출 (HTTP POST)
→ Vercel API가 DB에서 스케줄 조회
→ 해당하는 스케줄마다 GitHub Actions dispatch (크롤링)
→ 크롤링 완료 후 알림톡 발송
```

### Success Criteria

- [ ] pg_cron이 매시 정각에 정확히 실행됨
- [ ] Vercel API가 스케줄 조회 후 GitHub Actions를 dispatch함
- [ ] GitHub Actions에서 크롤링 + 알림톡 정상 작동
- [ ] 기존 수동 실시간 진단/웰컴 리포트에 영향 없음
- [ ] `npx next build` 성공

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| pg_cron → Vercel API → GitHub Actions | 정시 트리거 + 기존 크롤링 인프라 유지 | Vercel API 경유로 1단계 추가 |
| 스케줄 조회를 Vercel API로 이동 | pg_cron은 SQL만 실행 가능, 복잡한 로직은 API에서 처리 | API 라우트 1개 추가 |
| cron.yml의 schedule 트리거 제거 | 중복 실행 방지 | workflow_dispatch는 유지 (수동 테스트용) |
| CRON_SECRET 환경변수로 API 보호 | 외부에서 임의 호출 방지 | 시크릿 관리 필요 |

---

## 📦 Dependencies

### Supabase 확장 (사용자 작업)
- [ ] `pg_cron` 확장 활성화 (Supabase Dashboard → Database → Extensions)
- [ ] `pg_net` 확장 활성화 (동일 위치)

### 환경변수 (사용자 작업)
- [ ] Vercel에 `CRON_SECRET` 환경변수 추가 (임의의 긴 문자열)

---

## 🚀 Implementation Phases

### Phase 1: Vercel API 라우트 생성 (`/api/cron/scheduled-search`)
**Goal**: pg_cron이 호출할 API 엔드포인트 생성. 스케줄 조회 + GitHub Actions dispatch.
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 1.1**: `src/app/api/cron/scheduled-search/route.ts` 생성
  - `CRON_SECRET` 인증 검증
  - KST 기준 현재 요일/시간 계산
  - `search_schedules`에서 활성 스케줄 조회 (현재 요일 + 시간 매칭)
  - 오늘 이미 실행한 스케줄 제외
  - 해당 스케줄의 place/keyword/grid 정보로 `searches` 레코드 생성
  - `/api/queue/dispatch` 호출하여 GitHub Actions 트리거
  
  **핵심 로직** (기존 `run-search.ts` SCHEDULE 모드에서 이식):
  ```
  1. KST 시간 계산 → 요일/시간
  2. search_schedules 조회 (is_active=true, crawling_time 매칭, 요일 매칭)
  3. 이미 오늘 실행한 것 제외 (last_run_at 확인)
  4. 스케줄별로:
     a. managed_places에서 장소 정보 조회
     b. search 레코드 생성 (status='pending', report_type='weekly')
     c. ⚠️ last_run_at 즉시 업데이트 (중복 방지 — dispatch 전에!)
  5. /api/queue/dispatch 호출 → GitHub Actions에서 크롤링 실행
  ```

- [ ] **Task 1.2**: `npx next build` 빌드 확인

#### Quality Gate ✋
- [ ] `npx next build` 성공
- [ ] API 라우트가 CRON_SECRET 없이 호출 시 401 반환

---

### Phase 2: cron.yml 수정 + pg_cron SQL 준비
**Goal**: GitHub Actions에서 schedule 트리거 제거, pg_cron SQL 작성
**Estimated Time**: 15분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: `.github/workflows/cron.yml` 수정
  - `schedule` 트리거 제거 (중복 방지)
  - `workflow_dispatch` 유지 (수동 테스트용)
  
  변경 전:
  ```yaml
  on:
    schedule:
      - cron: '0 * * * *'
    workflow_dispatch:
  ```
  
  변경 후:
  ```yaml
  on:
    workflow_dispatch:  # 수동 테스트용으로만 유지
  ```

- [ ] **Task 2.2**: Supabase pg_cron SQL 작성 (migration 파일)
  ```sql
  -- pg_cron + pg_net으로 매시 정각 스케줄 트리거
  select cron.schedule(
    'scheduled-search-hourly',
    '0 * * * *',  -- 매시 정각 (UTC)
    $$
    select net.http_post(
      url := 'https://www.maptamin.com/api/cron/scheduled-search',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <CRON_SECRET>'
      ),
      body := jsonb_build_object('trigger', 'pg_cron'),
      timeout_milliseconds := 30000
    ) as request_id;
    $$
  );
  ```
  > ⚠️ 이 SQL은 사용자가 Supabase SQL Editor에서 직접 실행합니다.
  > `<CRON_SECRET>` 부분은 실제 시크릿 값으로 교체 필요.

- [ ] **Task 2.3**: `npx next build` 빌드 확인

#### Quality Gate ✋
- [ ] `npx next build` 성공
- [ ] cron.yml에서 schedule 트리거가 제거됨 확인

---

### Phase 3: 배포 + 테스트
**Goal**: Vercel 배포, pg_cron 활성화, 전체 플로우 테스트
**Estimated Time**: 15분
**Status**: ⏳ Pending

#### 사용자 작업

- [ ] **Step 3.1**: Vercel에 `CRON_SECRET` 환경변수 추가 후 재배포
- [ ] **Step 3.2**: Supabase Dashboard → Extensions에서 `pg_cron`, `pg_net` 활성화
- [ ] **Step 3.3**: Supabase SQL Editor에서 pg_cron SQL 실행
- [ ] **Step 3.4**: 다음 정시까지 대기 후 GitHub Actions에 새 실행이 뜨는지 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| pg_cron이 Vercel API 호출 실패 | Low | High | pg_net에 timeout 30초 설정, Vercel 로그에서 확인 |
| CRON_SECRET 노출 | Low | High | Supabase Vault 또는 SQL에 직접 하드코딩 (DB 내부) |
| 기존 cron.yml 삭제 후 수동 테스트 불가 | Low | Low | workflow_dispatch 유지 |
| UTC vs KST 시간 혼동 | Med | Med | API 라우트에서 KST 변환 처리 |

---

## 🔄 Rollback Strategy

1. `cron.yml`에 `schedule` 트리거 다시 추가
2. Supabase에서 `select cron.unschedule('scheduled-search-hourly')` 실행
3. 원래 상태로 복귀

---

## 📊 Progress Tracking

- **Phase 1**: ⏳ Pending
- **Phase 2**: ⏳ Pending
- **Phase 3**: ⏳ Pending

**Overall Progress**: 0%
