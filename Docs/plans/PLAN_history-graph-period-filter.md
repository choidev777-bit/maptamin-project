# Implementation Plan: History 그래프 기간 필터

**Status**: ⏳ Pending
**Started**: 2026-03-19
**Last Updated**: 2026-03-19
**Estimated Completion**: 2026-03-19

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

`/history` 페이지의 그래프(평균 순위 변화, 노출 좌표 수, 상위 노출률)에 **기간 필터** 기능을 추가합니다.

**배경**: 현재 `calculateRankTrend()` 등의 함수는 `limit` 없이 전체 데이터를 반환하므로, 데이터가 수백~수천 건 쌓이면 X축 라벨이 겹치고 차트 퍼포먼스가 저하됩니다.

**해결 방향**: SSR에서 이미 **전체 trend 배열**이 내려와 있으므로, 클라이언트(`HistoryPageContent.tsx`)에서 `selectedPeriod` 상태로 데이터를 슬라이싱합니다. 서버 재요청 불필요.

### Success Criteria
- [ ] 기간 필터 버튼(최근 7일 / 30일 / 90일 / 전체)이 그래프 카드에 표시된다
- [ ] 버튼 클릭 시 X축 데이터 포인트가 해당 기간 이내로 필터링된다
- [ ] "전체" 선택 시 모든 데이터가 표시된다
- [ ] 기간 필터는 플랫폼 토글 및 그래프 탭과 독립적으로 동작한다
- [ ] 기존 테스트(rank-trend.test.ts)가 모두 통과한다

### User Impact
데이터가 쌓일수록 그래프가 가독성 없이 빽빽해지는 문제를 해결하고, 사용자가 원하는 기간의 추세를 선택적으로 확인할 수 있습니다.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **클라이언트 사이드 필터링** (`HistoryPageContent.tsx`에서 `filter`) | SSR이 이미 전체 데이터를 props로 내려줌. 서버 재요청 없이 즉각 반응 가능 | 대량 데이터일 때 props 전송량은 동일 (수용 가능) |
| **`rank-trend.ts` 함수는 수정 안 함** | 함수는 "전체 계산"의 책임만 가짐. 기간 필터는 UI 관심사 | 없음 |
| **날짜 기반 필터링** (`fullDate >= cutoffStr`) — ~~slice(-N) 방식 폐기~~ | 네이버는 daily(매일 1포인트), 구글은 weekly(주 1회 1포인트)이므로 포인트 수 기준 `slice(-30)`은 구글에서 "30일"이 아닌 "30주" 가 됨. `fullDate` 필드로 실제 날짜 비교 필수 | 없음 — `fullDate`가 모든 `RankTrendDataPoint`에 존재 확인됨 |
| **`useMemo`로 필터된 배열 파생** (`rerender-memo`) | `selectedPeriod`나 `currentTrend`가 바뀔 때만 재계산 | 없음 |
| **`startTransition`으로 필터 상태 업데이트** (`rerender-transitions`) | 그래프 리렌더는 긴급하지 않은 업데이트. 메인 스레드 블로킹 방지 | 없음 |
| **기간 버튼 위치: 탭 바 외부(헤더 영역)** — ~~탭 바 내부 ml-auto 폐기~~ | 탭 바(`overflow-x-auto` flex 컨테이너)에 4개 버튼 추가 시 모바일에서 `ml-auto`가 오동작(flex 자식 합계가 컨테이너 초과 시 auto margin = 0 계산). 헤더의 `flex-col sm:flex-row` 영역에 배치하면 모바일-데스크탑 모두 안전 | 없음 |
| **플랫폼 토글 + 기간 버튼을 하나의 `div`로 묶기** | 헤더가 `sm:justify-between`으로 좌(제목) / 우(컨트롤) 2개 아이템 구조로 설계됨. 기간 버튼을 세 번째 아이템으로 추가하면 `justify-between`이 3개를 균등 배분해 제목 영역이 좁아짐. 플랫폼 토글과 기간 버튼을 하나의 `div`로 묶어 우측 그룹을 유지해야 함 | 없음 |
| **빈 상태 메시지 2단계 분리** (`hasAnyData` / `currentTabHasData`) | `currentTabHasData`만 `filteredTrend.length >= 1`로 교체하면, 데이터 100개 존재 but 최근 7일치 0개일 때 "분석 기록이 쌓이면..." 메시지가 표시되어 사용자 혼란. `hasAnyData`(전체 데이터 존재 여부)와 `currentTabHasData`(필터 후 존재 여부)를 분리해 각각 다른 메시지 표시 | 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `HistoryPageContent.tsx` 코드 확인 완료 (총 266줄)
- [x] `RankTrendChart.tsx` 코드 확인 완료 (총 172줄)
- [x] `rank-trend.ts` 코드 확인 완료 (총 355줄)

