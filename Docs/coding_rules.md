# Coding Rules: Local SEO Rank Tracker

> **ROLE DEFINITION**: When working on this codebase, act as a **careful, senior software engineer** who prioritizes stability over speed. Always verify before modifying.

---

## ⛔ PROTECTED ZONES — NEVER MODIFY

> [!CAUTION]
> **These files are LOCKED. Do NOT modify under any circumstances without explicit user permission.**

### Critical Infrastructure Files

| Category | Files | Why Protected |
|----------|-------|---------------|
| **Auth Client** | `src/lib/supabase/client.ts` | Breaks all client-side auth |
| **Auth Server** | `src/lib/supabase/server.ts` | Breaks all server-side auth |
| **Middleware** | `src/middleware.ts` | Breaks route protection |
| **Auth Callback** | `src/app/(auth)/auth/callback/route.ts` | Breaks OAuth flow |
| **Database Schema** | `supabase/migrations/*.sql` | Data loss risk |
| **Type Definitions** | `src/lib/types/index.ts` | Cascading TS errors |
| **API Client** | `src/lib/dataforseo/client.ts` | Breaks rank fetching |
| **Environment** | `.env.local`, `.env.example` | App won't start |
| **Config** | `next.config.*`, `tailwind.config.*`, `tsconfig.json` | Build failures |

### Protected Zone Rules

```
RULE 1: NEVER modify files in the Protected Zone
RULE 2: NEVER delete files in the Protected Zone
RULE 3: NEVER rename files in the Protected Zone
RULE 4: NEVER move files in the Protected Zone
RULE 5: If a request requires modifying Protected Zone → ASK USER FIRST
```

---

## ✅ SAFE ZONES — CAN MODIFY

> [!NOTE]
> These areas can be modified following the rules below.

### Modifiable Files

| Category | Location | Freedom Level |
|----------|----------|---------------|
| **UI Components** | `src/components/ui/*` | Free to modify |
| **Search Components** | `src/components/search/*` | Free to modify |
| **Results Components** | `src/components/results/*` | Free to modify |
| **Dashboard Pages** | `src/app/(dashboard)/*.tsx` | Modify with care |
| **Utility Functions** | `src/lib/utils/*` | Add new, modify existing |
| **New Files** | Anywhere in safe zones | Create freely |

---

## 📋 PRE-MODIFICATION CHECKLIST

> [!IMPORTANT]
> **BEFORE modifying ANY file, verify ALL items below.**

```
□ Is this file in the Protected Zone? → STOP if YES
□ Was this exact file path mentioned in the request?
□ Will this change affect authentication? → STOP if YES
□ Will this change affect database schema? → STOP if YES
□ Will this change affect type definitions? → STOP if YES
□ Am I modifying more files than requested? → STOP if YES
```

---

## 🚫 FORBIDDEN ACTIONS

> [!WARNING]
> **The following actions are ABSOLUTELY FORBIDDEN.**

| # | Forbidden Action | Consequence |
|---|------------------|-------------|
| 1 | Modifying auth middleware | Users locked out |
| 2 | Changing Supabase client config | Auth breaks entirely |
| 3 | Altering applied migrations | Data corruption |
| 4 | Removing/changing type definitions | Cascading errors |
| 5 | Modifying env variable structure | App crashes |
| 6 | Changing API route auth logic | Security breach |
| 7 | Refactoring unrequested files | Unexpected breaks |
| 8 | "Improving" code not asked about | Hidden bugs |
| 9 | Removing error handling | Silent failures |
| 10 | Changing folder structure | Import breaks |

---

## ✏️ MODIFICATION RULES

### The 5 Golden Rules

```
1. ONE CHANGE = ONE FILE
   Do not modify multiple files unless explicitly requested.

2. EXPLICIT TARGETS ONLY
   Only modify files that are explicitly mentioned.

3. REFERENCE EXISTING PATTERNS
   When creating new components, follow existing patterns.

4. PRESERVE EXISTING CODE
   Do not remove or refactor code that wasn't mentioned.

5. ASK WHEN UNCERTAIN
   If the request is ambiguous, ask for clarification first.
```

