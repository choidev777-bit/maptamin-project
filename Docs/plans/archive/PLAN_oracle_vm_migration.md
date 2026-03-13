# Implementation Plan: GitHub Actions → Oracle VM 마이그레이션

**Status**: ⏳ Pending
**Started**: 2026-03-09
**Last Updated**: 2026-03-09 (rev.3 — 환경변수명 불일치 경고 추가)
**Estimated Completion**: 2026-03-11

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
현재 네이버 순위 크롤링은 GitHub Actions(`manual-dispatch.yml`)를 통해 실행됩니다.
이를 **Oracle VM (Always Free Ampere A1)**에서 직접 실행하는 방식으로 전환합니다.

**전환 이유:**
- 매 실행마다 `npm ci` + `playwright install` 반복 → 2~3분 낭비 제거
- GitHub Actions 워커 큐 대기 시간 제거 → 즉시 실행
- 무료 runner 1개 병렬 제한 제거 → 향후 다중 동시 처리 가능
- Oracle VM Always Free (24GB RAM) → 비용 $0

### Success Criteria
- [ ] Oracle VM에서 `scripts/run-search.ts MANUAL <search_id>` 실행 시 네이버 크롤링 정상 완료
- [ ] Oracle VM에서 `scripts/run-search.ts SCHEDULE` 실행 시 주간 리포트 정상 완료
- [ ] Vercel API가 GitHub Actions 대신 Oracle VM에 작업 요청
- [ ] 기존 기능 전체 정상 동작: 티켓 차감, 결과 저장, 알림톡 발송
- [ ] GitHub Actions 워크플로우 비활성화 (삭제 아님)

### Architecture Change Summary

```
[AS-IS: 경로 A — 큐 디스패처]
Vercel API → /api/naver/search (검색생성) → /api/queue/dispatch → GitHub REST API → GitHub Actions

[AS-IS: 경로 B — 직접 디스패치 (프론트엔드에서 추가 호출)]
Vercel API → /api/naver/search/[id]/process → GitHub REST API → GitHub Actions

⚠️ 현재 실시간 진단 시 경로 A + B가 동시에 실행됨 (이중 디스패치)

[TO-BE]
Vercel API → /api/queue/dispatch → Oracle VM HTTP API → scripts/run-search.ts (상주 프로세스)
Vercel API → /api/naver/search/[id]/process → Oracle VM HTTP API → (동일)
```

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| VM에 HTTP 서버를 띄워서 Vercel → VM 통신 | GitHub REST API 호출을 VM의 HTTP 엔드포인트 호출로 대체하면, 기존 dispatch 구조를 최소 변경으로 유지 | VM에 Express 또는 간단한 HTTP 서버 추가 필요 |
| PM2로 프로세스 관리 | 자동 재시작, 로그 관리, 모니터링 내장. systemd보다 Node.js 친화적 | 없음 (표준 관행) |
| 환경변수는 `.env` 파일로 관리 | GitHub Secrets와 동일한 값을 `.env` 파일에 저장. 코드 변경 없음 | 파일 보안 관리 필요 (chmod 600) |
| `/api/queue/dispatch` + `/api/naver/search/[id]/process` 수정 | GitHub REST API 호출 → VM HTTP 호출로 교체. **2개 파일** 수정 필요 | 없음 |
| 프록시(Bright Data) 동일 사용 | `scraper_ex2.ts`가 `process.env.BRIGHT_DATA_*` 환경변수만 읽으므로 실행 환경 무관 | 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [ ] Oracle VM (Always Free Ampere A1) 인스턴스 생성 완료
- [ ] VM에 SSH 접속 가능
- [ ] VM 보안 목록(Security List)에서 HTTP 포트(예: 3939) 오픈

### External Dependencies
- Node.js 20.x (VM에 설치)
- PM2: 최신 버전
- Playwright + Chromium (VM에 한 번만 설치)

---

## 🚀 Implementation Phases

### Phase 1: Oracle VM 환경 세팅
**Goal**: VM에서 `scripts/run-search.ts`가 단독 실행 가능한 상태
**Estimated Time**: 2시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 1.1**: VM에 Node.js 20, npm, PM2 설치
  ```bash
  # ARM64 Oracle Linux / Ubuntu
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  sudo npm install -g pm2
  ```

