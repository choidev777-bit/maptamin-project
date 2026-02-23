# Maptamin Coding Rules & AI Guidelines (Part 3/3)

> **Status**: ACTIVE — All AI code generation MUST comply with these rules.  
> **Version**: 1.0  
> **Last Updated**: 2026-02-22  
> **Scope**: Protected Zones, File/Directory Conventions, Testing, Documentation Maintenance, and Code Style.

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
