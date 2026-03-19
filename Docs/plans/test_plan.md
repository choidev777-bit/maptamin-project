# Maptamin 테스트 계획서

> **Version**: 1.0  
> **Last Updated**: 2026-03-16  
> **Status**: Review Required  
> **목표**: 서비스 오픈 전, 결제·비즈니스 로직 안정성을 최우선으로 검증

---

## 1. 테스트 전략 요약

### 테스트 피라미드

```
        ╱  E2E (Playwright)  ╲        ← 적고 느리지만, 크리티컬 사용자 흐름만
       ╱   Integration (Jest)  ╲      ← API Route 단위, Mock Supabase/PortOne
      ╱     Unit (Jest)           ╲   ← 많고 빠르게, 비즈니스 규칙 전수 검증
     ────────────────────────────────
```

| 종류 | 도구 | 목적 | 실행 시간 목표 |
|------|------|------|-------------|
| **Unit** | Jest | 순수 함수, 유틸리티, 설정값 검증 | < 10초 |
| **Integration** | Jest (`@jest-environment node`) | API Route Handler의 요청→응답→DB 연동 검증 | < 30초 |
| **E2E** | Playwright | 인증된 사용자의 크리티컬 사용자 흐름 | < 3분 |

---

## 2. 테스트 범위 (Scope)

### 2.1 리스크 기반 우선순위

> 💰 = 결제/매출 직결, 🔒 = 데이터 무결성, 👤 = 사용자 경험

| 우선순위 | 기능 영역 | 리스크 | 테스트 종류 |
|---------|-----------|--------|-----------|
| **P0 (필수)** | 구독 결제 / Webhook | 💰 결제 누락·중복·조작 | Unit + Integration |
| **P0** | 티켓 차감/환불 | 💰 무료 크롤링 방지 | Unit + Integration |
| **P0** | 플랜별 접근 제어 | 🔒 무단 기능 사용 방지 | Unit |
| **P0** | 30일 락 정책 | 🔒 어뷰징 방지 | Unit + Integration |
| **P1 (중요)** | 온보딩 5단계 | 👤 첫 경험 = 전환율 직결 | Unit + E2E |
| **P1** | 네이버/구글 검색 API | 💰🔒 크롤링 비용 | Integration |
| **P1** | CRON 스케줄 검색 | 🔒 중복 실행·Free 유저 차단 | Integration |
| **P1** | 인증 미들웨어 | 🔒 보호 라우트 접근 제어 | Unit + E2E |
| **P2 (선택)** | 대시보드 데이터 표시 | 👤 시각화 정확도 | E2E |
| **P2** | 알림톡 발송 | 👤 알림 누락 | Integration |
| **P2** | 설정/히스토리 UI | 👤 사용 편의 | E2E |

---

## 3. Unit 테스트 명세

### 3.1 비즈니스 로직 — `src/lib/utils/subscription.ts` ✅ (이미 존재)

> **파일**: `src/lib/utils/subscription.test.ts` (224줄, 11개 describe 블록)

```typescript
// 실제 코드 — 플랜별 접근 제어의 핵심 함수
export function canAccessPlatform(planId: string, platform: 'naver' | 'google'): boolean {
    const config = PLAN_CONFIG[planId];
    if (!config) return false;
    if (config.channels === 'none') return false;
    if (platform === 'naver') return config.channels === 'naver' || config.channels === 'naver+google';
    if (platform === 'google') return config.channels === 'naver+google';
    return false;
}
```

**현재 커버리지**: `isSubscribed`, `canAccessPlatform`, `getMaxGridSize`, `getAllowedGridSizes`, `canManageCompetitors`, `getMaxKeywords`, `getMaxCompetitors`, `getRequiredPlanForPlatform`, `getRequiredPlanForCompetitors`, `getPlanDisplayName`, `canCancelSubscription`, `isPlaceLockExempt` — **전수 검증 완료**

**상태**: ✅ 충분 — 추가 작업 불필요

---

