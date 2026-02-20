# Implementation Plan: Competitor Name-Based Matching Fix

**Status**: 🔄 In Progress
**Started**: 2026-02-20
**Last Updated**: 2026-02-20
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
The `CompetitorComparisonPanel` component currently fails to display competitor statistics (showing `-` for Average Rank and `0%` for Top Exposure Share). This bug occurs because the panel attempts to look up competitor ranks using a database `place_id` (a base64 string) against the `competitor_ranks` property. However, the original search scraping logic stores competitor results solely by their text names, without database IDs. 

To fix this, we need to align the panel's logic with the `NaverCompetitorComparisonMap` component, which successfully extracts rank data by matching the normalized competitor name against the `competitors` array within each `SearchResult` point.

### Success Criteria
- [ ] The "내 매장 VS 경쟁사" table accurately displays the competitor's Average Rank.
- [ ] The "내 매장 VS 경쟁사" table accurately displays the competitor's Top Exposure Share (1~N 위).
- [ ] Selecting different competitors updates the metrics correctly without causing runtime errors.
- [ ] The fix respects the `topRankThreshold` prop.

### User Impact
Users will be able to accurately compare their store's performance metrics against their selected local competitors directly from the summary table, making the dashboard functional and useful again.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| Use Name-Based Matching | The backend/scraper currently only returns competitor names, not database IDs. We must match by name (ignoring spaces and casing) to extract the rank from `SearchResult.competitors`. | Name changes on the map platform could break tracking, but this is a systemic limitation of the current scraping infrastructure. |
| Retrieve Name from Props | The `CompetitorComparisonPanel` already receives the full `competitors` list and `selectedId`. We can effortlessly find the `competitorName` doing a `.find()` on the list. | Slightly increases client-side sorting/filtering logic complexity. |

---

## 📦 Dependencies

### Required Before Starting
- [x] Identification of the discrepancy between Map rendering matching and Panel rendering matching.

---

## 🚀 Implementation Phases

### Phase 1: Name-Based Rank Extraction
**Goal**: Update the `compStats` memoized calculation in `CompetitorComparisonPanel.tsx` to extract competitor ranks using a normalized name string match against `r.competitors`.
**Estimated Time**: 0.5 hours
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement to Make Feature Work**
- [ ] **Task 1.1**: Find `competitorName`
  - File(s): `src/components/results/CompetitorComparisonPanel.tsx`
  - Details: Inside `compStats` memo, use `selectedId` to find the corresponding `ManagedCompetitor` object from the `competitors` prop to get the `place_name`.
- [ ] **Task 1.2**: Implement Normalize Helper
  - Details: Create a helper function `const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase()` to standardize names.
- [ ] **Task 1.3**: Update Map/Filter Logic
  - Details: Instead of reading `r.competitor_ranks?.[selectedId]`, search through `(r.competitors || [])` to find `c => normalize(c.name) === normalizedCompetitorName`. Extract the `rank` from the found object. If not found, skip or treat as null.

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.4**: Remove outdated code
  - Details: Remove any lingering `competitor_ranks` usage inside `validResults`, `sum`, and `topCount` calculations if it is no longer used elsewhere.

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed until ALL checks pass**

**Build & Tests**:
- [ ] **Build**: Project builds/compiles without errors (run `npm run build` or rely on Next.js dev server stability)

**Code Quality**:
- [ ] **Linting**: No linting errors or warnings introduced.
- [ ] **Type Safety**: TypeScript compiler passes cleanly.

**Manual Testing**:
- [ ] **Functionality**: The Competitor Comparison Table populates Average Rank and Top Exposure Share.
- [ ] **Edge Cases**: Handles gracefully if `selectedId` is null, or if the `competitorName` doesn't match any data in `competitors` array.

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
**Steps to revert**:
- Revert `CompetitorComparisonPanel.tsx` back to the state that used `competitor_ranks?.[selectedId]`.

---

## 📝 Notes & Learnings

### Implementation Notes
- Add any findings here.

### Blockers Encountered
- None yet.
