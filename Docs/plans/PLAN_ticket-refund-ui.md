# PLAN: 티켓 환불 UI 및 환불 보안 수정

**작성일:** 2026-03-18  
**최종 수정:** 2026-03-18 (환불 검증 로직 v3 — FIFO 기반으로 변경)  
**범위:** Small (3 Phase, 예상 3~5시간)  
**관련 버그:** [A] 환불 UI 없음 / [B] 사용 티켓 환불 차단 없음 / [D] 플랫폼 하드코딩

---

> **CRITICAL INSTRUCTIONS**: 각 Phase 완료 후:
> 1. ✅ 완료된 체크박스를 체크합니다
> 2. 🧪 Quality Gate 검증을 실행합니다
> 3. ⚠️ 모든 Quality Gate 항목이 통과한 경우에만 다음 Phase로 진행합니다
> 4. 📝 Notes 섹션에 학습 내용을 기록합니다
>
> ⛔ Quality Gate를 건너뛰거나 실패한 상태로 다음 Phase로 진행하지 마세요

---

## 개요

### 목표
1. 티켓 상점(`/dashboard/shop`) 하단에 **구매 내역 테이블** 표시
2. 각 내역에 환불 가능 조건(7일 이내 + FIFO 기준 미사용)을 충족할 때만 **환불 버튼** 노출
3. `/api/payment/refund` API에 **FIFO 기반 잔여 티켓 검증** 로직 추가
4. `process/route.ts`의 플랫폼 하드코딩 수정

### 수정 대상 파일
| 파일 | 변경 유형 |
|------|---------|
| `src/app/(dashboard)/dashboard/shop/page.tsx` | payment_history 쿼리 추가 |
| `src/components/dashboard/TicketShopContent.tsx` | 구매 내역 + 환불 UI 추가 |
| `src/app/api/payment/refund/route.ts` | FIFO 기반 검증 로직 추가 |
| `src/app/api/search/[id]/process/route.ts` | 플랫폼 하드코딩 수정 |

### 핵심 검증 로직 (v3 — FIFO 기반)

**원리:** 티켓은 오래된 것부터 소비된다고 가정 (FIFO: First In, First Out).  
특정 결제건의 티켓이 사용되었는지 판단하려면, 해당 결제 이후에 구매한 티켓을 제외해야 함.

```
"이 결제 풀에 남은 티켓" = 전체 잔여 - 이 결제보다 나중에 산 티켓 합계
```

**공식:**
```ts
const available = remaining - laterPurchasedTotal
if (available < paymentHistory.quantity) → 환불 불가 (409)
```

**쉬운 비유:**
```
티켓 더미:  [구독] [구매A-어제] [구매B-오늘]
             ←── 오래된 것부터 사용됨 (FIFO)

사용 시: 구독 → A → B 순서로 소진
환불 검증 시: B를 빼고 남은 양 >= A의 수량인지 확인
```

### 4단계 검증 흐름
```
고객이 환불 버튼 클릭
→ [프론트] status !== 'paid' → 버튼 미노출
→ [프론트] 7일 초과 → 버튼 미노출
→ [확인 모달] → API 호출
→ [백엔드] 본인 결제? → 403
→ [백엔드] 이미 환불? → 409
→ [백엔드] 7일 초과? → 400
→ [백엔드] FIFO 잔여 < 수량? → 409
→ [PortOne] 결제 취소 → 티켓 차감 → 상태 업데이트
```

---

## 엣지케이스 검증표