### 3.2 플랜 설정값 — `src/lib/pricing/config.ts` ✅ (이미 존재)

> **파일**: `src/lib/pricing/__tests__/config.test.ts`

**검증 대상 (PLAN_CONFIG 실제 값)**:

```typescript
// 실제 코드
starter: { price: 9900, gridSize: 3, ticketsNaver: 2, ticketsGoogle: 0, ... placeLock: true },
pro:     { price: 29000, gridSize: 5, ticketsNaver: 5, ticketsGoogle: 0, ... placeLock: true },
premium: { price: 79000, gridSize: 7, ticketsNaver: 10, ticketsGoogle: 10, ... placeLock: false },
```

**상태**: ✅ 존재 — PRD 대비 값 불일치 여부만 확인 필요

---

### 3.3 온보딩 유틸리티 — `onboarding-utils.ts` ✅ (이미 존재)

> **파일**: `src/app/(dashboard)/onboarding/onboarding-utils.test.ts` (165줄)

**검증 완료 항목**:
- `getSteps()`: starter 4단계 / pro·premium 5단계 (경쟁사 포함)
- `computeStartStep()`: 이탈 복구 — 플랜별 × 데이터 보유 조합 전수 검증

**상태**: ✅ 충분

---

### 3.4 그리드 계산기 — `grid-calculator.ts` ✅ (이미 존재)

> **파일**: `src/lib/utils/grid-calculator.test.ts`

**상태**: ✅ 존재

---

### 3.5 순위 트렌드 계산 — `rank-trend.ts` ✅ (이미 존재)

> **파일**: `src/lib/utils/__tests__/rank-trend.test.ts`

**상태**: ✅ 존재

---

### 3.6 순위 색상 매핑 — `rank-colors.ts` ✅ (이미 존재)

> **파일**: `src/lib/utils/rank-colors.test.ts`

**상태**: ✅ 존재

---

### 3.7 티켓 가격 계산 — `ticket-price.ts` ✅ (이미 존재)

> **파일**: `src/lib/pricing/ticket-price.test.ts`

**상태**: ✅ 존재

---

### 3.8 🆕 미들웨어 보호 라우트 — `middleware.ts` ❌ (Unit 테스트 없음)

> **대상 파일**: `src/middleware.ts`

```typescript
// 실제 코드 — 보호 라우트 목록
const protectedPrefixes = ['/dashboard', '/naver-search', '/search', '/settings', '/history', '/onboarding', '/report-settings']
const isProtected = protectedPrefixes.some(prefix => request.nextUrl.pathname.startsWith(prefix))
```

**필요한 테스트 케이스**:

| # | 시나리오 | 입력 | 기대 결과 |
|---|---------|------|----------|
| 1 | 비인증 유저 → /dashboard | user=null | `/login?redirectTo=/dashboard` 리다이렉트 |
| 2 | 비인증 유저 → /naver-search/new | user=null | `/login?redirectTo=/naver-search/new` 리다이렉트 |
| 3 | 비인증 유저 → /settings | user=null | `/login?redirectTo=/settings` 리다이렉트 |
| 4 | 인증 유저 → /login | user 존재 | `/dashboard` 리다이렉트 |
| 5 | 인증 유저 → /dashboard | user 존재 | 통과 (NextResponse.next) |
| 6 | 비인증 유저 → / (랜딩) | user=null | 통과 (보호 대상 아님) |
| 7 | redirectTo 경로 보존 | /settings?tab=keywords | `redirectTo=/settings?tab=keywords` |

**상태**: ❌ 신규 작성 필요 → `src/middleware.test.ts`

---

## 4. Integration 테스트 명세

### 4.1 Webhook Handler — `route.test.ts` ✅ (이미 존재)

> **파일**: `src/app/api/payment/webhook/route.test.ts` (259줄, 6개 테스트)

**검증 완료 항목**:

