# PLAN: 스크래퍼 실패 보호 로직

**Last Updated**: 2026-03-11  
**Status**: 📋 Planning  
**Scope**: Small (2 phases, ~3-4h)

---

**CRITICAL INSTRUCTIONS**: 각 Phase 완료 후:
1. ✅ 완료된 태스크 체크박스 체크
2. 🧪 Quality Gate 검증
3. ⚠️ 모든 QG 항목 통과 확인
4. 📅 Last Updated 날짜 업데이트
5. ➡️ 모든 QG 통과 후에만 다음 Phase 진행

⛔ Quality Gate 미통과 시 다음 Phase 진행 금지

---

## 배경 및 목표

### 현재 문제 2가지

**문제 1: 부분 실패를 감지하지 못함**

`scrapeNaverBatch()`는 항상 Task 수만큼의 배열을 반환합니다 (증거: `scraper_ex2.ts:424` → `return results`).
개별 Task가 전부 실패해도 `results.length = 9`이므로 `run-search.ts:295`의 조건:
```typescript
if (isAlive && results && results.length > 0) {
    // → 항상 통과 → completed 마킹
```
즉, **모든 Task가 `results: []`(빈 결과)여도 `completed`로 처리**됨.

**문제 2: 완전 실패(catch 진입) 시 정기리포트 자동 재시도 없음**

Playwright 크래시, 네트워크 에러 등으로 catch에 진입하면:
- `realtime`: 티켓 환불 ✅ (정상)
- `weekly` / `welcome`: `failed` 확정 → **재시도 없음** → 데이터 손실

또한 `pending`으로 롤백해도 SCHEDULE 모드는 `processSearch()`를 직접 호출하므로 (증거: `run-search.ts:424`),
`dispatch_pending_searches()`가 다시 픽업하려면 **cron cleanup까지 최대 30분 대기**해야 함.

### 목표

| 보호 유형 | 감지 위치 | 동작 |
|----------|---------|------|
| **부분 실패** (1개라도 Task 빈 결과) | `completed` 마킹 직전 | 전체 Task 성공 여부 체크 → 1개라도 실패 시 실패 처리 |
| **완전 실패** (catch 진입) | catch 블록 | `weekly/welcome` → 즉시 재실행 (최대 3회), `realtime` → `failed` + 환불 |
| **최종 실패 알림** | catch 블록 (retry 한도 초과 시) | 관리자 이메일로 알림 발송 |

### 설계 가정 (명시적 서술)
1. `searches` 테이블에 `retry_count INTEGER DEFAULT 0` 컬럼 추가 필요 (현재 없음)
2. 부분 실패 기준: **1개라도 빈 결과(`results: []`)가 있으면** → 실패 판정
3. 완전 실패 재시도: catch 블록에서 **직접 `processSearch()` 재호출** (dispatch/cron 의존 안 함)
4. 재시도 상한: `retry_count >= 3`이면 최종 `failed`
5. `search` 객체 조회 시 `retry_count` 포함 여부 확인 필요 (`.select('*')`이면 자동 포함)
6. 관리자 알림은 `nodemailer` + Gmail SMTP 사용 (환경변수: `ADMIN_EMAIL`, `GMAIL_APP_PASSWORD`)

---

## Architecture 변경 최소화 원칙 (Surgical Changes)

| 변경 | 파일 |
|------|------|
| **수정** | `scripts/run-search.ts` (1개) |
| **신규** | `supabase/migrations/025_add_retry_count.sql` (1개) |
| **건드리지 않음** | `dispatch/route.ts`, `process/route.ts`, `scraper_ex2.ts`, `vm-worker.ts`, `ecosystem.config.js` |

---

## Phase 1: DB 스키마 — `retry_count` 컬럼 추가

**목표**: `searches` 테이블에 `retry_count` 컬럼 추가  
**예상 소요**: ~30분  
**의존성**: 없음

### Tasks

- [ ] `supabase/migrations/025_add_retry_count.sql` 파일 생성
  ```sql
  ALTER TABLE searches
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
  ```
- [ ] 프로덕션 Supabase Dashboard → SQL Editor에서 직접 실행
- [ ] 기존 레코드 `retry_count = 0` 기본값 확인

### Quality Gate
- [ ] `searches` 테이블에 `retry_count` 컬럼 존재 확인
- [ ] `select('*')`로 조회 시 `retry_count` 포함 확인
- [ ] 기존 기능(dispatch, process) 동작 변화 없음

### Rollback
```sql
ALTER TABLE searches DROP COLUMN IF EXISTS retry_count;
```

---

## Phase 2: `run-search.ts` 실패 보호 로직 추가

**목표**: 부분 실패 감지 + 완전 실패 시 정기리포트 즉시 재실행  
**예상 소요**: ~2h  
**의존성**: Phase 1 완료

---

### 2-A: 부분 실패 감지 (completed 직전 검증)

**변경 위치**: `run-search.ts:295` 부근 — `completed` 마킹 직전

