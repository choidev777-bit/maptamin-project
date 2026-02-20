# Implementation Plan: Phase 4 — 정기 구독 결제

**Status**: 🔄 Planning
**Started**: 2026-02-19
**Last Updated**: 2026-02-19
**Estimated Completion**: 2026-02-23

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
PortOne V2 + NHN KCP를 이용한 **정기 구독 결제** 시스템입니다.
사용자가 플랜(스타터/프로/프리미엄)을 선택하면 빌링키를 발급받고, 매월 자동으로 결제가 이루어지며, 결제 성공 시 티켓이 자동 충전됩니다.

### Success Criteria
- [ ] 사용자가 결제창에서 카드를 등록하여 빌링키 발급 가능
- [ ] 빌링키로 첫 결제 수행 후 다음 달 자동 결제 예약 가능
- [ ] PortOne Webhook으로 결제 성공/실패 이벤트를 수신하여 DB 반영
- [ ] 구독 취소/변경 UI 제공
- [ ] 결제 실패 시 재시도 로직 및 사용자 알림

### User Impact
현재의 **수동 티켓 구매** 방식에서 **자동 구독 충전** 방식으로 전환하여, 
사용자가 매월 수동으로 티켓을 구매하지 않아도 서비스를 지속 이용할 수 있습니다.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **SDK 결제창 빌링키 발급** (API 키인 방식 X) | KCP 사전 계약 없이도 사용 가능, 카드 정보를 서버에 저장하지 않아 PCI-DSS 대응 불필요 | 결제창 팝업 UX에 의존 |
| **PortOne 예약 결제 (schedule)** 방식 | PortOne 서버가 자동으로 결제를 실행하므로 서버 크론잡 불필요, 인프라 관리 비용 절감 | Webhook 수신으로 결과를 확인해야 함 |
| **Webhook 핸들러로 결제 결과 처리** | 예약 결제 완료 시점을 서버가 Push로 수신, 실시간 반영 가능 | Webhook 유실 대비 fallback 필요 |
| **기존 `user_subscriptions` 테이블 확장** | 이미 `plan_id`, `current_period_start/end`, `remaining_tickets` 컬럼 존재하여 호환성 높음 | 마이그레이션 필요 |
| **`subscription_billing` 신규 테이블** | 빌링키와 구독 상태를 분리하여 관리, 빌링키 교체·만료 등 유연 대응 가능 | 테이블 1개 추가 |

---

## 📦 Dependencies

### Required Before Starting
- [x] PortOne SDK 설치 완료 (`@portone/browser-sdk`)
- [x] 기존 결제 API (`/api/payment/ticket`, `/api/payment/refund`) 동작 확인
- [x] `user_subscriptions` 테이블 존재 확인 (migration 015)
- [ ] **PortOne 콘솔에서 Webhook URL 등록** (`https://[domain]/api/payment/webhook`)

### External Dependencies
- `@portone/browser-sdk`: v2 (이미 설치)
- PortOne REST API V2: `https://api.portone.io`
- NHN KCP: 결제창 빌링키 발급 지원 (카드만)

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: Write tests FIRST, then implement to make them pass

### Test Pyramid
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥80% | 빌링키 발급/결제/스케줄 서버 유틸, Webhook 검증 로직 |
| **Integration Tests** | Critical paths | API Route → PortOne API → DB 흐름 |
| **E2E Tests** | Key user flows | 구독 페이지 → 빌링키 발급 → 결제 완료 UI 흐름 |

---

## 🚀 Implementation Phases

### Phase 4-1: DB 스키마 확장 & 서버 유틸리티
**Goal**: 구독 결제에 필요한 DB 테이블과 PortOne 빌링키/스케줄 서버 함수를 구현
**Estimated Time**: 3-4시간
**Status**: ⏳ Pending

#### 핵심 변경사항

**[NEW] DB Migration: `subscription_billing` 테이블**
```sql
-- 빌링키 및 구독 상태를 관리하는 소규모 테이블
CREATE TABLE subscription_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_key TEXT NOT NULL,             -- PortOne 빌링키
  card_last4 TEXT,                       -- 카드 마지막 4자리 (표시용)
  card_brand TEXT,                       -- 카드 브랜드 (신한, 국민 등)
  plan_id TEXT REFERENCES plans(id),     -- 구독 중인 플랜
  status TEXT NOT NULL DEFAULT 'active'  -- active / cancelled / past_due / expired
    CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  next_payment_id TEXT,                  -- 다음 예약 결제 paymentId
  next_billing_date TIMESTAMPTZ,         -- 다음 결제 예정일
  retry_count INTEGER DEFAULT 0,         -- 결제 실패 재시도 횟수
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)                        -- 사용자당 1개 구독
);
```