```typescript
// 실제 코드 — 핵심 시나리오 전부 커버
it('BillingKey.Issued 이벤트는 무시하고 200 반환')
it('구독 결제가 아닌(sub_ 접두사 없는) 결제는 무시')
it('paymentId가 없으면 무시')
it('이미 처리된 결제는 멱등하게 duplicate 반환')
it('Transaction.Paid 정상: 구독 활성화 + 다음달 예약')
it('Transaction.Failed: 재시도 카운트 증가 + past_due')
it('서버 에러 발생해도 항상 200 반환 (Webhook 안정성)')
```

**상태**: ✅ 잘 구현됨 — `jest.resetModules()` + `jest.doMock()` 패턴으로 정교한 DB Mock 처리

---

### 4.2 네이버 검색 API — `route.test.ts` ✅ (이미 존재)

> **파일**: `src/app/api/naver/search/route.test.ts` (137줄, 4개 테스트)

**검증 완료 항목**:

```typescript
// 실제 코드
it('should return 401 if user is not logged in')
it('should deduct ticket and create search on success')
it('should return 402 if no tickets')
it('should refund ticket if search creation fails')
```

**상태**: ✅ 핵심 시나리오 커버됨

**⚠️ 누락된 케이스** (추가 권장):

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 플랜 그리드 크기 초과 요청 (starter에서 5×5) | 400 |
| 2 | free 플랜에서 네이버 검색 시도 | 403 |
| 3 | 키 워드 배열 비어있음 | 400 |

---

### 4.3 티켓 결제 API — `route.test.ts` ✅ (이미 존재)

> **파일**: `src/app/api/payment/ticket/route.test.ts` (248줄, 8개 테스트)

**검증 완료 항목**:

```typescript
// 실제 코드
it('should return 401 if user is not authenticated')
it('should return 400 if paymentId is missing')
it('should return 400 if platform is invalid')
it('should return 400 if quantity is zero or negative')
it('should return 409 if paymentId already processed')      // 중복 방지
it('should return 400 if payment status is not PAID')       // PortOne 검증
it('should return 400 if payment amount does not match')    // 금액 조작 방지
it('should return 200 and increase tickets on valid payment')
it('should return 502 if PortOne API fails')
it('should return 500 if DB ticket update fails')
```

**상태**: ✅ 매우 잘 구현됨 — 결제 보안 시나리오 충분

---

### 4.4 🆕 구독 시작 API ❌ (테스트 없음)

> **대상**: `src/app/api/payment/subscribe/route.ts`

**필요한 테스트 케이스**:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 유효한 billingKey + planId → 구독 시작 성공 | 200 + `activate_subscription` RPC 호출 |
| 2 | 빌링키 없이 요청 | 400 |
| 3 | 잘못된 planId (존재하지 않는 플랜) | 400 |
| 4 | 빌링키 검증 실패 | 400 |
| 5 | 첫 결제 (payWithBillingKey) 실패 | 502 |
| 6 | 비인증 유저 | 401 |

**상태**: ❌ 신규 작성 필요 → `src/app/api/payment/subscribe/route.test.ts`

---

### 4.5 🆕 구독 해지 API ❌ (테스트 없음)

> **대상**: `src/app/api/payment/subscribe/cancel/route.ts`

**필요한 테스트 케이스**:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | active 상태 → cancel_scheduled 전환 | 200 + status 변경 |
| 2 | 이미 cancel_scheduled 상태에서 재해지 | 400 |
| 3 | 활성 구독 없음 | 404 |
| 4 | 비인증 유저 | 401 |

**상태**: ❌ 신규 작성 필요

---

### 4.6 🆕 해지 철회 API ❌ (테스트 없음)

> **대상**: `src/app/api/payment/subscribe/reactivate/route.ts`

**필요한 테스트 케이스**:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | cancel_scheduled → active 복원 | 200 + schedulePayment 호출 |
| 2 | active 상태에서 철회 시도 | 400 |
| 3 | 비인증 유저 | 401 |

**상태**: ❌ 신규 작성 필요

---

### 4.7 🆕 환불 API ❌ (테스트 없음)

> **대상**: `src/app/api/payment/subscribe/refund/route.ts`

