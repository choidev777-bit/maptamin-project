# Maptamin Coding Rules & AI Guidelines (Part 2/3)

> **Status**: ACTIVE — All AI code generation MUST comply with these rules.  
> **Version**: 1.1  
> **Last Updated**: 2026-02-25  
> **Scope**: API Routes, Error Handling, Authentication, PortOne Payments, and DB/Supabase Rules.

---

## 6. API Route Rules

### 6.1 Standard Response Format

- **Success responses:**
  ```typescript
  return NextResponse.json({ data: result })
  // or
  return NextResponse.json({ success: true, message: '...' })
  ```
- **Error responses (with error codes):**
  ```typescript
  return NextResponse.json(
      { error: 'Human-readable message', code: 'ERROR_CODE' },
      { status: 4xx | 5xx }
  )
  ```
- **Established error codes:** `UNAUTHORIZED`, `NO_TICKETS`, `PLAN_LIMIT_EXCEEDED`, `TICKET_DEDUCTION_FAILED`, `DUPLICATE_PAYMENT`, `INVALID_PAYMENT`, `NO_SUBSCRIPTION`, `ALREADY_CANCELED`, `LOCKED_PLACE`, `DB_ERROR`, `INTERNAL_ERROR`, `INVALID_STATUS`, `RENEWAL_NOT_REFUNDABLE`, `REFUND_PERIOD_EXPIRED`, `SERVICE_ALREADY_USED`, `PORTONE_CANCEL_FAILED`, `USAGE_CHECK_ERROR`, `NO_PAYMENT_HISTORY`

### 6.2 Authentication Guard

- **EVERY user-facing API route** MUST start with authentication check:
  ```typescript
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  ```
- **Exception**: CRON/system API routes (e.g., `/api/cron/scheduled-search`) use **shared secret** authentication instead:
  ```typescript
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Use createClient from @supabase/supabase-js with service role key (NOT server client)
  ```
- **Webhook routes** (e.g., `/api/payment/webhook`) use **PortOne Webhook signature verification**:
  ```typescript
  import { Webhook } from '@portone/server-sdk'
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET
  if (webhookSecret) {
      await Webhook.verify(webhookSecret, body, headers)
  }
  // Use createClient from @supabase/supabase-js with service role key (no user session)
  ```

### 6.3 Request Validation

- Validate ALL required fields from `request.json()` immediately after authentication.
- Return `400` with a descriptive error for missing/invalid fields.
- **Pattern:**
  ```typescript
  const { platform, placeId, placeName } = await request.json()
  if (!platform || !placeId || !placeName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  ```

### 6.4 Admin Bypass

- Admin email addresses are defined as constants in API routes:
  ```typescript
  const ADMIN_EMAILS = ['canadacyj0226@gmail.com', 'admin@maptamin.com']
  const isAdmin = user.email && ADMIN_EMAILS.includes(user.email)
  ```
- **DO NOT modify** the admin email list without explicit user approval.

---

## 7. Error Handling & Validation

### 7.1 API Route Error Handling

- **EVERY API route handler** MUST be wrapped in a top-level `try/catch`:
  ```typescript
  export async function POST(request: Request) {
      try {
          // ... route logic ...
      } catch (error) {
          console.error('[RouteName] Error:', error)
          return NextResponse.json(
              { error: 'Server error occurred', code: 'INTERNAL_ERROR' },
              { status: 500 }
          )
      }
  }
  ```
- **Nested try/catch** is used for operations that should not abort the entire request (e.g., notification sending failure should not fail the search).

### 7.2 Supabase Error Handling

- **ALWAYS check for Supabase errors** after queries:
  ```typescript
  const { data, error } = await supabase.from('table').select('*')
  if (error) {
      console.error('[Context] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
  }
  ```
- For RPC calls, check the error separately:
  ```typescript
  const { error: deductError } = await supabase.rpc('deduct_ticket', { p_platform: 'naver' })
  if (deductError) {
      return NextResponse.json({ error: 'Ticket deduction failed', code: 'TICKET_DEDUCTION_FAILED' }, { status: 500 })
  }
  ```

### 7.3 Client-Side Error Handling

- Client components use `try/catch` around `fetch()` calls with user-facing error messages.
- **Use `window.alert()` or inline error state** for error display (no toast library is installed).
- The only toast component is `PaymentSuccessToast` — a custom component for payment confirmations.

### 7.4 Compensation Pattern (Ticket Refund)

- If a **ticket is deducted** but the subsequent operation fails, **ALWAYS refund** the ticket:
  ```typescript
  // Deduct ticket
  await supabase.rpc('deduct_ticket', { p_platform: 'naver' })

  // Attempt operation
  const { error: createError } = await supabase.from('searches').insert({...})
  if (createError) {
      // COMPENSATE: Refund the ticket
      await supabase.rpc('refund_ticket', { p_platform: 'naver' })
      return NextResponse.json({ error: createError.message }, { status: 500 })
  }
  ```

---

## 8. Authentication & Authorization

### 8.1 Auth Flow

- Authentication is handled exclusively by **Supabase Auth** with OAuth providers (Kakao, Google).
- **DO NOT implement** custom authentication logic. Use Supabase Auth SDK only.
- Auth callback is at `/auth/callback` — exchanges OAuth code for session.
- Sign out is at `/auth/signout` — calls `supabase.auth.signOut()`.

