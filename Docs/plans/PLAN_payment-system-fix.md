# Implementation Plan: 결제/구독 시스템 수정 (PortOne V2 + NHN KCP)

**Status**: 🔄 In Progress
**Started**: 2026-02-25
**Last Updated**: 2026-02-25
**Estimated Completion**: 2026-02-27

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

감사 보고서에서 도출된 14개 이슈(CRITICAL 4, MAJOR 7, MINOR 4)를 수정하여 결제 시스템을 심사 가능한 수준으로 완성한다. 핵심 목표:

1. **금액 불일치 해소** — 프론트/백엔드 VAT 처리 통일
2. **구독 라이프사이클 구현** — 해지 철회, 플랜 변경, 만료 감지
3. **웹훅 보안 강화** — PortOne 서버 SDK 시그니처 검증
4. **데이터 정합성** — 카드 정보 저장, 기간 계산 개선
5. **구독 환불** — 약관 20조 기반 7일 이내 미이용 시 전액 환불

### Success Criteria
- [ ] 프론트엔드 표시 금액 = 실제 청구 금액 (VAT 오류 제거)
- [ ] 해지 → `cancel_scheduled` → 잔여 기간 유지 → 해지 철회 가능
- [ ] 플랜 변경 요청 → 다음 결제일부터 자동 적용 (`pending_plan_id`)
- [ ] `cancel_scheduled` 만료 시 자동 다운그레이드 (CRON)
- [ ] Webhook 시그니처 검증 통과
- [ ] 모든 결제 API에서 서비스 롤 클라이언트 사용 (RLS 문제 해결)
- [ ] 구독 관리 UI에서 `cancel_scheduled`, `pending_plan_id` 상태 표시
- [ ] 첫 구독 7일 이내 + 웰컴리포트 미이용 시 전액 환불 가능 (약관 20조 1항 ①)
- [ ] `npm run build` 성공, 기존 테스트 통과

### User Impact
SaaS 사용자가 안전하게 구독을 관리할 수 있고, 결제 사고(이중 과금, 무료 탈취) 방지

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `cancel_scheduled` 패턴 (빌링키 유지) | 해지 철회 시 추가 결제 없이 복구 가능, Notion 패턴 | 빌링키를 만료까지 보관해야 함 (보안 부담 미미) |
| `pending_plan_id` 컬럼 (다음 결제일 적용) | 일할 계산(proration) 없이 플랜 변경 가능, MVP에 최적 | 즉시 업그레이드 불가 (Phase 2 이후) |
| CRON으로 만료 감지 | 접근 시점 체크보다 확실, pg_cron 인프라 이미 존재 | 최대 1일 지연 (매일 실행 기준) |
| `@portone/server-sdk` 웹훅 검증 | PortOne 공식 권장, 시그니처 기반 위변조 방지 | SDK 의존성 추가 필요 |
| Webhook에서 서비스 롤 클라이언트 사용 | 사용자 세션 없이 호출되므로 RLS 우회 필수 | 서비스 롤 키 환경변수 필요 (이미 존재) |

---

## 📦 Dependencies