**[NEW] `src/lib/portone/billing.ts` — 빌링키 서버 유틸**
- `issueBillingKeyViaAPI(method, channelKey, customer)` — API 빌링키 발급 (SDK 발급 후 서버 검증용은 불필요, SDK가 직접 발급)
- `payWithBillingKey(paymentId, billingKey, orderName, amount, currency)` — 빌링키 단건 결제
- `schedulePayment(paymentId, billingKey, orderName, amount, currency, timeToPay)` — 예약 결제 등록
- `cancelSchedule(scheduleIds)` — 예약 결제 취소
- `getBillingKeyInfo(billingKey)` — 빌링키 상태 조회

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 4-1.1**: `src/lib/portone/billing.test.ts` 단위 테스트 작성
  - `payWithBillingKey` — 정상 결제, API 에러, 인증 에러 케이스
  - `schedulePayment` — 정상 예약, 이미 존재하는 스케줄 에러
  - `cancelSchedule` — 정상 취소, 이미 취소된 스케줄
  - 각 함수의 파라미터 검증 (빈 문자열, 음수 금액 등)

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 4-1.2**: `src/lib/portone/billing.ts` 구현
- [ ] **Task 4-1.3**: DB migration SQL 작성 (`supabase/migrations/0XX_subscription_billing.sql`)

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 4-1.4**: 코드 정리 및 타입 추출

#### Quality Gate ✋
- [ ] `npm run test` — billing.test.ts 전체 통과
- [ ] `npx tsc --noEmit` — 타입 에러 없음
- [ ] migration SQL 문법 확인

---

### Phase 4-2: 빌링키 발급 API & UI
**Goal**: 사용자가 구독 플랜을 선택하고 빌링키(카드 등록)를 발급받는 프론트엔드/백엔드 구현
**Estimated Time**: 3-4시간
**Status**: ⏳ Pending

#### 핵심 구현

**플로우**:
```
사용자 → 구독 페이지 → 플랜 선택 → "구독 시작" 클릭
→ PortOne SDK requestIssueBillingKey() 호출 (결제창 팝업)
→ 사용자 카드 정보 입력 → 빌링키 발급 완료
→ 프론트에서 billingKey + issueId를 백엔드 전송
→ 백엔드: billingKey로 첫 결제 실행 (payWithBillingKey)
→ 성공 시: subscription_billing 레코드 생성 + 다음 달 예약 결제 등록
→ user_subscriptions.plan_id 업데이트 + 티켓 충전
```

**[NEW] `src/lib/portone/subscription-client.ts` — 프론트엔드 빌링키 발급**
- `requestBillingKey(planId, customer)` — SDK `requestIssueBillingKey` 래핑

**[NEW] `src/app/api/payment/subscribe/route.ts` — 구독 시작 API**
- `POST /api/payment/subscribe`
- Request: `{ billingKey, planId }`
- 처리:
  1. 사용자 인증
  2. 빌링키 유효성 검증 (PortOne API로 조회)
  3. 첫 결제 실행 (`payWithBillingKey`)
  4. `subscription_billing` 레코드 생성
  5. `user_subscriptions.plan_id` 업데이트 & 티켓 충전
  6. 다음 달 자동 결제 예약 (`schedulePayment`)

**[NEW] `src/components/dashboard/SubscriptionContent.tsx`** — 구독 UI 컴포넌트

#### Tasks

**🔴 RED**
- [ ] **Test 4-2.1**: `src/app/api/payment/subscribe/route.test.ts` 작성
  - 인증 실패 → 401
  - 잘못된 planId → 400
  - 빌링키 결제 실패 → 502
  - 정상 구독 시작 → 200

**🟢 GREEN**
- [ ] **Task 4-2.2**: `src/lib/portone/subscription-client.ts` 구현
- [ ] **Task 4-2.3**: `POST /api/payment/subscribe` API 구현
- [ ] **Task 4-2.4**: `SubscriptionContent.tsx` 구독 UI 구현