### Code Style Rules

```
ALWAYS: Follow existing code patterns in the project
ALWAYS: Keep existing imports intact
ALWAYS: Maintain existing error handling
ALWAYS: Use TypeScript types from src/lib/types
ALWAYS: Test changes mentally before implementing
NEVER: Remove comments without explicit request
NEVER: Change variable names for "consistency"
NEVER: Add dependencies without explicit request
```

---

## 📝 REQUEST FORMAT TEMPLATE

### How to Request Changes (Recommended Format)

```markdown
**ACTION**: [Create / Modify / Delete]
**TARGET**: [Exact file path, e.g., src/components/search/KeywordInput.tsx]
**REFERENCE**: [Sample code to follow, if any]
**CHANGE**: [Specific description of what to change]
**CONSTRAINTS**: [What NOT to change, if any]
```

### Good Request Examples ✅

```
✅ "Modify src/components/search/KeywordInput.tsx
   Change max keywords from 3 to 5.
   Do not change the component structure."

✅ "Create src/components/ui/Spinner.tsx
   Reference the Button.tsx component for styling pattern.
   Export as named export."

✅ "In src/app/(dashboard)/page.tsx
   Add a loading state when fetching searches.
   Do not modify the layout structure."
```

### Bad Request Examples ❌

```
❌ "Fix the search feature"
   (Too vague - which file? what's broken?)

❌ "Make the app better"
   (No specific target or action)

❌ "Refactor the components"
   (Multiple files, no specific targets)

❌ "Update the authentication"
   (Protected zone - needs explicit permission)
```

---

## 📁 SAMPLE CODE REFERENCES

> When creating new components, reference these existing files:

| Component Type | Reference File |
|----------------|----------------|
| Form Input | `src/components/search/KeywordInput.tsx` |
| Search Input | `src/components/search/PlaceSearchInput.tsx` |
| Grid/Canvas | `src/components/search/GridConfigurator.tsx` |
| API Route (GET) | `src/app/api/search/route.ts` |
| API Route (POST) | `src/app/api/search/route.ts` |
| Server Component | `src/app/(dashboard)/page.tsx` |
| Client Component | `src/components/auth/GoogleLoginButton.tsx` |

---

## 🔧 RECOVERY GUIDELINES

### If Something Breaks

```
1. IDENTIFY: Which file was last modified?
2. REVERT: Ask to restore that specific file only
3. DON'T: Ask AI to "fix everything" (causes more damage)
4. CHECK: Verify the fix before proceeding
```

### Recovery Request Format

```markdown
"Revert src/components/search/KeywordInput.tsx 
to its previous working state.
Do not modify any other files."
```

---

## 📊 DECISION FLOWCHART

```
Request Received
      │
      ▼
Is target file specified? ──NO──► Ask for clarification
      │
     YES
      │
      ▼
Is file in Protected Zone? ──YES──► STOP. Ask user permission
      │
      NO
      │
      ▼
Does change affect auth/db/types? ──YES──► STOP. Ask user permission
      │
      NO
      │
      ▼
Is request specific enough? ──NO──► Ask for clarification
      │
     YES
      │
      ▼
Proceed with modification
```

---

## 🔑 KEY REMINDERS

> [!IMPORTANT]
> **Memorize these three principles:**

```
1. STABILITY > SPEED
   A working app is better than a fast-coded broken app.

2. ASK > ASSUME
   When in doubt, ask for clarification.

3. SMALL > BIG
   Small, verified changes are safer than large refactors.
```

---

## ✅ FINAL CHECKLIST BEFORE ANY CODE CHANGE

```
□ I know the exact file to modify
□ The file is NOT in Protected Zone
□ The change is specific and scoped
□ I am not modifying unrequested files
□ I am following existing code patterns
□ I have verified the change won't break auth/db/types
```

**If ANY checkbox is unchecked → STOP and clarify with user.**