### Required Before Starting
- [ ] `PORTONE_WEBHOOK_SECRET` 환경변수 — PortOne 개발자콘솔에서 웹훅 시크릿 발급 ([발급 페이지](https://admin.portone.io/integration-v2/manage/webhook?version=V2))
- [ ] 현재 마이그레이션 번호 확인 (마지막: `020_add_receipt_url.sql`)
- [ ] 기존 테스트 통과 여부 확인 (`npm test`)

### External Dependencies
- `@portone/server-sdk`: 웹훅 검증용 (신규 설치 필요)

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: Write tests FIRST, then implement to make them pass

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥80% | VAT 계산, status 전이 로직, period 계산 |
| **Integration Tests** | Critical paths | API Route 입출력, RPC 호출 결과 |
| **Manual Tests** | Key flows | 실제 PortOne 테스트 결제 |

### Test File Organization
```
src/app/api/payment/
├── webhook/route.test.ts          ← 기존 + 추가
├── subscribe/route.test.ts        ← 신규
├── subscribe/cancel/route.test.ts ← 기존 수정
├── subscribe/reactivate/route.test.ts  ← 신규
├── subscribe/change-plan/route.test.ts ← 신규
├── subscribe/refund/route.test.ts      ← 신규
└── ticket/route.test.ts           ← 기존 (변경 없음)
```

---

## 🚀 Implementation Phases

### Phase 1: 기초 수정 — VAT 통일 + 금액 오류 + 가격 중복 제거
**Goal**: 프론트/백엔드 금액 불일치 해소, 연간 재시도 금액 수정
**Estimated Time**: 1.5시간
**Status**: ⏳ Pending

#### 해결하는 이슈
- C1: 프론트엔드-서버 금액 불일치 (VAT)
- M3: 연간 결제 웹훅 재시도 시 금액 오류
- m1: CheckoutContent.tsx 가격 데이터 중복 정의
- m4: getPlanDisplayName import 미사용

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: VAT 계산 유틸 함수 테스트 작성
  - File: `src/lib/pricing/__tests__/config.test.ts`
  - 시나리오: PLAN_CONFIG의 price가 VAT 포함가인지 확인하는 헬퍼 함수
  - Expected: Tests FAIL (함수 미존재)

- [ ] **Test 1.2**: 연간 재시도 금액 검증 테스트
  - File: `src/app/api/payment/webhook/route.test.ts`
  - 시나리오: yearly 구독 실패 시 재시도 금액 = yearlyPrice
  - Expected: Tests FAIL (현재 price 사용)

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.3**: `PLAN_CONFIG` 가격 정의 명확화
  - File: `src/lib/pricing/config.ts`
  - 변경: price/yearlyPrice가 **VAT 포함 최종 가격**임을 주석으로 명시
  - ⚠️ Protected Zone — 명시적 승인 필요

- [ ] **Task 1.4**: `CheckoutContent.tsx` VAT 표시 수정
  - File: `src/components/dashboard/CheckoutContent.tsx`
  - 변경:
    - 별도 VAT 10% 가산 로직 제거
    - `PLANS` 상수 제거, `PLAN_CONFIG`에서 직접 가격 읽기
    - `getPlanDisplayName` 미사용 import 제거
  - ⚠️ Protected Zone

- [ ] **Task 1.5**: Webhook 재시도 금액 수정
  - File: `src/app/api/payment/webhook/route.ts`
  - 변경: `handlePaymentFailed`에서 `billing_cycle` 확인 후 `yearlyPrice` 또는 `price` 사용
  - ⚠️ Protected Zone

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.6**: 가격 관련 코드 정리
  - `CheckoutContent.tsx`의 중복 가격 데이터 제거 확인
  - `PLAN_CONFIG` 하나로 통일된 가격 소스 확인

#### Quality Gate ✋

**⚠️ STOP: Phase 2 진행 전 ALL checks 통과 필수**

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] `npm test` 기존 테스트 통과
- [ ] 새 테스트 통과

**Manual Testing**:
- [ ] CheckoutContent에서 표시되는 금액 = PLAN_CONFIG 금액 (VAT 별도 없음)
- [ ] 스타터 월간: ₩9,900 표시 확인

**Validation Commands**:
```bash
npm run build
npm test -- --passWithNoTests
npx tsc --noEmit
```

---

### Phase 2: DB 마이그레이션 — cancel_scheduled + pending_plan_id + 만료 감지
**Goal**: 구독 라이프사이클을 지원하는 DB 스키마 변경 + 만료 감지 CRON RPC
**Estimated Time**: 2시간
**Status**: ⏳ Pending

#### 해결하는 이슈
- C3: 구독 만료 시 플랜 다운그레이드 로직 없음
- C4 (DB부분): cancel_scheduled 상태, pending_plan_id 컬럼

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 2.1**: `expire_cancelled_subscriptions` RPC 테스트 케이스 설계
  - 시나리오:
    - cancel_scheduled + next_billing_date 지남 → status='expired', plan_id='free'
    - cancel_scheduled + next_billing_date 안 지남 → 변경 없음
    - active 상태 → 변경 없음

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 2.2**: 마이그레이션 `021_subscription_lifecycle.sql` 작성
  - File: `supabase/migrations/021_subscription_lifecycle.sql`
  - 내용:
    ```sql
    -- 1. status CHECK 제약 조건 변경
    ALTER TABLE subscription_billing
      DROP CONSTRAINT IF EXISTS subscription_billing_status_check;
    ALTER TABLE subscription_billing
      ADD CONSTRAINT subscription_billing_status_check
      CHECK (status IN ('active', 'canceled', 'cancel_scheduled', 'past_due', 'expired'));

    -- 2. pending_plan_id 컬럼 추가
    ALTER TABLE subscription_billing
      ADD COLUMN IF NOT EXISTS pending_plan_id TEXT;

    -- 3. cancelled_at 저장용 (M1)
    -- (이미 컬럼 존재 여부 확인 필요)

    -- 4. 만료 감지 RPC (CRON에서 호출)
    -- ⚠️ CTE + RETURNING 패턴 사용: 방금 만료 처리된 user_id만 정확히 추적
    CREATE OR REPLACE FUNCTION expire_cancelled_subscriptions()
    RETURNS SETOF uuid  -- 만료된 user_id 목록 반환 (CRON에서 빌링키 삭제용)
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      WITH expired AS (
        UPDATE subscription_billing
        SET status = 'expired',
            updated_at = now()
        WHERE status = 'cancel_scheduled'
          AND next_billing_date < now()
        RETURNING user_id, billing_key
      ),
      downgraded AS (
        UPDATE user_subscriptions
        SET plan_id = 'free',
            remaining_tickets_naver = 0,
            remaining_tickets_google = 0,
            current_period_end = now(),
            updated_at = now()
        WHERE user_id IN (SELECT user_id FROM expired)
        RETURNING user_id
      )
      SELECT user_id FROM expired;
    END;
    $$;

    -- 5. 결제 실패 3회 만료 처리 RPC
    CREATE OR REPLACE FUNCTION expire_failed_subscription(p_user_id uuid)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      UPDATE subscription_billing
      SET status = 'expired', updated_at = now()
      WHERE user_id = p_user_id AND status = 'past_due';

      UPDATE user_subscriptions
      SET plan_id = 'free',
          remaining_tickets_naver = 0,
          remaining_tickets_google = 0,
          current_period_end = now(),
          updated_at = now()
      WHERE user_id = p_user_id;
    END;
    $$;
    ```

- [ ] **Task 2.3**: CRON API 라우트 생성 — 만료 감지 트리거
  - File: `src/app/api/cron/expire-subscriptions/route.ts`
  - 흐름:
    1. CRON_SECRET 인증
    2. 만료 대상 조회: `cancel_scheduled` + `next_billing_date < now()` 목록 + `billing_key` 조회
    3. 각 사용자의 빌링키 삭제 (PortOne API `deleteBillingKey`)
    4. Supabase 서비스 롤 클라이언트로 `expire_cancelled_subscriptions()` RPC 호출
    5. RPC가 반환한 만료된 user_id 목록 로깅
    6. 빌링키 삭제 실패한 건은 로깅만 (DB 상태는 정상 전환)
  - pg_cron에서 매일 00:00 UTC 호출 예정

- [ ] **Task 2.4**: Webhook `handlePaymentFailed`에서 `expire_failed_subscription` RPC 사용
  - File: `src/app/api/payment/webhook/route.ts`
  - 변경: 최대 재시도 초과 시 `expire_failed_subscription(user_id)` 호출

**🔵 REFACTOR**
- [ ] **Task 2.5**: 마이그레이션 SQL 리뷰 및 정리
  - CHECK 제약 조건 이름 정확성 확인
  - RPC 함수 권한 및 RLS 정책 확인

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] `supabase db push` 또는 `supabase migration up` 성공
- [ ] 새 RPC 함수 존재 확인