**🔵 REFACTOR**
- [ ] **Task 4-2.5**: 에러 핸들링 개선, 타입 정리

#### Quality Gate ✋
- [ ] `npm run test` — subscribe route 테스트 통과
- [ ] 빌드 에러 없음
- [ ] UI에서 빌링키 발급 → 첫 결제 → 구독 시작 플로우 수동 테스트

---

### Phase 4-3: Webhook 핸들러 구현
**Goal**: PortOne에서 보내는 결제 완료/실패 Webhook을 수신하여 구독 갱신 처리
**Estimated Time**: 2-3시간
**Status**: ⏳ Pending

#### 핵심 구현

**PortOne Webhook 동작 방식**:
```
PortOne → POST /api/payment/webhook
Body: { paymentId }
→ 서버: paymentId로 PortOne API 결제 조회 (verifyPayment)
→ 결제 상태 확인 (PAID / FAILED)
→ PAID: 티켓 충전 + 다음 달 예약 결제 등록 + subscription_billing 업데이트
→ FAILED: retry_count 증가 + 재시도 예약 or 구독 만료 처리
```

**[NEW] `src/app/api/payment/webhook/route.ts`**
- `POST /api/payment/webhook`
- **보안**: PortOne에서 보낸 요청인지 검증 (paymentId로 조회하여 확인)
- **멱등성**: 이미 처리된 결제는 재처리하지 않음 (payment_history 중복 체크)

#### Tasks

**🔴 RED**
- [ ] **Test 4-3.1**: `src/app/api/payment/webhook/route.test.ts` 작성
  - 유효한 paymentId → 200 + DB 업데이트
  - 잘못된 paymentId → 400
  - 이미 처리된 결제 → 200 (멱등성)
  - 결제 실패 상태 → retry 로직 트리거

**🟢 GREEN**
- [ ] **Task 4-3.2**: Webhook 핸들러 구현
- [ ] **Task 4-3.3**: 재시도 로직 구현 (최대 3회, 3일 간격)

**🔵 REFACTOR**
- [ ] **Task 4-3.4**: 로깅 및 에러 핸들링 강화

#### Quality Gate ✋
- [ ] `npm run test` — webhook 테스트 통과
- [ ] 수동 테스트: PortOne 콘솔에서 테스트 Webhook 전송 → 서버 응답 확인

---

### Phase 4-4: 구독 관리 (취소/변경/상태 조회)
**Goal**: 사용자가 구독을 취소하거나 플랜을 변경할 수 있는 기능 구현
**Estimated Time**: 2-3시간
**Status**: ⏳ Pending

#### 핵심 구현

**[NEW] `src/app/api/payment/subscription/route.ts`**
- `GET /api/payment/subscription` — 현재 구독 상태 조회
- `DELETE /api/payment/subscription` — 구독 취소 (예약 결제 취소 + 빌링키 삭제)
- `PATCH /api/payment/subscription` — 플랜 변경 (다음 결제 시 적용)

**[MODIFY] `src/components/dashboard/SubscriptionContent.tsx`**
- 현재 구독 상태 표시 (카드 정보, 다음 결제일, 현재 플랜)
- "구독 취소" 버튼
- "플랜 변경" 기능

#### Tasks

**🔴 RED**
- [ ] **Test 4-4.1**: 구독 관리 API 테스트 작성

**🟢 GREEN**
- [ ] **Task 4-4.2**: 구독 조회/취소/변경 API 구현
- [ ] **Task 4-4.3**: 구독 관리 UI 완성

**🔵 REFACTOR**
- [ ] **Task 4-4.4**: 공통 에러 처리 패턴 적용

#### Quality Gate ✋
- [ ] 전체 테스트 통과
- [ ] 구독 취소 → 예약 결제 취소 확인
- [ ] 갱신 시 올바른 플랜 금액 결제 확인

---

### Phase 4-5: E2E 테스트 & 통합 검증
**Goal**: 전체 구독 결제 흐름을 E2E로 검증
**Estimated Time**: 1-2시간
**Status**: ⏳ Pending

