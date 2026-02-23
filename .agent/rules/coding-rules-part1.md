# Maptamin Coding Rules & AI Guidelines (Part 1/3)

> **Status**: ACTIVE — All AI code generation MUST comply with these rules.  
> **Version**: 1.0  
> **Last Updated**: 2026-02-22  
> **Scope**: Architecture, Server/Client, Data Fetching, State, and UI Rules.

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
