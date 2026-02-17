# Implementation Verification Plan: Subscription + Ticket System

**Status**: 🔄 Planning
**Started**: 2026-02-17
**Last Updated**: 2026-02-17

---

## 📋 Overview

### Objective
Verify that the "Subscription + Credit System" has been successfully migrated to a "Subscription + Ticket System".
The key change is that 1 search consuming multiple credits (based on grid size) is now **1 search = 1 ticket** regardless of grid size, and tickets are separated by platform (Naver/Google).

### Success Criteria
- [ ] Database schema reflects `tickets` instead of `lines/credits`.
- [ ] Backend logic correctly deducts 1 ticket per search.
- [ ] Frontend displays "Tickets" and handles the search flow correctly.
- [ ] Refund logic works for failed searches.

---

## 🧪 Verification Phases

### Phase 1: Database & Schema Verification
**Goal**: Confirm the database structure supports the new Ticket System.

#### Tasks to Verify
- [ ] **Table `user_subscriptions`**:
    - Check for columns: `remaining_tickets_naver`, `remaining_tickets_google`.
    - Verify removal/deprecation of: `credits`, `grade_points`.
- [ ] **Table `plans`**:
    - Check columns: `monthly_tickets_naver`, `monthly_tickets_google`.
    - Verify `monthly_points` is 0 or deprecated.
- [ ] **Table `ticket_ledger`**:
    - Verify table exists.
    - Check columns: `amount`, `type` ('usage', 'refund', 'monthly_reset', 'welcome_bonus'), `platform`.
- [ ] **RPC Functions**:
    - Verify `deduct_ticket(platform)` exists and decrements by exactly 1.
    - Verify `refund_ticket(platform)` exists and increments by 1.
    - Verify `reset_monthly_tickets()` exists and resets to plan limits.
    - Verify legacy functions (`deduct_points`, `refund_points`) are dropped or unused.

### Phase 2: Backend Logic Verification
**Goal**: Ensure server-side logic enforces the Ticket System rules.

#### Tasks to Verify
- [ ] **Search API (`src/app/api/search/route.ts` or similar)**:
    - Does it call `deduct_ticket` RPC?
    - Does it handle the "No tickets remaining" error gracefully?
    - Does it trigger `refund_ticket` on search failure?
- [ ] **User Signup Trigger (`handle_new_user`)**:
    - Does it initialize `user_subscriptions` with 0 tickets (until payment)?
    - Or does it give welcome tickets if defined? (Check policy)
- [ ] **Cron/Scheduler**:
    - Does the monthly reset logic use `reset_monthly_tickets`?

### Phase 3: Frontend UI/UX Verification
**Goal**: Ensure the user interface accurately reflects the Ticket System.

#### Tasks to Verify
- [ ] **Dashboard Header/Nav**:
    - Displays "티켓" (Tickets) instead of "크레딧" (Credits).
    - Shows separate counts for Naver/Google if applicable.
- [ ] **Search Page**:
    - Usage warning/modal says "1 티켓이 소진됩니다" (1 Ticket will be consumed).
    - Prevents search if ticket count is 0.
- [ ] **Settings/Billing Page**:
    - Plan descriptions mention "Month N Tickets" instead of "N Points".
    - Usage history shows "Ticket Usage".

---

## ⚠️ Critical Checkpoints (Quality Gate)

- [ ] **One-Ticket-Per-Search Rule**: Confirm that a 7x7 grid search (49 points) consumes **ONLY 1 Ticket**, not 49 credits.
- [ ] **Platform Separation**: Confirm Naver search consumes Naver ticket, Google search consumes Google ticket.
- [ ] **Refunds**: Confirm failed search refunds the ticket automatically.
