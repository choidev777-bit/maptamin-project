# PLAN: 모바일 최적화 (Mobile Optimization)

**작성일:** 2026-03-18  
**최종 수정:** 2026-03-18  
**범위:** Medium-Large (5단계, 예상 12-18시간)

---

> **⛔ 중요 지침**: 각 Phase 완료 후:
> 1. ✅ 체크박스 체크
> 2. 🧪 `npx tsc --noEmit` 실행해 타입 에러 없음 확인
> 3. 📱 Chrome DevTools → 390px(iPhone 14) 기준 직접 확인
> 4. 📅 "최종 수정" 날짜 업데이트
> 5. ➡️ 통과 후 다음 Phase 진행
>
> **Karpathy 원칙 적용**: 인접 코드 수정 금지. 요청된 부분만 수정.

---

## 현황 분석 (코드 전수 조사 결과)

### ✅ 이미 완성된 부분

| 항목 | 증거 코드 |
|------|---------|
| 사이드바 모바일 분기 | `DashboardShell.tsx L93`: `className="hidden lg:block"` |
| 모바일 햄버거 헤더 | `DashboardShell.tsx L107`: `className="lg:hidden bg-white border-b"` |
| 모바일 슬라이드 드로어 | `MobileNav.tsx L68`: `fixed top-0 right-0 h-full w-72` |
| 메인 컨텐츠 모바일 마진 | `DashboardShell.tsx L130`: `@media (max-width: 1023px) { --sidebar-ml: 0px; }` |
| 컨텐츠 패딩 반응형 | `DashboardShell.tsx L134`: `px-4 sm:px-6 lg:px-8 py-4 sm:py-8` |
| 대시보드 플랫폼 카드 | `dashboard/page.tsx L152`: `grid-cols-1 md:grid-cols-2` |
| 빠른 통계 카드 | `QuickStatsRow.tsx L15`: `grid-cols-1 sm:grid-cols-2` |
| 네이버 히트맵 헤더 | `NaverRankHeatmap.tsx L192`: `flex-col sm:flex-row` |

### ✅ 모달 전수 조사 결과

| 모달 | 증거 코드 | 판정 |
|------|---------|------|
| `CompetitorManageModal` | `L106: w-full max-w-md mx-4 max-h-[80vh]` | ✅ 안전 |
| `KeywordManageModal` | `L127: w-full max-w-md mx-4 max-h-[80vh]` | ✅ 안전 |
| `PlaceSelectionModal` | `L53: <DialogContent className="sm:max-w-md">` — shadcn Dialog | ✅ 안전 |
| `RankDetailModal` | `L27: flex items-center justify-center p-4` + `L35: w-full max-w-md` | ✅ 안전 |
| `CompetitorDetailModal` | `L52: w-full max-w-sm` + `L44: p-4` | ✅ 안전 (`max-w-sm` + `p-4` 여백) |

---

## 수정 대상 전체 목록 (코드 증거 포함)

### 🔴 심각 — Phase 1 (테이블)

| 파일 | 줄 | 증거 코드 | 문제 |
|------|-----|---------|------|
| `SearchHistorySection.tsx` | L137 | `<table className="... min-w-[700px]">` | overflow-x-auto는 있으나 스크롤 힌트 없음 |
| `HistoryTable.tsx` | L102 | `<table className="... min-w-[700px]">` | 동일 |
| `TicketShopContent.tsx` | 구매내역 테이블 | 새로 추가된 테이블 | 모바일 스크롤 처리 필요 |

### 🔴 심각 — Phase 2 (그리드 설정)

| 파일 | 줄 | 증거 코드 | 문제 |
|------|-----|---------|------|
| `GridConfigurator.tsx` | L112 | `<div className="flex gap-3">` + `flex-1` 버튼 4개 | 390px에서 3×3·5×5·7×7·초기화 버튼 텍스트 잘림 |
| `GridConfigurator.tsx` | L138 | `style={{ gridTemplateColumns: 'repeat(15, 1fr)' }}` | 15×15 캔버스 → 모바일 가로 overflow |
| `NaverMapGridConfigurator.tsx` | 동일 패턴 | 같은 구조 예상 | 동일 문제 |