**Manual Testing**:
- [ ] Supabase SQL Editor에서 `SELECT * FROM subscription_billing` 확인 — `cancel_scheduled` status 허용
- [ ] `pending_plan_id` 컬럼 존재 확인
- [ ] `expire_cancelled_subscriptions()` 수동 실행 테스트

---

### Phase 3: 구독 라이프사이클 API — 해지 변경 + 해지 철회 + 플랜 변경 + 구독 환불
**Goal**: 해지 시 빌링키 유지, 해지 철회 API, 플랜 변경 API, 중복 방지, 7일 구독 환불
**Estimated Time**: 4시간
**Status**: ⏳ Pending

#### 해결하는 이슈
- C4 (API부분): 해지 로직 변경, 해지 철회, 플랜 변경
- M1: cancelled_at 미저장
- M2: 중복 구독 방지
- M6: 구독 환불 정책 (약관 20조 1항 ①)
- M7: 해지 철회 API

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 3.1**: 해지 API (`cancel/route.ts`) 테스트
  - File: `src/app/api/payment/subscribe/cancel/route.test.ts`
  - 시나리오:
    - 해지 → status='cancel_scheduled' (NOT 'canceled')
    - 빌링키 삭제 안 됨 확인
    - `cancelled_at` 저장 확인

- [ ] **Test 3.2**: 해지 철회 API (`reactivate/route.ts`) 테스트
  - File: `src/app/api/payment/subscribe/reactivate/route.test.ts`
  - 시나리오:
    - cancel_scheduled + 잔여 기간 → active 복구, 결제 재예약
    - cancel_scheduled + 기간 만료 → 에러 반환
    - active 상태 → 에러 (이미 활성)
    - 빌링키 만료(invalid) → 카드 재등록 안내 에러