- [ ] **Task 1.2**: 프로젝트 클론 및 의존성 설치
  ```bash
  git clone <repo-url> ~/maptamin
  cd ~/maptamin
  npm ci --legacy-peer-deps
  ```

- [ ] **Task 1.3**: Playwright Chromium 설치 (ARM64 호환)
  ```bash
  npx playwright install chromium --with-deps
  ```

- [ ] **Task 1.4**: 환경변수 설정 (`.env` 파일 생성)
  - 필요한 변수 (GitHub Actions `secrets`에서 복사):
    ```
    NEXT_PUBLIC_SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...
    BRIGHT_DATA_HOST=brd.superproxy.io
    BRIGHT_DATA_PORT=33335
    BRIGHT_DATA_USERNAME=...
    BRIGHT_DATA_PASSWORD=...
    SOLAPI_API_KEY=...
    SOLAPI_API_SECRET=...
    SOLAPI_SENDER_NUMBER=...
    SOLAPI_PFID=...
    KAKAO_TEMPLATE_WELCOME=...
    KAKAO_TEMPLATE_WEEKLY=...
    SITE_URL=https://www.maptamin.com
    DATAFORSEO_LOGIN=...
    DATAFORSEO_PASSWORD=...
    ```
  - 파일 보안: `chmod 600 .env`

  > ⚠️ **주의: 환경변수명 불일치 함정**
  > 기존 `.env.local` 파일에는 `BRIGHT_DATA_USER`, `BRIGHT_DATA_PASS`로 저장되어 있지만,
  > 코드(`src/lib/naver/scraper_ex2.ts` L209-210)는 `BRIGHT_DATA_USERNAME`, `BRIGHT_DATA_PASSWORD`를 읽습니다.
  > `.env.local`을 그대로 복사하면 프록시가 **무음 실패** (빈 문자열로 폴백되어 직접 연결 시도)합니다.
  >
  > | `.env.local` 실제 키 | 코드가 읽는 키 | VM `.env`에 넣을 키 |
  > |---|---|---|
  > | `BRIGHT_DATA_USER` | `BRIGHT_DATA_USERNAME` | **`BRIGHT_DATA_USERNAME`** |
  > | `BRIGHT_DATA_PASS` | `BRIGHT_DATA_PASSWORD` | **`BRIGHT_DATA_PASSWORD`** |

- [ ] **Task 1.5**: 수동 실행 테스트
  ```bash
  # 테스트: 기존 search ID로 MANUAL 모드 실행
  cd ~/maptamin
  npx tsx scripts/run-search.ts MANUAL <test-search-id>
  ```
  - 성공 기준: `searches.status = 'completed'` + `search_results` INSERT 확인

#### Quality Gate ✋

**⚠️ STOP: Phase 2 진행 전 반드시 확인**

- [ ] VM에서 `npx tsx scripts/run-search.ts MANUAL <id>` 실행 성공
- [ ] Supabase `searches` 테이블에서 해당 검색의 `status = 'completed'` 확인
- [ ] Supabase `search_results` 에 결과 데이터 INSERT 확인
- [ ] 프록시(Bright Data) 정상 연결 확인 (스크래퍼 로그에서 `Proxy Active` 메시지)
- [ ] 알림톡 발송 정상 (또는 환경변수 미설정 시 skip 로그 확인)

---

### Phase 2: VM 워커 HTTP 서버 구축
**Goal**: Vercel에서 호출 가능한 HTTP 엔드포인트 구축, 작업 큐 처리
**Estimated Time**: 3시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: `scripts/vm-worker.ts` 생성
  - HTTP 서버 (Express 또는 내장 `http` 모듈)
  - 엔드포인트: `POST /run` → `{ search_id: string }` 수신
  - 보안: `VM_WORKER_SECRET` 헤더 검증
  - 비동기 실행: 즉시 `200 OK` 반환 후 백그라운드에서 `processSearch()` 실행
  - 파일 위치: `scripts/vm-worker.ts`
  
  ```
  핵심 플로우:
  1. POST /run 수신 (search_id + secret)
  2. 즉시 { status: 'accepted' } 응답
  3. search_id로 DB에서 search 데이터 조회 (run-search.ts L477-482 패턴 재사용):
     const { data: search } = await supabase
       .from('searches').select('*').eq('id', searchId).single()
  4. 백그라운드에서 processSearch(search) 실행
  5. 헬스체크: GET /health → { status: 'ok' }
  ```