| # | 시나리오 | 잔여 | 나중구매 | 이 결제 풀 | 환불 수량 | 결과 | v2와 차이 |
|---|---------|------|---------|-----------|----------|------|----------|
| 1 | 10장 구매, 0장 사용 | 10 | 0 | 10 | 10 | ✅ | 동일 |
| 2 | 10장 구매, 3장 사용 | 7 | 0 | 7 | 10 | ❌ | 동일 |
| 3 | A(10)+B(3), 1장 사용, A 환불 | 12 | B=3 | 9 | 10 | ❌ | **v2는 ✅였음** |
| 4 | 위 시나리오에서 B 환불 | 12 | 0 | 12 | 3 | ✅ | 동일 |
| 5 | 네이버A(10), 구글1장 사용, A 환불 | N:10 | 0 | 10 | 10 | ✅ | 동일(플랫폼 독립) |
| 6 | 구독2+구매5=7, 4장 사용, 5장 환불 | 3 | 0 | 3 | 5 | ❌ | 동일 |
| 7 | 환불 완료 후 재환불 | - | - | - | 5 | ❌ | 동일(status) |
| 8 | 5장 구매, 전량 사용 | 0 | 0 | 0 | 5 | ❌ | 동일 |
| 9 | 7일 경계 (정확히 7.0일) | 10 | 0 | 10 | 10 | ✅ | 동일 |
| 10 | A(10)+B(5), 미사용, A→B 순서 환불 | 15→5 | B=5→0 | 10→5 | 10,5 | ✅✅ | 동일 |
| **11** | **구독1+A(5어제)+B(10오늘), 2장 사용, A 환불** | **14** | **B=10** | **4** | **5** | **❌** | **v2는 ✅** |
| **12** | **위 시나리오에서 B 환불** | **14** | **0** | **14** | **10** | **✅** | **동일** |

### 시나리오 11 상세 (v3 변경 계기)

```
구독 기본: 1장
어제 구매A: 5장 (네이버)
오늘 구매B: 10장 (네이버)
합계: 16장

오늘 2장 사용 → 남은: 14장

FIFO 소비 순서: 구독(1장) → A(1장) = 총 2장 소진
→ A는 부분 사용됨 (4/5 남음)
→ B는 미사용 (10/10 남음)

환불 A(5장): 14 - B(10) = 4 >= 5? NO → ❌ 차단 ✅
환불 B(10장): 14 - 0 = 14 >= 10? YES → ✅ 허용 ✅

v2 로직이었다면: 14 >= 5 → ✅ (사용된 A도 환불 가능 — 오류!)
```

---

## Phase 1: 백엔드 보안 수정 (1~1.5h)

### 목표
- `/api/payment/refund`에 FIFO 기반 잔여 티켓 검증 추가
- `process/route.ts` 플랫폼 하드코딩 수정

### 작업 목록

- [ ] **[D] process/route.ts 플랫폼 하드코딩 수정**
  - `src/app/api/search/[id]/process/route.ts` L130
  - 변경 전: `await supabase.rpc('refund_ticket', { p_platform: 'google' })`
  - 변경 후: `await supabase.rpc('refund_ticket', { p_platform: search.platform })`

- [ ] **[B] refund/route.ts FIFO 기반 검증 추가**
  - 7일 체크(Step 6) 이후, PortOne 취소(Step 7) 이전 시점에 삽입
  - Step 6-b: `user_subscriptions`에서 잔여 티켓 조회
  - Step 6-c: `payment_history`에서 이 결제보다 나중에 산 같은 플랫폼 구매 합계 조회
  - Step 6-d: `(잔여 - 나중구매합계) < 이 결제 수량` 이면 409 반환
  - 추가 코드:
    ```ts
    // ── 6-b. 잔여 티켓 조회 ──
    const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('remaining_tickets_naver, remaining_tickets_google')
        .eq('user_id', user.id)
        .single()

    if (subError || !subscription) {
        return NextResponse.json(
            { error: '구독 정보를 확인할 수 없습니다.', code: 'SUBSCRIPTION_NOT_FOUND' },
            { status: 500 }
        )
    }

    const remainingTickets = paymentHistory.platform === 'naver'
        ? subscription.remaining_tickets_naver
        : subscription.remaining_tickets_google

    // ── 6-c. 이 결제보다 나중에 구매한 같은 플랫폼 티켓 합계 ──
    const { data: laterPurchases } = await supabase
        .from('payment_history')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('platform', paymentHistory.platform)
        .eq('status', 'paid')
        .gt('created_at', paymentHistory.created_at)

    const laterPurchasedTotal = (laterPurchases || [])
        .reduce((sum: number, p: { quantity: number }) => sum + p.quantity, 0)

    // ── 6-d. FIFO 기반 사용 여부 판단 ──
    const availableFromThisPurchase = remainingTickets - laterPurchasedTotal

    if (availableFromThisPurchase < paymentHistory.quantity) {
        return NextResponse.json(
            {
                error: '티켓을 이미 사용하여 환불이 불가합니다.',
                code: 'INSUFFICIENT_TICKETS_FOR_REFUND',
            },
            { status: 409 }
        )
    }
    ```