**필요한 테스트 케이스**:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 첫 구독 7일 이내 + 미이용 → 환불 성공 | 200 + expired 전환 |
| 2 | 7일 초과 → 환불 거부 | 400 |
| 3 | 서비스 이용 이력 있음 (search_results > 0) | 400 |
| 4 | 결제 이력 2건 이상 (첫 구독 아님) | 400 |

**상태**: ❌ 신규 작성 필요

---

### 4.8 🆕 CRON 스케줄 검색 ❌ (테스트 없음)

> **대상**: `src/app/api/cron/scheduled-search/route.ts`

**필요한 테스트 케이스**:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | CRON_SECRET 인증 실패 | 401 |
| 2 | 네이버 스케줄: 오늘 요일 포함, 시간 일치 → 실행 | searches INSERT (report_type='daily') |
| 3 | 네이버 스케줄: 같은 날짜 이미 실행 → SKIP | last_run_at 확인 |
| 4 | 구글 스케줄: 같은 주 이미 실행 → SKIP | ISO 주차 비교 |
| 5 | free 플랜 유저 스케줄 → SKIP | plan_id 체크 |

**상태**: ❌ 신규 작성 필요

---

### 4.9 🆕 매장 등록/관리 API ❌ (테스트 없음)

> **대상**: `src/app/api/settings/my-shop/route.ts`

**필요한 테스트 케이스**:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 신규 매장 등록 (starter) | 201 + locked_until = 30일 후 |
| 2 | 30일 락 기간 내 매장 변경 시도 (starter) | 403 |
| 3 | Premium 유저 → 락 면제로 매장 자유 변경 | 200 + locked_until = null |
| 4 | Premium 유저 → 매장 바로 삭제 | 200 |
| 5 | 비인증 유저 | 401 |

**상태**: ❌ 신규 작성 필요

---

## 5. E2E 테스트 명세

### 5.1 현재 E2E 상태 (8개 파일 분석)

| 파일 | 상태 | 문제점 |
|------|------|--------|
| `app.spec.ts` | ⚠️ 구식 | `RankTracker`, `Sign in`, `Get Started Free` 등 **현재 UI와 불일치** |
| `naver-search.spec.ts` | ⚠️ 최소화 | 리다이렉트 확인만 (16줄) — 실제 검색 흐름 미검증 |
| `subscription.spec.ts` | ⚠️ 인증 불가 | 로그인 세션 없이 구독 페이지 접근 → 항상 리다이렉트됨 |
| `dashboard.spec.ts` | ❌ 레거시 | `user_credits` (비활성 테이블) 참조 → 실행 시 에러 |
| `payment.spec.ts` | ⚠️ 확인 필요 | |
| `competitors.spec.ts` | ⚠️ 확인 필요 | |
| `pricing.spec.ts` | ⚠️ 확인 필요 | |
| `qa-search-maps.spec.ts` | ⚠️ 확인 필요 | |

---

### 5.2 E2E 테스트 추가/수정 계획

#### 🛠️ 공통: 인증 세션 Fixture

현재 E2E 최대 장벽은 **모든 보호 라우터가 인증을 요구**한다는 점입니다.

```typescript
// e2e/fixtures/auth.ts (신규 생성 필요)
// Supabase Admin SDK로 테스트 유저를 생성하고
// email/password 로그인으로 세션 쿠키를 브라우저에 주입하는 Fixture
```

#### E2E-01: 랜딩 페이지 기본 검증 (수정)

```
e2e/app.spec.ts 수정
├── 랜딩 페이지 로드 ✓
├── "맵타민" 브랜딩 텍스트 확인 (기존: RankTracker → 현재 UI에 맞게 수정)
├── 카카오 로그인 버튼 표시 확인
├── 구글 로그인 버튼 표시 확인
└── 보호 라우트 리다이렉트 확인 (기존 유지)
```

#### E2E-02: 온보딩 전체 흐름 (신규)

