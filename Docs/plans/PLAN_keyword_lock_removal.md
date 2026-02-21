# Implementation Plan: Keyword Lock Removal

**Status**: 🔄 In Progress
**Started**: 2026-02-21
**Last Updated**: 2026-02-21
**Estimated Completion**: 2026-02-21

---

**⚠️ CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date above
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ **DO NOT skip quality gates or proceed with failing checks**

---

## 📋 Overview

### Feature Description
Remove the 30-day lock restriction on keywords so that users can freely add or delete keywords regardless of the place's lock status. This requires updates to both the database layer (Supabase triggers) and the frontend UI (`KeywordManager.tsx`).

### Success Criteria
- [x] Users can add keywords even when their place is locked
- [x] Users can delete keywords even when their place is locked
- [x] UI no longer displays lock icons or warning messages regarding keyword changes
- [x] Inputs and buttons in `KeywordManager` are always active (unless loading/saving)
- [x] Existing functionality (e.g., place lock itself) remains intact

### User Impact
Improves user flexibility by allowing immediate adjustments to tracking keywords without having to wait 30 days after registering a place.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| Remove Supabase DB Trigger | The DB-level trigger (`enforce_keyword_lock`) physically prevents removing or adding keywords during the lock period. Removing it ensures API safety logic aligns with the new requirement. | None; this is strictly aligning DB constraints with business rules. |
| Modify Frontend Component State | `KeywordManager.tsx` currently disables the UI. We remove this derivation (`isPlatformLocked`) instead of bypassing it so the component gets cleaner. | Requires touching the UI component directly, but it's isolated. |

---

## 📦 Dependencies

### Required Before Starting
- [ ] User approval on this plan.

---

## 🧪 Test Strategy

### Testing Approach
Since this is a straightforward constraint removal, we will verify the changes via manual E2E testing and type-checking the codebase to ensure nothing breaks from removing `canUpdateKeywords` usage. We will run `next build` to verify there are no compilation errors.

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Manual / E2E Tests** | Critical paths | Verify UI allows adding/deleting keywords while a place is locked. |
| **Static Analysis** | 100% | Ensure no broken TypeScript types or ESLint errors exist. |

---

## 🚀 Implementation Phases

### Phase 1: Database Trigger Removal
**Goal**: Remove the `enforce_keyword_lock` trigger and `check_keyword_lock` function from Supabase so the backend no longer rejects keyword inserts/deletes.
**Estimated Time**: 0.5 hours
**Status**: ✅ Complete

#### Tasks
- [x] **Task 1.1**: Create Migration File
  - File(s): `supabase/migrations/021_remove_keyword_lock_trigger.sql` (Check latest migration number, currently 020)
  - Goal: Write SQL to drop trigger `enforce_keyword_lock` and function `check_keyword_lock` on `managed_keywords`.
- [x] **Task 1.2**: Apply Migration
  - Command: `npx supabase db push`

#### Quality Gate ✋
**Build & Tests**:
- [x] Migration applies cleanly without errors.
- [x] Cannot test E2E yet until Phase 2 is done, but the database accepts manual inserts via Supabase studio.

---

### Phase 2: Frontend UI Unlocking
**Goal**: Remove all UI locks, disabled states, and lock warning messages from the `KeywordManager.tsx` component.
**Estimated Time**: 0.5 hours
**Status**: ✅ Complete

#### Tasks
- [x] **Task 2.1**: Update `KeywordManager.tsx`
  - File(s): `src/components/settings/KeywordManager.tsx`
  - Goal: Remove `isPlatformLocked`, `naverLocked`, `googleLocked`. Remove `disabled` states and conditional rendering of Lock icons.
- [x] **Task 2.2**: Update `subscription.ts` (Optional)
  - File(s): `src/lib/utils/subscription.ts`
  - Goal: Ensure `canUpdateKeywords` is only used where appropriate (it may still be needed for places, so verify its usage).

#### Quality Gate ✋
**Build & Tests**:
- [x] Runs `npm run build` and `npm run lint` successfully without errors.
**Manual Testing**:
- [x] Go to Settings > Keyword Management.
- [x] Verify that the input fields and add buttons are fully active despite the place having a lock date.
- [x] Verify that clicking the "Delete" trash can icon works for keywords.

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
**Steps to revert**:
- Rerun previous migrations or create a reverting migration to restore the trigger using the code from `017_integrate_lock_timer.sql`.

### If Phase 2 Fails
**Steps to revert**:
- Revert changes to `src/components/settings/KeywordManager.tsx` using Git (`git checkout`).

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ✅ 100%
- **Phase 2**: ✅ 100%

**Overall Progress**: 100% complete
