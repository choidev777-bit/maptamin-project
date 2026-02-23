# Implementation Plan: 솔라피 카카오 알림톡 + 주간 자동 검색 파이프라인 완성

**Status**: 🔄 In Progress
**Started**: 2026-02-24
**Last Updated**: 2026-02-24
**Estimated Completion**: 2026-02-25

---

## 📋 Overview

### Feature Description

주간 자동 검색 → 알림톡 발송 전체 파이프라인을 완성한다.

**현재 상태 (문제점):**
1. `messaging.ts` 템플릿 변수명이 실제 솔라피 템플릿과 불일치
2. `.env.local` 템플릿 코드가 플레이스홀더 상태
3. `cron.yml`에 자동 스케줄 트리거 없음 (수동만 가능)
4. `run-search.ts` SCHEDULE 모드가 잘못된 테이블명 조회 (`scheduled_searches` → 실제는 `search_schedules`)
5. `cron.yml`에 Bright Data 프록시 환경변수 누락
6. 크롤링 완료 후 알림톡 발송 코드가 연결되지 않음

**해결 아키텍처: GitHub Actions CRON(매시간) + 캐싱**

```
GitHub Actions CRON (매시간)
  → npm/Playwright 캐시 사용 (~1분, 캐시 없으면 ~3분)
  → run-search.ts SCHEDULE
    → DB에서 "지금 실행해야 할 스케줄" 조회 (service role key)
    → 매칭되는 스케줄: 크롤링 실행 → 결과 저장 → 알림톡 발송
    → 매칭 없으면: 로그 출력 후 종료
```

**비용 계산 (50명 기준):**

| 항목 | 분/월 |
|------|-------|
| CRON 고정 비용 (캐싱) | 1분 × 730회 = **730분** |
| 주간 크롤링 | 50명 × 4주 × 5분 = **1,000분** |
| 실시간 진단 | 50명 × 2회 × 5분 = **500분** |
| **합계** | **2,230분** ⚠️ 약간 초과 가능 |

→ 30명까지 안전, 50명부터 빡빡 → GitHub Pro($4/월, 3,000분)으로 전환 시점

