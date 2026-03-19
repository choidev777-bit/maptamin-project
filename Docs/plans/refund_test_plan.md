# 맵타민 환불 테스트 계획서

> **Version**: 1.0  
> **Last Updated**: 2026-03-16  
> **근거 법률**: 이용약관 제20조 1항 ①

---

## 1. 환불 시스템 아키텍처 개요

맵타민에는 **2개의 독립된 환불 API**가 존재합니다.

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│  티켓(일회성) 환불            │     │  구독 환불                     │
│  /api/payment/refund         │     │  /api/payment/subscribe/refund │
│                              │     │                               │
│  대상: 추가 구매한 티켓       │     │  대상: 첫 구독 결제 (월정액)   │
│  테이블: payment_history     │     │  테이블: subscription_billing  │
│                              │     │          subscription_payment_ │
│  테스트: ✅ 존재 (212줄)      │     │          history               │
│                              │     │          user_subscriptions    │
│                              │     │  테스트: ❌ 없음               │
└─────────────────────────────┘     └──────────────────────────────┘
        │                                        │
        └────────── 공통 의존 ──────────────────────┘
                        │
            PortOne cancelPayment()
            (server.ts → REST API)
```

---

## 2. 환불 경로 A: 티켓 환불 (`/api/payment/refund`)

### 2.1 소스 코드 위치

- **API Route**: [route.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/payment/refund/route.ts)
- **테스트 파일**: [route.test.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/payment/refund/route.test.ts) (212줄, 8개 테스트)

### 2.2 실제 환불 흐름 (코드 기반)

```typescript
// src/app/api/payment/refund/route.ts — 환불 핵심 로직

// Step 1-2: 인증 + 입력 검증
const { paymentId, reason } = body
if (!paymentId || typeof paymentId !== 'string') → 400 INVALID_PAYMENT_ID
if (!reason || typeof reason !== 'string') → 400 INVALID_REASON

// Step 3: 결제 내역 조회 (payment_history 테이블)
const { data: paymentHistory } = await supabase
    .from('payment_history')
    .select('*')
    .eq('payment_id', paymentId)
    .single()

// Step 4: 본인 결제 확인
if (paymentHistory.user_id !== user.id) → 403 FORBIDDEN

// Step 5: 중복 환불 방지
if (paymentHistory.status === 'refunded') → 409 ALREADY_REFUNDED

// Step 6: 7일 이내 확인
const daysSincePurchase = (now - purchaseDate) / (1000*60*60*24)
if (daysSincePurchase > REFUND_DEADLINE_DAYS) → 400 REFUND_DEADLINE_EXCEEDED

// Step 7: PortOne 결제 취소
await cancelPayment(paymentId, reason)

// Step 8: DB 티켓 차감 (RPC)
await supabase.rpc('deduct_tickets_for_refund', {
    p_user_id: user.id,
    p_platform: paymentHistory.platform,
    p_quantity: paymentHistory.quantity,
})

// Step 9: 상태 업데이트
await supabase.from('payment_history')
    .update({ status: 'refunded', refunded_at: now, refund_reason: reason })
```

### 2.3 기존 테스트 현황 ✅

```typescript
// src/app/api/payment/refund/route.test.ts — 실제 코드