- [ ] **Task 2.2**: PM2 ecosystem 설정 파일 생성
  - 파일: `scripts/ecosystem.config.js`
  ```javascript
  module.exports = {
    apps: [{
      name: 'maptamin-worker',
      script: 'npx',
      args: 'tsx scripts/vm-worker.ts',
      cwd: '/home/ubuntu/maptamin',
      env: { NODE_ENV: 'production' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/var/log/maptamin/worker-error.log',
      out_file: '/var/log/maptamin/worker-out.log',
      max_restarts: 10,
      restart_delay: 5000,
    }]
  }
  ```

- [ ] **Task 2.3**: PM2로 워커 시작 및 부팅 시 자동시작 설정
  ```bash
  sudo mkdir -p /var/log/maptamin
  pm2 start scripts/ecosystem.config.js
  pm2 startup
  pm2 save
  ```

#### Quality Gate ✋

- [ ] `curl -X POST http://<VM_IP>:3939/run -H "Authorization: Bearer <secret>" -d '{"search_id":"test-id"}'` → `200 OK`
- [ ] `curl http://<VM_IP>:3939/health` → `{"status":"ok"}`
- [ ] PM2 대시보드에서 `maptamin-worker` 프로세스 상태 `online` 확인
- [ ] VM 재부팅 후에도 자동 시작 확인

---

### Phase 3: Vercel API 수정 (GitHub → VM 전환)
**Goal**: GitHub REST API 호출을 Oracle VM HTTP 호출로 전환 (**2개 파일**)
**Estimated Time**: 3시간
**Status**: ⏳ Pending

#### 수정 대상 파일

**수정 파일 ①: `src/app/api/queue/dispatch/route.ts`**
- 호출 경로: `/api/naver/search` → `/api/queue/dispatch` → ~~GitHub~~ **VM**
- 호출 경로: `/api/cron/scheduled-search` → `/api/queue/dispatch` → ~~GitHub~~ **VM**
- 호출 경로: `/api/cron/cleanup` → `/api/queue/dispatch` → ~~GitHub~~ **VM**

**수정 파일 ②: `src/app/api/naver/search/[id]/process/route.ts`**
- 호출 경로: 프론트엔드 `naver-search/new/page.tsx` L344 → `/api/naver/search/[id]/process` → ~~GitHub~~ **VM**
- ⚠️ 이 파일은 `dispatch/route.ts`와 **독립적으로** GitHub API를 호출하므로 반드시 함께 수정 필요

현재 코드 (AS-IS) — 두 파일 공통 패턴:
```typescript
// dispatch/route.ts L28-29, process/route.ts L42-43
const ghRepo = process.env.NEXT_PUBLIC_GITHUB_REPO
const ghPat = process.env.GH_PAT

const [owner, repo] = ghRepo.split('/')
const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/dispatches`