### Success Criteria
- [ ] `cron.yml`에 매시간 schedule + 캐싱 + 환경변수 설정
- [ ] `run-search.ts` SCHEDULE 모드가 `search_schedules` 정상 조회
- [ ] 크롤링 완료 후 솔라피 알림톡 자동 발송
- [ ] 알림톡 변수(#{가게명}, #{플랫폼명}, #{분석일시}, #{리포트기간}, #{리포트URL}) 정상 치환
- [ ] `notification_logs`에 발송 결과 기록
- [ ] 온보딩/리포트 설정 UI 변경 없음

---

## 🏗️ Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| GitHub Actions CRON + 캐싱 | 외부 서비스 의존 없음, 기존 인프라 활용, 캐싱으로 고정 비용 절약 |
| `run-search.ts`에 알림톡 코드 직접 구현 | `messaging.ts`는 Next.js path alias 사용 → Actions에서 import 불가 |
| `messaging.ts`도 동시에 수정 | Vercel 수동 테스트 API 유지 목적 |
| Vercel CRON 추가 불필요 | Hobby 플랜은 하루 1회 제한이라 매시간 불가 |

---

## ⚠️ Pre-flight 체크 (코딩 시작 전 사용자 확인 필요)

- [ ] Supabase 대시보드에서 `search_schedules` 테이블의 실제 컬럼명 확인:
  - `crawling_day` vs `crawling_days` (단수/복수)
  - 해당 컬럼의 타입 (integer vs integer[])
  - `grid_config` 내부에 `distance` 값이 포함되어 있는지

---

## 🚀 Implementation Phases

### Phase 1: cron.yml + run-search.ts 수정 (핵심)
**Goal**: 매시간 스케줄 체크 → 크롤링 → 알림톡 발송
**Estimated Time**: 3시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 1.1**: `cron.yml` — schedule 트리거 + 캐싱 + 환경변수
  - File: `.github/workflows/cron.yml`
  - 변경:
    - `schedule: - cron: '0 * * * *'` 추가 (매시간 정각)
    - npm cache 추가 (`setup-node`의 `cache: 'npm'`)
    - Playwright cache 추가 (`actions/cache`로 `~/.cache/ms-playwright`)
    - Bright Data + Solapi 환경변수 11개 추가
  - 목표: 캐시 히트 시 실행 시간 ~3분 → ~1분

- [ ] **Task 1.1b**: `manual-dispatch.yml` — Playwright 캐싱 + Solapi 환경변수 추가
  - File: `.github/workflows/manual-dispatch.yml`
  - npm 캐시는 이미 있음 (`cache: 'npm'`) → Playwright 캐시만 추가
  - Solapi 환경변수 7개 추가 (알림톡 발송용)

- [ ] **Task 1.2**: `run-search.ts` — SCHEDULE 모드 정상화
  - File: `scripts/run-search.ts` (line 249~260)
  - 변경:
    - 테이블명: `scheduled_searches` → `search_schedules`
    - ⚠️ `crawling_day`/`crawling_days` 실제 컬럼명 사용 (Pre-flight에서 확인)
    - KST 기준 현재 요일/시간 매칭 로직 추가
    - `last_run_at` 체크 (오늘 이미 실행했으면 skip)
    - `managed_places` 조회로 `place_name`, `place_lat`, `place_lng`, `place_address` 획득

- [ ] **Task 1.3**: `processScheduleJob()` 스키마 수정
  - File: `scripts/run-search.ts` (line 216~240)
  - 변경:
    - `grid_points` → `grid_config` (실제 컬럼명)
    - `grid_distance` ← `grid_config[0].distance || 1` (기본값 fallback)
    - ❌ `cost: 0` 제거 (searches 테이블에 cost 컬럼 없음)
    - `report_type: 'weekly'` 추가
    - `managed_places`에서 좌표/주소 조회
    - ⚡ `last_run_at`을 크롤링 **시작 전**에 먼저 업데이트 (중복 실행 방지)

- [ ] **Task 1.4**: 알림톡 발송 함수 추가
  - File: `scripts/run-search.ts` (신규 함수)
  - Solapi SDK 직접 호출 (`SolapiMessageService`)
  - 변수 매핑: `#{가게명}`, `#{플랫폼명}`, `#{분석일시}`, `#{리포트기간}`, `#{리포트URL}`
  - `#{리포트URL}` = `www.maptamin.com/naver-search/{id}` (https:// 제외)
  - `notification_logs` INSERT (sent_via: 'solapi')
  - 전화번호 미등록 시 skip (에러 아님, 로그만)
  - 실패해도 검색 결과 보존 (try/catch)

- [ ] **Task 1.5**: `processSearch()` 완료 후 알림톡 호출
  - File: `scripts/run-search.ts` (line ~172)
  - `report_type === 'weekly' || report_type === 'welcome'`일 때만 호출
  - `report_type === 'realtime'`이면 호출하지 않음 (사용자가 이미 페이지에서 보고 있음)

#### Quality Gate ✋
- [ ] `npx next build` 성공
- [ ] `run-search.ts` 문법 에러 없음
- [ ] GitHub Actions 수동 트리거 → "No active schedules" 로그 확인

---

### Phase 2: messaging.ts + .env.local 수정
**Goal**: Vercel 수동 테스트 API 변수 일치 + 호출자 인터페이스 정리
**Estimated Time**: 1.5시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: `.env.local` 템플릿 코드 업데이트
  - `KAKAO_TEMPLATE_WELCOME=KA01TP260213123637772HFZb1Qpqh9M`
  - `KAKAO_TEMPLATE_WEEKLY=KA01TP2602131241245770e5WJAvuo3G`

- [ ] **Task 2.2**: `messaging.ts` 변수 매핑 수정
  - `sendWelcomeReport`: `platform`, `analysisDate` 파라미터 추가
  - `sendWeeklyReport`: `platform`, `reportPeriod`, `analysisDate` 추가
  - `getReportUrl()` 헬퍼 (https:// 제거, 플랫폼별 URL)

- [ ] **Task 2.3**: 호출자 수정 — `send-report/route.ts`
- [ ] **Task 2.4**: 호출자 수정 — `schedule-manager.ts`, `notification-service.ts`

#### Quality Gate ✋
- [ ] `npx next build` 성공
- [ ] `npm test` 기존 테스트 모두 통과

---

### Phase 3: 환경변수 + 실제 테스트
**Goal**: GitHub Secrets 설정, 실제 알림톡 발송
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 3.1**: GitHub Secrets 추가 (사용자 수동 작업)
- [ ] **Task 3.2**: Vercel 수동 API 테스트 (`/api/kakao/send-report`)
- [ ] **Task 3.3**: GitHub Actions SCHEDULE 수동 트리거 테스트

#### Quality Gate ✋
- [ ] 카카오톡 알림톡 수신 확인
- [ ] 5개 변수 정상 치환
- [ ] 버튼 URL 정상 이동

---

## 📝 Notes

### 수정 대상 파일 (총 9개)
| 파일 | Phase |
|------|-------|
| `.github/workflows/cron.yml` | 1 |
| `.github/workflows/manual-dispatch.yml` | 1 |
| `scripts/run-search.ts` | 1 |
| `src/lib/kakao/messaging.ts` | 2 |
| `.env.local` | 2 |
| `src/app/api/kakao/send-report/route.ts` | 2 |
| `src/lib/services/schedule-manager.ts` | 2 |
| `src/lib/services/notification-service.ts` | 2 |

### GitHub Secrets 추가 목록 (사용자 수동 작업)
```
SOLAPI_API_KEY=NCSNWDSLWGZHKXZY
SOLAPI_API_SECRET=CS0CMCMYMBBGKL3CHQR43XRTDZDLWVWI
SOLAPI_SENDER_NUMBER=01057960903
SOLAPI_PFID=KA01PF260213122012390u5QnUopnqHU
KAKAO_TEMPLATE_WELCOME=KA01TP260213123637772HFZb1Qpqh9M
KAKAO_TEMPLATE_WEEKLY=KA01TP2602131241245770e5WJAvuo3G
SITE_URL=https://www.maptamin.com
```

### 템플릿 변수 정보
- `#{가게명}` ← search.place_name
- `#{플랫폼명}` ← '네이버' 또는 '구글'
- `#{분석일시}` ← KST 현재시간 (2026.02.24 17:00)
- `#{리포트기간}` ← 직전 7일 (02.17 ~ 02.23) — 주간만
- `#{리포트URL}` ← www.maptamin.com/naver-search/{id} (https:// 제외)

---

**Next Action**: 사용자 "코딩 시작" 승인 대기
