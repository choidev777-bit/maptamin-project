**CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ DO NOT skip quality gates or proceed with failing checks

# Feature Plan: Search Results UI Revamp

**Scope**: Medium (4-5 phases, approx. 8-12 hours total)
**Target**: `src/app/(dashboard)/naver-search/[id]` and related components.

## 📋 Overview
Redesigning the Naver Search Results detail page to match the new Stitch-generated B2B SaaS dashboard UI. The goal is to improve data visualization with clear KPI cards, an intuitive competitor comparison layout, and modernized map containers, while preserving the user-requested "Win/Loss" (승/패) marker style for competitor map comparisons.

### 🏗️ Architecture & Best Practices Decisions
- **`vercel-react-best-practices` Alignment**:
  - `rendering-hoist-jsx`: We will extract the header and KPI grid into separate client/server components rather than bloating `NaverResultsContent.tsx` to improve render performance.
  - `rerender-memo`: Complex calculations for "Top 3 Share" and "Average Rank" will be memoized using `useMemo` to prevent unnecessary recalculations when the map pans or zooms.
- **Componentization**: The raw Stitch HTML will be broken down into discrete React components (`SearchResultsOverview`, `CompetitorComparisonPanel`, `ResultsHeader`) to keep `NaverResultsContent` focused purely on layout orchestration.

## ⚠️ Risk Assessment
| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Map Re-rendering Jank | Medium | High | Use `useMemo` for marker data sets. Ensure Naver Map instance relies on stable refs. |
| Over-fetching Competitor Data | Low | Medium | Ensure we only calculate comparison metrics for the *currently selected* competitor in state. |
| Accidental removal of Win/Loss logic | High | High | Explicitly document in Phase 5 that the Stitch split-marker design must be rejected in favor of the existing Win/Loss calculation logic. |

---

## 🚀 Phase Breakdown

### Phase 1: Layout Wrapper & Header Extraction
**Goal**: Create the overall page layout and the new sticky header with badges.
- **Tasks**:
  - [x] Extract existing title/date logic from `page.tsx` into a new `src/components/results/NaverResultsHeader.tsx` component.
  - [x] Apply Stitch styling (Platform Badge, Status Badge, specific typography) to the header.
  - [x] Update `src/components/results/KeywordTabs.tsx` to use the new simple bottom-border design from Stitch.
- **Quality Gate**:
  - [x] Compiles successfully (`npm run dev`).
  - [x] Header displays correct dynamic data from Supabase (Place Name, Time, Platform).
  - [x] Keyword tabs successfully update the `selectedKeyword` state.

### Phase 2: KPI Grid Component (`SearchResultsOverview`)
**Goal**: Implement the 3-column data overview cards (Average Rank, Top 3 Exposure, Total Points).
- **Tasks**:
  - [x] Create `src/components/results/SearchResultsOverview.tsx`.
  - [x] Implement `useMemo` to calculate `averageRank`, `top3Share` (ranks 1-3 / total points), and `totalPoints`.
  - [x] Apply Stitch styling (shadows, Lucide icons, colored gradient backgrounds).
  - [x] Replace `AverageRankCard` in `NaverResultsContent.tsx`.
- **Quality Gate**:
  - [ ] Metrics calculate accurately when switching keywords.
  - [ ] UI collapses gracefully to a single column on mobile views.

### Phase 3: Rank Heatmap Container Styling
**Goal**: Wrap the existing Naver map in the new stylized container with a legend.
- **Tasks**:
  - [ ] Update the container `div` around `NaverRankHeatmap` in `NaverResultsContent.tsx`.
  - [ ] Add the Rank Legend UI (Good, Fair, Poor, Unranked) above the map as per Stitch HTML.
  - [ ] Ensure the map container height (e.g., `h-[500px]`) is appropriate for desktop and mobile.
- **Quality Gate**:
  - [ ] Existing map markers render correctly without styling regressions.
  - [ ] Legend is visible and styled correctly.

### Phase 4: Competitor Analysis Panel (Left Column)
**Goal**: Create the interactive panel for selecting competitors and viewing comparative metrics.
- **Tasks**:
  - [ ] Create `src/components/results/CompetitorComparisonPanel.tsx`.
  - [ ] Update the `CompetitorSelector` UI to match the new Stitch dropdown design.
  - [ ] Implement the "My Store vs. Competitor" metrics table calculating:
    - My Average Rank vs Competitor Average Rank
    - My Top 3 Share vs Competitor Top 3 Share
- **Quality Gate**:
  - [ ] Changing the dropdown correctly updates the `selectedCompetitorId` state.
  - [ ] The comparative metrics accurately reflect the difference between my store and the selected competitor.

### Phase 5: Competitor Comparison Map - Win/Loss Variant (Right Column)
**Goal**: Position the map next to the panel and **preserve the existing Win/Loss (승/패)** marker logic.
- **Tasks**:
  - [ ] Wrap `NaverCompetitorComparisonMap` in the new Stitch container styling.
  - [ ] Implement the 2-column grid layout (1 column for Panel, 2 columns for Map on desktop) in `NaverResultsContent.tsx`.
  - [ ] **CRITICAL**: Do NOT implement the split markers from the Stitch HTML. Ensure the map continues to use the green "승" / red "패" markers based on the rank comparison, as explicitly requested by the user.
- **Quality Gate**:
  - [ ] Layout matches the provided grid structure.
  - [ ] Map markers correctly display "승" (win) or "패" (loss) based on the rank comparison metric.
  - [ ] Testing: Verify behavior across different keyword selections and competitor selections.

---
## 📝 Progress & Learnings
*Last Updated: 2026-02-20*
* Pending User Approval to begin Phase 1.