- [ ] **Test 3.3**: 플랜 변경 API (`change-plan/route.ts`) 테스트
  - File: `src/app/api/payment/subscribe/change-plan/route.test.ts`
  - 시나리오:
    - active + 다른 플랜 → pending_plan_id 저장
    - 같은 플랜 → 에러
    - free 플랜으로 변경 → 에러 (해지를 사용하라고 안내)
    - cancel_scheduled → 에러 (먼저 해지 철회 필요)

- [ ] **Test 3.4**: 구독 시작 API 중복 방지 테스트
  - File: `src/app/api/payment/subscribe/route.test.ts`
  - 시나리오:
    - 이미 active → 409 ALREADY_SUBSCRIBED
    - cancel_scheduled + 잔여 기간 → 409 HAS_REMAINING_PERIOD
    - expired 또는 없음 → 정상 진행

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 3.5**: `cancel/route.ts` 수정
  - 변경점:
    - `status: 'canceled'` → `status: 'cancel_scheduled'`
    - `cancelled_at: new Date().toISOString()` 추가
    - `deleteBillingKey()` 호출 제거 (빌링키 유지)
    - `cancelSchedule()` 유지 (예약 결제만 취소)
  - ⚠️ Protected Zone

- [ ] **Task 3.6**: `reactivate/route.ts` 신규 생성
  - File: `src/app/api/payment/subscribe/reactivate/route.ts`
  - 흐름:
    1. 인증 확인
    2. `subscription_billing` 조회 (`status === 'cancel_scheduled'`)
    3. `next_billing_date > now()` 확인 (잔여 기간)
    4. `getBillingKeyInfo()` 호출 — 빌링키 유효성 확인
       - 실패 시 → `{ error: '카드 정보가 만료되었습니다...', code: 'BILLING_KEY_EXPIRED' }`
    5. `schedulePayment()` — 다음 결제 재예약
    6. `status → 'active'`, `cancelled_at → null` 업데이트
    7. **추가 결제 없음!**

- [ ] **Task 3.7**: `change-plan/route.ts` 신규 생성
  - File: `src/app/api/payment/subscribe/change-plan/route.ts`
  - 흐름:
    1. 인증 확인
    2. `subscription_billing` 조회 (`status === 'active'`)
    3. 입력값 검증 (`planId` 유효성, 현재 플랜과 다른지)
    4. `pending_plan_id = 새 planId` 저장
    5. 응답: `{ nextBillingDate, newPlan }` — UI에서 안내 표시용

- [ ] **Task 3.8**: `subscribe/route.ts` 중복 방지 로직 추가
  - 변경: 이미 `active` 또는 `cancel_scheduled` + 잔여 기간인 경우 409 반환
  - ⚠️ Protected Zone

- [ ] **Test 3.5**: 구독 환불 API (`subscribe/refund/route.ts`) 테스트
  - File: `src/app/api/payment/subscribe/refund/route.test.ts`
  - 시나리오:
    - 첫 구독 + 7일 이내 + 웰컴리포트 미이용 → 전액 환불 성공
    - 첫 구독 + 7일 이내 + 웰컴리포트 이용 완료 → 환불 거절 ("서비스를 이용하셨으므로 환불이 불가합니다")
    - 첫 구독 + 8일차 → 환불 거절 ("7일이 경과하여 환불이 불가합니다")
    - 갱신 결제 (payment_history 2건 이상) → 환불 거절 ("자동 갱신 결제는 환불 대상이 아닙니다")
    - 검색 시도했지만 실패 (search_results 없음) → 미이용으로 판단 → 환불 가능
    - 연간 구독 + 7일 이내 + 미이용 → 전액 환불 (월간/연간 동일 적용)

**🟢 GREEN: Implement to Make Tests Pass (계속)**

- [ ] **Task 3.10**: `subscribe/refund/route.ts` 신규 생성
  - File: `src/app/api/payment/subscribe/refund/route.ts`
  - 흐름:
    ```
    POST /api/payment/subscribe/refund
    1. 인증 확인
    2. subscription_billing 조회 (status = 'active' 또는 'cancel_scheduled')
    3. subscription_payment_history에서 최근 결제 조회
    4. 첫 구독인지 확인 (payment_history 건수 = 1)
       - 2건 이상 → 에러: RENEWAL_NOT_REFUNDABLE
    5. 결제일로부터 7일 이내인지 확인
       - 초과 → 에러: REFUND_PERIOD_EXPIRED
    6. 웰컴리포트 이용 여부 확인:
       SELECT COUNT(*) FROM searches s
       JOIN search_results sr ON sr.search_id = s.id
       WHERE s.user_id = ? AND s.created_at >= 구독_활성화_시점
         AND s.deleted_at IS NULL
       - COUNT > 0 → 에러: SERVICE_ALREADY_USED
    7. PortOne cancelPayment(paymentId, 전액)
    8. subscription_payment_history.status = 'refunded'
    9. cancelSchedule() — 예약 결제 취소
    10. deleteBillingKey() — 빌링키 삭제
    11. plan_id = 'free', 티켓 리셋, status = 'expired'
    ```
  - 약관 근거: 제20조 1항 ① "결제일로부터 7일 이내에 서비스 이용 내역이 없는 경우 전액 환불"
  - ⚠️ Protected Zone