### External Dependencies
- 추가 패키지 없음 (React `startTransition`은 React 18 내장)

---

## 🧪 Test Strategy

이번 기능은 **순수 UI 상태 필터링** (클라이언트 slice)이므로, 기존 `rank-trend.test.ts` 유닛 테스트가 영향 받지 않음을 확인하는 것이 핵심입니다.

| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **기존 Unit Tests 통과 확인** | 100% pass | `rank-trend.ts` 함수 로직 무변경 검증 |
| **수동 통합 테스트** | 핵심 시나리오 7가지 | 기간 필터 UI 동작 확인 |

---

## 🚀 Implementation Phases

### Phase 1: `HistoryPageContent.tsx` — 기간 필터 상태 + UI 추가
**Goal**: 기간 선택 버튼 UI가 렌더링되고, 클릭 시 그래프 데이터가 필터링된다
**Estimated Time**: 1~1.5시간
**Status**: ⏳ Pending

---

#### 전제 파악 (Karpathy: 가정을 명시)

> **가정 1**: `trendData` 배열의 각 요소는 날짜별 1개 포인트다 (중복 날짜 없음)
> — `calculateRankTrend()`의 `dateGroupMap` 구조로 확인됨 (`rank-trend.ts` 61번째 줄)
>
> **가정 2**: `selectedPeriod`가 바뀌어도 SSR 데이터 재요청은 없다. 클라이언트 `slice`만으로 충분하다.
>
> **가정 3**: `naverLocalTrend`(지역명 키워드 카드)는 이번 스코프에서 기간 필터 적용 제외.

---

#### Tasks

**🔴 RED: 실패 기준 정의**
- [ ] **Test 1.1**: 기존 테스트가 현재 통과하는지 먼저 확인
  - 명령어: `npx jest rank-trend --no-coverage`
  - 기대: 모든 기존 테스트 PASS (이후에도 이 상태 유지 확인)

**🟢 GREEN: 구현**

- [ ] **Task 1.2**: `HistoryPageContent.tsx` 상단 import에 `useMemo`, `startTransition` 추가
  - File: `src/components/history/HistoryPageContent.tsx` (1번째 줄)
  - 수정 내용:
    ```typescript
    // 변경 전
    import { useState } from 'react'
    // 변경 후
    import { useState, useMemo, startTransition } from 'react'
    ```

- [ ] **Task 1.3**: `PERIOD_OPTIONS` 상수를 컴포넌트 **외부**에 선언 (매 렌더마다 재생성 방지)
  - File: `src/components/history/HistoryPageContent.tsx` (Props 인터페이스 위)
  - 추가 내용:
    ```typescript
    type PeriodOption = '7' | '30' | '90' | 'all'

    const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
        { value: '7',   label: '7일' },
        { value: '30',  label: '30일' },
        { value: '90',  label: '90일' },
        { value: 'all', label: '전체' },
    ]
    ```

- [ ] **Task 1.4**: `selectedPeriod` 상태 추가
  - File: `src/components/history/HistoryPageContent.tsx` (49~52번째 줄 아래)
  - 추가 내용:
    ```typescript
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('30')
    ```

- [ ] **Task 1.5**: 기간 변경 핸들러 추가 (`startTransition` 적용)
  - File: `src/components/history/HistoryPageContent.tsx` (`handlePlatformToggle` 함수 아래)
  - 추가 내용:
    ```typescript
    const handlePeriodChange = (period: PeriodOption) => {
        startTransition(() => {   // rerender-transitions: 비긴급 업데이트
            setSelectedPeriod(period)
        })
    }
    ```

