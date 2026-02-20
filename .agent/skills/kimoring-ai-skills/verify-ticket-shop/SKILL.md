---
name: verify-ticket-shop
description: Verifies the ticket shop system implementation consistency. Use after modifying ticket pricing, shop page UI, WalletLabel popup, or ticket purchase flow.
---

# Ticket Shop System Verification

## Purpose

1. **Pricing Consistency** — Ensure `TICKET_PRICE` constant matches the value used across all UI components and tests
2. **WalletLabel Popup Integrity** — Verify the WalletLabel displays separate Naver/Google ticket counts and opens a Radix Dialog popup with correct content
3. **Shop Page Completeness** — Verify the shop page has all required UI elements: platform selection, quantity controls, price calculation, and payment button
4. **Terms of Service Alignment** — Ensure refund policy text in the shop page matches the official Terms of Service (Article 20)
5. **Test Coverage** — Verify `ticket-price.ts` unit tests exist and cover edge cases (zero, negative, non-integer)

## When to Run

- After modifying `src/lib/pricing/ticket-price.ts` (price constant or calculation logic)
- After modifying `src/components/layout/WalletLabel.tsx` (popup or display logic)
- After modifying `src/components/dashboard/TicketShopContent.tsx` (shop UI)
- After modifying `src/app/(dashboard)/dashboard/shop/page.tsx` (server-side data fetching)
- After updating Terms of Service page (`src/app/terms/page.tsx`) refund policy section

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/pricing/ticket-price.ts` | TICKET_PRICE constant (1500), calculateTicketPrice(), formatPrice() |
| `src/lib/pricing/ticket-price.test.ts` | Unit tests for ticket pricing functions |
| `src/components/layout/WalletLabel.tsx` | Nav ticket badge with separate N/G display + Radix Dialog popup |
| `src/components/dashboard/TicketShopContent.tsx` | Client component: platform tabs, quantity selector, price display, payment button |
| `src/app/(dashboard)/dashboard/shop/page.tsx` | Server component: fetches subscription data, renders TicketShopContent |
| `src/app/(dashboard)/dashboard/shop/loading.tsx` | Skeleton loading state for shop page |
| `src/lib/pricing/config.ts` | PLAN_CONFIG with per-plan ticket allocations (ticketsNaver, ticketsGoogle) |
| `src/lib/utils/subscription.ts` | canAccessPlatform(), getPlanDisplayName() used by shop components |
| `src/app/terms/page.tsx` | Terms of Service page containing Article 20 (refund policy) |

## Workflow

### Step 1: TICKET_PRICE Constant Consistency

**Tool:** Grep
**File:** `src/lib/pricing/ticket-price.ts`

**Check:** The TICKET_PRICE constant must be 1500 (KRW per ticket, VAT excluded).

```bash
grep -n "TICKET_PRICE" src/lib/pricing/ticket-price.ts
```

**PASS:** `export const TICKET_PRICE = 1500` exists
**FAIL:** TICKET_PRICE is missing, has a different value, or is not exported

**Fix:** Set `export const TICKET_PRICE = 1500` in the file.

---

### Step 2: calculateTicketPrice Function Validation

**Tool:** Grep
**File:** `src/lib/pricing/ticket-price.ts`

**Check:** The function must multiply quantity by TICKET_PRICE and handle edge cases (negative, non-integer).

```bash
grep -n "calculateTicketPrice\|quantity.*TICKET_PRICE\|Number.isInteger" src/lib/pricing/ticket-price.ts
```

**PASS:**
- `calculateTicketPrice` function is exported
- Contains `quantity * TICKET_PRICE` multiplication
- Throws on negative quantities (`quantity < 0`)
- Throws on non-integer quantities (`!Number.isInteger`)

**FAIL:** Function missing, no validation, or incorrect calculation logic

---

### Step 3: Unit Test Coverage

**Tool:** Grep
**File:** `src/lib/pricing/ticket-price.test.ts`

**Check:** Tests must cover the key scenarios defined in the implementation plan.

```bash
grep -n "describe\|it(" src/lib/pricing/ticket-price.test.ts
```

**PASS:**
- Test for TICKET_PRICE value (1500)
- Test for single ticket (1 → 1500)
- Test for multiple tickets (5 → 7500)
- Test for large quantity (100 → 150000)
- Test for zero quantity (0 → 0)
- Test for negative quantity (throws)
- Test for non-integer quantity (throws)
- Test for formatPrice formatting

**FAIL:** Any of the above test cases is missing

**Verify tests pass:**
```bash
npx jest src/lib/pricing/ticket-price.test.ts --no-coverage 2>&1
```

**PASS:** All tests pass (0 failures)
**FAIL:** Any test failure

---

### Step 4: WalletLabel Separate Display

**Tool:** Grep
**File:** `src/components/layout/WalletLabel.tsx`

**Check:** WalletLabel must display Naver and Google tickets separately (not combined).

```bash
grep -n "remaining_tickets_naver\|remaining_tickets_google" src/components/layout/WalletLabel.tsx
```

**PASS:**
- Both `remaining_tickets_naver` and `remaining_tickets_google` are fetched from Supabase
- Separate display logic exists (e.g., `N {naverTickets} | G {googleTickets}`)

```bash
grep -n "naverTickets\|googleTickets\|hasGoogle" src/components/layout/WalletLabel.tsx
```

**PASS:** Variables for separate ticket counts and Google access check exist
**FAIL:** Only combined ticket count is used, or Google tickets are not displayed for Premium users

---

### Step 5: WalletLabel Radix Dialog Popup

**Tool:** Grep
**File:** `src/components/layout/WalletLabel.tsx`

**Check:** Clicking WalletLabel must open a Radix Dialog popup with ticket details.

```bash
grep -n "Dialog\|@radix-ui/react-dialog" src/components/layout/WalletLabel.tsx
```

**PASS:**
- `@radix-ui/react-dialog` is imported
- `Dialog.Root`, `Dialog.Trigger`, `Dialog.Portal`, `Dialog.Content` are used
- `Dialog.Title` and `Dialog.Description` are present (accessibility)

**Additional checks:**
```bash
grep -n "PLAN_CONFIG\|planConfig\|ticketsNaver\|ticketsGoogle" src/components/layout/WalletLabel.tsx
```

**PASS:** Monthly ticket allocation from PLAN_CONFIG is displayed in the popup
**FAIL:** Dialog import missing, or popup doesn't show monthly allocations

---

### Step 6: WalletLabel Popup Navigation Buttons

**Tool:** Grep
**File:** `src/components/layout/WalletLabel.tsx`

**Check:** Popup must contain navigation buttons to shop and upgrade pages.

```bash
grep -n "/dashboard/shop\|/dashboard/upgrade" src/components/layout/WalletLabel.tsx
```

**PASS:** Both `/dashboard/shop` and `/dashboard/upgrade` navigation targets exist
**FAIL:** Either navigation path is missing

---

### Step 7: Shop Page Server Component

**Tool:** Read
**File:** `src/app/(dashboard)/dashboard/shop/page.tsx`

**Check:** Server component fetches subscription data and passes it to TicketShopContent.

```bash
grep -n "createClient\|user_subscriptions\|remaining_tickets\|TicketShopContent" src/app/(dashboard)/dashboard/shop/page.tsx
```

**PASS:**
- `createClient` from `@/lib/supabase/server` is imported
- `user_subscriptions` table is queried
- `remaining_tickets_naver` and `remaining_tickets_google` are fetched
- `TicketShopContent` is rendered with props

**FAIL:** Missing data fetch, incomplete props, or client-side fetch instead of server-side

---

### Step 8: Shop Page Platform Selection & Google Gating

**Tool:** Grep
**File:** `src/components/dashboard/TicketShopContent.tsx`

**Check:** Platform selection tabs exist, and Google tab is locked for non-Premium users.

```bash
grep -n "canAccessPlatform\|hasGoogle\|selectedPlatform\|naver.*google" src/components/dashboard/TicketShopContent.tsx
```

**PASS:**
- `canAccessPlatform` is imported and used to check Google access
- `selectedPlatform` state exists with 'naver' and 'google' options
- Google tab is disabled when `!hasGoogle`
- Lock icon is shown for non-Premium users

**FAIL:** No platform gating, Google always accessible, or no visual lock indicator

---

### Step 9: Shop Page Quantity Controls & Price Calculation

**Tool:** Grep
**File:** `src/components/dashboard/TicketShopContent.tsx`

**Check:** Quantity selection with +/- buttons and correct price calculation.

```bash
grep -n "TICKET_PRICE\|calculateTicketPrice\|formatPrice\|quantity\|handleQuantityChange" src/components/dashboard/TicketShopContent.tsx
```

**PASS:**
- `TICKET_PRICE`, `calculateTicketPrice`, `formatPrice` are imported from `@/lib/pricing/ticket-price`
- `quantity` state starts at 1
- `handleQuantityChange` prevents going below 1
- Total price is calculated via `calculateTicketPrice(quantity)`
- Price is formatted with `formatPrice()`

**FAIL:** Missing imports, hardcoded price values, or no minimum quantity enforcement

---

### Step 10: Payment Button Placeholder

**Tool:** Grep
**File:** `src/components/dashboard/TicketShopContent.tsx`

**Check:** Payment button exists with a placeholder alert (PG integration deferred).

```bash
grep -n "handlePurchase\|결제 시스템 준비 중\|alert(" src/components/dashboard/TicketShopContent.tsx
```

**PASS:**
- `handlePurchase` function exists
- Contains `alert('결제 시스템 준비 중입니다.')` or similar placeholder
- Has a `TODO` comment referencing PG integration

**FAIL:** No payment button, missing alert, or actual payment logic without PG integration

---

### Step 11: Refund Policy Text vs Terms of Service

**Tool:** Grep
**File:** `src/components/dashboard/TicketShopContent.tsx`, `src/app/terms/page.tsx`

**Check:** The refund policy text in the shop page must align with Article 20 of the Terms of Service.

```bash
grep -n "7일" src/components/dashboard/TicketShopContent.tsx
grep -n "7일" src/app/terms/page.tsx
```

**PASS:**
- Shop page mentions "7일 이내" (within 7 days) for refund eligibility
- This matches Article 20 of Terms: "구매 후 7일 이내에 전혀 사용하지 않은 경우에 한하여 전액 환불 가능"

**FAIL:** Shop page refund text contradicts or omits the 7-day condition from the Terms of Service

---

### Step 12: Loading Skeleton Existence

**Tool:** Read
**File:** `src/app/(dashboard)/dashboard/shop/loading.tsx`

**Check:** A loading skeleton exists for the shop page.

```bash
grep -n "animate-pulse\|Loading\|Skeleton" src/app/(dashboard)/dashboard/shop/loading.tsx
```

**PASS:** File exists and contains `animate-pulse` skeleton elements
**FAIL:** File missing or no skeleton UI

---

## Output Format

```markdown
## Ticket Shop System Verification Results