### 🟡 중간 — Phase 3 (검색 결과 페이지)

| 파일 | 줄 | 증거 코드 | 문제 |
|------|-----|---------|------|
| `CompetitorComparisonMap.tsx` | L121 | `<div className="flex-1 grid grid-cols-3 gap-2 text-center">` | 승·패·무 3열 + 승률 flex → 390px에서 각 셀 너무 좁음 |
| `CompetitorComparisonMap.tsx` | L142 | `style={{ height: '500px' }}` | 지도 고정 500px → 모바일에서 큼 |
| `AverageRankCard.tsx` | L50 | `<div className="flex items-center gap-6">` | 원형 아이콘 + 통계 + 변화 지표 3개 flex → 모바일에서 가로 공간 부족 |
| `NaverRankHeatmap.tsx` | L221 | `style={{ width: '100%', height: '500px' }}` | 지도 고정 500px |

### 🟡 중간 — Phase 4 (검색 신청 폼 & 기타 페이지)

| 파일 | 줄 | 증거 코드 | 문제 |
|------|-----|---------|------|
| `search/new/page.tsx` | 전체 | 540줄 폼 | 거리 프리셋 버튼·전체 레이아웃 점검 필요 |
| `naver-search/new/page.tsx` | 전체 | 595줄 폼 | 동일 |
| `report-settings/ReportSettingsContent.tsx` | L549 | `flex-1 min-w-0` 버튼 행 | 거리 프리셋 버튼 모바일 확인 |

### 🟢 낮음 — Phase 5 (랜딩·기타)

| 파일 | 줄 | 증거 코드 | 문제 |
|------|-----|---------|------|
| `BridgeSection2.tsx` | L48 | `<div className="grid grid-cols-5 gap-1.5">` | 5열 고정, 반응형 없음 |
| `TicketShopContent.tsx` | L183, 212 | `<div className="grid grid-cols-2 gap-3">` | 2열 고정 버튼 확인 |

---

## Phase 1: 데이터 테이블 모바일 처리

**목표:** 대시보드·분석기록·티켓 구매내역 테이블이 모바일에서 가로 스크롤로 작동  
**예상 시간:** 1-2시간

### 작업 목록

**`SearchHistorySection.tsx` (L136-137):**
- [ ] `overflow-x-auto` 래퍼에 우측 fade 그라디언트 힌트 추가 (모바일에서만 표시)
- [ ] `<td>` 패딩 `px-6` → `px-3 sm:px-6` 조정

**`HistoryTable.tsx` (L101-102):**
- [ ] 동일 패턴 적용

**`TicketShopContent.tsx` 구매내역 테이블:**
- [ ] 테이블 래퍼에 `overflow-x-auto` + 스크롤 힌트 추가

### 성공 기준

- [ ] iPhone 14 (390px) 기준 3개 테이블 모두 가로 스크롤 동작
- [ ] 스크롤 가능 힌트 시각적으로 인지 가능
- [ ] `npx tsc --noEmit` 에러 없음

---

## Phase 2: 그리드 설정 UI 모바일 처리

**목표:** 3×3 / 5×5 / 7×7 프리셋 버튼 잘림 해결, 그리드 캔버스 터치 스크롤 보장  
**예상 시간:** 2-3시간

### 문제 증거

`GridConfigurator.tsx L112-131`:
```tsx
<div className="flex gap-3">          // ← 4개 flex-1 버튼 → 390px에서 잘림
    <button className="flex-1 py-3 px-4 ...">
        <span className="text-lg">3×3</span>
    </button>
    {/* 5×5, 7×7, 초기화 */}
</div>
```
`GridConfigurator.tsx L134-138`:
```tsx
<div className="... overflow-x-auto">
    <div className="inline-grid gap-1 select-none"
         style={{ gridTemplateColumns: `repeat(15, 1fr)` }}>
        <button className="w-5 h-5 sm:w-6 sm:h-6 ...">  // 15×15=225개 버튼
```

