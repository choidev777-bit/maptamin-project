---
name: verify-subscription-billing
description: 구독 결제 시스템 일관성 검증 — API 라우트, Webhook, CRON, DB 마이그레이션, UI 간 상태 처리 및 가격 로직 일관성 검사. 구독 결제 관련 파일 변경 후 사용.
---

# 구독 결제 시스템 검증

## Purpose

다음 항목의 일관성을 검증합니다:

1. **가격 일관성** — `PLAN_CONFIG`의 가격이 모든 결제 흐름에서 동일하게 사용되는지 (VAT 포함 최종가)
2. **구독 상태 일관성** — `active`, `cancel_scheduled`, `cancelled`, `past_due`, `expired` 상태가 API, Webhook, UI에서 동일하게 처리되는지
3. **billing_cycle 일관성** — `monthly`/`yearly` 구분이 가격 계산, 기간 계산, 예약 결제에 올바르게 적용되는지
4. **pending_plan_id 플로우** — 플랜 변경 저장 → Webhook에서 적용 → DB 초기화 흐름이 완전한지
5. **보안 일관성** — Webhook 시그니처 검증, 서비스 롤 클라이언트 사용, 인증 체크가 적절한지

## When to Run

- 구독 결제 관련 API 라우트를 추가/수정한 후
- `PLAN_CONFIG` 가격이나 플랜 구조를 변경한 후
- Webhook 핸들러를 수정한 후
- `subscription_billing` 또는 `subscription_payment_history` 테이블 스키마를 변경한 후
- 구독 관련 UI 컴포넌트 (`SubscriptionContent`, `CheckoutContent`)를 수정한 후

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/pricing/config.ts` | `PLAN_CONFIG`, `getPlanName()`, `getPlanPrice()` 정의 |
| `src/lib/utils/billing.ts` | `calculateNextBillingDate()` 유틸 — 월말 오버플로우 방지 |
| `src/app/api/payment/subscribe/route.ts` | 구독 시작 API — 첫 결제 + 중복 방지 + 카드 정보 추출 |
| `src/app/api/payment/subscribe/cancel/route.ts` | 구독 해지 → `cancel_scheduled` 상태 전환 |
| `src/app/api/payment/subscribe/reactivate/route.ts` | 해지 철회 → `active` 복구 + 결제 재예약 |
| `src/app/api/payment/subscribe/change-plan/route.ts` | 플랜 변경 → `pending_plan_id` 저장 |
| `src/app/api/payment/subscribe/refund/route.ts` | 환불 API — 7일 이내 + 미이용 검증 |
| `src/app/api/payment/webhook/route.ts` | Webhook 핸들러 — 시그니처 검증, Paid/Failed 처리, pending_plan_id 적용 |
| `src/app/api/cron/expire-subscriptions/route.ts` | CRON — cancel_scheduled 만료 감지 + 빌링키 삭제 |
| `src/components/dashboard/SubscriptionContent.tsx` | 구독 관리 UI — 상태 표시, 해지/철회/환불 |
| `src/components/dashboard/CheckoutContent.tsx` | 결제 UI — 가격 표시 |
| `supabase/migrations/018_subscription_billing.sql` | `subscription_billing` 테이블 정의 |
| `supabase/migrations/019_billing_cycle.sql` | `billing_cycle` 컬럼 + `activate_subscription` RPC |
| `supabase/migrations/023_subscription_lifecycle.sql` | `cancel_scheduled`, `pending_plan_id`, 만료 RPC |
| `src/lib/portone/billing.ts` | PortOne 빌링키/결제/예약 API 호출 |
| `src/lib/portone/server.ts` | PortOne 결제 조회/취소 API 호출 |

## Workflow

### Step 1: 가격 로직 일관성 검증

**파일:** `src/lib/pricing/config.ts`

**검사:** `PLAN_CONFIG`의 `price`와 `yearlyPrice`가 VAT 포함 최종가로 문서화되어 있는지 확인합니다.

```bash
grep -n "VAT.*포함\|최종.*금액" src/lib/pricing/config.ts
```

**위반:** `price`/`yearlyPrice`에 VAT를 별도로 가산하는 코드가 있는 경우.

```bash
grep -rn "price.*\*.*1\.1\|price.*\+.*vat\|VAT.*별도" src/app/api/payment/ src/components/dashboard/CheckoutContent.tsx
```

**PASS:** 검색 결과가 0건이어야 합니다.
**FAIL:** VAT를 별도로 계산하는 코드가 발견되면 `PLAN_CONFIG`의 가격 정책과 불일치합니다.

### Step 2: getPlanPrice/getPlanName 사용 검증

**검사:** 가격 조회 시 `PLAN_CONFIG[planId].price` 직접 접근 대신 `getPlanPrice()` 유틸을 사용하는지 확인합니다.

```bash
grep -rn "plan\.price\|plan\.yearlyPrice\|plan_id.*===.*premium.*?.*프리미엄" src/app/api/payment/webhook/route.ts src/app/api/payment/subscribe/route.ts
```

**PASS:** `getPlanPrice()`/`getPlanName()` 만 사용.
**FAIL:** 인라인으로 가격을 직접 참조하거나 플랜 이름을 하드코딩하는 경우.

### Step 3: 구독 상태 CHECK 제약 조건 일관성

**검사:** DB의 `status` CHECK 제약 조건에 정의된 상태와 API/UI에서 사용하는 상태가 일치하는지 확인합니다.

```bash
grep -n "cancel_scheduled" supabase/migrations/018_subscription_billing.sql supabase/migrations/023_subscription_lifecycle.sql
```

**검사:** UI에서 `cancel_scheduled` 상태를 올바르게 처리하는지 확인합니다.

```bash
grep -n "cancel_scheduled\|isCancelScheduled" src/components/dashboard/SubscriptionContent.tsx
```

**PASS:** `cancel_scheduled`가 DB 제약 조건, API, UI에 모두 존재.
**FAIL:** 어느 한 곳에서 `cancel_scheduled` 처리가 누락된 경우.

### Step 4: billing_cycle 기반 가격 분기 검증

**검사:** 결제 금액 계산 시 `billing_cycle`을 확인하여 연간/월간 가격을 올바르게 사용하는지 확인합니다.

```bash
grep -n "billing_cycle\|isYearly\|getPlanPrice" src/app/api/payment/webhook/route.ts src/app/api/payment/subscribe/route.ts
```

**PASS:** Webhook과 subscribe 모두 `billing_cycle`에 따라 가격을 분기.
**FAIL:** `billing_cycle` 확인 없이 `plan.price`만 사용하는 경우 (연간 구독자 금액 오류).

### Step 5: calculateNextBillingDate 사용 검증

**검사:** 기간 계산에 `+30`/`+365` 하드코딩 대신 `calculateNextBillingDate()`를 사용하는지 확인합니다.

```bash
grep -rn "setDate.*30\|setDate.*365\|getDate.*+.*30" src/app/api/payment/webhook/route.ts src/app/api/payment/subscribe/route.ts
```

**PASS:** 검색 결과가 0건 — `calculateNextBillingDate()` 사용 중.
**FAIL:** 하드코딩된 일수 계산이 발견되면 월말 오버플로우 버그 위험.

### Step 6: Webhook 보안 검증

**검사:** Webhook 핸들러가 시그니처 검증과 서비스 롤 클라이언트를 사용하는지 확인합니다.

```bash
grep -n "Webhook.verify\|@portone/server-sdk" src/app/api/payment/webhook/route.ts
```

```bash
grep -n "SUPABASE_SERVICE_ROLE_KEY\|createClient.*supabaseUrl.*serviceKey" src/app/api/payment/webhook/route.ts
```

**PASS:** 시그니처 검증 코드와 서비스 롤 클라이언트 모두 존재.
**FAIL:** `createClient('@/lib/supabase/server')`를 사용하거나 시그니처 검증이 없는 경우.

### Step 7: pending_plan_id 플로우 완전성 검증

**검사:** 플랜 변경 저장 → Webhook 적용 → DB 초기화 흐름이 끊기지 않는지 확인합니다.

```bash
# 저장 단계
grep -n "pending_plan_id" src/app/api/payment/subscribe/change-plan/route.ts