**🔵 REFACTOR**
- [ ] **Task 3.11**: 공통 유틸 추출
  - `getSubscriptionBilling(supabase, userId)` 헬퍼
  - 에러 코드 상수 정리

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] 모든 테스트 통과

**Manual Testing**:
- [ ] API 테스트 (curl 또는 Postman):
  - POST `/api/payment/subscribe/cancel` → status='cancel_scheduled' 확인
  - POST `/api/payment/subscribe/reactivate` → status='active' 복구 확인
  - POST `/api/payment/subscribe/change-plan` → pending_plan_id 저장 확인
  - POST `/api/payment/subscribe` (중복) → 409 확인
  - POST `/api/payment/subscribe/refund` (7일 이내 + 미이용) → 전액 환불 확인
  - POST `/api/payment/subscribe/refund` (이용 후) → 거절 확인

---

### Phase 4: 웹훅 보안 강화 — 시그니처 검증 + 서비스 롤 + 카드 정보
**Goal**: PortOne 서버 SDK 기반 Webhook 검증, RLS 문제 해결, 카드 정보 저장
**Estimated Time**: 2시간
**Status**: ⏳ Pending

#### 해결하는 이슈
- C2: 웹훅 인증 미구현
- M4: 카드 정보 미저장
- m3: Webhook에서 Supabase 서비스 Role 사용 여부

#### 사전 조건
- `PORTONE_WEBHOOK_SECRET` 환경변수 설정 완료
- `@portone/server-sdk` 패키지 설치

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 4.1**: Webhook 시그니처 검증 테스트
  - File: `src/app/api/payment/webhook/route.test.ts`
  - 시나리오:
    - 유효한 시그니처 → 정상 처리
    - 잘못된 시그니처 → 400 반환
    - 시그니처 헤더 없음 → 400 반환

- [ ] **Test 4.2**: 카드 정보 저장 테스트
  - File: `src/app/api/payment/subscribe/route.test.ts`
  - 시나리오: 구독 활성화 후 card_last4, card_brand 저장 확인

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 4.3**: `@portone/server-sdk` 설치
  - `npm install @portone/server-sdk`

- [ ] **Task 4.4**: Webhook 핸들러 시그니처 검증 추가
  - File: `src/app/api/payment/webhook/route.ts`
  - **핵심 구현 순서** (Next.js App Router 주의사항):
    ```typescript
    // 1. raw body를 text()로 먼저 읽기 (한 번만 가능!)
    const rawBody = await request.text()

    // 2. 시그니처 검증
    try {
      await PortOne.Webhook.verify(
        process.env.PORTONE_WEBHOOK_SECRET!,
        rawBody,
        Object.fromEntries(request.headers)
      )
    } catch (e) {
      if (e instanceof PortOne.Webhook.WebhookVerificationError) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
      throw e
    }

    // 3. 수동 JSON 파싱 (request.json() 사용 불가)
    const body: WebhookPayload = JSON.parse(rawBody)
    ```
  - ⚠️ `request.text()`와 `request.json()`은 동시 호출 불가! body stream은 한 번만 읽기 가능
  - ⚠️ Protected Zone

- [ ] **Task 4.5**: Webhook에서 서비스 롤 클라이언트 사용
  - File: `src/app/api/payment/webhook/route.ts`
  - 변경: `createClient()` → `createServiceRoleClient()` (또는 직접 `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)`)
  - 이유: Webhook은 사용자 세션 없이 호출 → RLS가 차단할 수 있음

- [ ] **Task 4.6**: 구독 활성화 시 카드 정보 저장
  - File: `src/app/api/payment/subscribe/route.ts`
  - 변경:
    ```typescript
    const billingKeyInfo = await getBillingKeyInfo(billingKey)
    // PortOne V2 응답에서 카드 정보 추출
    const cardLast4 = billingKeyInfo?.methods?.[0]?.card?.number?.slice(-4) || null
    const cardBrand = billingKeyInfo?.methods?.[0]?.card?.brand || null
    // activate_subscription RPC에 전달
    ```
  - ⚠️ Protected Zone