#### Tasks
- [ ] **Test 4-5.1**: `e2e/subscription.spec.ts` 작성 (Mock SDK 기반)
- [ ] **Task 4-5.2**: 수동 E2E 테스트 (테스트 채널로 실제 결제 흐름)
- [ ] **Task 4-5.3**: walkthrough.md 작성

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Webhook 유실 | Medium | High | 주기적 결제 상태 조회 fallback 로직 구현 |
| 빌링키 만료/삭제 | Low | Medium | 결제 실패 시 사용자에게 카드 재등록 안내 |
| KCP 사전 계약 미비 | Low | High | SDK 빌링키 발급 방식 사용 (API 키인 X) |
| 결제 중복 처리 | Medium | High | payment_history 중복 체크 + 멱등성 보장 |
| 테스트 채널 제한 | Low | Low | PortOne 테스트 채널로 개발/QA 진행 |

---

## 🔄 Rollback Strategy

### If Phase 4-1 Fails
- Migration SQL rollback: `DROP TABLE IF EXISTS subscription_billing;`
- `billing.ts` 삭제

### If Phase 4-2 Fails
- 신규 API route, 컴포넌트 삭제
- 기존 티켓 구매 방식 유지

### If Phase 4-3 Fails
- Webhook handler 삭제
- 수동 결제 확인 방식으로 임시 운영

### If Phase 4-4 Fails
- 관리 API 삭제, Phase 4-2까지 기능만 유지
- 구독 취소는 관리자 수동 처리

---

## 📊 Progress Tracking

| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| 4-1: DB & Server Utils | 3-4h | - | ⏳ |
| 4-2: Billing Key & UI | 3-4h | - | ⏳ |
| 4-3: Webhook | 2-3h | - | ⏳ |
| 4-4: Subscription Mgmt | 2-3h | - | ⏳ |
| 4-5: E2E & Verification | 1-2h | - | ⏳ |
| **Total** | **11-16h** | - | ⏳ |

---

## 📁 File Map (생성/수정 예정)

| Action | File | Description |
|--------|------|-------------|
| **NEW** | `supabase/migrations/0XX_subscription_billing.sql` | 구독 빌링 테이블 |
| **NEW** | `src/lib/portone/billing.ts` | 빌링키 결제/예약 서버 유틸 |
| **NEW** | `src/lib/portone/billing.test.ts` | 빌링키 유틸 단위 테스트 |
| **NEW** | `src/lib/portone/subscription-client.ts` | 프론트엔드 빌링키 발급 클라이언트 |
| **NEW** | `src/app/api/payment/subscribe/route.ts` | 구독 시작 API |
| **NEW** | `src/app/api/payment/subscribe/route.test.ts` | 구독 시작 API 테스트 |
| **NEW** | `src/app/api/payment/webhook/route.ts` | Webhook 핸들러 |
| **NEW** | `src/app/api/payment/webhook/route.test.ts` | Webhook 테스트 |
| **NEW** | `src/app/api/payment/subscription/route.ts` | 구독 관리(조회/취소/변경) API |
| **NEW** | `src/components/dashboard/SubscriptionContent.tsx` | 구독 UI 컴포넌트 |
| **NEW** | `e2e/subscription.spec.ts` | E2E 테스트 |

---

## 📚 References

### PortOne API
- [빌링키 발급 API](https://api.portone.io) — `POST /billing-keys`
- [빌링키 결제 API](https://api.portone.io) — `POST /payments/{paymentId}/billing-key`
- [결제 예약 API](https://api.portone.io) — `POST /payments/{paymentId}/schedule`
- [KCP V2 가이드](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/Docs/references/portone_kcp_v2_guide.md)

### 기존 코드 참조
- [PortOne 서버 유틸](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/portone/server.ts) — `verifyPayment`, `cancelPayment` 패턴 참조
- [PortOne 클라이언트](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/portone/client.ts) — `requestTicketPayment` 패턴 참조
- [티켓 결제 API](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/payment/ticket/route.ts) — API Route 패턴 참조
- [요금제 설정](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/pricing/config.ts) — 플랜별 가격/티켓 참조
- [DB 스키마](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/supabase/migrations/015_v2_schema_upgrade.sql) — `user_subscriptions` 구조

---

**Plan Status**: 🔄 Planning — User Review Required
**Next Action**: 사용자 승인 후 Phase 4-1 착수
**Blocked By**: 사용자 리뷰 및 승인