it('should return 401 if user is not authenticated')      // 인증 없음
it('should return 400 if paymentId is missing')            // paymentId 누락
it('should return 400 if reason is missing')               // 환불 사유 누락
it('should return 404 if payment history not found')       // 결제 내역 없음
it('should return 403 if payment belongs to another user') // 타인 결제 환불 시도
it('should return 409 if payment already refunded')        // 중복 환불 방지
it('should return 400 if payment is older than 7 days')    // 7일 초과
it('should return 200 and process refund on valid request')// 성공 시나리오
it('should return 502 if PortOne cancel API fails')        // PortOne 장애
```

### 2.4 누락된 테스트 케이스

| # | 시나리오 | 기대 | 위험도 |
|---|---------|------|--------|
| T-A1 | PortOne 취소 성공 후 `deduct_tickets_for_refund` RPC 실패 | 500 + 로그 (수동 처리 필요) | 💰 **높음** — 돈은 환불됐는데 티켓은 그대로 |
| T-A2 | 7일 경계값: 정확히 7일 0시간 0분 (168시간) | 200 (통과) vs 400 (거부) 경계 | ⚠️ 중간 |

**T-A1이 위험한 이유** — 실제 코드에서 RPC 실패를 catch하지만 **200을 반환하지 않고 로그만 남김**:

```typescript
// src/app/api/payment/refund/route.ts:123-126 — 실제 코드
if (rpcError) {
    // 포트원에서는 이미 환불됨 → 심각한 상태 불일치
    console.error('환불 후 티켓 차감 실패 (수동 처리 필요):', rpcError)
}
// ↑ 여기서 return하지 않고 그대로 200 응답으로 진행됨
```

이 경우 **사용자에게 "환불 성공"이 표시되지만 티켓은 차감되지 않은 상태**입니다. 이 동작이 의도된 것인지 확인 필요.

---

## 3. 환불 경로 B: 구독 환불 (`/api/payment/subscribe/refund`) — ❌ 테스트 없음

### 3.1 소스 코드 위치

- **API Route**: [route.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/payment/subscribe/refund/route.ts) (208줄)
- **UI 트리거**: [SubscriptionContent.tsx](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/components/dashboard/SubscriptionContent.tsx) — `handleRefund()` (L298-328), `renderRefundModal()` (L493-542)
- **테스트**: ❌ **없음**

### 3.2 실제 환불 흐름 (코드 기반)

```typescript
// src/app/api/payment/subscribe/refund/route.ts — 전체 흐름

const REFUND_PERIOD_DAYS = 7

// ── 1. 인증 확인 ──
if (!user) → 401 UNAUTHORIZED

// ── 2. 구독 정보 조회 (subscription_billing) ──
const { data: billing } = await supabase
    .from('subscription_billing')
    .select('billing_key, next_payment_id, plan_id, status, created_at')
    .eq('user_id', user.id)
    .single()

if (billing.status !== 'active' && billing.status !== 'cancel_scheduled')
    → 400 INVALID_STATUS

// ── 3. 첫 구독인지 확인 (갱신 결제 제외) ──
const { data: paymentHistory } = await supabase
    .from('subscription_payment_history')
    .select('id, payment_id, created_at, amount')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: true })

if (paymentHistory.length > 1) → 400 RENEWAL_NOT_REFUNDABLE

// ── 4. 7일 이내인지 확인 ──
const daysDiff = Math.floor((now - paymentDate) / (1000*60*60*24))
if (daysDiff >= REFUND_PERIOD_DAYS) → 400 REFUND_PERIOD_EXPIRED