- [ ] **Task 4.7**: `.env.local` 업데이트
  - 추가: `PORTONE_WEBHOOK_SECRET=whsec_...`

**🔵 REFACTOR**
- [ ] **Task 4.8**: Webhook 에러 처리 정리
  - 시그니처 실패 시 400 (재전송 방지)
  - 비즈니스 로직 에러 시 200 (PortOne 재전송 방지)

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] Webhook 테스트 통과
- [ ] 카드 정보 저장 테스트 통과

**Manual Testing**:
- [ ] PortOne 테스트 결제 → Webhook 수신 + 시그니처 검증 성공 확인
- [ ] 잘못된 시그니처로 수동 요청 → 400 반환 확인

---

### Phase 5: 웹훅 플랜 변경 처리 + 구독 기간 개선
**Goal**: Webhook에서 pending_plan_id 처리, period 계산 개선
**Estimated Time**: 1.5시간
**Status**: ⏳ Pending

#### 해결하는 이슈
- C4 (Webhook부분): pending_plan_id 적용
- M5: 구독 기간 하드코딩

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 5.1**: pending_plan_id 처리 테스트
  - File: `src/app/api/payment/webhook/route.test.ts`
  - 시나리오:
    - Transaction.Paid + pending_plan_id 있음 → 새 플랜으로 전환
    - Transaction.Paid + pending_plan_id 없음 → 기존 플랜 유지
    - 플랜 변경 시 티켓 수가 새 플랜 기준으로 충전

- [ ] **Test 5.2**: period 계산 유틸 테스트
  - File: `src/lib/utils/__tests__/billing.test.ts`
  - 시나리오:
    - 1월 31일 + 1개월 = 2월 28일 (평년) / 2월 29일 (윤년)
    - 2월 28일 + 1개월 = 3월 28일
    - 연간: 정확히 1년 후

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 5.3**: period 계산 유틸 함수 생성
  - File: `src/lib/utils/billing.ts`
  - 내용:
    ```typescript
    export function calculateNextBillingDate(
      fromDate: Date,
      billingCycle: 'monthly' | 'yearly'
    ): Date {
      const next = new Date(fromDate)
      if (billingCycle === 'yearly') {
        next.setFullYear(next.getFullYear() + 1)
      } else {
        const targetMonth = (next.getMonth() + 1) % 12
        next.setMonth(next.getMonth() + 1)
        // ⚠️ 월말 오버플로우 방지 (1월 31일 → 3월 3일 방지)
        // setMonth()는 해당 월에 없는 날짜를 다음 달로 넘김
        // 예: Jan 31 → setMonth(1) → Feb 31 → Mar 3 (오버플로우!)
        if (next.getMonth() !== targetMonth) {
          next.setDate(0) // 이전 달의 마지막 날로 보정 (Feb 28/29)
        }
      }
      return next
    }
    ```

- [ ] **Task 5.4**: Webhook `handlePaymentPaid`에서 pending_plan_id 처리
  - File: `src/app/api/payment/webhook/route.ts`
  - 변경:
    ```
    Transaction.Paid 처리 시:
    1. subscription_billing 조회
    2. pending_plan_id가 있으면:
       - 새 플랜 기준으로 activate_subscription RPC 호출
       - pending_plan_id = null로 초기화
    3. pending_plan_id가 없으면:
       - 기존 로직 유지
    4. 다음 결제 예약 시 calculateNextBillingDate 사용
    ```
  - ⚠️ Protected Zone

- [ ] **Task 5.5**: `subscribe/route.ts`에서 period 계산 함수 사용
  - File: `src/app/api/payment/subscribe/route.ts`
  - 변경: `periodEnd.setDate(+30/+365)` → `calculateNextBillingDate()` 사용
  - ⚠️ Protected Zone

**🔵 REFACTOR**
- [ ] **Task 5.6**: period 계산 통일
  - subscribe/route.ts, webhook/route.ts 모두 같은 유틸 함수 사용 확인

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] period 계산 테스트 통과
- [ ] pending_plan_id 처리 테스트 통과

**Manual Testing**:
- [ ] 1월 31일 기준 월간 구독 → next_billing_date = 2월 28일 확인

---

### Phase 6: 프론트엔드 UI — 구독 상태 표시 + 해지 철회/플랜 변경 UI
**Goal**: 사용자가 해지 철회, 플랜 변경 기능을 실제로 사용할 수 있는 UI
**Estimated Time**: 2시간
**Status**: ⏳ Pending

