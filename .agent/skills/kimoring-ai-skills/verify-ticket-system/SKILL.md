---
name: verify-ticket-system
description: 구독+티켓 시스템의 구현 일관성을 검증합니다. 티켓 관련 코드 변경 후, 검색 API 수정 후, 프론트엔드 티켓 UI 수정 후 사용.
---

# 구독 + 티켓 시스템 검증

## Purpose

1. **DB ↔ Backend 일관성** — 마이그레이션에서 정의한 RPC(`deduct_ticket`, `refund_ticket`)를 Backend API가 올바르게 호출하는지 확인
2. **Legacy 코드 제거** — 삭제된 크레딧 함수(`deduct_credits`, `refund_credits`, `increment_daily_usage`)를 여전히 참조하는 코드가 없는지 확인
3. **플랫폼 분리** — Naver 검색은 `remaining_tickets_naver`, Google 검색은 `remaining_tickets_google`을 각각 사용하는지 확인
4. **1-Ticket-Per-Search 규칙** — 그리드 크기나 키워드 수와 관계없이 검색 1회당 티켓 1장만 차감되는지 확인
5. **Frontend 티켓 표시** — 검색 페이지에서 티켓 잔량 표시 및 차감 경고 UI가 존재하는지 확인

## When to Run

- 검색 API (`api/search`, `api/naver/search`) 수정 후
- 티켓 관련 Frontend 컴포넌트 수정 후
- 요금제 설정 (`pricing/config.ts`) 변경 후
- DB 마이그레이션 스크립트 추가 후
- `user_subscriptions` 테이블 관련 로직 변경 후

## Related Files

| File | Purpose |
|------|---------|
| `supabase/migrations/015_v2_schema_upgrade.sql` | 티켓 시스템 DB 스키마 (deduct_ticket, refund_ticket RPC 정의) |
| `supabase/migrations/016_add_free_plan.sql` | free 플랜 추가 및 handle_new_user 트리거 업데이트 |
| `src/app/api/search/route.ts` | Google 검색 API (티켓 차감 로직 필요) |
| `src/app/api/naver/search/route.ts` | Naver 검색 API (티켓 차감 로직 구현됨) |
| `src/app/(dashboard)/search/new/page.tsx` | Google 검색 프론트엔드 (티켓 UI 필요) |
| `src/app/(dashboard)/naver-search/new/page.tsx` | Naver 검색 프론트엔드 (티켓 UI 구현됨) |
| `src/components/layout/WalletLabel.tsx` | 네비게이션 티켓 잔량 표시 컴포넌트 |
| `src/lib/pricing/config.ts` | 플랜별 티켓 수량 설정 (PLAN_CONFIG) |
| `src/lib/utils/subscription.ts` | 구독 상태 확인 유틸리티 함수들 |
| `src/hooks/useSubscription.ts` | 클라이언트 구독 상태 훅 |

## Workflow

### Step 1: Legacy 크레딧 함수 참조 검사

**도구:** Grep  
**파일:** `src/` 전체

**검사:** 삭제된 legacy 함수를 여전히 호출하는 코드가 없어야 한다.

```bash
grep -rn "deduct_credits\|refund_credits\|deduct_points\|refund_points\|increment_daily_usage\|deduct_credits_and_track_usage" src/ --include="*.ts" --include="*.tsx"
```

**PASS 기준:** 결과가 0건 (match 없음)  
**FAIL 기준:** 1건 이상 match — legacy 함수 호출을 `deduct_ticket` / `refund_ticket` RPC로 교체해야 함

**수정 방법:**
- `increment_daily_usage` → `deduct_ticket` (platform 파라미터 포함)
- `deduct_credits_and_track_usage` → `deduct_ticket` (1-ticket-per-search)
- `refund_credits` → `refund_ticket` (platform 파라미터 포함)

---

### Step 2: Google 검색 API 티켓 차감 확인

**도구:** Read, Grep  
**파일:** `src/app/api/search/route.ts`

**검사:** Google 검색 API가 `deduct_ticket`을 `p_platform: 'google'`로 호출하는지 확인

```bash
grep -n "deduct_ticket" src/app/api/search/route.ts
```

**PASS 기준:** `supabase.rpc('deduct_ticket', { p_platform: 'google' })` 호출이 존재  
**FAIL 기준:** `deduct_ticket` 호출이 없거나, platform이 'google'이 아닌 경우

**추가 확인:**
```bash
grep -n "platform.*google\|'google'" src/app/api/search/route.ts
```

**수정 방법:** Naver API (`src/app/api/naver/search/route.ts`)를 참고하여 동일한 패턴으로 구현:
1. `user_subscriptions`에서 `remaining_tickets_google` 조회
2. 잔량 0 이하 시 402 반환
3. `deduct_ticket({ p_platform: 'google' })` RPC 호출
4. 실패 시 refund 로직

---

### Step 3: Naver 검색 API 티켓 차감 확인

**도구:** Read, Grep  
**파일:** `src/app/api/naver/search/route.ts`

**검사:** Naver 검색 API가 올바르게 티켓을 차감하는지 확인