### 8.2 Middleware

- `src/middleware.ts` handles route protection:
  - Protected routes: `/dashboard`, `/naver-search`, `/search`, `/settings`, `/history`, `/onboarding`, `/report-settings`
  - Unauthenticated users → redirect to `/login?redirectTo=원래경로`
  - Authenticated users accessing `/login` → redirect to `/dashboard`
  - Login buttons pass `redirectTo` param to OAuth callback for post-login navigation
- **DO NOT modify middleware logic** without understanding the full auth flow.

### 8.3 Row Level Security (RLS)

- **ALL user data tables** have RLS enabled. Users can only access their own data.
- When writing new Supabase queries, **DO NOT** add `WHERE user_id = ...` manually in Server Components — RLS handles this automatically when using the anon/user client.
- In API routes using `createClient()`, RLS applies based on the authenticated session.

---

## 9. Payment System Rules (PortOne)

### 9.1 Architecture

- **Client-side** (`@/lib/portone/client.ts`, `@/lib/portone/subscription-client.ts`):
  - Initiates payment windows via `@portone/browser-sdk/v2`
  - Returns `paymentId` to server for verification
- **Server-side** (`@/lib/portone/server.ts`, `@/lib/portone/billing.ts`):
  - Verifies payments via PortOne REST API
  - Handles billing key operations (pay, schedule, cancel, delete)
  - Uses `PORTONE_API_SECRET` (server-only, NEVER expose to client)

### 9.2 Critical Payment Rules

- **NEVER expose `PORTONE_API_SECRET`** to client-side code.
- **ALWAYS verify payments server-side** before updating the database.
- **Duplicate payment prevention**: Check `payment_history` for existing `payment_id` before processing.
- **Amount validation**: Compare PortOne's reported amount with expected amount.
- **Atomic subscription activation**: Use the `activate_subscription` RPC (not individual table updates).

### 9.3 Subscription State Transition Rules

- **구독 상태 전환은 다음 규칙을 따릅니다:**
  ```
  active → cancel_scheduled (해지 요청, 빌링키 유지)
  cancel_scheduled → active (해지 철회, 결제 재예약)
  cancel_scheduled → expired (CRON 만료 감지)
  active → past_due (결제 실패)
  past_due → active (재결제 성공)
  past_due → expired (3회 실패 초과)
  active/cancel_scheduled → expired (환불 처리)
  ```
- **해지(cancel) 시 빌링키를 삭제하지 마세요.** `cancel_scheduled` 상태에서 해지 철회(reactivate) 시 기존 빌링키를 재사용합니다.
- **빌링키 삭제는 `expired` 전환 시점에만 수행합니다** (CRON 또는 환불).
- **`pending_plan_id`** — 플랜 변경 요청 시 저장하며, 다음 결제 Webhook에서 적용 후 `null`로 초기화합니다.

### 9.4 Environment Variables

| Variable | Side | Required |
|----------|------|----------|
| `NEXT_PUBLIC_PORTONE_STORE_ID` | Client | Yes |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | Client | Yes |
| `PORTONE_API_SECRET` | Server only | Yes |
| `PORTONE_WEBHOOK_SECRET` | Server only | Yes (Webhook 시그니처 검증) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Yes (CRON API, admin ops) |
| `CRON_SECRET` | Server only | Yes (pg_cron → Vercel API 인증) |
| `GH_PAT` | Server only | Yes (GitHub Actions dispatch) |
| `NEXT_PUBLIC_GITHUB_REPO` | Client | Yes (owner/repo format) |
| `NEXT_PUBLIC_APP_URL` | Client | Yes (dispatch 콜백 URL) |

---

## 10. Database & Supabase Rules

### 10.1 Atomic Operations via RPC

- For operations requiring multiple table updates, **ALWAYS use Supabase RPC functions**:
  - `deduct_ticket(p_platform)` — Ticket deduction + ledger entry
  - `refund_ticket(p_platform, p_search_id)` — Ticket refund + ledger entry
  - `activate_subscription(...)` — Billing + subscription + ledger update
  - `reset_monthly_tickets()` — Monthly ticket reset for all users
  - `expire_cancelled_subscriptions()` — CRON: cancel_scheduled 만료 → expired 전환 + free 다운그레이드
  - `expire_failed_subscription(p_user_id)` — Webhook: 결제 3회 실패 → expired 전환 + free 다운그레이드
- **NEVER update `user_subscriptions.remaining_tickets_*` directly.** Always use the RPC functions to ensure `ticket_ledger` consistency.

### 10.2 30-Day Lock Policy

- `managed_places` and `managed_keywords` have a **30-day lock** after creation/update.
- **ALWAYS check `locked_until`** before allowing modifications or deletions.
- `managed_competitors` also have `locked_until` but enforcement varies by route.

### 10.3 Soft Delete

- The `searches` table uses **soft delete** via `deleted_at` column.
- **ALWAYS filter** `deleted_at IS NULL` when querying searches for display:
  ```typescript
  .is('deleted_at', null)
  ```

### 10.4 Migration File Rules

- **NEVER modify existing migration files.** Always create new migrations for schema changes.
- Migration files follow the naming convention: `NNN_description.sql` (e.g., `021_add_new_column.sql`).
- All tables MUST have RLS enabled.
- All new tables MUST have appropriate RLS policies.