#### 해결하는 이슈
- 검토 누락 #2: 프론트엔드 UI 변경 미포함
- 검토 추가 #2: useSubscription 훅이 cancel_scheduled 미인식

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 6.1**: SubscriptionContent 상태 표시 테스트
  - File: `src/components/dashboard/__tests__/SubscriptionContent.test.tsx`
  - 시나리오:
    - active → "현재 구독 중" + 해지 버튼
    - cancel_scheduled → "해지 예약됨 (X월 X일 만료)" + 구독 재개 버튼
    - pending_plan_id → "다음 결제일부터 [플랜] 전환 예정" 안내

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 6.2**: 구독 관리 페이지 서버 컴포넌트 데이터 추가
  - File: `src/app/(dashboard)/dashboard/subscription/page.tsx`
  - 변경: `subscription_billing` 테이블에서 `status`, `next_billing_date`, `pending_plan_id`, `card_last4`, `card_brand` 추가 조회
  - Props로 SubscriptionContent에 전달

- [ ] **Task 6.3**: SubscriptionContent 클라이언트 컴포넌트 수정
  - File: `src/components/dashboard/SubscriptionContent.tsx`
  - 추가 UI:
    - `cancel_scheduled` 상태: 노란 배너 "X월 X일에 구독이 만료됩니다" + "구독 재개" 버튼
    - `pending_plan_id` 존재: 파란 배너 "다음 결제일부터 [플랜명]으로 변경됩니다"
    - 카드 정보: "등록된 카드: **** XXXX (BRAND)"
    - 플랜 변경 버튼/드롭다운

- [ ] **Task 6.4**: 해지 철회 API 호출 연결
  - File: `src/components/dashboard/SubscriptionContent.tsx`
  - "구독 재개" 버튼 → `POST /api/payment/subscribe/reactivate` → `router.refresh()`
  - 빌링키 만료 에러 시 → 카드 재등록 안내

- [ ] **Task 6.5**: 플랜 변경 API 호출 연결
  - File: `src/components/dashboard/SubscriptionContent.tsx`
  - 플랜 선택 → `POST /api/payment/subscribe/change-plan` → `router.refresh()`

- [ ] **Task 6.6**: `useSubscription` 훅에 billing 상태 추가 (선택적)
  - File: `src/hooks/useSubscription.ts`
  - 변경: `subscription_billing` JOIN 또는 별도 쿼리로 `billingStatus` 추가
  - 다른 컴포넌트에서도 cancel_scheduled 상태를 인지할 수 있도록

**🔵 REFACTOR**
- [ ] **Task 6.7**: UI 코드 정리
  - 기존 UI 패턴(§5.5 카드 패턴) 준수 확인
  - `lucide-react` 아이콘 사용 확인
  - dark mode 대응 확인

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] SubscriptionContent 테스트 통과

**Manual Testing**:
- [ ] 구독 활성 상태 → 카드 정보 + 해지 버튼 표시
- [ ] cancel_scheduled 상태 → "해지 예약됨" 배너 + "구독 재개" 버튼
- [ ] "구독 재개" 클릭 → active 복구, 배너 사라짐
- [ ] 플랜 변경 → "다음 결제일부터 변경" 안내 표시

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Webhook RLS 차단 (서비스 롤 미사용) | High | High | Phase 4에서 서비스 롤 클라이언트로 교체 + 테스트 결제 검증 |
| CHECK 제약 조건 이름 불일치 | Medium | Medium | `information_schema.table_constraints`에서 실제 이름 조회 후 DROP |
| Next.js raw body 처리 실수 | Medium | High | `request.text()` → `JSON.parse()` 순서 엄수, 테스트 커버 |
| 빌링키 만료 시 해지 철회 실패 | Low | Medium | reactivate API에서 getBillingKeyInfo 호출로 사전 검증 |
| pg_cron 만료 감지 지연 (최대 24시간) | Low | Low | 허용 가능 — 대시보드 접근 시 프론트에서도 next_billing_date 체크 |
| `@portone/server-sdk` 버전 호환성 | Low | Medium | 설치 전 최신 문서 확인, 테스트 결제로 검증 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `git revert` — CheckoutContent.tsx, config.ts 원복
- 영향 범위: UI 표시만, 결제 로직 변경 없음

### If Phase 2 Fails
- 마이그레이션 롤백: `021_subscription_lifecycle.sql`에 대응하는 down migration
- RPC 함수 DROP: `DROP FUNCTION expire_cancelled_subscriptions(), expire_failed_subscription(uuid)`
- CRON API 라우트 삭제

### If Phase 3 Fails
- cancel/route.ts 원복 (기존 canceled + 빌링키 삭제 방식)
- reactivate/route.ts, change-plan/route.ts 삭제
- subscribe/route.ts 중복 방지 로직 제거