// ── 5. 서비스 이용 여부 확인 (핵심!) ──
const { count: usedCount } = await supabase
    .from('searches')
    .select('id, search_results!inner(id)', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', paymentDate.toISOString())
    .is('deleted_at', null)

if (usedCount && usedCount > 0) → 400 SERVICE_ALREADY_USED

// ── 6. PortOne 결제 취소 (전액 환불) ──
await cancelPayment(firstPayment.payment_id,
    '구독 7일 이내 미이용 전액 환불 (약관 제20조 1항 ①)')

// ── 7. 후처리 (5단계) ──
// 7-1. 예약 결제 취소 (PortOne)
await cancelSchedule([billing.next_payment_id])
// 7-2. 빌링키 삭제 (PortOne)
await deleteBillingKey(billing.billing_key)
// 7-3. subscription_billing → status: 'expired'
// 7-4. subscription_payment_history → status: 'refunded'
// 7-5. user_subscriptions → plan_id: 'free', tickets: 0
```

### 3.3 필요한 Integration 테스트 케이스 (신규)

> **파일**: `src/app/api/payment/subscribe/refund/route.test.ts` (신규 생성)

#### 3.3.1 인증 및 접근 제어

| # | 시나리오 | 입력 | 기대 결과 | 근거 코드 |
|---|---------|------|----------|----------|
| T-B1 | 비인증 유저 | user=null | 401 `UNAUTHORIZED` | route.ts L40-45 |
| T-B2 | 구독 정보 없음 | billing=null | 404 `NO_SUBSCRIPTION` | route.ts L54-59 |
| T-B3 | expired 상태 구독 | billing.status='expired' | 400 `INVALID_STATUS` | route.ts L61-66 |
| T-B4 | canceled 상태 구독 | billing.status='canceled' | 400 `INVALID_STATUS` | route.ts L61-66 |

```typescript
// 근거: route.ts L61-66 — 실제 코드
if (billing.status !== 'active' && billing.status !== 'cancel_scheduled') {
    return NextResponse.json(
        { error: '환불 가능한 구독 상태가 아닙니다.', code: 'INVALID_STATUS' },
        { status: 400 }
    )
}
```

#### 3.3.2 환불 조건 검증 (핵심 비즈니스 규칙)

| # | 시나리오 | 입력 | 기대 결과 | 근거 코드 |
|---|---------|------|----------|----------|
| T-B5 | 결제 내역 0건 | paymentHistory=[] | 404 `NO_PAYMENT_HISTORY` | route.ts L76-81 |
| T-B6 | 갱신 결제 (2건 이상) | paymentHistory.length=2 | 400 `RENEWAL_NOT_REFUNDABLE` | route.ts L83-88 |
| T-B7 | 7일 초과 (8일 전 결제) | daysDiff=8 | 400 `REFUND_PERIOD_EXPIRED` | route.ts L98-103 |
| T-B8 | 정확히 7일 경과 | daysDiff=7 | 400 `REFUND_PERIOD_EXPIRED` | route.ts L98 (`>=`) |
| T-B9 | 6일 경과 (환불 가능) | daysDiff=6 | 환불 진행 (다음 단계로) | route.ts L98 |
| T-B10 | 서비스 이용함 (search_results 존재) | usedCount=1 | 400 `SERVICE_ALREADY_USED` | route.ts L123-128 |
| T-B11 | 서비스 미이용 (검색 시도했으나 결과 없음) | usedCount=0 | 환불 진행 | route.ts L123 |

```typescript
// 근거: route.ts L83-88 — 갱신 결제 차단 실제 코드
if (paymentHistory.length > 1) {
    return NextResponse.json(
        { error: '자동 갱신 결제는 환불 대상이 아닙니다. 구독 해지를 이용해주세요.',
          code: 'RENEWAL_NOT_REFUNDABLE' },
        { status: 400 }
    )
}
```

```typescript
// 근거: route.ts L96-103 — 7일 경계값 실제 코드
const daysDiff = Math.floor((now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))
if (daysDiff >= REFUND_PERIOD_DAYS) {  // >= 이므로 정확히 7일도 거부
    return NextResponse.json(
        { error: `결제일로부터 ${REFUND_PERIOD_DAYS}일이 경과하여 환불이 불가합니다.`,
          code: 'REFUND_PERIOD_EXPIRED' },
        { status: 400 }
    )
}
```

```typescript
// 근거: route.ts L108-113 — 서비스 이용 여부 확인 실제 코드
// search_results!inner(id) → inner join으로 결과가 있는 검색만 카운트
const { count: usedCount } = await supabase
    .from('searches')
    .select('id, search_results!inner(id)', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', paymentDate.toISOString())
    .is('deleted_at', null)
```

#### 3.3.3 PortOne 통신 오류

| # | 시나리오 | 입력 | 기대 결과 | 근거 코드 |
|---|---------|------|----------|----------|
| T-B12 | cancelPayment 실패 (PortOne 500) | throw Error | 500 `PORTONE_CANCEL_FAILED` | route.ts L131-142 |
| T-B13 | cancelSchedule 실패 (무시) | throw Error | 200 (경고 로그만) | route.ts L148-153 |
| T-B14 | deleteBillingKey 실패 (무시) | throw Error | 200 (경고 로그만) | route.ts L156-162 |

```typescript
// 근거: route.ts L131-142 — cancelPayment 실패 시 전체 환불 중단
try {
    await cancelPayment(firstPayment.payment_id,
        '구독 7일 이내 미이용 전액 환불 (약관 제20조 1항 ①)')
} catch (error) {
    console.error('[Refund] PortOne 결제 취소 실패:', error)
    return NextResponse.json(
        { error: '환불 처리에 실패했습니다. 고객센터에 문의해주세요.',
          code: 'PORTONE_CANCEL_FAILED' },
        { status: 500 }
    )
}
```

```typescript
// 근거: route.ts L147-153 — cancelSchedule 실패해도 환불은 계속 진행
if (billing.next_payment_id) {
    try {
        await cancelSchedule([billing.next_payment_id])
    } catch (error) {
        console.warn('[Refund] 예약 결제 취소 중 오류 (무시됨):', error)
    }
}
```

#### 3.3.4 정상 환불 성공 시나리오

| # | 시나리오 | 검증 항목 | 근거 코드 |
|---|---------|----------|----------|
| T-B15 | active 상태 첫 구독 + 7일 이내 + 미이용 → 전체 환불 성공 | 아래 전체 | route.ts L130-199 |

**T-B15에서 반드시 검증해야 하는 8가지 사항:**

```
✅ cancelPayment 호출됨 (firstPayment.payment_id + 약관 제20조 사유)
✅ cancelSchedule 호출됨 ([billing.next_payment_id])
✅ deleteBillingKey 호출됨 (billing.billing_key)
✅ subscription_billing.update → status: 'expired', next_payment_id: null
✅ subscription_payment_history.update → status: 'refunded'
✅ user_subscriptions.update → plan_id: 'free', tickets: 0, 0
✅ 응답: { success: true, refundedAmount, refundedPaymentId }
✅ 응답 status: 200
```

```typescript
// 근거: route.ts L164-190 — 후처리 DB 업데이트 실제 코드
// 7-3. 구독 billing 상태 → expired
await supabase.from('subscription_billing')
    .update({ status: 'expired', next_payment_id: null, updated_at: ... })
    .eq('user_id', user.id)

// 7-4. 결제 이력 상태 → refunded
await supabase.from('subscription_payment_history')
    .update({ status: 'refunded' })
    .eq('id', firstPayment.id)

// 7-5. 사용자 구독 → free + 티켓 리셋
await supabase.from('user_subscriptions')
    .update({
        plan_id: 'free',
        remaining_tickets_naver: 0,
        remaining_tickets_google: 0,
        current_period_end: new Date().toISOString(),
    })
    .eq('user_id', user.id)
```

#### 3.3.5 cancel_scheduled 상태에서도 환불 가능

| # | 시나리오 | 기대 결과 | 근거 코드 |
|---|---------|----------|----------|
| T-B16 | cancel_scheduled + 7일 이내 + 미이용 → 환불 성공 | 200 | route.ts L61 |

```typescript
// 근거: route.ts L61 — cancel_scheduled도 환불 허용
if (billing.status !== 'active' && billing.status !== 'cancel_scheduled') {
    // active, cancel_scheduled 둘 다 통과 → 환불 가능
```

#### 3.3.6 next_payment_id가 null인 경우

| # | 시나리오 | 기대 결과 | 근거 코드 |
|---|---------|----------|----------|
| T-B17 | billing.next_payment_id = null | cancelSchedule 호출 안 함, 환불 성공 | route.ts L147 |

```typescript
// 근거: route.ts L147 — null일 때 if문으로 skip
if (billing.next_payment_id) {  // null이면 skip
    try { await cancelSchedule([billing.next_payment_id]) } catch ...
}
```

---

## 4. 공통 의존: PortOne 유틸리티 테스트 현황

### 4.1 `cancelPayment()` — `src/lib/portone/server.ts` ✅

```typescript
// src/lib/portone/server.test.ts — 실제 테스트 코드 (이미 존재)
it('should cancel payment successfully')                     // 정상 취소
it('should throw error when paymentId is empty')             // paymentId 누락
it('should throw error when reason is empty')                // 사유 누락
it('should throw error when PortOne API returns cancel error') // 이미 취소된 결제
```

### 4.2 `cancelSchedule()`, `deleteBillingKey()` — `src/lib/portone/billing.ts` ✅

```typescript
// src/lib/portone/billing.test.ts — 실제 테스트 코드 (이미 존재)
// cancelSchedule
it('정상 예약 결제 취소 시 결과를 반환한다')
it('scheduleIds가 비어있으면 에러를 throw한다')

// deleteBillingKey
it('빌링키를 삭제한다')
it('billingKey가 비어있으면 에러를 throw한다')
```

---

## 5. UI 트리거 검증 (SubscriptionContent.tsx)

### 5.1 환불 모달 흐름 (실제 코드)

```typescript
// src/components/dashboard/SubscriptionContent.tsx L298-328

const handleRefund = async () => {
    setRefunding(true)
    setActionMessage(null)

    try {
        const response = await fetch('/api/payment/subscribe/refund', {
            method: 'POST',    // ← body 없음, 서버에서 user.id로 조회
        })
        const data = await response.json()

        if (!response.ok) {
            setActionMessage(data.error || '환불에 실패했습니다.')
            // ...
            return
        }

        setActionMessage(`환불이 완료되었습니다. (환불 금액: ${data.refundedAmount?.toLocaleString()}원)`)
        router.refresh()
    } catch (error) { ... }
}
```

### 5.2 환불 모달 UI (실제 코드)

```tsx
// src/components/dashboard/SubscriptionContent.tsx L493-542

const renderRefundModal = () => {
    return (
        <div>
            <h3>구독을 환불하시겠습니까?</h3>
            <p>첫 구독 결제 후 <strong>7일 이내</strong>이며,
               서비스를 이용하지 않은 경우에만 환불이 가능합니다.</p>
            <p>환불 시 구독이 즉시 해지되고 무료 플랜으로 전환됩니다.</p>
            <button onClick={() => setShowRefundModal(false)}>취소</button>
            <button onClick={handleRefund} disabled={refunding}>
                {refunding ? '처리 중...' : '환불하기'}
            </button>
        </div>
    )
}
```

### 5.3 환불 버튼 노출 조건 (실제 코드)

```tsx
// src/components/dashboard/SubscriptionContent.tsx L933
onClick={() => setShowRefundModal(true)}
```

> ⚠️ 이 버튼의 노출 조건(7일 이내인지, 미이용인지)은 **서버 사이드에서 체크하지 않고 항상 노출**될 수 있습니다. 환불 조건 미충족 시 서버에서 거부하므로 보안 문제는 없으나, UX적으로 불필요한 "환불 실패" 메시지가 표시될 수 있습니다.

---

## 6. 수동 검증 체크리스트

PortOne 테스트 채널을 사용한 **실제 결제→환불 사이클** 수동 테스트입니다.

### 사전 준비

- [ ] PortOne 테스트 채널 MID 확인
- [ ] Supabase 대시보드 접근 가능 확인
- [ ] 테스트용 카카오 계정 준비

### 구독 환불 (경로 B — 테스트 없는 핵심 영역)

```
──────────────────────────────────────────────────
시나리오 1: 첫 구독 + 7일 이내 + 미이용 → 환불 성공
──────────────────────────────────────────────────
[ ] 1. 테스트 계정으로 스타터 플랜 구독 시작 (9,900원)
[ ] 2. Supabase 확인:
    - subscription_billing.status = 'active'
    - subscription_payment_history: 1건, status = 'paid'
    - user_subscriptions.plan_id = 'starter', remaining_tickets_naver = 2
[ ] 3. 검색 실행하지 않음 (웰컴리포트 미이용)
[ ] 4. 구독 관리 → "환불" 버튼 클릭 → 모달 확인 → "환불하기" 클릭
[ ] 5. 성공 메시지 확인: "환불이 완료되었습니다. (환불 금액: 9,900원)"
[ ] 6. Supabase 확인:
    - subscription_billing.status = 'expired'
    - subscription_payment_history: status = 'refunded'
    - user_subscriptions.plan_id = 'free'
    - user_subscriptions.remaining_tickets_naver = 0
    - user_subscriptions.remaining_tickets_google = 0
[ ] 7. PortOne 콘솔 → 해당 결제 건 "취소 완료" 상태 확인

──────────────────────────────────────────────────
시나리오 2: 서비스 이용 후 환불 시도 → 거부
──────────────────────────────────────────────────
[ ] 1. 테스트 계정으로 프로 플랜 구독 시작 (29,000원)
[ ] 2. 네이버 검색 1회 실행 (웰컴리포트 이용 = search_results 생성)
[ ] 3. 구독 관리 → "환불" 버튼 클릭 → "환불하기" 클릭
[ ] 4. 오류 메시지 확인:
    "서비스를 이용하셨으므로 환불이 불가합니다. (웰컴리포트 이용 내역 확인됨)"
[ ] 5. Supabase 확인: 모든 값 변경 없음 (status 여전히 'active')

──────────────────────────────────────────────────
시나리오 3: 7일 초과 후 환불 시도 → 거부
──────────────────────────────────────────────────
[ ] 1. Supabase에서 subscription_payment_history.created_at을 8일 전으로 수동 변경
[ ] 2. 구독 관리 → "환불" 클릭
[ ] 3. 오류 메시지 확인: "결제일로부터 7일이 경과하여 환불이 불가합니다."
```

### 티켓 환불 (경로 A — 이미 테스트 존재)

```
[ ] 1. 추가 티켓 4장 구매 (6,000원)
[ ] 2. Supabase 확인: payment_history 1건, status = 'paid'
[ ] 3. 환불 실행
[ ] 4. Supabase 확인: status = 'refunded', remaining_tickets 감소
[ ] 5. PortOne 콘솔 확인: 결제 건 취소 완료
```

---

## 7. 테스트 실행 방법

### Integration 테스트 (Jest)

```bash
# 티켓 환불 테스트 (기존)
npx jest src/app/api/payment/refund/route.test.ts --verbose

# 구독 환불 테스트 (신규 작성 후)
npx jest src/app/api/payment/subscribe/refund/route.test.ts --verbose

# PortOne 유틸리티 테스트
npx jest src/lib/portone/server.test.ts --verbose
npx jest src/lib/portone/billing.test.ts --verbose

# 환불 관련 전체 실행
npx jest --testPathPattern="refund|portone" --verbose
```

---

## 8. 작업 요약

| 항목 | 상태 | 필요 작업 |
|------|------|----------|
| **티켓 환불** API 테스트 | ✅ 존재 (8개 케이스) | T-A1 RPC 실패 시나리오 추가 |
| **구독 환불** API 테스트 | ❌ 없음 | 17개 케이스 신규 작성 (~250줄) |
| PortOne `cancelPayment` 단위 테스트 | ✅ 존재 | 불필요 |
| PortOne `cancelSchedule` 단위 테스트 | ✅ 존재 | 불필요 |
| PortOne `deleteBillingKey` 단위 테스트 | ✅ 존재 | 불필요 |
| 구독 해지 API 테스트 | ✅ 존재 (6개 케이스) | 불필요 |
| UI 환불 모달 E2E | ⚠️ 없음 | 선택 (인증 Fixture 필요) |
| 수동 검증 (PortOne 테스트 채널) | 📋 체크리스트 | 서비스 오픈 전 1회 필수 실행 |