```bash
grep -n "deduct_ticket" src/app/api/naver/search/route.ts
```

**PASS 기준:**
- `supabase.rpc('deduct_ticket', { p_platform: 'naver' })` 호출이 존재
- `remaining_tickets_naver` 조회 로직이 존재
- 잔량 부족 시 402 응답 반환

**FAIL 기준:** 위 항목 중 누락된 것이 있음

---

### Step 4: 1-Ticket-Per-Search 규칙 확인

**도구:** Grep  
**파일:** `src/app/api/search/route.ts`, `src/app/api/naver/search/route.ts`

**검사:** 검색 API에서 티켓 차감량이 그리드 크기나 키워드 수에 비례하지 않고, 고정 1장인지 확인

```bash
grep -n "gridPoints\|keywords\|enabledCount\|gridSize" src/app/api/search/route.ts | grep -i "cost\|deduct\|ticket\|credit\|point"
grep -n "gridPoints\|keywords\|enabledCount\|gridSize" src/app/api/naver/search/route.ts | grep -i "cost\|deduct\|ticket\|credit\|point"
```

**PASS 기준:** 티켓 차감 로직에 `gridPoints.length`, `keywords.length`, `enabledCount` 등이 곱해지는 패턴이 없음  
**FAIL 기준:** `deduct_ticket` 또는 비용 계산에 grid/keyword 수가 곱해지는 패턴 발견

**수정 방법:** `deduct_ticket(p_platform)` RPC는 항상 1장을 차감하므로, cost 계산 로직을 제거하고 RPC만 호출

---

### Step 5: Frontend 티켓 표시 확인 (Google 검색)

**도구:** Grep  
**파일:** `src/app/(dashboard)/search/new/page.tsx`

**검사:** Google 검색 페이지에서 ti켓 관련 UI 요소가 존재하는지 확인

```bash
grep -n "ticket\|티켓\|잔여\|차감\|remaining_tickets" "src/app/(dashboard)/search/new/page.tsx"
```

**PASS 기준:**
- 남은 티켓 수 표시 UI가 존재
- "1장 차감" 경고 메시지가 존재
- 티켓 부족 시 검색 버튼 비활성화 로직이 존재

**FAIL 기준:** 위 항목 중 누락된 것이 있음

**수정 방법:** Naver 검색 페이지(`naver-search/new/page.tsx`)의 Step 3 (확인 및 시작) 섹션을 참고하여 동일한 패턴으로 구현

---

### Step 6: Frontend 티켓 표시 확인 (Naver 검색)

**도구:** Grep  
**파일:** `src/app/(dashboard)/naver-search/new/page.tsx`

**검사:** Naver 검색 페이지에서 티켓 관련 UI 요소가 존재하는지 확인

```bash
grep -n "remaining_tickets_naver\|티켓\|잔여\|차감" "src/app/(dashboard)/naver-search/new/page.tsx"
```

**PASS 기준:**
- `remaining_tickets_naver` 조회 로직이 존재
- 남은 티켓 수 표시 UI가 존재
- "1장 차감" 경고 메시지가 존재
- 티켓 부족 시 검색 버튼 비활성화 (`!hasTicket`) 로직이 존재

**FAIL 기준:** 위 항목 중 누락된 것이 있음

---

### Step 7: WalletLabel 컴포넌트 확인

**도구:** Grep  
**파일:** `src/components/layout/WalletLabel.tsx`

**검사:** 네비게이션 바의 티켓 잔량 표시가 올바른지 확인

```bash
grep -n "remaining_tickets_naver\|remaining_tickets_google\|user_subscriptions" src/components/layout/WalletLabel.tsx
```

**PASS 기준:**
- `user_subscriptions` 테이블에서 데이터 조회
- `remaining_tickets_naver`와 `remaining_tickets_google`을 모두 사용
- "크레딧" 또는 "포인트"라는 용어 미사용

**추가 확인 (legacy 용어):**
```bash
grep -in "credit\|포인트\|크레딧" src/components/layout/WalletLabel.tsx
```

**PASS 기준:** 결과가 0건  
**FAIL 기준:** "credit", "포인트", "크레딧" 등 legacy 용어가 발견됨

---

### Step 8: PLAN_CONFIG와 DB 스키마 정합성

**도구:** Read  
**파일:** `src/lib/pricing/config.ts`, `supabase/migrations/015_v2_schema_upgrade.sql`, `supabase/migrations/016_add_free_plan.sql`

**검사:** `PLAN_CONFIG`의 플랜 키(`free`, `starter`, `pro`, `premium`)가 DB `plans` 테이블의 `id`와 일치하는지 확인

```bash
grep -n "ticketsNaver\|ticketsGoogle" src/lib/pricing/config.ts
grep -n "monthly_tickets_naver\|monthly_tickets_google" supabase/migrations/015_v2_schema_upgrade.sql
grep -n "free" supabase/migrations/016_add_free_plan.sql
```