### If Phase 4 Fails
- Webhook 시그니처 검증 제거 (기존 방식 복귀)
- `@portone/server-sdk` 제거 (`npm uninstall`)
- 서비스 롤 → 기존 createClient() 복귀

### If Phase 5 Fails
- period 계산 유틸 제거, 기존 +30/+365 복귀
- pending_plan_id 처리 제거

### If Phase 6 Fails
- SubscriptionContent.tsx 원복
- useSubscription.ts 원복

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%
- **Phase 4**: ⏳ 0%
- **Phase 5**: ⏳ 0%
- **Phase 6**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 — 기초 수정 | 1.5h | - | - |
| Phase 2 — DB 마이그레이션 | 2h | - | - |
| Phase 3 — 라이프사이클 API + 구독 환불 | 4h | - | - |
| Phase 4 — 웹훅 보안 | 2h | - | - |
| Phase 5 — 플랜 변경 + period | 1.5h | - | - |
| Phase 6 — 프론트엔드 UI | 2h | - | - |
| **Total** | **13h** | - | - |

---

## 🔄 구독 상태 전이 다이어그램 (목표)

```
                    ┌──────────────────────────────────┐
                    │     subscription_billing.status   │
                    └──────────────────────────────────┘

[신규 구독] ──────► active
                     │
                     ├──[해지 요청]──► cancel_scheduled
                     │                   │
                     │                   ├──[해지 철회]──► active (추가결제 없음)
                     │                   │
                     │                   └──[CRON 감지]──► expired → plan_id='free'
                     │                      (빌링키 삭제)     │
                     │                                       └──[재구독]──► active (전액결제)
                     │
                     ├──[플랜 변경]──► active (pending_plan_id 저장)
                     │                 └──[Webhook Paid]──► active (새 플랜 적용)
                     │
                     └──[결제 실패]──► past_due
                                       │
                                       ├──[재시도 성공]──► active
                                       └──[3회 실패]──► expired → plan_id='free'
                                          (RPC: expire_failed_subscription)
```

---

## 📝 Notes & Learnings

### Implementation Notes
- (구현 중 추가)

### Blockers Encountered
- (구현 중 추가)

### 코딩 룰 준수 체크리스트
- [ ] §10.4: 기존 마이그레이션 수정 없음, 021번 새 파일 사용
- [ ] §11.2: Protected Zone 파일 수정 전 계획 확인
- [ ] §14.1: 완료 후 `erd_design.md`, `architecture_data_flow.md`, `component_tree.md` 업데이트
- [ ] §6.1: 새 에러 코드 기존 패턴 준수 (`BILLING_KEY_EXPIRED`, `HAS_REMAINING_PERIOD` 등)
- [ ] §10.1: 직접 UPDATE 대신 RPC 사용 (티켓/구독 변경)
- [ ] §1.3: 모든 Client mutation 후 `router.refresh()` 호출

---

## 📚 References

### Documentation
- [PortOne V2 웹훅 연동](https://developers.portone.io/opi/ko/integration/webhook/readme-v2)
- [PortOne 서버 SDK (JavaScript)](https://developers.portone.io/sdk/ko/v2-server-sdk/javascript)
- [결제 감사 보고서](../../.gemini/antigravity/brain/aa365553-9e17-45d6-9976-39f8189a6967/implementation_plan.md)
- [아키텍처 문서](../../Docs/important_files/architecture_data_flow.md)
- [ERD 문서](../../Docs/important_files/erd_design.md)
- [코딩 룰 Part 1-3](../../.agent/rules/)

### 환경변수 추가 필요
| Variable | Side | Purpose |
|----------|------|---------|
| `PORTONE_WEBHOOK_SECRET` | Server only | 웹훅 시그니처 검증 |

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All 6 phases completed with quality gates passed
- [ ] Full integration testing with PortOne test payment
- [ ] 구독 환불 테스트: 7일 이내 미이용 → 전액 환불 확인
- [ ] 구독 환불 거절 테스트: 이용 후 or 7일 초과 → 거절 확인
- [ ] `erd_design.md` updated (새 컬럼, 새 RPC)
- [ ] `architecture_data_flow.md` updated (새 API 라우트, CRON 추가)
- [ ] `component_tree.md` updated (SubscriptionContent 변경사항)
- [ ] `npm run build` 성공
- [ ] 기존 테스트 + 새 테스트 전체 통과
- [ ] PortOne 테스트 결제 end-to-end 검증 완료

---

**Plan Status**: ⏳ Pending
**Next Action**: Phase 1 시작 — VAT 통일 + 금액 오류 수정
**Blocked By**: None
