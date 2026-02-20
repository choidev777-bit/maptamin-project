# Implementation Plan: Subscription & Upgrade UI Consolidation

**Status**: 🔄 In Progress
**Started**: 2026-02-19
**Last Updated**: 2026-02-19
**Estimated Completion**: 2026-02-20

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
Consolidate the `/dashboard/subscription` and `/dashboard/upgrade` pages into a single "Subscription Management" page. The new page will use the improved UI from the current Upgrade page (better pricing cards, yearly/monthly toggle) while retaining the existing subscription management functionality (payment, cancellation). The redundant Upgrade page will be removed.

### Success Criteria
- [ ] `/dashboard/subscription` displays the new "Upgrade-style" pricing cards.
- [ ] Yearly/Monthly toggle correctly updates displayed prices.
- [ ] "Subscribe" / "Change Plan" buttons trigger the correct PortOne payment flow.
- [ ] `/dashboard/upgrade` redirects to `/dashboard/subscription`.
- [ ] All existing tests pass.

### User Impact
- **Better UX**: Unified interface for managing subscriptions and upgrading.
- **Improved UI**: More attractive and informative pricing display.
- **Less Confusion**: Removes redundant "Upgrade" route.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **Component Extraction** | Extract `PlanCard` from `UpgradePageContent` into a separate component. | Slightly more files, but promotes reusability and cleaner code. |
| **Logic Integration** | Move `UpgradePage`'s state (toggle) into `SubscriptionContent` to control the cards. | `SubscriptionContent` becomes slightly more complex, but encapsulates all subscription logic. |
| **Redirect Strategy** | Use Next.js `redirect` in `next.config.js` or middleware (or just client-side redirect for simplicity if strictly internal). *Decision: Delete file and rely on Sidebar link updates.* | Simple and clean. |

---

## 📦 Dependencies

### Required Before Starting
- [x] Existing `SubscriptionContent` logic (payment, cancellation).
- [x] Existing `UpgradePageContent` UI.

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: Write tests FIRST, then implement to make them pass.

### Test Pyramid for This Features
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥90% | Verify `PlanCard` rendering and price calculation logic. |
| **Integration Tests** | Critical paths | Verify `SubscriptionContent` integrates the new UI and payment flow correctly. |
| **E2E Tests** | Key user flows | Verify the full subscription flow with the new UI (covered by existing Phase 4-5 plan). |

### Test File Organization
```
src/
└── components/
    └── dashboard/
        ├── PlanCard.tsx
        ├── PlanCard.test.tsx (Unit)
        ├── SubscriptionContent.tsx
        └── SubscriptionContent.test.tsx (Integration - Update existing)
```

---

## 🚀 Implementation Phases

### Phase 1: Component Extraction & Unit Testing
**Goal**: Create a reusable `PlanCard` component from the Upgrade page UI.
**Estimated Time**: 1 hour
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: Write unit tests for `PlanCard`
  - File(s): `src/components/dashboard/PlanCard.test.tsx`
  - Expected: Tests FAIL (red) because `PlanCard` doesn't exist.
  - Details: Test rendering of plan name, price (monthly/yearly), features list, and correct button text based on 'isCurrentPlan' prop.

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.2**: Implement `PlanCard` component
  - File(s): `src/components/dashboard/PlanCard.tsx`
  - Goal: Implement the UI logic extracted from `UpgradePageContent`.
  - Details: Accept props for plan details, billing cycle, and handlers.

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.3**: Refactor `PlanCard`
  - Check for any hardcoded strings or styling inconsistencies.

#### Quality Gate ✋
- [ ] **TDD Compliance**: Tests written before code.
- [ ] **Build**: Compiles without error.
- [ ] **Tests**: `PlanCard.test.tsx` passes.
- [ ] **Lint**: No lint errors.

---

### Phase 2: Integration & Logic Update
**Goal**: Replace the old UI in `SubscriptionContent` with the new `PlanCard` and Toggle.
**Estimated Time**: 2 hours
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 2.1**: Update `SubscriptionContent.test.tsx`
  - File(s): `src/components/dashboard/SubscriptionContent.test.tsx`
  - Expected: Tests fail because the UI structure has changed (toggle logic, different buttons/cards).
  - Details: Verify that toggling the "Yearly" switch changes the passed props to `PlanCard`. Verify clicking the button on `PlanCard` calls `handleSubscribe`.

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 2.2**: Integrate Toggle & Cards into `SubscriptionContent`
  - File(s): `src/components/dashboard/SubscriptionContent.tsx`
  - Goal: Add `isYearly` state, implement the toggle UI, and replace the old card map with `PlanCard` components.
  - Details: Ensure `billing=yearly` param is correctly handled in `handleSubscribe`.

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 2.3**: Remove old card code
  - Remove `renderPlanCard` function and `PLAN_DISPLAY` constant from `SubscriptionContent.tsx`.

#### Quality Gate ✋
- [ ] **TDD Compliance**: Tests updated before code changes.
- [ ] **All Tests Pass**: Unit and Integration tests pass.
- [ ] **Manual Check**: Toggle works, prices update, "Subscribe" button opens PortOne window.

---

### Phase 3: Cleanup & Routing
**Goal**: Remove the redundant Upgrade page and fix navigation.
**Estimated Time**: 0.5 hours
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Safe Cleanup**
- [ ] **Task 3.1**: Delete Upgrade Page
  - Delete `src/app/(dashboard)/dashboard/upgrade/` directory.
- [ ] **Task 3.2**: Update Sidebar/Navigation
  - Check `SidebarNav.tsx` or similar for links to `/dashboard/upgrade` and point them to `/dashboard/subscription`.

**🔵 REFACTOR: Verify**
- [ ] **Task 3.3**: Verify no broken links
  - Grep for `dashboard/upgrade` in the whole codebase.

#### Quality Gate ✋
- [ ] **Build**: Compiles without error.
- [ ] **Links**: No dead links to Upgrade page.

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Payment logic regression | Low | High | rely on `SubscriptionContent.test.tsx` and manual verification of PortOne window. |
| Style regressions | Medium | Low | Use existing Tailwind classes from Upgrade page directly. |

## 🔄 Rollback Strategy

### If Phase 1 Fails
- Delete `PlanCard.tsx` and test.

### If Phase 2 Fails
- Revert changes to `SubscriptionContent.tsx`.

### If Phase 3 Fails
- Restore `src/app/(dashboard)/dashboard/upgrade/` from git history.

---

## 📝 Notes & Learnings
- (To be filled during execution)