- [ ] **Task 1.6**: `useMemo`로 기간 필터된 trend 배열 3개 파생 (`rerender-memo` 적용)
  - File: `src/components/history/HistoryPageContent.tsx` (60~64번째 줄 `currentTrend` 선언 아래)
  - ⚠️ **`slice(-N)` 방식 사용 금지** — 네이버 daily는 매일 1포인트, 구글 weekly는 주 1회 1포인트이므로, `slice(-30)`이 구글에서 "30주"가 됨
  - ✅ **`fullDate >= cutoffStr` 날짜 기반 필터링 사용**
  - 추가 내용:
    ```typescript
    // 기간 필터 cutoff 날짜 계산 (rerender-memo: selectedPeriod가 바뀔 때만 재계산)
    const cutoffDateStr = useMemo(() => {
        if (selectedPeriod === 'all') return null
        const d = new Date()
        d.setDate(d.getDate() - parseInt(selectedPeriod))
        return d.toISOString().split('T')[0]  // 'YYYY-MM-DD'
    }, [selectedPeriod])

    // trend 배열 필터링 — fullDate(YYYY-MM-DD) 문자열 비교로 날짜 범위 적용
    const filteredTrend = useMemo(
        () => cutoffDateStr ? currentTrend.filter(p => p.fullDate >= cutoffDateStr) : currentTrend,
        [currentTrend, cutoffDateStr]
    )
    const filteredExposureTrend = useMemo(
        () => cutoffDateStr ? currentExposureTrend.filter(p => p.fullDate >= cutoffDateStr) : currentExposureTrend,
        [currentExposureTrend, cutoffDateStr]
    )
    const filteredTopRateTrend = useMemo(
        () => cutoffDateStr ? currentTopRateTrend.filter(p => p.fullDate >= cutoffDateStr) : currentTopRateTrend,
        [currentTopRateTrend, cutoffDateStr]
    )
    ```
  - 참고: `fullDate`는 `rank-trend.ts`의 `RankTrendDataPoint` 인터페이스에 `'YYYY-MM-DD'` 형식으로 정의되어 있음 (9번째 줄). 문자열 사전순 비교(`>=`)가 날짜 비교와 동일하게 동작

- [ ] **Task 1.7**: `hasAnyData` / `currentTabHasData` 두 변수로 빈 상태 분리
  - File: `src/components/history/HistoryPageContent.tsx` (81~84번째 줄)
  - ⚠️ **`currentTabHasData`만 `filtered*`으로 교체하면 안 됨** — 데이터가 존재하지만 기간 필터 결과가 0개일 때 "분석 기록이 쌓이면..." 메시지가 표시되어 사용자 혼란
  - ✅ **두 변수로 분리해 각각 다른 메시지 표시**
  - 수정 내용:
    ```typescript
    // 전체 데이터 존재 여부 (필터 무관)
    const hasAnyData =
        activeGraphTab === 'rank' ? currentTrend.length >= 1 :
        activeGraphTab === 'exposure' ? currentExposureTrend.length >= 1 :
        currentTopRateTrend.length >= 1

    // 현재 기간 필터 후 데이터 존재 여부
    const currentTabHasData =
        activeGraphTab === 'rank' ? filteredTrend.length >= 1 :
        activeGraphTab === 'exposure' ? filteredExposureTrend.length >= 1 :
        filteredTopRateTrend.length >= 1
    ```

- [ ] **Task 1.8**: `RankTrendChart`로 넘기는 `trendData`를 `filtered*` 배열로 교체
  - File: `src/components/history/HistoryPageContent.tsx` (163~182번째 줄, 3곳)
  - 수정 내용:
    ```tsx
    // rank 탭 (163번째 줄)
    <RankTrendChart trendData={filteredTrend} keywords={currentKeywords} />
    // exposure 탭 (169번째 줄)
    <RankTrendChart trendData={filteredExposureTrend} keywords={currentKeywords} yAxisMode="count" />
    // topRate 탭 (176번째 줄)
    <RankTrendChart trendData={filteredTopRateTrend} keywords={currentKeywords} yAxisMode="percent" />
    ```