**PASS 기준:**
- PLAN_CONFIG에 `free`, `starter`, `pro`, `premium` 4개 플랜이 모두 존재
- free 플랜의 모든 티켓/키워드/경쟁사 값이 0
- DB 마이그레이션에 free 플랜 INSERT 문이 존재
- 플랜 ID가 일치 (`free`, `starter`, `pro`, `premium`)

**FAIL 기준:** 플랜 ID 불일치, free 플랜 누락, 또는 티켓 관련 필드 누락

---

### Step 9: 검색 실패 시 Refund 로직 확인

**도구:** Grep  
**파일:** `src/app/api/search/route.ts`, `src/app/api/naver/search/route.ts`

**검사:** 검색 레코드 생성 실패 시 자동으로 티켓을 환불하는 로직이 있는지 확인

```bash
grep -n "refund_ticket" src/app/api/search/route.ts
grep -n "refund_ticket" src/app/api/naver/search/route.ts
```

**PASS 기준:** 검색 레코드 생성(`insert`) 실패 시 `refund_ticket` RPC 호출이 존재  
**FAIL 기준:** 실패 시 refund 로직이 없음 (TODO 주석만 있는 경우 FAIL로 판정)

**수정 방법:**
```typescript
if (createError) {
    // 티켓 환불
    await supabase.rpc('refund_ticket', { p_platform: '<platform>' })
    return NextResponse.json({ error: createError.message }, { status: 500 })
}
```

---

### Step 10: Free 플랜 설정 일관성 확인

**도구:** Grep  
**파일:** `src/lib/pricing/config.ts`

**검사:** `PLAN_CONFIG`에 `free` 플랜이 존재하고, 모든 제한값이 0인지 확인

```bash
grep -A 15 "free:" src/lib/pricing/config.ts
```

**PASS 기준:**
- `free` 키가 `PLAN_CONFIG`에 존재
- `ticketsNaver: 0`, `ticketsGoogle: 0`
- `keywordsNaver: 0`, `keywordsGoogle: 0`
- `competitorsNaver: 0`, `competitorsGoogle: 0`
- `channels: 'none'`

**FAIL 기준:** free 플랜이 없거나 제한값이 0이 아닌 경우

---

### Step 11: 구독 유틸리티 함수 일관성 확인

**도구:** Grep  
**파일:** `src/lib/utils/subscription.ts`

**검사:** 구독 유틸리티가 `PLAN_CONFIG`를 올바르게 참조하고, 필수 함수들이 export 되는지 확인

```bash
grep -n "export function" src/lib/utils/subscription.ts
grep -n "PLAN_CONFIG" src/lib/utils/subscription.ts
```

**PASS 기준:**
- `isSubscribed`, `canAccessPlatform`, `getMaxGridSize`, `getAllowedGridSizes` 함수가 모두 export 됨
- `PLAN_CONFIG`를 import하여 사용
- `isSubscribed`가 `planId !== 'free'`를 반환

**FAIL 기준:** 필수 함수 누락 또는 `PLAN_CONFIG` 미사용

## Output Format

```markdown
## 티켓 시스템 검증 결과

| # | 검사 항목 | 대상 파일 | 결과 | 상세 |
|---|-----------|-----------|------|------|
| 1 | Legacy 함수 참조 | src/ 전체 | PASS/FAIL | ... |
| 2 | Google API 티켓 차감 | api/search/route.ts | PASS/FAIL | ... |
| 3 | Naver API 티켓 차감 | api/naver/search/route.ts | PASS/FAIL | ... |
| 4 | 1-Ticket-Per-Search | 검색 API 전체 | PASS/FAIL | ... |
| 5 | Google 검색 티켓 UI | search/new/page.tsx | PASS/FAIL | ... |
| 6 | Naver 검색 티켓 UI | naver-search/new/page.tsx | PASS/FAIL | ... |
| 7 | WalletLabel | WalletLabel.tsx | PASS/FAIL | ... |
| 8 | PLAN_CONFIG 정합성 | pricing/config.ts + migrations | PASS/FAIL | ... |
| 9 | Refund 로직 | 검색 API 전체 | PASS/FAIL | ... |
| 10 | Free 플랜 설정 | pricing/config.ts | PASS/FAIL | ... |
| 11 | 구독 유틸리티 일관성 | subscription.ts | PASS/FAIL | ... |

**총 검사: 11개 | PASS: N개 | FAIL: M개**
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **테스트 파일의 legacy 함수명** — `*.test.ts`, `*.spec.ts` 파일에서 mock 목적으로 사용된 legacy 함수명은 Step 1의 위반이 아님. 다만, 테스트 자체가 최신 로직과 불일치하면 별도로 경고
2. **마이그레이션 파일의 DROP 문** — `supabase/migrations/*.sql`에서 `deduct_credits`, `refund_credits` 등을 DROP하는 구문은 legacy 제거를 위한 정상 코드
3. **주석 내 legacy 용어** — 코드 주석에서 이전 시스템을 설명하기 위해 "크레딧", "포인트" 등의 용어를 사용하는 것은 위반이 아님
4. **Admin bypass 로직** — Admin 이메일 목록에 의한 제한 bypass는 티켓 시스템의 예외가 아니라 별도의 관리자 기능