| # | Check | Target File | Result | Detail |
|---|-------|-------------|--------|--------|
| 1 | TICKET_PRICE constant | ticket-price.ts | PASS/FAIL | ... |
| 2 | calculateTicketPrice logic | ticket-price.ts | PASS/FAIL | ... |
| 3 | Unit test coverage | ticket-price.test.ts | PASS/FAIL | ... |
| 4 | WalletLabel separate display | WalletLabel.tsx | PASS/FAIL | ... |
| 5 | WalletLabel Radix Dialog | WalletLabel.tsx | PASS/FAIL | ... |
| 6 | Popup navigation buttons | WalletLabel.tsx | PASS/FAIL | ... |
| 7 | Shop server component | shop/page.tsx | PASS/FAIL | ... |
| 8 | Platform selection & gating | TicketShopContent.tsx | PASS/FAIL | ... |
| 9 | Quantity & price calculation | TicketShopContent.tsx | PASS/FAIL | ... |
| 10 | Payment button placeholder | TicketShopContent.tsx | PASS/FAIL | ... |
| 11 | Refund policy alignment | TicketShopContent.tsx + terms | PASS/FAIL | ... |
| 12 | Loading skeleton | shop/loading.tsx | PASS/FAIL | ... |

**Total Checks: 12 | PASS: N | FAIL: M**
```

## Exceptions

The following are **NOT violations**:

1. **Hardcoded price in UI labels** — Displaying "1,500원" as a formatted string via `formatPrice(TICKET_PRICE)` is correct; it's not a hardcoded value bypass since it derives from the constant.
2. **Alert instead of real payment** — The `alert()` in `handlePurchase` is intentional; actual PG integration is planned as a separate phase. A `TODO` comment must be present.
3. **Google tab visible but disabled** — For non-Premium users, the Google tab should be visible with a lock icon but not clickable. This is intentional UX, not a bug.
4. **WalletLabel showing only Naver** — For Starter/Pro plans that don't include Google tickets, showing only Naver ticket count (without the "N | G" split) is correct behavior, not a display error.