**현재 코드** (`run-search.ts:295-338`):
```typescript
if (isAlive && results && results.length > 0) {
    console.log(`[Worker] Saving ${results.length} results to database...`);
    // ... insert → completed 마킹
```

**수정 후**:
```typescript
if (isAlive && results && results.length > 0) {
    // ── 부분 실패 감지 (Naver only) ──
    if (search.platform === 'naver') {
        const failedTasks = results.filter((r: any) => !r.results || r.results.length === 0);

        if (failedTasks.length > 0) {
            throw new Error(
                `Partial failure: ${failedTasks.length}/${results.length} tasks have empty results`
            );
        }
    }

    console.log(`[Worker] Saving ${results.length} results to database...`);
    // ... 나머지 기존 코드 동일
```

**핵심**: `throw`로 catch 블록에 진입시킴 → 2-B의 재시도 로직이 자동 적용됨.

---

### 2-B: 완전 실패 시 정기리포트 즉시 재실행

**변경 위치**: `run-search.ts:365-380` — catch 블록

**현재 코드**:
```typescript
} catch (error: any) {
    console.error(`[Worker] Search ${search.id} Failed:`, error);

    await supabase.from('searches').update({
        status: 'failed',
    }).eq('id', search.id);

    if (search.report_type === 'realtime') {
        const platform = search.platform || 'naver';
        await refundTicket(search.user_id, platform);
    }
}
```

**수정 후**:
```typescript
} catch (error: any) {
    console.error(`[Worker] Search ${search.id} Failed:`, error);

    const currentRetryCount = search.retry_count ?? 0;
    const MAX_SEARCH_RETRIES = 3;
    const isScheduled = search.report_type === 'weekly' || search.report_type === 'welcome';

    if (isScheduled && currentRetryCount < MAX_SEARCH_RETRIES) {
        // 정기리포트: retry_count 증가 후 즉시 재실행
        const nextRetry = currentRetryCount + 1;
        console.log(`[Worker] 🔄 Scheduled job retry ${nextRetry}/${MAX_SEARCH_RETRIES}`);

        await supabase.from('searches').update({
            status: 'pending',
            retry_count: nextRetry,
        }).eq('id', search.id);

        // 30초 대기 후 즉시 재실행 (dispatch/cron 의존하지 않음)
        const RETRY_DELAY_MS = 30_000;
        console.log(`[Worker] Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

        // search 객체에 retry_count 반영 후 재호출
        search.retry_count = nextRetry;
        search.status = 'pending';
        await processSearch(search);
    } else {
        // 실시간 진단 또는 재시도 한도 초과 → 최종 실패
        await supabase.from('searches').update({
            status: 'failed',
        }).eq('id', search.id);

        if (search.report_type === 'realtime') {
            const platform = search.platform || 'naver';
            await refundTicket(search.user_id, platform);
        } else if (isScheduled) {
            console.log(`[Worker] ❌ Search ${search.id} permanently failed after ${currentRetryCount} retries.`);
            // 🚨 관리자 이메일 알림
            await sendAdminAlert({
                searchId: search.id,
                placeName: search.place_name,
                platform: search.platform,
                retryCount: currentRetryCount,
                errorMessage: error.message || 'Unknown error',
            });
        }
    }
}
```

**핵심**: `processSearch(search)` 직접 재호출 → dispatch/cron 대기 불필요.

---

### 2-C: 최종 실패 시 관리자 이메일 알림

**추가 위치**: `run-search.ts` 파일 상단 (함수 추가)

**필요 패키지**: `nodemailer` (`npm install nodemailer`)

**필요 환경변수** (VM `.env`에 추가):
- `ADMIN_EMAIL`: 알림 받을 관리자 이메일 (Gmail)
- `GMAIL_APP_PASSWORD`: Gmail 앱 비밀번호

**추가 함수**:
```typescript
import nodemailer from 'nodemailer';