- [ ] **Task 1.9**: 헤더 우측 컨트롤 영역 재구성 — 플랫폼 토글 + 기간 버튼을 하나의 `div`로 묶기
  - File: `src/components/history/HistoryPageContent.tsx` (113~134번째 줄, 헤더 내 플랫폼 토글 영역)
  - ⚠️ **헤더가 `sm:justify-between`으로 좌/우 2개 아이템 구조임** — 기간 버튼을 세 번째 아이템으로 추가하면 `justify-between`이 3개를 균등 배분해 제목이 좁아짐
  - ✅ **플랫폼 토글과 기간 버튼을 하나의 wrapper `div`로 묶어 우측 그룹 유지**
  - 수정 내용:
    ```tsx
    {/* 변경 전: 플랫폼 토글만 단독 */}
    <div className="flex bg-gray-100/80 p-1.5 rounded-xl">
        {/* 네이버/구글 버튼 */}
    </div>

    {/* 변경 후: 우측 컨트롤 그룹 wrapper로 묶기 */}
    <div className="flex items-center gap-3 flex-wrap justify-end">
        {/* 플랫폼 토글 (기존 코드 유지) */}
        <div className="flex bg-gray-100/80 p-1.5 rounded-xl">
            {/* 네이버/구글 버튼 — 기존 코드 그대로 */}
        </div>

        {/* 기간 필터 버튼 (신규) */}
        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-lg text-xs">
            {PERIOD_OPTIONS.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => handlePeriodChange(opt.value)}
                    className={`px-2.5 py-1.5 rounded-md font-semibold transition-all ${
                        selectedPeriod === opt.value
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    </div>
    ```

- [ ] **Task 1.10**: 빈 상태 JSX를 `hasAnyData` / `currentTabHasData` 2단계로 분리
  - File: `src/components/history/HistoryPageContent.tsx` (184~192번째 줄)
  - 수정 내용:
    ```tsx
    {/* 변경 전: currentTabHasData 1단계만 */}
    {currentTabHasData ? (
        <> {/* 그래프 */} </>
    ) : (
        <div>{/* "분석 기록이 쌓이면..." */}</div>
    )}

    {/* 변경 후: 2단계 분리 */}
    {!hasAnyData ? (
        {/* 케이스 1: 데이터 자체가 없음 — 기존 "분석 기록이 쌓이면..." 메시지 */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">분석 기록이 쌓이면</p>
            <p className="text-gray-500">{emptyMessages[activeGraphTab]}</p>
        </div>
    ) : !currentTabHasData ? (
        {/* 케이스 2: 데이터 있지만 선택 기간 내 없음 — 신규 메시지 */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <BarChart3 className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">선택한 기간에 데이터가 없습니다.</p>
            <p className="text-gray-500 text-sm">기간을 넓혀보세요.</p>
        </div>
    ) : (
        <> {/* 그래프 — 기존 코드 그대로 */} </>
    )}
    ```

**🔵 REFACTOR: 코드 정리**
- [ ] **Task 1.11**: 변수명 의도 확인 (`filtered*` vs `current*`, `hasAnyData` vs `currentTabHasData` 혼동 없는지 전체 검토)
- [ ] **Task 1.12**: `cutoffDateStr` 파생이 각 `useMemo` 의존성 배열에 올바르게 포함되었는지 재확인
- [ ] **Task 1.13**: `cutoffDateStr` 계산에 `new Date()`를 사용하므로 서버 렌더링과 클라이언트 렌더링 시각 차이가 없는지 확인 (이 컴포넌트는 `'use client'`이므로 클라이언트 전용 — 문제 없음)

---

#### Quality Gate ✋

**⚠️ STOP: 모든 체크 통과 전까지 완료 선언 금지**

**Build & Tests**:
- [ ] `npx jest rank-trend --no-coverage` → 기존 테스트 모두 PASS (수정 전과 동일)
- [ ] `npx tsc --noEmit` → TypeScript 오류 없음 (`PeriodOption` 타입 정확)
- [ ] `npm run dev` → 빌드/런타임 오류 없음

**수동 테스트 체크리스트**:
- [ ] 기간 버튼 4개(7일/30일/90일/전체)가 플랫폼 토글 옆에 표시된다
- [ ] 기본값 "30일"이 하이라이트되어 있다
- [ ] "7일" 클릭 → 최근 7일 이내 데이터만 그래프에 표시된다
- [ ] "전체" 클릭 → 기존처럼 전체 데이터가 표시된다
- [ ] 네이버 ↔ 구글 플랫폼 토글 후에도 기간 선택이 유지된다
- [ ] 그래프 탭(순위/노출/노출률) 전환 후에도 기간 선택이 유지된다
- [ ] 헤더 레이아웃: 데스크탑에서 제목(좌) / [플랫폼 토글 + 기간 버튼](우) 2열 정렬이 유지된다
- [ ] 헤더 레이아웃: 모바일에서 제목-토글-기간버튼이 세로로 쌓이며 레이아웃 깨짐 없다
- [ ] **빈 상태 케이스 1**: 데이터 자체가 0개 → "분석 기록이 쌓이면..." 표시
- [ ] **빈 상태 케이스 2**: 데이터 있지만 "7일" 필터 결과 0개 → "선택한 기간에 데이터가 없습니다. 기간을 넓혀보세요." 표시

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| `useMemo` 의존성 배열 누락으로 필터 미반영 | Low | Medium | `cutoffDateStr`, `currentTrend` 모두 포함 확인 |
| `startTransition` import 누락으로 빌드 오류 | Low | Low | Task 1.2에서 최초 수정 |
| ~~탭 바 내부 기간 버튼으로 인한 모바일 ml-auto 오동작~~ | ~~Medium~~ | ~~Low~~ | ✅ **해결됨**: 기간 버튼을 헤더 영역으로 이동 (Task 1.9 수정) |
| ~~`slice(-N)` 방식으로 구글 weekly에서 기간 라벨 불일치~~ | ~~High~~ | ~~Medium~~ | ✅ **해결됨**: `fullDate >= cutoffStr` 날짜 기반 필터링으로 교체 (Task 1.6 수정) |
| ~~헤더 3번째 아이템 추가로 `justify-between` 레이아웃 깨짐~~ | ~~Medium~~ | ~~Low~~ | ✅ **해결됨**: 플랫폼 토글 + 기간 버튼을 하나의 wrapper `div`로 묶기 (Task 1.9 수정) |
| ~~`currentTabHasData`만 교체 시 기간 필터 결과 0개에서 혼란스러운 빈 메시지~~ | ~~High~~ | ~~Medium~~ | ✅ **해결됨**: `hasAnyData` / `currentTabHasData` 2단계 분리 (Task 1.7 + 1.10 수정) |

---

## 🔄 Rollback Strategy

`HistoryPageContent.tsx` 1개 파일만 수정합니다.

```bash
git checkout src/components/history/HistoryPageContent.tsx
```

`rank-trend.ts`, `RankTrendChart.tsx`는 **무수정** → 롤백 불필요.

---

## 📊 Progress Tracking

- **Phase 1**: ⏳ 0%

| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 1~1.5시간 | - | - |

---

## 📝 Notes & Learnings

### 스코프 경계 (Karpathy: 요청된 것만 건드림)
- `rank-trend.ts` 4개 함수 — **수정 안 함**
- `naverLocalTrend` 지역명 키워드 카드 — **이번 스코프 제외** (이 카드에는 기간 필터 미적용이 UX 불일치일 수 있으나, 별도 작업으로 분리)
- `RankTrendChart.tsx` — **수정 안 함**, props만 `filtered*`으로 교체

### 검토에서 발견된 수정 내역
- **1차 검토 Issue 1**: `slice(-N)` → `fullDate >= cutoffStr` 날짜 기반 필터링으로 교체 (구글 weekly 주기 차이 대응)
- **1차 검토 Issue 2**: 기간 버튼 위치를 탭 바 내부 → 헤더 영역으로 이동 (모바일 `overflow-x-auto` 컨테이너 내 `ml-auto` 오동작 방지)
- **2차 검토 Issue 3**: 헤더에 기간 버튼을 세 번째 아이템으로 추가 시 `justify-between` 레이아웃 깨짐 → 플랫폼 토글 + 기간 버튼을 wrapper `div`로 묶어 2-아이템 구조 유지
- **2차 검토 Issue 4**: `currentTabHasData`만 `filteredTrend` 기준으로 교체 시, 데이터 존재 but 기간 필터 결과 0개 → "분석 기록이 쌓이면..." 혼란 메시지 → `hasAnyData` / `currentTabHasData` 2단계 분리, 각각 다른 메시지 표시

### Validation Commands
```bash
# 기존 테스트 확인
npx jest rank-trend --no-coverage

# TypeScript 타입 체크
npx tsc --noEmit

# 개발 서버 실행
npm run dev
```

---

**Plan Status**: ⏳ Pending
**Next Action**: 코딩 시작 승인 후 Phase 1 착수
**Blocked By**: 없음