# 조회+적용 단계
grep -n "pending_plan_id" src/app/api/payment/webhook/route.ts

# 초기화 단계
grep -n "pending_plan_id.*null" src/app/api/payment/webhook/route.ts
```

**PASS:** 3단계 모두에서 `pending_plan_id`가 처리됨.
**FAIL:** 어느 단계에서 `pending_plan_id` 처리가 누락된 경우 (플랜 변경이 영영 적용되지 않거나, 적용 후 초기화되지 않음).

### Step 8: 환불 조건 검증

**검사:** 환불 API가 3단계 검증 (첫 구독, 7일 이내, 미이용)을 모두 수행하는지 확인합니다.

```bash
grep -n "paymentHistory.length\|REFUND_PERIOD_DAYS\|usedCount\|search_results.*inner" src/app/api/payment/subscribe/refund/route.ts
```

**PASS:** 3개 검증 로직 모두 존재.
**FAIL:** 검증 단계 중 하나가 누락된 경우 (잘못된 환불 가능).

### Step 9: UI 상태 반영 완전성

**검사:** UI가 모든 구독 상태를 올바르게 표시하는지 확인합니다.

```bash
grep -n "isSubscribed\|isCancelScheduled\|isCanceled\|handleReactivate\|handleRefund\|showRefundModal" src/components/dashboard/SubscriptionContent.tsx
```

**PASS:** `active` (이용 중), `cancel_scheduled` (해지 예약), `cancelled` (해지됨) 3가지 상태 모두 UI에 반영.
**FAIL:** 특정 상태에 대한 UI 처리가 누락된 경우.

### Step 10: 인증 일관성

**검사:** 모든 구독 API가 인증을 수행하는지 확인합니다.

```bash
grep -l "auth.getUser\|UNAUTHORIZED\|인증이 필요" src/app/api/payment/subscribe/route.ts src/app/api/payment/subscribe/cancel/route.ts src/app/api/payment/subscribe/reactivate/route.ts src/app/api/payment/subscribe/change-plan/route.ts src/app/api/payment/subscribe/refund/route.ts
```

**PASS:** 5개 파일 모두 인증 체크 존재.
**FAIL:** 인증 없이 동작하는 API가 있는 경우 (보안 취약점).

## Output Format

```markdown
| # | 검사 항목 | 결과 | 상세 |
|---|-----------|------|------|
| 1 | 가격 일관성 (VAT 포함) | ✅/❌ | ... |
| 2 | getPlanPrice/getPlanName 사용 | ✅/❌ | ... |
| 3 | 구독 상태 일관성 | ✅/❌ | ... |
| 4 | billing_cycle 가격 분기 | ✅/❌ | ... |
| 5 | calculateNextBillingDate 사용 | ✅/❌ | ... |
| 6 | Webhook 보안 | ✅/❌ | ... |
| 7 | pending_plan_id 플로우 | ✅/❌ | ... |
| 8 | 환불 조건 검증 | ✅/❌ | ... |
| 9 | UI 상태 반영 | ✅/❌ | ... |
| 10 | 인증 일관성 | ✅/❌ | ... |
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **Webhook에서 서비스 롤 클라이언트 사용** — Webhook은 브라우저 세션이 없는 서버-서버 호출이므로 `@/lib/supabase/server` 대신 `@supabase/supabase-js`의 `createClient(url, serviceKey)`를 사용하는 것이 올바름
2. **CRON에서 서비스 롤 클라이언트 사용** — CRON 역시 인증된 사용자 세션 없이 동작하므로 서비스 롤 필수
3. **`PORTONE_WEBHOOK_SECRET` 미설정 시 검증 건너뜀** — 개발 환경에서는 Webhook Secret이 없을 수 있으며, 코드에서 graceful하게 경고만 출력하고 건너뛰는 것은 의도된 동작
4. **환불 API에서 `createClient('@/lib/supabase/server')` 사용** — 환불은 사용자가 직접 요청하는 API이므로 사용자 세션 기반 클라이언트가 올바름
5. **`PLAN_CONFIG`에서 직접 `plan.price` 접근** — `getPlanPrice()`가 아닌 직접 접근은 `billing_cycle` 분기가 불필요한 곳 (예: UI 표시용)에서는 허용