async function sendAdminAlert(info: {
    searchId: string;
    placeName: string;
    platform: string;
    retryCount: number;
    errorMessage: string;
}) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!adminEmail || !gmailPassword) {
        console.log('[Admin Alert] 이메일 환경변수 미설정 — 알림 건너뜀');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: adminEmail, pass: gmailPassword },
        });

        const kstTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

        await transporter.sendMail({
            from: adminEmail,
            to: adminEmail,
            subject: `🚨 [Maptamin] 정기리포트 최종 실패: ${info.placeName}`,
            text: [
                `정기리포트가 ${info.retryCount + 1}회 시도 후 최종 실패했습니다.`,
                ``,
                `Search ID: ${info.searchId}`,
                `업체명: ${info.placeName}`,
                `플랫폼: ${info.platform}`,
                `재시도 횟수: ${info.retryCount}`,
                `에러: ${info.errorMessage}`,
                `발생 시각: ${kstTime}`,
                ``,
                `Supabase에서 해당 검색을 확인해주세요.`,
            ].join('\n'),
        });

        console.log(`[Admin Alert] ✅ 관리자 이메일 발송 완료`);
    } catch (emailError: any) {
        console.error(`[Admin Alert] ❌ 이메일 발송 실패:`, emailError.message);
    }
}
```

---

### Tasks

- [ ] `processSearch()` 내부 295행 부근에 부분 실패 감지 로직 추가 (2-A)
- [ ] catch 블록 수정 (2-B)
- [ ] `sendAdminAlert()` 함수 추가 (2-C)
- [ ] `nodemailer` 설치: VM에서 `npm install nodemailer && npm install -D @types/nodemailer`
- [ ] VM `.env`에 `ADMIN_EMAIL`, `GMAIL_APP_PASSWORD` 추가
- [ ] 상수 `MAX_SEARCH_RETRIES = 3` 파일 상단 정의

### 시나리오별 예상 동작

| 시나리오 | 조건 | 기대 결과 |
|---------|------|---------|
| A | `realtime`, 완전 실패 | `failed` + 티켓 환불 (기존 동일) |
| B | `realtime`, 부분 실패 (8/9 성공, 1개 실패) | `failed` + 티켓 환불 |
| C | `weekly`, 완전 실패, `retry_count=0` | 30초 대기 → 즉시 재실행 (`retry_count=1`) |
| D | `weekly`, 부분 실패 (8/9 성공), `retry_count=0` | 30초 대기 → 즉시 재실행 |
| E | `weekly`, 실패, `retry_count=2` | 30초 대기 → 즉시 재실행 (`retry_count=3`) |
| F | `weekly`, 실패, `retry_count=3` | `failed` 확정 + **관리자 이메일 발송** |
| G | 정상 완료 (9/9 성공) | `completed` (변경 없음) |
| H | `welcome`, 완전 실패, `retry_count=0` | `weekly`와 동일 (즉시 재실행) |

### Quality Gate
- [ ] TypeScript 컴파일 오류 없음: `npx tsc --noEmit`
- [ ] 시나리오 A: realtime 실패 → `status='failed'`, 티켓 환불 확인
- [ ] 시나리오 G: 정상 완료 → `status='completed'` 확인
- [ ] 시나리오 C/D: weekly 실패 → 로그에 "retry 1/3" 출력, 30초 후 재실행 확인
- [ ] 시나리오 F: weekly 3회 초과 → `status='failed'` + 관리자 이메일 수신 확인
- [ ] 시나리오 B: realtime 부분 실패 (1개 실패) → `status='failed'`, 티켓 환불 확인
- [ ] PM2 무한 루프 발생 안 함 확인 (retry_count 상한 동작)
- [ ] 이메일 환경변수 미설정 시 에러 없이 건너뜀 확인

### Rollback
```bash
git revert HEAD  # run-search.ts 변경 롤백
```

---

## 리스크 평가

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| `processSearch()` 재귀 호출 시 스택 오버플로우 | 극낮음 | 높음 | 최대 3회 재귀로 제한 (`MAX_SEARCH_RETRIES`) |
| 재시도 중 PM2 프로세스 종료 | 낮음 | 중간 | `retry_count`가 DB에 기록되어 있으므로, 재시작 후 dispatch에서 픽업 가능 |
| `search` 객체에 `retry_count` 없음 (migration 미적용) | 중간 | 낮음 | `?? 0` 방어 코드로 기본값 처리 |
| 부분 실패 후 재시도해도 동일 부분 실패 반복 | 중간 | 중간 | 30초 대기로 IP 로테이션 기대 + 최대 3회 재시도 후 accept |
| Google (DataForSEO) 결과에 부분 실패 감지 불필요 | - | - | `search.platform === 'naver'` 조건으로 Naver만 적용 |

---

## 전체 흐름 다이어그램

```
scrapeNaverBatch() 완료
  ↓
[전체 Task 성공?] 1개라도 빈 결과?
  ├─ 전부 성공 → completed 마킹
  └─ 1개라도 실패 → throw → catch 블록 진입
                     ↓
              [report_type 체크]
              ├─ realtime       → failed + 티켓 환불
              └─ weekly/welcome → [retry_count 체크]
                                  ├─ < 3  → DB 업데이트(pending, retry_count++)
                                  │         → 30초 대기
                                  │         → processSearch() 재호출
                                  └─ >= 3 → failed 확정 + 📧 관리자 이메일 알림
```

---

## 변경 후 VM 배포

코드 수정 완료 후:
1. `git commit & push`
2. VM SSH → `cd ~/maptamin && git pull`
3. `npm install nodemailer && npm install -D @types/nodemailer`
4. VM `.env`에 `ADMIN_EMAIL`, `GMAIL_APP_PASSWORD` 추가
5. PM2 재시작: `pm2 restart maptamin-worker`

---

## 진행 현황

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 1: DB 스키마 | ⬜ 미시작 | - |
| Phase 2: 로직 수정 | ⬜ 미시작 | - |

---

## Notes & Learnings

- (진행하면서 기록)