### 성공 기준
- [ ] `tsc --noEmit` 오류 없음 (테스트 파일 제외)
- [ ] `src/app/api/search/[id]/process/route.ts` 변경 = 정확히 1줄
- [ ] refund API 흐름: 인증 → 결제조회 → 본인확인 → 이미환불 → 7일체크 → **FIFO 잔여체크** → PortOne취소 → DB차감

### 롤백 전략
- 두 파일 모두 git diff로 복원 가능. DB 변경 없음.

---

## Phase 2: 서버 컴포넌트 데이터 페칭 (0.5~1h)

### 목표
- `shop/page.tsx`에서 `payment_history` 조회 후 `TicketShopContent`에 props로 전달

### 작업 목록

- [ ] **shop/page.tsx: payment_history 쿼리 추가**
  - 기존 subscription 쿼리 아래에 추가
  - 최신순 최대 20건 조회
  - 쿼리:
    ```ts
    const { data: paymentHistory } = await supabase
        .from('payment_history')
        .select('id, payment_id, platform, quantity, amount, status, created_at, refunded_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20)
    ```
  - Props에 추가: `paymentHistory={paymentHistory || []}`

- [ ] **TicketShopContent.tsx: Props 타입 확장**
  ```ts
  interface PaymentHistoryItem {
      id: string
      payment_id: string
      platform: 'naver' | 'google'
      quantity: number
      amount: number
      status: 'paid' | 'refunded'
      created_at: string
      refunded_at: string | null
  }

  interface Props {
      planId: string
      remainingTicketsNaver: number
      remainingTicketsGoogle: number
      paymentHistory: PaymentHistoryItem[]  // 추가
  }
  ```

### 성공 기준
- [ ] `tsc --noEmit` 오류 없음
- [ ] `localhost:3000/dashboard/shop` 접속 시 빌드 에러 없음

### 롤백 전략
- 두 파일 git 복원. DB 변경 없음.

---

## Phase 3: 구매 내역 UI + 환불 버튼 (1.5~2h)

### 목표
- `TicketShopContent.tsx` 하단에 구매 내역 테이블 렌더링
- 각 행에 환불 가능 조건 판단 후 버튼 노출
- 환불 확인 모달 → API 호출 → 성공 시 페이지 갱신

### 환불 가능 조건 (프론트에서 판단 — 버튼 노출 여부만)
```ts
const isRefundable = (item: PaymentHistoryItem): boolean => {
    if (item.status !== 'paid') return false  // 이미 환불됨
    const daysSince = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince <= 7  // 7일 이내
}
// ⚠️ FIFO 사용 여부 검증은 백엔드(Phase 1)에서 최종 검증
// → 프론트에서 버튼은 보이지만, 사용한 티켓이면 백엔드에서 409로 차단
```

### 작업 목록

#### State 추가
- [ ] `refundingPaymentId: string | null` — 현재 환불 진행 중인 paymentId
- [ ] `refundConfirmTarget: PaymentHistoryItem | null` — 확인 모달 대상
- [ ] `refundMessage: { type: 'success' | 'error', text: string } | null` — 환불 결과 메시지

#### handleRefund 함수
- [ ] `/api/payment/refund` POST 호출 (`paymentId`, `reason: '고객 환불 요청'`)
- [ ] 성공 시 `router.refresh()` + 성공 메시지
- [ ] 실패 시 에러 메시지 표시 (백엔드에서 온 error 메시지 그대로 사용)

#### 구매 내역 테이블 UI
- [ ] 결제 버튼 아래, 안내 텍스트 위에 위치
- [ ] 컬럼: 구매일 / 플랫폼 / 수량 / 금액 / 상태 / 환불
- [ ] `isRefundable(item)` = true → "환불" 버튼 (amber 계열)
- [ ] `item.status === 'refunded'` → "환불완료" 뱃지
- [ ] 7일 초과 + paid → 환불 버튼 미노출
- [ ] paymentHistory가 빈 배열이면 섹션 자체를 숨김

#### 확인 모달
- [ ] "정말 환불하시겠습니까? 해당 결제의 티켓 N장이 차감됩니다." 메시지
- [ ] 취소 / 환불하기 버튼
- [ ] 환불 진행 중 로딩 표시

