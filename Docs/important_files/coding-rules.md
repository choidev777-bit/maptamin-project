# Maptamin Coding Rules & AI Guidelines

> **Status**: ACTIVE — All AI code generation MUST comply with these rules.  
> **Version**: 1.0  
> **Last Updated**: 2026-02-22  
> **Scope**: Applies to ALL code modifications, including bug fixes, new features, and refactors.

---

## Table of Contents

1. [Architecture & Data Flow Rules](#1-architecture--data-flow-rules)
2. [Server vs. Client Component Rules](#2-server-vs-client-component-rules)
3. [Data Fetching Rules](#3-data-fetching-rules)
4. [State Management Rules](#4-state-management-rules)
5. [UI & Styling Guidelines](#5-ui--styling-guidelines)
6. [API Route Rules](#6-api-route-rules)
7. [Error Handling & Validation](#7-error-handling--validation)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Payment System Rules (PortOne)](#9-payment-system-rules-portone)
10. [Database & Supabase Rules](#10-database--supabase-rules)
11. [Protected Zones (DO NOT MODIFY)](#11-protected-zones-do-not-modify)
12. [File & Directory Conventions](#12-file--directory-conventions)
13. [Testing Rules](#13-testing-rules)
14. [Documentation Maintenance](#14-documentation-maintenance)
15. [Code Style & Naming](#15-code-style--naming)

---

## 1. Architecture & Data Flow Rules

### 1.1 SSR-First Architecture

- **DEFAULT to Server Components.** Every new page (`page.tsx`) MUST be a Server Component unless interactive UI is the primary purpose.
- **Only add `'use client'`** when the component requires:
  - `useState`, `useEffect`, `useRef`, or other React hooks
  - Browser-only APIs (`window`, `document`, `localStorage`)
  - Event handlers (`onClick`, `onChange`, `onSubmit`)
  - Third-party client-only libraries (e.g., `@portone/browser-sdk`, map SDKs)
- **NEVER add `'use client'` to page files** that only fetch data and render children. Instead, delegate interactivity to child Client Components.

### 1.2 Data Flow Direction

```
Server Component (SSR)  →  Props  →  Client Component
       ↓
   Supabase (server)     ← NO direct DB access from Client
                            (except via useSubscription hook or API routes)
```

- **Server Components** fetch data from Supabase using `createClient()` from `@/lib/supabase/server`.
- **Client Components** receive data through props from their parent Server Component.
- **If a Client Component needs fresh data**, it must either:
  - Call an API route (`/api/*`) via `fetch()`
  - Use the `useSubscription()` hook (for subscription data only)
  - Use `createClient()` from `@/lib/supabase/client` for lightweight reads (e.g., keyword lists)

### 1.3 Router Refresh After Mutations

- **After ANY database mutation** (INSERT, UPDATE, DELETE) from a Client Component, ALWAYS call `router.refresh()` to re-run Server Component data fetching.
- This is the established pattern used in 15+ components throughout the codebase.
- **Pattern:**
  ```typescript
  const router = useRouter()

  const handleAction = async () => {
      await fetch('/api/some-endpoint', { method: 'POST', body: ... })
      router.refresh() // ← MANDATORY after mutation
  }
  ```
- **NEVER** rely on local state updates alone after a DB mutation. The SSR-rendered data must be re-fetched.

### 1.4 Async-Parallel Fetching

- When a Server Component needs data from **multiple independent tables**, use `Promise.all()` for parallel fetching.
- **Pattern (established in results pages):**
  ```typescript
  const [searchResult, resultsResult, competitorsResult, subscriptionResult] = await Promise.all([
      supabase.from('searches').select('*').eq('id', id).single(),
      supabase.from('search_results').select('*').eq('search_id', id),
      supabase.from('managed_competitors').select('*').eq('user_id', user.id),
      supabase.from('user_subscriptions').select('plan_id').eq('user_id', user.id).single(),
  ])
  ```
- **NEVER** use sequential `await` for independent queries. This degrades page load performance.

---

## 2. Server vs. Client Component Rules

### 2.1 Decision Matrix

| Scenario | Component Type | Reason |
|----------|---------------|--------|
| Page that only fetches data and renders children | **Server** | Direct Supabase access, no JS bundle |
| Dashboard page with SSR data aggregation | **Server** | 7 parallel queries, SEO |
| Form with user input | **Client** | Needs `useState`, event handlers |
| Modal with open/close state | **Client** | Needs `useState` |
| Map component (Naver/Google) | **Client** | Requires browser APIs, SDK |
| Search wizard (multi-step) | **Client** | Complex state management |
| Static landing section | **Server** | Pure presentation |
| Navigation with dropdown | **Client** | Needs interaction state |

### 2.2 Server/Client Boundary Pattern

- **Split at the data/interaction boundary:**
  ```
  page.tsx (Server) → fetches data → passes props → InteractiveContent.tsx (Client)
  ```
- **Established examples:**
  - `settings/page.tsx` (Server) → `SettingsContent.tsx` (Client)
  - `subscription/page.tsx` (Server) → `SubscriptionContent.tsx` (Client)
  - `dashboard/page.tsx` (Server) → `DashboardPlatformCard` / `SearchHistorySection` (Client)

### 2.3 Dynamic Import for Heavy Libraries

- **Map providers MUST use `next/dynamic` with `ssr: false`:**
  ```typescript
  const GoogleMapsProvider = dynamic(
      () => import('@/components/maps/GoogleMapsProvider').then(m => m.GoogleMapsProvider),
      { ssr: false }
  )
  ```
- This prevents server-side rendering errors and reduces initial bundle size.

---

## 3. Data Fetching Rules

### 3.1 Server-Side Data Fetching

- Use `const supabase = await createClient()` from `@/lib/supabase/server` in Server Components and API routes.
- Use `const user = await getCurrentUser()` from `@/lib/supabase/server` when only the user object is needed (cached with `React.cache`).
- Always destructure results and handle errors:
  ```typescript
  const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('plan_id, remaining_tickets_naver')
      .eq('user_id', user.id)
      .single()
  ```

### 3.2 Client-Side Data Fetching

- For subscription data, **ALWAYS use the `useSubscription()` hook** rather than direct Supabase calls.
- For other client-side reads (e.g., keyword lists in modals), use `createClient()` from `@/lib/supabase/client`.
- **NEVER** import `@/lib/supabase/server` in a Client Component. This will crash at runtime.

### 3.3 API Route Calls from Client

- Use standard `fetch()` for API calls from Client Components.
- **ALWAYS** include the full path starting with `/api/`.
- **Pattern:**
  ```typescript
  const response = await fetch('/api/settings/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, placeId, placeName, address, lat, lng }),
  })
  const data = await response.json()
  if (!response.ok) {
      // Handle error using data.error and data.code
  }
  ```

---

## 4. State Management Rules

### 4.1 No Global State Libraries

- This project **DOES NOT use** Context API, Redux, Zustand, Jotai, or any global state management.
- **DO NOT introduce** any global state management library without explicit user approval.
- All state management is handled through:
  - SSR props drilling (Server → Client)
  - Component-local `useState` / `useEffect`
  - `useSubscription()` hook for subscription data
  - URL parameters via `useSearchParams()`

### 4.2 Subscription State

- The **single source of truth** for subscription data is the `user_subscriptions` table.
- **In Server Components**: Direct Supabase query.
- **In Client Components**: Use `useSubscription()` hook exclusively.
- **Plan limits** are derived using utility functions from `@/lib/utils/subscription`:
  - `isSubscribed(planId)`, `canAccessPlatform(planId, platform)`, `getMaxGridSize(planId)`
  - `getAllowedGridSizes(planId)`, `canManageCompetitors(planId)`, `getMaxKeywords(planId, platform)`

### 4.3 Plan Configuration

- **All plan limits** MUST be read from `@/lib/pricing/config` via `PLAN_CONFIG[planId]` or `getPlanLimit(planId)`.
- **NEVER hardcode** plan limits (grid sizes, ticket counts, competitor limits) directly in components or API routes.

---

## 5. UI & Styling Guidelines

### 5.1 Component Library Usage

- **ALWAYS use existing `@/components/ui/` components** before creating raw HTML elements:
  - `<Button>` instead of `<button>`
  - `<Card>`, `<CardContent>`, `<CardHeader>` instead of `<div className="border rounded...">`
  - `<Badge>` instead of `<span className="px-2 py-1 rounded-full...">`
  - `<Dialog>` instead of custom modals
- **DO NOT create ad-hoc styled components** that duplicate existing UI primitives.

### 5.2 Tailwind CSS Rules

- **Use Tailwind CSS v4** utility classes for all styling.
- **DO NOT use** inline `style={{}}` attributes except for dynamic values (e.g., map positioning).
- **DO NOT create** new CSS files. All styles should use Tailwind utilities.
- **Responsive design is mandatory**: Use `sm:`, `md:`, `lg:` breakpoints.
- **Dark mode** is partially implemented. Use `dark:` variants when adding new UI.
- **Follow existing color patterns**:
  - Primary actions: `bg-blue-600`, `hover:bg-blue-700`
  - Naver branding: `bg-[#03C75A]` (Naver green)
  - Google branding: `bg-blue-500`
  - Danger/destructive: `bg-red-600`
  - Success: `bg-emerald-600`
  - Warnings: `bg-yellow-50`, `border-yellow-200`, `text-yellow-800`

### 5.3 Icon Library

- **Use `lucide-react`** for all icons. Do not introduce another icon library.
- Import icons individually: `import { Search, Settings, ChevronRight } from 'lucide-react'`

### 5.4 Font & Typography

- The project uses **Geist Sans** and **Geist Mono** from `next/font/google`.
- **DO NOT add** additional font imports without explicit approval.

### 5.5 Card & Section Patterns

- **Dashboard sections** follow this pattern:
  ```tsx
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-slate-700 p-6">
      <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Section Title</h3>
      </div>
      {/* Section content */}
  </div>
  ```
- **DO NOT deviate** from this established card styling pattern without explicit approval.

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
- **Established error codes:** `UNAUTHORIZED`, `NO_TICKETS`, `PLAN_LIMIT_EXCEEDED`, `TICKET_DEDUCTION_FAILED`, `DUPLICATE_PAYMENT`, `INVALID_PAYMENT`, `NO_SUBSCRIPTION`, `ALREADY_CANCELED`, `LOCKED_PLACE`, `DB_ERROR`, `INTERNAL_ERROR`

### 6.2 Authentication Guard

- **EVERY API route** MUST start with authentication check:
  ```typescript
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }
  ```
- **NO EXCEPTIONS.** Even internal routes must validate the user.

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
  - Unauthenticated users accessing `/dashboard/*` → redirect to `/login`
  - Authenticated users accessing `/login` → redirect to `/dashboard`
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

### 9.3 Environment Variables

| Variable | Side | Required |
|----------|------|----------|
| `NEXT_PUBLIC_PORTONE_STORE_ID` | Client | Yes |
| `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | Client | Yes |
| `PORTONE_API_SECRET` | Server only | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Client | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Yes |

---

## 10. Database & Supabase Rules

### 10.1 Atomic Operations via RPC

- For operations requiring multiple table updates, **ALWAYS use Supabase RPC functions**:
  - `deduct_ticket(p_platform)` — Ticket deduction + ledger entry
  - `refund_ticket(p_platform, p_search_id)` — Ticket refund + ledger entry
  - `activate_subscription(...)` — Billing + subscription + ledger update
  - `reset_monthly_tickets()` — Monthly ticket reset for all users
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

---

## 11. Protected Zones (DO NOT MODIFY)

> **CRITICAL**: The following files and directories MUST NOT be modified by AI without **explicit user approval**. Any suggested changes to these files require presenting a detailed plan to the user first.

### 11.1 Infrastructure & Auth

| Path | Reason |
|------|--------|
| `src/middleware.ts` | Auth route protection — incorrect changes break entire auth flow |
| `src/lib/supabase/server.ts` | Server-side Supabase client factory — shared across ALL server code |
| `src/lib/supabase/client.ts` | Client-side Supabase client factory — shared across ALL client code |
| `src/app/(auth)/auth/callback/route.ts` | OAuth callback — handles session exchange |
| `src/app/(auth)/auth/signout/route.ts` | Sign out handler |

### 11.2 Payment System

| Path | Reason |
|------|--------|
| `src/lib/portone/server.ts` | Payment verification — security-critical |
| `src/lib/portone/billing.ts` | Billing key operations — financial transactions |
| `src/lib/portone/client.ts` | Client payment initiation — PortOne SDK integration |
| `src/lib/portone/subscription-client.ts` | Subscription billing key issuance |
| `src/app/api/payment/**` | All payment API routes — money-critical |

### 11.3 Database

| Path | Reason |
|------|--------|
| `supabase/migrations/*` | Existing migrations — NEVER modify, only add new ones |
| `src/lib/services/search-service.ts` | Core search logic with ticket atomicity |
| `src/lib/services/place-manager.ts` | Place/competitor registration with plan limits |

### 11.4 Core Configuration

| Path | Reason |
|------|--------|
| `src/lib/pricing/config.ts` | Plan limits and pricing — business-critical |
| `src/lib/utils/subscription.ts` | Subscription utility functions — used system-wide |
| `src/lib/types/index.ts` | Core TypeScript types — breaking changes affect entire app |
| `next.config.ts` | Next.js configuration |
| `tailwind.config.ts` | Tailwind configuration |
| `package.json` | Dependencies — do not add/remove without approval |

### 11.5 Documentation

| Path | Reason |
|------|--------|
| `Docs/important_files/*` | Architecture reference docs — master source of truth |
| `Docs/PRD.md` | Product requirements — business decisions |

---

## 12. File & Directory Conventions

### 12.1 Directory Structure

```
src/
├── app/
│   ├── (auth)/          ← Auth routes (login, callback, signout)
│   ├── (dashboard)/     ← Protected routes (dashboard, search, settings)
│   │   ├── dashboard/   ← Main dashboard + sub-routes
│   │   ├── naver-search/ ← Naver search flow
│   │   ├── search/      ← Google search flow
│   │   ├── settings/    ← User settings
│   │   └── onboarding/  ← Onboarding wizard
│   └── api/             ← API routes
├── components/
│   ├── ui/              ← Shared UI primitives (Shadcn/Radix)
│   ├── dashboard/       ← Dashboard-specific components
│   ├── search/          ← Search configuration components
│   ├── results/         ← Search results visualization
│   ├── naver/           ← Naver-specific map components
│   ├── maps/            ← Google Maps provider
│   ├── layout/          ← Layout components (nav, guards)
│   ├── landing/         ← Landing page sections
│   ├── onboarding/      ← Onboarding step components
│   ├── settings/        ← Settings management components
│   ├── competitor/      ← Competitor management
│   └── auth/            ← Auth buttons
├── hooks/               ← Custom hooks
├── lib/
│   ├── supabase/        ← Supabase client factories
│   ├── portone/         ← PortOne payment integration
│   ├── services/        ← Business logic services
│   ├── pricing/         ← Plan configuration
│   ├── utils/           ← Utility functions
│   ├── types/           ← TypeScript type definitions
│   └── kakao/           ← KakaoTalk AlimTalk integration
└── middleware.ts        ← Route protection
```

### 12.2 Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Page files | `page.tsx` (Next.js convention) | `dashboard/page.tsx` |
| Client page content | `[Feature]Content.tsx` | `SettingsContent.tsx`, `SubscriptionContent.tsx` |
| API routes | `route.ts` in appropriate directory | `api/settings/my-shop/route.ts` |
| Components | PascalCase | `DashboardPlatformCard.tsx` |
| Hooks | `use[Name].ts` | `useSubscription.ts` |
| Utility functions | camelCase | `isSubscribed()`, `canAccessPlatform()` |
| Service classes | PascalCase class | `SearchService`, `PlaceManager`, `ScheduleManager` |
| Supabase RPC | snake_case | `deduct_ticket`, `activate_subscription` |
| DB columns | snake_case | `remaining_tickets_naver`, `place_name` |
| Env variables | SCREAMING_SNAKE_CASE | `PORTONE_API_SECRET` |

---

## 13. Testing Rules

### 13.1 Test Framework

- **Unit tests**: Jest + React Testing Library
- **E2E tests**: Playwright
- Test files follow the pattern: `[Component].test.tsx` or `[file].test.ts`
- **Existing test coverage** includes: `DashboardPlatformCard.test.tsx`, `PlanCard.test.tsx`, `InlineRankGraph.test.tsx`, `SubscriptionContent.test.tsx`, `KeywordInput.test.tsx`

### 13.2 When Tests Are Required

- **MUST write tests** for:
  - New utility functions in `src/lib/utils/`
  - New or modified business logic in `src/lib/services/`
  - Complex client components with conditional rendering
- **SHOULD write tests** for:
  - New API routes (at minimum, test auth guard and input validation)
  - Refactored components with changed behavior

---

## 14. Documentation Maintenance

### 14.1 Mandatory Documentation Updates

> When making changes to the following areas, the AI **MUST proactively suggest** updating the corresponding documentation files in `Docs/important_files/`.

| Change Type | Docs to Update |
|-------------|---------------|
| New DB table / column / RPC function | `erd_design.md`, `architecture_data_flow.md` |
| New API route | `architecture_data_flow.md` |
| New page route or major component | `component_tree.md` |
| Modified data flow (new Supabase query pattern) | `architecture_data_flow.md` |
| New plan feature or pricing change | `architecture_data_flow.md` (§3, §4) |
| New authentication provider | `architecture_data_flow.md` (§2) |
| New payment flow | `architecture_data_flow.md` (§3, §4) |
| Changes to coding patterns or conventions | `coding-rules.md` (this file) |

### 14.2 Documentation Format

- Use the existing format and section structure of each document.
- Include Mermaid diagrams for visual representation where appropriate.
- Clearly mark DB operations with `SELECT`, `INSERT`, `UPDATE`, `DELETE` annotations.

### 14.3 Pre-Modification Checklist

Before making any code changes, the AI MUST:

1. ✅ Check if the target file is in the **Protected Zones** list (§11)
2. ✅ Verify the change aligns with the **Architecture Rules** (§1)
3. ✅ Confirm the component type (Server/Client) is correct (§2)
4. ✅ Use existing UI primitives from `@/components/ui/` (§5)
5. ✅ Follow the established error handling pattern (§7)
6. ✅ Identify which documentation files need updating (§14.1)

---

## 15. Code Style & Naming

### 15.1 TypeScript

- **Strict TypeScript** — DO NOT use `any` type unless absolutely necessary (legacy code exceptions only).
- Define interfaces for all component props.
- Use the shared types from `@/lib/types/index.ts` for database record shapes.
- **Import order**: React/Next.js → External libraries → `@/lib/*` → `@/components/*` → Relative imports

### 15.2 Comments

- **Korean comments** are acceptable and commonly used for business logic explanations.
- **English comments** for technical/code-level comments.
- API routes should have a JSDoc-style header comment explaining the endpoint:
  ```typescript
  /**
   * POST /api/settings/competitors
   *
   * 경쟁사 등록 API
   * 1. 인증 확인
   * 2. 플랜 제한 검증
   * 3. 중복 체크
   * 4. INSERT → managed_competitors
   */
  ```

### 15.3 Error Logging

- Use descriptive prefixes in `console.error` and `console.log`:
  ```typescript
  console.error('[RouteName] Description:', error)
  console.log(`[ScheduleManager] Found ${count} schedules`)
  console.warn(`[Cancel] Warning message:`, details)
  ```
- Include the component/route name in brackets for easy log tracing.