```
e2e/onboarding.spec.ts (신규)
├── 인증 Fixture 사용 (Starter 플랜)
├── Step 1: 매장 검색 → 선택 → 등록 확인
├── Step 2: 키워드 입력 → 등록 확인 (최대 2개)
├── Step 3: (Starter는 Skip) 그리드 설정
├── Step 4: 스케줄 요일/시간 선택 → 전화번호 입력
└── 온보딩 완료 → 웰컴 리포트 진행 화면 표시
```

#### E2E-03: 구독 관리 흐름 (수정)

```
e2e/subscription.spec.ts 수정
├── 인증 Fixture 사용
├── 구독 관리 페이지 로드 확인
├── 플랜 카드 3개 표시 확인 (Starter, Pro, Premium)
├── 구독 시작 → 성공 화면 (PortOne SDK Mock 유지)
├── 구독 해지 → 모달 → 확인 → cancel_scheduled
└── 해지 철회 → active 복원
```

#### E2E-04: 대시보드 검증 (수정)

```
e2e/dashboard.spec.ts 수정
├── 인증 Fixture 사용
├── ❌ user_credits 참조 제거 → user_subscriptions 사용
├── 등록 매장 카드 표시 확인
├── 티켓 잔량 표시 확인
└── 검색 기록 테이블 표시 확인
```

---

## 6. 기존 테스트 중 수정이 필요한 항목

| 파일 | 무엇을 | 왜 |
|------|--------|-----|
| `e2e/dashboard.spec.ts` | `user_credits` → `user_subscriptions` 테이블로 변경 | 레거시 테이블 참조 → 실행 시 에러 |
| `e2e/app.spec.ts` | `RankTracker` → 현재 UI 텍스트로 변경 | 브랜딩 변경 후 미반영 |
| `e2e/subscription.spec.ts` | 인증 Fixture 적용 | 로그인 없이 실행 불가 |

---

## 7. 테스트 실행 방법

### Unit + Integration 테스트 (Jest)

```bash
# 전체 실행
npx jest

# 특정 파일 실행
npx jest src/lib/utils/subscription.test.ts
npx jest src/app/api/payment/webhook/route.test.ts

# 커버리지 리포트
npx jest --coverage
```

### E2E 테스트 (Playwright)

```bash
# 먼저 개발 서버 실행
npm run dev

# 전체 E2E 실행
npx playwright test

# 특정 파일 실행
npx playwright test e2e/app.spec.ts

# UI 모드 (디버깅)
npx playwright test --ui

# HTML 리포트
npx playwright show-report
```

---

## 8. 작업 요약 — 신규 작성 vs 기존 유지

| 구분 | 기존 유지 (✅) | 신규 작성 (🆕) | 수정 필요 (⚠️) |
|------|--------------|---------------|---------------|
| **Unit** | 7개 파일 | 1개 (middleware) | 0개 |
| **Integration** | 3개 파일 | 5개 (subscribe, cancel, reactivate, refund, cron, my-shop) | 0개 |
| **E2E** | 0개 | 1개 (onboarding) | 4개 (app, subscription, dashboard, naver-search) |
| **Fixture** | 0개 | 1개 (인증 세션) | 0개 |

### 총 신규 작성 예상 규모

| 파일 | 예상 줄 수 | 예상 소요 시간 |
|------|-----------|-------------|
| `middleware.test.ts` | ~80줄 | 30분 |
| `subscribe/route.test.ts` | ~200줄 | 1시간 |
| `cancel/route.test.ts` | ~120줄 | 45분 |
| `reactivate/route.test.ts` | ~100줄 | 30분 |
| `refund/route.test.ts` | ~150줄 | 45분 |
| `cron/scheduled-search/route.test.ts` | ~180줄 | 1시간 |
| `settings/my-shop/route.test.ts` | ~150줄 | 45분 |
| `e2e/fixtures/auth.ts` | ~60줄 | 30분 |
| `e2e/onboarding.spec.ts` | ~200줄 | 1.5시간 |
| E2E 4개 파일 수정 | ~100줄 수정 | 1시간 |
| **합계** | **~1,340줄** | **~8시간** |