### UI 레이아웃 (기존 스타일 일치)
```
[결제 버튼]

── 구매 내역 ──────────────────────────
┌─────────┬────────┬────┬───────┬────────┬──────┐
│ 구매일   │ 플랫폼 │ 수량│ 금액  │ 상태   │      │
├─────────┼────────┼────┼───────┼────────┼──────┤
│ 03/17   │ 네이버 │ 10 │15,000 │결제완료 │      │ ← FIFO상 사용됨, 버튼 없지만 백엔드 검증
│ 03/18   │ 네이버 │  3 │ 4,500 │결제완료 │[환불] │
│ 03/18   │ 구글   │  4 │ 6,000 │환불완료 │      │
│ 03/10   │ 네이버 │  5 │ 7,500 │결제완료 │      │ ← 7일 초과, 버튼 없음
└─────────┴────────┴────┴───────┴────────┴──────┘

미사용 티켓은 구매 후 7일 이내 환불 가능합니다. (사용한 티켓 제외)
```

### 성공 기준
- [ ] `tsc --noEmit` 오류 없음
- [ ] 구매 내역이 없으면 섹션 미노출
- [ ] 구매 내역 있으면 테이블 렌더링 확인
- [ ] 환불 버튼 클릭 시 확인 모달 표시
- [ ] 7일 초과 항목에는 환불 버튼 미노출
- [ ] 이미 환불된 항목에는 "환불완료" 뱃지 표시
- [ ] 환불 성공 시 페이지 갱신 + 성공 메시지
- [ ] 사용된 티켓 환불 시도 시 백엔드 409 에러 메시지 노출

### 롤백 전략
- `TicketShopContent.tsx`, `shop/page.tsx` git 복원. DB 변경 없음.

---

## 리스크 평가

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| `payment_history` 테이블이 실제 DB에 없을 수 있음 | 낮 | 높 | Phase 2 시작 전 Supabase Dashboard에서 테이블 존재 확인 |
| PortOne `cancelPayment` 이미 취소된 결제 호출 | 낮 | 중 | API 응답 에러를 그대로 반환 (현재 코드 유지) |
| 동시 환불 요청 (Race Condition) | 극저 | 중 | `deduct_tickets_for_refund`의 `GREATEST(0,...)` 음수 방지. 추후 필요 시 `SELECT FOR UPDATE` 추가 |
| 구독 갱신 시 구매 티켓 덮어쓰기 (버그 C) | 중 | 높 | 이번 범위 밖. 별도 이슈로 관리 |

---

## 가정 (Assumptions)

1. `payment_history` 테이블이 Supabase에 실제 생성되어 있음
   - 근거: `Docs/plans/migration_payment_history.sql` 존재, `ticket/route.ts`에서 사용 중
2. `user_subscriptions`에 `remaining_tickets_naver`, `remaining_tickets_google` 컬럼 존재
   - 근거: `search-service.ts`, `naver/search/route.ts` 등 다수 파일에서 사용 중
3. 티켓 소비는 FIFO (선입선출) 기준으로 판단
   - 근거: 개별 티켓 추적 불가하므로, 오래된 것부터 소비된다고 가정하는 것이 가장 합리적
4. `user` 객체가 항상 존재 (shop/page.tsx에서 이미 auth guard 처리됨)

---

## Notes & Learnings

**v1 → v2 변경 (2026-03-18):**  
`ticket_ledger`에서 `type='use'` 레코드 존재 여부 → `잔여 >= 수량` 비교로 변경.  
사유: "구글 1장 사용 시에도 네이버 전체 환불 차단"은 해결되었으나, "네이버 1장 사용 시 모든 네이버 구매건 환불 차단" 문제가 남아있었음.

**v2 → v3 변경 (2026-03-18):**  
단순 `잔여 >= 수량` → FIFO 기반 `(잔여 - 나중구매합계) >= 수량`으로 변경.  
사유: v2에서는 "구독1+A(5어제)+B(10오늘), 2장 사용 후 A 환불" 시,  
전체 잔여(14) >= A수량(5)으로 허용됨. 하지만 FIFO상 A의 티켓이 이미 사용되었으므로 차단해야 정확함.  
v3에서는 14 - B(10) = 4 < 5 → 정확히 차단됨.

---

## 진행 상태

- [ ] Phase 1: 백엔드 보안 수정
- [ ] Phase 2: 서버 컴포넌트 데이터 페칭
- [ ] Phase 3: 구매 내역 UI + 환불 버튼