### 작업 목록

**`GridConfigurator.tsx`:**
- [ ] 프리셋 버튼 행 `flex` → `grid grid-cols-4` (버튼 수 고정이므로 grid가 더 안정적)
- [ ] 초기화 버튼: `px-4` 유지, 텍스트 줄임 필요 시 `초기화` → `↺`로 변경 (아이콘 대체)
- [ ] 그리드 캔버스 래퍼: `touch-action: pan-x pan-y` CSS 추가로 터치 스크롤 보장
- [ ] 모바일에서 "가로 스크롤 가능" 안내 문구 추가 (`text-xs text-gray-400 sm:hidden`)
- [ ] **⚠️ 예상 발견 항목**: 드래그 선택이 `onMouseDown/onMouseEnter/onMouseUp`만 구현됨 (`L71-88`) — 모바일 터치 드래그 안 됨. `onTouchStart / onTouchMove / onTouchEnd` 추가 필요

**`NaverMapGridConfigurator.tsx`:**
- [ ] 동일 컴포넌트 확인 후 동일 패턴 적용

### 성공 기준

- [ ] 390px에서 4개 버튼 텍스트 잘리지 않음
- [ ] 그리드 캔버스 터치 드래그 스크롤 가능
- [ ] `npx tsc --noEmit` 에러 없음

---

## Phase 3: 검색 결과 페이지 모바일 처리

**목표:** 평균 순위 카드, 경쟁사 비교 요약바, 지도 높이가 모바일에서 적절히 표시  
**예상 시간:** 2-3시간

### 문제 증거

`AverageRankCard.tsx L50`:
```tsx
<div className="flex items-center gap-6">
    <div className="w-24 h-24 rounded-full ...">  {/* 원형 순위 */}
    <div className="flex-1 space-y-2">             {/* 통계 목록 */}
    <div className="flex flex-col items-center p-4 ...">  {/* 변화 지표 */}
</div>
```
→ 3개 flex 아이템이 390px에서 한 행에 배치되면 가로 공간 부족.

`CompetitorComparisonMap.tsx L120-138`:
```tsx
<div className="flex items-center gap-4 p-4 ...">
    <div className="flex-1 grid grid-cols-3 gap-2 text-center">  {/* 승·패·무 */}
    <div className="text-center pl-4 border-l ...">               {/* 승률 */}
</div>
```

`NaverRankHeatmap.tsx L221`, `CompetitorComparisonMap.tsx L142`:
```tsx
style={{ height: '500px' }}  // 고정 높이
```

### 작업 목록

**`AverageRankCard.tsx`:**
- [ ] 외부 컨테이너 `flex items-center gap-6` → `flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6`
- [ ] 원형 순위 표시: 모바일에서 상단 중앙 배치

**`CompetitorComparisonMap.tsx`:**
- [ ] 요약바 `grid-cols-3` → 유지하되 `gap-1 sm:gap-2` 조정 (이미 내용이 짧아서 괜찮을 수 있음 — 실제 확인 후 결정)
- [ ] 지도 높이 `height: '500px'` → `height: '300px'` (모바일) / `height: '500px'` (sm 이상) — tailwind 클래스로 처리

**`NaverRankHeatmap.tsx`:**
- [ ] 지도 컨테이너 `height: '500px'` → `h-[300px] sm:h-[500px]` 로 변경

### 성공 기준

- [ ] 390px에서 평균 순위 카드 겹침 없음
- [ ] 지도가 모바일에서 300px 높이로 표시, 터치 스크롤 가능
- [ ] `npx tsc --noEmit` 에러 없음

---

