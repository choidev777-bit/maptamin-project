# Implementation Plan: Onboarding & Payment Flow Fixes

**Status**: 🔄 In Progress
**Started**: 2026-02-21
**Last Updated**: 2026-02-21

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
Resolving critical issues in the onboarding and payment flows:
1.  **Auth Redirection**: Google login bypasses redirect parameters, failing to return users to the intended destination (e.g., checkout with plan selections).
2.  **Payment Success Redirect**: Hardcoded redirect to `/dashboard/subscription?success=true` in `CheckoutContent.tsx` needs to be changed to `/dashboard` with a success toast notification.
3.  **Onboarding Validation UI**: Add red border highlighting for incomplete onboarding steps, with automatic scroll-to-error and real-time state clearing.
4.  **Store Registration UI**: Move the "30-day lock" warning directly under the store search card in `StepStoreRegister.tsx`. Fix the "Next" button disabled state bug by adding a `key` prop. Apply the actual `NaverPlaceSearchInput` component for Naver searches, as used in the dashboard.
5.  **Keyword Registration UI**: Re-add missing text indicating keywords can be changed later in `StepKeywordRegister.tsx`.

### Success Criteria
- [ ] Google login correctly preserves and forwards all URL parameters (e.g., `?next=/checkout&plan=pro`).
- [ ] Successful payments redirect to `/dashboard?payment=success` (or similar) and display a success toast.
- [ ] Incomplete onboarding steps are visually highlighted, scrolling to the first error, and clearing when interacted with.
- [ ] "30-day lock" warning is correctly positioned under the search input in `StepStoreRegister`.
- [ ] The "Next" button in `StepStoreRegister` enables correctly after selecting a store.
- [ ] `NaverPlaceSearchInput` is correctly used for Naver searches in `StepStoreRegister`.
- [ ] `StepKeywordRegister` includes informational text about keyword flexibility.

### User Impact
Provides a smoother, bug-free onboarding experience, ensures users aren't left confused by incorrect payment redirects, and improves clarity during store and keyword registration.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| Pass `next` parameter in `GoogleLoginButton.tsx` | Aligns Google login behavior with Kakao login. Essential for preserving intended destination across OAuth flows. | Minor modification to existing auth flow components. |
| Use `key={subStep}` or similar state-dependent key on `PlaceSearchInput` | A standard React pattern to force a component to unmount and remount, clearing internal state that causes the "Next" button bug. | Slight performance overhead of remounting the component vs. updating props, but ensures clean state. |
| Vercel Best Practices Applied | Ensure any new dynamic imports or Suspense boundaries follow `vercel-react-best-practices` (e.g., `bundle-dynamic-imports` for heavy maps components if touched). | None. |

---

## 🚀 Implementation Phases

### Phase 1: Authentication & Payment Redirect Fixes
**Goal**: Ensure users are directed to the correct pages after login and successful payment.
**Estimated Time**: 1 hour
**Status**: ⏳ Pending

#### Tasks

- [x] **Task 1.1**: Update `GoogleLoginButton.tsx`
  - Modify the `onClick` handler to preserve and forward all current URL search parameters, not just `next`, ensuring returning users land at the exact checkout state.
- [x] **Task 1.2**: Update `CheckoutContent.tsx` & Dashboard
  - Change `router.push` to `/dashboard?payment=success` upon successful payment verification.
  - Implement a `useEffect` in the appropriate dashboard component to detect this parameter and show a success toast notification.

#### Quality Gate ✋
- [x] **Build Check**: `npm run build` passes.
- [x] **Lint Check**: `npm run lint` passes.
- [x] **Manual Verification**: Test Google login flow with a `?next=/checkout` parameter and verify it redirects correctly. Test a mock payment and verify redirect to `/dashboard`.

---

### Phase 2: Onboarding Validation & Informational UI
**Goal**: Improve user feedback during the onboarding flow.
**Estimated Time**: 1.5 hours
**Status**: ⏳ Pending

#### Tasks

- [x] **Task 2.1**: Implement Validation UI in `onboarding/page.tsx`
  - Add state/logic to track which steps are incomplete.
  - Pass a `hasError` prop to individual step components to trigger a red border style.
  - Implement an auto-scroll mechanism to bring the first error step into view.
- [x] **Task 2.2**: Implement Real-time Error Clearing
  - Clear the error state for a specific step as soon as the user interacts with it (e.g., typing, selecting).
- [x] **Task 2.3**: Update `StepKeywordRegister.tsx`
  - Add the informational text: "등록하신 키워드는 언제든지 자유롭게 수정/변경이 가능합니다."

#### Quality Gate ✋
- [x] **Build Check**: `npm run build` passes.
- [x] **Lint Check**: `npm run lint` passes.
- [x] **Manual Verification**: Attempt to complete onboarding without filling out steps; verify red borders appear. Check that the new text is visible and styled correctly in the keyword step.

---

### Phase 3: Store Registration Bug Fixes & Refinements
**Goal**: Fix the state persistence bug disabling the "Next" button and refine the UI layout in store registration.
**Estimated Time**: 2 hours
**Status**: ⏳ Pending

#### Tasks

- [x] **Task 3.1**: Reposition "30-day lock" warning in `StepStoreRegister.tsx`
  - Move the warning alert component directly below the store search card/input area.
- [x] **Task 3.2**: Apply NaverPlaceSearchInput and fix Next button bug
  - In `StepStoreRegister.tsx`, conditionally render `NaverPlaceSearchInput` for `subStep === 'naver'` and `PlaceSearchInput` for `subStep === 'google'`.
  - Use `key={subStep}` or independent state management to ensure state is clean when switching between them, fixing the disabled "Next" button bug.
- [x] **Task 3.3**: Verify Tracking State
  - Verify if similar Naver/Google switching state bugs exist in `NewSearchPage.tsx` and fix if necessary.

#### Quality Gate ✋
- [x] **Build Check**: `npm run build` passes.
- [x] **Lint Check**: `npm run lint` passes.
- [x] **Manual Verification**: Go to store registration. Select a platform, interact with search. Switch to the other platform. Verify the "Next" button behaves correctly and doesn't remain stuck disabled. Verify the 30-day warning is in the correct new location. Confirm the correct search style (Naver vs Google) presents visually.

---

## 📝 Notes & Learnings
- **[Date]**: Initial plan created.