const response = await fetch(dispatchUrl, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${ghPat}`,
        'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
        event_type: 'manual_search',
        client_payload: { search_id: ... }
    })
})
```

변경 후 (TO-BE) — 두 파일 공통 패턴:
```typescript
// 환경변수 변경
const vmWorkerUrl = process.env.VM_WORKER_URL      // e.g. http://<VM_IP>:3939
const vmWorkerSecret = process.env.VM_WORKER_SECRET // 인증 토큰

// VM HTTP 서버 호출
const response = await fetch(`${vmWorkerUrl}/run`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${vmWorkerSecret}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ search_id: ... })
})
```

#### Tasks

- [ ] **Task 3.1**: `src/app/api/queue/dispatch/route.ts` 수정
  - GitHub REST API 호출 → VM HTTP 호출로 변경
  - 환경변수: `NEXT_PUBLIC_GITHUB_REPO`, `GH_PAT` → `VM_WORKER_URL`, `VM_WORKER_SECRET`
  - 롤백 로직(`rollback_to_pending`) 유지
  - 에러 핸들링 유지

- [ ] **Task 3.2**: `src/app/api/naver/search/[id]/process/route.ts` 수정
  - 동일한 패턴으로 GitHub REST API → VM HTTP 호출 변경
  - 환경변수: `NEXT_PUBLIC_GITHUB_REPO`, `GH_PAT` → `VM_WORKER_URL`, `VM_WORKER_SECRET`
  - 실패 시 `status = 'failed'` 업데이트 로직 유지

- [ ] **Task 3.3**: Vercel 환경변수 추가
  - Vercel Dashboard → Settings → Environment Variables에 추가:
    ```
    VM_WORKER_URL=http://<VM_PUBLIC_IP>:3939
    VM_WORKER_SECRET=<생성한 시크릿 토큰>
    ```
  - 기존 `NEXT_PUBLIC_GITHUB_REPO`, `GH_PAT`은 삭제하지 않고 유지 (롤백 대비)

- [ ] **Task 3.4**: 통합 테스트
  - Vercel에 배포 후, 대시보드에서 실시간 진단 실행
  - 검증 항목:
    1. 티켓 차감 정상
    2. `searches.status` 변경: `pending → processing → completed`
    3. `search_results` 데이터 정상
    4. 결과 페이지 히트맵 정상 표시
    5. VM 로그에서 **동일 search_id의 중복 요청**이 안전하게 처리되는지 확인
       (dispatch + process 이중 호출로 인해 같은 search_id가 2번 올 수 있음 → `status = 'processing'`이면 무시)

#### Quality Gate ✋

- [ ] Vercel 배포 후 `/api/queue/dispatch` 호출 → VM에서 크롤링 실행 확인
- [ ] 실시간 진단 (네이버): 대시보드 → 실행 → 결과 페이지까지 전체 플로우 정상
- [ ] 주간 리포트 시뮬레이션: `POST /api/cron/scheduled-search` 호출 후 크롤링 실행 확인
- [ ] 실패 시 티켓 환불 정상 동작 확인
- [ ] 기존 구글 검색(DataForSEO)은 영향 없음 확인 (VM 경유 안 함)

---

### Phase 4: GitHub Actions 비활성화 및 정리
**Goal**: 기존 GitHub Actions 경로 비활성화, 문서 업데이트
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 4.1**: `.github/workflows/manual-dispatch.yml` 비활성화
  - 파일 삭제가 아닌 **트리거 비활성화** (롤백 대비):
  ```yaml
  on:
    # repository_dispatch 비활성화 — Oracle VM으로 전환 (2026-03-09)
    # repository_dispatch:
    #   types: [manual_search]
    workflow_dispatch:  # 수동 테스트용으로만 유지
  ```

- [ ] **Task 4.2**: `.github/workflows/cron.yml` 상태 유지 (변경 없음)
  - 이미 `schedule` 트리거가 주석 처리되어 있고, `workflow_dispatch`만 남아있음
  - 수동 테스트 용도로 그대로 유지

- [ ] **Task 4.3**: `src/app/api/cron/scheduled-search/route.ts` 주석 업데이트
  - L8 주석 수정: `GitHub Actions 트리거` → `Oracle VM 트리거`

- [ ] **Task 4.4**: 아키텍처 문서 업데이트
  - `Docs/important_files/architecture_data_flow.md`의 §8, §11 섹션에서 GitHub Actions 참조를 Oracle VM으로 업데이트

#### Quality Gate ✋

- [ ] GitHub Actions `manual-dispatch.yml`의 `repository_dispatch` 트리거 비활성화 확인
- [ ] 이전 3일간 VM을 통한 실시간 진단 + 주간 리포트 정상 동작 검증
- [ ] 아키텍처 문서가 현재 구조를 정확히 반영

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Oracle VM Always Free 스펙 제한 (ARM64 호환 이슈) | Low | High | Phase 1에서 Playwright ARM64 설치 검증. 실패 시 x86 VM 고려 |
| VM 네트워크 불안정/재부팅 | Low | Medium | PM2 자동 재시작 + `pm2 startup`. Oracle Always Free VM은 유휴 90일 후 비활성화 가능 → 주기적 헬스체크 |
| 보안: VM 포트 노출 | Medium | High | `VM_WORKER_SECRET` 토큰 검증 필수. 방화벽에서 Vercel IP만 허용 가능하지만, 토큰 인증으로 충분 |
| Vercel → VM 간 네트워크 지연 | Low | Low | 지연은 수십ms 수준. 비동기 실행이므로 크롤링 시간(분 단위) 대비 무시할 수 있음 |
| 롤백 필요 시 GitHub Actions 복원 | Low | Low | `manual-dispatch.yml` 삭제 안 함. `GH_PAT`, `NEXT_PUBLIC_GITHUB_REPO` 환경변수 유지. `dispatch/route.ts` + `process/route.ts` 2개 파일 되돌리면 즉시 복원 |
| 이중 디스패치 (동일 search_id 2번 호출) | Medium | Low | `dispatch/route.ts` (RPC 경유)와 `process/route.ts` (직접 호출)가 동시 실행됨. VM 워커에서 `status = 'processing'`인 작업은 무시하도록 가드 로직 추가 |

---

## 🔄 Rollback Strategy

### GitHub Actions로 즉시 복원하는 방법

모든 Phase에서 문제 발생 시, **2개 파일** 복원으로 원상 복구:

1. `src/app/api/queue/dispatch/route.ts`를 Git에서 이전 버전으로 복원
2. `src/app/api/naver/search/[id]/process/route.ts`를 Git에서 이전 버전으로 복원
3. Vercel 환경변수에서 `VM_WORKER_URL`, `VM_WORKER_SECRET` 제거 (또는 방치)
4. `.github/workflows/manual-dispatch.yml`에서 `repository_dispatch` 주석 해제
5. Vercel 재배포

**예상 복원 시간**: 5분 이내

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1** (VM 환경 세팅): ⏳ 0%
- **Phase 2** (VM 워커 HTTP): ⏳ 0%
- **Phase 3** (Vercel API 수정): ⏳ 0%
- **Phase 4** (정리): ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 (VM 환경) | 2시간 | - | - |
| Phase 2 (VM 워커) | 3시간 | - | - |
| Phase 3 (API 수정) | 2시간 | - | - |
| Phase 4 (정리) | 1시간 | - | - |
| **Total** | **8시간** | - | - |

---

## 📝 수정 대상 파일 요약

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `scripts/vm-worker.ts` | **신규 생성** | VM에서 돌아가는 HTTP 워커 서버 |
| `scripts/ecosystem.config.js` | **신규 생성** | PM2 프로세스 설정 |
| `src/app/api/queue/dispatch/route.ts` | **수정** | GitHub API → VM HTTP 호출로 변경 |
| `src/app/api/naver/search/[id]/process/route.ts` | **수정** | GitHub API → VM HTTP 호출로 변경 (dispatch와 독립적인 두 번째 경로) |
| `.github/workflows/manual-dispatch.yml` | **수정** | `repository_dispatch` 트리거 주석 처리 |
| `src/app/api/cron/scheduled-search/route.ts` | **주석만** | 주석의 "GitHub Actions" → "Oracle VM" 수정 |
| `Docs/important_files/architecture_data_flow.md` | **문서** | 아키텍처 문서 업데이트 |

**Vercel 환경변수 추가**:
- `VM_WORKER_URL`: Oracle VM의 워커 서버 주소
- `VM_WORKER_SECRET`: 인증 토큰

---

## 📝 Notes & Learnings

### Implementation Notes
- [Add insights discovered during implementation]

### Blockers Encountered
- **Blocker 1**: [Description] → [Resolution]

---

## 📚 References

### 관련 코드
- `src/app/api/queue/dispatch/route.ts` — 현재 GitHub Actions 디스패처 (경로 A)
- `src/app/api/naver/search/[id]/process/route.ts` — 직접 GitHub Actions 호출 (경로 B, 프론트엔드에서 호출)
- `src/app/(dashboard)/naver-search/new/page.tsx` L311, L344 — 프론트엔드 호출부 (경로 A + B 동시 실행)
- `src/app/api/naver/search/route.ts` L147 — dispatch 호출부 (경로 A 트리거)
- `src/app/api/cron/scheduled-search/route.ts` L172 — CRON dispatch 호출부
- `src/app/api/cron/cleanup/route.ts` L44 — Cleanup → dispatch 호출부
- `scripts/run-search.ts` — 크롤링 실행 스크립트
- `src/lib/naver/scraper_ex2.ts` — 네이버 스크래퍼 (Playwright + Bright Data)
- `.github/workflows/manual-dispatch.yml` — 현재 GitHub Actions 워크플로우
- `supabase/migrations/013_dispatch_queue.sql` — dispatch RPC 함수 (status 변경 로직)

---

**Plan Status**: ⏳ Pending
**Next Action**: Phase 1 — Oracle VM 환경 세팅 시작
**Blocked By**: None