## Phase 4: 검색 신청 폼 & 리포트 설정 모바일 처리

**목표:** 구글·네이버 검색 신청 폼, 리포트 설정 페이지가 모바일에서 사용 가능  
**예상 시간:** 3-4시간

### 작업 목록

**`search/new/page.tsx` 전체 검토:**
- [ ] 로컬 서버 `localhost:3000/search/new` → 390px 확인
- [ ] 거리 프리셋 버튼 열: `flex-1` 버튼들 → `grid-cols-3 sm:flex` 등 반응형 처리
- [ ] GridConfigurator 포함 여부 확인 (Phase 2에서 처리됐으면 스킵)
- [ ] 폼 섹션 여백 `gap-8` → `gap-4 sm:gap-8`

**`naver-search/new/page.tsx` 전체 검토:**
- [ ] 동일 패턴으로 처리

**`report-settings/ReportSettingsContent.tsx` (L549):**
- [ ] 거리 프리셋 버튼 모바일 처리 확인 (`flex-1 min-w-0` 패턴 — 이미 처리됐을 가능성 있음)

### 성공 기준

- [ ] 390px에서 두 검색 신청 폼 전체가 세로 배치로 사용 가능
- [ ] 모든 버튼 터치 타겟 최소 44px height
- [ ] `npx tsc --noEmit` 에러 없음

---

## Phase 5: 랜딩·나머지 페이지 점검 및 마무리

**목표:** 랜딩 페이지, 티켓상점, 구독, 설정, 약관 최종 확인  
**예상 시간:** 2-3시간

### 작업 목록

**`BridgeSection2.tsx` (L48):**
- [ ] `grid-cols-5` → `grid-cols-3 sm:grid-cols-5` 변경

**`TicketShopContent.tsx` (L183, L212):**
- [ ] `grid-cols-2` 티켓 수량 버튼: 390px에서 확인 후 필요 시 `grid-cols-1 sm:grid-cols-2`

**전체 페이지 최종 390px 확인 체크리스트:**
- [ ] `/dashboard` — 대시보드 메인
- [ ] `/dashboard/shop` — 티켓 상점
- [ ] `/dashboard/subscription` — 구독 관리
- [ ] `/dashboard/subscription/checkout` — 구독 결제
- [ ] `/settings` — 설정
- [ ] `/report-settings` — 리포트 설정
- [ ] `/onboarding` — 온보딩
- [ ] `/terms` — 이용약관
- [ ] `/` — 랜딩 페이지

**공통 마무리:**
- [ ] 전체 버튼 터치 타겟 최소 44px 확인
- [ ] 데스크탑(1280px) 기존 레이아웃 회귀 없음 확인

### 성공 기준

- [ ] 위 9개 페이지 390px 깨짐 없음
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] 데스크탑 레이아웃 변화 없음

---

## 리스크 평가

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 지도 높이 변경이 데스크탑 레이아웃 영향 | 낮 | 높음 | Tailwind `sm:` prefix로 격리 |
| `search/new` 폼 내부 추가 문제 발견 | 중 | 중 | Phase 4 진행 중 발견 시 계획서 업데이트 |
| `NaverMapGridConfigurator` 패턴 다름 | 중 | 낮 | Phase 2에서 직접 확인 |

---

## 롤백 전략

- Phase별 git commit 분리: `모바일최적화 Phase[N]: [대상]`
- 문제 발생 시: `git revert HEAD`

---

## 진행 상황

- [x] Phase 1: 데이터 테이블 (SearchHistorySection, HistoryTable, TicketShop)
- [x] Phase 2: 그리드 설정 (GridConfigurator — 3×3/5×5/7×7 버튼)
- [x] Phase 3: 검색 결과 (AverageRankCard, 경쟁사비교, 지도 높이)
- [x] Phase 4: 검색 신청 폼 (search/new, naver-search/new, report-settings)
- [x] Phase 5: 랜딩·나머지 + 전체 최종 확인

**메모:**

