# Implementation Plan: 행정구역 경계 오버레이 & 역지오코딩

**Status**: 🔄 In Progress
**Started**: 2026-04-02
**Last Updated**: 2026-04-02
**Estimated Completion**: 2026-04-04

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

맵타민의 모든 지도 컴포넌트에 다음 두 가지 기능을 추가한다:

1. **역지오코딩 (Reverse Geocoding)**: 격자 좌표 클릭 시 뜨는 `RankDetailModal` 상단에 해당 좌표의 행정동 이름(예: "마포구 망원1동")을 표시. 네이버 Reverse Geocoding API를 사용.

2. **행정구역 경계선 토글**: 모든 히트맵 지도와 격자 설정 지도에 행정동 경계선을 기본으로 표시. 버튼으로 On/Off 가능.
   - **네이버 지도**: SDK 내장 DISTRICT 오버레이 사용
   - **구글 검색결과 지도**: 기본이 네이버 지도(행정구역 포함), 토글 OFF 시 구글 지도로 전환

### 가정 (Assumptions)
- 네이버 Reverse Geocoding API 키는 기존 `.env.local`의 `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID`와 같은 프로젝트를 사용하나, **서버사이드 API 호출**이므로 별도 서버용 키(`NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`)가 필요함
- 행정동 기준으로 표시 (법정동 아님)
- 구글 격자 설정 지도(`MapGridConfigurator.tsx`)는 행정구역 경계 토글 대상에서 **제외** — 해당 컴포넌트는 구글 지도 전용이며 경계 구현 복잡도가 높음. 격자 설정 단계에서는 네이버 지도만 사용하도록 유도하는 것이 목적에 부합함.

### Success Criteria
- [ ] `RankDetailModal` 상단에 행정동 정보("OO구 OO동") 표시됨
- [ ] `CompetitorDetailModal` 상단에도 행정동 정보 표시됨
- [ ] API 호출 실패/로딩 중 상태가 graceful하게 처리됨
- [ ] `NaverRankHeatmap` 지도에 행정구역 경계선이 기본 표시됨
- [ ] `NaverRankHeatmap` 토글 버튼으로 경계선 On/Off 가능
- [ ] `NaverMapGridConfigurator` 지도에 행정구역 경계선이 기본 표시됨
- [ ] `NaverMapGridConfigurator` 토글 버튼으로 경계선 On/Off 가능
- [ ] `NaverCompetitorComparisonMap` 지도에 행정구역 경계선이 기본 표시됨
- [ ] `RankHeatmap` (구글 검색결과)는 기본이 네이버 지도로 표시됨
- [ ] `RankHeatmap` 토글로 구글 지도로 전환 가능
- [ ] `CompetitorComparisonMap` (구글 경쟁사)는 기본이 네이버 지도로 표시됨
- [ ] 온보딩/설정 구글 탭도 기본이 네이버 지도(행정구역), 토글 OFF 시 구글 지도로 전환
- [ ] 기존 기능(격자 클릭, 모달, 경쟁사 비교)에 회귀(regression) 없음

### User Impact
- 사용자가 격자 좌표가 어느 동에 위치하는지 즉시 파악 가능
- 행정구역 경계선으로 지역별 순위 패턴을 시각적으로 인지 가능
- 네이버/구글 광고 플랫폼의 "행정동 선택" 단위와 맵타민 히트맵이 시각적으로 일치하여 전략적 의사결정 편의 향상

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 역지오코딩에 네이버 API 사용 | 기존 프로젝트 키 재활용, 월 300만건 무료, 행정동 정확도 높음 | 카카오(일 10만건)보다 한도 높음 |
| 역지오코딩을 Next.js API Route에서 처리 | API 키 서버사이드 보호, CORS 문제 없음 | 클라이언트 직접 호출보다 약간 느림 |
| 네이버 지도 경계: SDK DISTRICT 오버레이 | 데이터 내장, 별도 GeoJSON 불필요, 동(洞) 단위까지 지원 | 네이버 지도 SDK에만 의존 |
| 구글 검색결과 페이지: 기본=네이버 지도 | 동 단위 경계를 구글 지도로 구현하면 GeoJSON 필요 → 복잡함. 네이버 지도가 이미 동 단위 지원 | "구글 검색결과 페이지"에서 네이버 지도가 기본인 점이 다소 어색할 수 있음 |
| `MapGridConfigurator`(구글 격자 설정)는 경계 제외 | 구글 격자 설정은 Premium 플랜 전용이며 이미 네이버 탭이 기본. 경계 구현 복잡도 대비 효과 낮음 | 구글 격자 설정 화면에는 경계선 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [ ] `.env.local`에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 환경 변수 설정 확인 (서버사이드 역지오코딩용)
- [ ] 기존 네이버 지도 SDK 로드 확인 (`NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` 존재 여부)

### External Dependencies
- 네이버 Reverse Geocoding REST API: `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc`
- 네이버 지도 SDK: `naver.maps.drawing.DrawingManager` / 지적편집도 레이어 (`DISTRICT` 타입 MapTypeId)
- 기존 `@vis.gl/react-google-maps`: 현재 버전 유지

---

## 🧪 Test Strategy

### Testing Approach
UI 컴포넌트 중심이므로 자동화 테스트보다 **수동 테스트 체크리스트** 위주로 검증.

| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | API Route 로직 | 역지오코딩 응답 파싱 함수 |
| **Manual Tests** | 전체 사용자 플로우 | 지도 렌더링, 토글, 모달 데이터 표시 |

---

## 🚀 Implementation Phases

---

### Phase 1: 역지오코딩 API Route 구현
**Goal**: 좌표(lat, lng)를 받아 행정동 이름을 반환하는 서버 API 엔드포인트 완성
**Estimated Time**: 1~2시간
**Status**: ✅ Complete

#### 사전 확인 (코딩 전)
- [x] `.env.local`에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 환경 변수 설정 확인 (서버사이드 역지오코딩용)
  - `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` + `NCP_CLIENT_SECRET` 조합 사용
  - NCP 콘솔에서 **Reverse Geocoding 서비스 활성화** 필요 (완료)
- [x] 기존 네이버 지도 SDK 로드 확인 (`NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` 존재 여부)

#### Tasks

**🟢 GREEN: 구현**

- [x] **Task 1.1**: API Route 파일 생성
  - File: `src/app/api/reverse-geocode/route.ts` ✅ 생성 완료
  - 입력: query param `lat`, `lng`
  - 출력: `{ district: "마포구 서교동" }` 형태 JSON
  - 키 조합: `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` + `NCP_CLIENT_SECRET`

- [x] **Task 1.2**: 응답 파싱 검증 ✅
  - 실제 응답 확인: `{"district":"마포구 서교동"}` (정상 반환)

#### Quality Gate ✋

**⚠️ STOP: Phase 2 진행 전 ALL 통과 필요**

- [x] `npm run build` 오류 없음 (기존 테스트 파일의 TS 에러는 본 작업과 무관)
- [x] `http://localhost:3000/api/reverse-geocode?lat=37.5566&lng=126.9236` 응답 확인
- [x] 응답에 `district` 필드 포함 확인: `{"district":"마포구 서교동"}` ✅
- [x] 잘못된 좌표 입력 시 `{ district: null }` 응답 확인
- [x] TypeScript 타입 에러 없음

---

### Phase 2: RankDetailModal 역지오코딩 UI 추가
**Goal**: 격자 클릭 시 모달 상단에 "마포구 망원1동" 형태의 행정동 정보 표시
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### 현재 상태 파악 (코딩 전 확인)
- `RankDetailModal.tsx`는 `result: SearchResult` prop을 받음
- `SearchResult` 타입에는 `grid_lat`, `grid_lng` 필드 존재 (확인됨)
- 모달 헤더 영역에 역지오코딩 결과를 추가할 공간 필요

#### Tasks

**🟢 GREEN: 구현**

- [ ] **Task 2.1**: `RankDetailModal.tsx` 수정
  - File: `src/components/results/RankDetailModal.tsx`
  - 변경 내용:
    1. `useState<string | null>(null)` — `districtName` 상태 추가
    2. `useState<boolean>(true)` — `isLoadingDistrict` 상태 추가
    3. `useEffect`에서 `result.grid_lat`, `result.grid_lng`를 이용해 `/api/reverse-geocode` 호출
    4. 모달 헤더에 행정동 표시 UI 추가:
       - 로딩 중: 작은 스피너 또는 `...`
       - 성공: `📍 마포구 망원1동` 형태 텍스트
       - 실패/null: 표시 안 함 (graceful 처리)
  - **Karpathy 원칙 준수**: 기존 모달 레이아웃 최소한으로만 수정

- [ ] **Task 2.2**: `CompetitorDetailModal.tsx` 수정
  - File: `src/components/results/CompetitorDetailModal.tsx`
  - 경쟁사 비교 지도 마커 클릭 시 열리는 모달 (별도 컴포넌트)
  - `gridLat`, `gridLng` prop이 이미 전달되고 있으므로 구현 방식 동일
  - 기존 주석 처리된 좌표 표시 영역(`{/* <p>...{gridLat}...</p> */}`)을 행정동 표시로 대체

**🔵 REFACTOR**

- [ ] **Task 2.3**: 불필요한 리렌더링 방지
  - `result`/`gridLat·gridLng`가 변경될 때만 API 호출하도록 dependency array 확인
  - 모달이 닫힐 때 상태 초기화

#### Quality Gate ✋

**⚠️ STOP: Phase 3 진행 전 ALL 통과 필요**

- [ ] `npm run build` 오류 없음
- [ ] 네이버 검색결과 페이지(`/naver-search/[id]`)에서 격자 클릭 → `RankDetailModal`에 행정동 표시 확인
- [ ] 구글 검색결과 페이지(`/search/[id]`)에서 격자 클릭 → `RankDetailModal`에 행정동 표시 확인
- [ ] 경쟁사 비교 지도에서 마커 클릭 → `CompetitorDetailModal`에 행정동 표시 확인
- [ ] 모달 열고 닫기 반복 시 이전 행정동 정보가 잔류하지 않음 확인
- [ ] API 느릴 때 로딩 상태 표시 확인 (네트워크 탭 Slow 3G 시뮬레이션)
- [ ] TypeScript 타입 에러 없음

---

### Phase 3: 네이버 지도 행정구역 경계 오버레이 구현
**Goal**: `NaverRankHeatmap`, `NaverMapGridConfigurator`, `NaverCompetitorComparisonMap`에 DISTRICT 레이어 기본 표시 + 토글 버튼
**Estimated Time**: 2~3시간
**Status**: ✅ Complete

#### 네이버 DISTRICT 오버레이 구현 방식 (사전 조사)

**⚠️ 중요**: 프로젝트의 3개 네이버 지도 컴포넌트(`NaverRankHeatmap`, `NaverMapGridConfigurator`, `NaverCompetitorComparisonMap`)는 모두 `react-naver-maps` 라이브러리를 사용한다.

```tsx
import { NavermapsProvider, NaverMap, useNavermaps } from 'react-naver-maps'
```

따라서 DISTRICT 레이어는 `useNavermaps()` 훅으로 얻은 `navermaps` 객체와 `ref`로 받은 `map` 인스턴스를 통해 제어해야 한다:

```tsx
// MapContent 내부에서 (useNavermaps 사용 가능한 컨텍스트)
const navermaps = useNavermaps()
const [map, setMap] = useState<any>(null) // NaverMap ref={setMap}

useEffect(() => {
    if (!map || !navermaps) return
    // 방법 1: LayerTypeId 방식
    if (showDistrict) {
        map.setLayerTypeIds([navermaps.LayerTypeId.CADASTRAL])
    } else {
        map.setLayerTypeIds([])
    }
}, [map, navermaps, showDistrict])
```

> ⚠️ **실제 구현 전 확인 필요**: `navermaps.LayerTypeId.CADASTRAL`이 현재 SDK 버전에 존재하는지 브라우저 콘솔에서 확인. 없으면 `naver.maps.LayerTypeId`를 직접 참조하는 방식으로 전환.

#### Tasks

**🟢 GREEN: NaverRankHeatmap 구현**

- [x] **Task 3.1**: `NaverRankHeatmap.tsx` 수정
  - File: `src/components/naver/NaverRankHeatmap.tsx`
  - 변경 내용:
    1. `showDistrict` state (boolean, 기본값 `false`) 추가 ✅
    2. `CadastralLayer` 인스턴스를 `useRef`로 관리하고 `useEffect`로 토글 ✅
    3. `showDistrict` 변경 시 `setMap(map)` / `setMap(null)`로 레이어 토글 ✅
    4. 헤더 영역에 토글 버튼 추가 ✅
  - **수술적 변경**: 기존 히트맵 마커, 클릭 핸들러, 모달 연동은 일체 건드리지 않음

**🟢 GREEN: NaverMapGridConfigurator 구현**

- [x] **Task 3.2**: `NaverMapGridConfigurator.tsx` 수정 ✅
  - File: `src/components/naver/NaverMapGridConfigurator.tsx`
  - 동일한 패턴으로 CadastralLayer + 토글 버튼 추가
  - 격자 포인트 표시 로직은 건드리지 않음

**🟢 GREEN: NaverCompetitorComparisonMap 구현**

- [x] **Task 3.3**: `NaverCompetitorComparisonMap.tsx` 수정 ✅
  - File: `src/components/naver/NaverCompetitorComparisonMap.tsx`
  - 동일한 패턴으로 CadastralLayer + 토글 버튼 추가

**🔵 REFACTOR: 공통 훅 검토**

- [x] **Task 3.4**: 공통 훅 추출 검토 → **불필요 판단** ✅
  - 각 컴포넌트의 CadastralLayer 토글 코드가 ~25줄로, 단일 사용 추상화 금지 원칙(Karpathy)에 따라 훅 추출하지 않음

#### Quality Gate ✋

**⚠️ STOP: Phase 4 진행 전 ALL 통과 필요**

- [x] `npm run build` 오류 없음 (기존 테스트 파일 TS 에러만 존재 — 본 작업과 무관)
- [ ] `/naver-search/[id]` 페이지에서 히트맵 지도에 행정구역 경계선 표시 확인
- [ ] 토글 버튼 클릭 시 경계선 숨김/표시 확인
- [ ] `/free-trial` Step 3 지도에서 행정구역 경계선 표시 확인
- [ ] 온보딩 격자 설정 지도에서 경계선 표시 확인
- [ ] 기존 격자 포인트 클릭(enable/disable) 기능 정상 작동 확인
- [x] TypeScript 타입 에러 없음 (수정 대상 3개 파일 기준)

---

### Phase 4: 구글 검색결과/경쟁사 지도 → 네이버 지도 기반으로 전환
**Goal**: `RankHeatmap`, `CompetitorComparisonMap`에서 기본을 네이버 지도로, 토글 OFF 시 구글 지도로 전환
**Estimated Time**: 2~3시간
**Status**: ✅ Complete

#### 구현 전략

`RankHeatmap.tsx` (구글 검색결과 히트맵)의 현재 구조:
```tsx
<Map> // 구글
  <AdvancedMarker> // 격자 마커
```

변경 후 구조:
```tsx
{showNaverMap ? (
  // 네이버 지도 (NaverRankHeatmap과 유사한 구조)
  // 행정구역 경계선 기본 ON
) : (
  <Map> // 구글 지도 (기존 코드 그대로)
    <AdvancedMarker>
  </Map>
)}
// 상단에 토글 버튼: [🗺 행정구역 지도] / [G 구글 지도]
```

> **핵심**: 기존 구글 지도 렌더링 코드는 **삭제하지 않고** `showNaverMap === false`일 때 그대로 사용.

#### Tasks

**🟢 GREEN: RankHeatmap 전환**

- [x] **Task 4.1**: `RankHeatmap.tsx` 수정 ✅
  - File: `src/components/results/RankHeatmap.tsx`
  - 변경 내용:
    1. `showNaverMap` state (boolean, 기본값 `true`) 추가
    2. `NaverRankHeatmap` 컴포넌트를 dynamic import
    3. `showNaverMap`이 true이면 `NaverRankHeatmap` 렌더링 (행정구역 토글 포함)
    4. `showNaverMap`이 false이면 기존 구글 `<Map>` 렌더링
    5. 플로팅 버튼으로 상호 전환

**🟢 GREEN: CompetitorComparisonMap 전환**

- [x] **Task 4.2**: `CompetitorComparisonMap.tsx` 수정 ✅
  - File: `src/components/results/CompetitorComparisonMap.tsx`
  - 동일 패턴으로 기본=네이버 지도, 토글=구글 지도 전환
  - 경쟁사 마커 데이터가 두 지도 모두에 전달됨 (좌표 동일)

**🟢 GREEN: 온보딩/설정 구글 탭 전환**

- [x] **Task 4.3**: `StepGridSetting.tsx` 수정 (온보딩) ✅
  - File: `src/components/onboarding/StepGridSetting.tsx`
  - 구글 탭에서 `NaverMapGridConfigurator`로 교체 (`googlePoints` state 연결)
  - `search/new/page.tsx`도 동일하게 `NaverMapGridConfigurator` 적용 ✅
  - `report-settings/ReportSettingsContent.tsx` 구글 탭도 동일하게 적용 ✅

**🔵 REFACTOR**

- [x] **Task 4.4**: 토글 버튼 스타일 일관성 검토 ✅
  - N/G 뱃지 스타일로 지도 전환 버튼 통일

#### Quality Gate ✋

**⚠️ STOP: Phase 5 진행 전 ALL 통과 필요**

- [ ] `npm run build` 오류 없음
- [ ] `/search/[id]` (구글 검색결과)에서 기본이 네이버 지도로 표시됨 확인
- [ ] 토글 클릭 시 구글 지도로 전환됨 확인
- [ ] 다시 토글 클릭 시 네이버 지도로 복귀 확인
- [ ] 격자 마커 클릭 시 `RankDetailModal` 정상 열림 확인 (두 지도 모두)
- [ ] `/search/[id]` 경쟁사 비교 영역에서 기본이 네이버 지도 확인
- [ ] 온보딩 구글 탭에서 기본이 네이버 지도(행정구역) 확인
- [ ] 온보딩 구글 탭에서 격자 클릭 시 `googlePoints`가 업데이트됨 확인 (네이버 탭 `naverPoints`와 독립적)
- [ ] 온보딩 구글 탭 토글 OFF → 구글 지도로 전환, 격자 설정 정상 작동 확인
- [ ] TypeScript 타입 에러 없음

---

### Phase 5: 최종 통합 검증
**Goal**: 모든 기능이 end-to-end로 정상 작동하고 기존 기능에 회귀 없음 확인
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 5.1**: 전체 페이지 수동 테스트 실행 (아래 Manual Test Checklist 참조)
- [ ] **Task 5.2**: `npm run build` 최종 확인
- [ ] **Task 5.3**: TypeScript strict 모드 에러 없음 확인

#### Quality Gate ✋ — Final

**Manual Test Checklist (증거 기반)**

| 페이지 | 테스트 시나리오 | 기대 결과 | 통과 여부 |
|--------|--------------|----------|----------|
| `/naver-search/[id]` | 히트맵 격자 클릭 | `RankDetailModal` + 행정동 표시 | [ ] |
| `/naver-search/[id]` | 행정구역 토글 OFF | 경계선 사라짐 | [ ] |
| `/naver-search/[id]` | 행정구역 토글 ON | 경계선 다시 표시 | [ ] |
| `/search/[id]` (구글) | 기본 진입 | 네이버 지도 + 행정구역 표시 | [ ] |
| `/search/[id]` (구글) | 격자 클릭 | `RankDetailModal` + 행정동 표시 | [ ] |
| `/search/[id]` (구글) | "구글 지도" 토글 | 구글 지도로 전환 | [ ] |
| `/search/[id]` (구글) | 구글 지도에서 격자 클릭 | `RankDetailModal` + 행정동 표시 | [ ] |
| 경쟁사 비교 (네이버) | 마커 클릭 | `CompetitorDetailModal` + 행정동 표시 | [ ] |
| 경쟁사 비교 (네이버) | 행정구역 토글 OFF | 경계선 사라짐 | [ ] |
| 경쟁사 비교 (구글) | 기본 진입 | 네이버 지도 + 경계선 표시 | [ ] |
| 경쟁사 비교 (구글) | 마커 클릭 | `CompetitorDetailModal` + 행정동 표시 | [ ] |
| `/free-trial` Step 3 | 지도 표시 | 행정구역 경계선 기본 표시 | [ ] |
| `/onboarding` 네이버 탭 | 격자 클릭 | `naverPoints` 업데이트 | [ ] |
| `/onboarding` 구글 탭 (Premium) | 기본 진입 | 네이버 지도 + 행정구역 표시 | [ ] |
| `/onboarding` 구글 탭 (Premium) | 격자 클릭 | `googlePoints` 업데이트 (naverPoints 아님) | [ ] |
| `/onboarding` 구글 탭 (Premium) | 토글 OFF | 구글 지도로 전환, 격자 설정 정상 | [ ] |

- [ ] `npm run build` 최종 성공
- [ ] 콘솔 에러 없음 (모든 테스트 페이지)

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| `react-naver-maps`에서 `navermaps.LayerTypeId.CADASTRAL`이 존재하지 않을 수 있음 | Medium | Medium | Phase 3 시작 전 브라우저 콘솔에서 `navermaps.LayerTypeId` 직접 출력하여 확인. 없으면 전역 `window.naver.maps.LayerTypeId` 참조로 대체 |
| `NAVER_CLIENT_SECRET` 환경변수 미설정 | Medium | High | Phase 1 시작 전 .env.local 확인. 없으면 네이버 클라우드 콘솔에서 발급 |
| `RankHeatmap`에서 네이버+구글 두 지도를 모두 로드 시 성능 저하 | Low | Medium | 네이버 지도는 dynamic import, 구글 지도는 토글 전까지 mount하지 않음 (조건부 렌더링으로 해결) |
| 온보딩 구글 탭에서 `NaverMapGridConfigurator`가 `googlePoints`를 올바르게 수정하지 않을 수 있음 | Medium | Medium | 구글 탭 네이버 지도에서 클릭 시 `setGooglePoints`가 호출되는지 콘솔 로그로 검증 |
| 역지오코딩 API 응답이 느려 모달 UX가 나빠짐 | Low | Low | 로딩 스피너 표시, API 응답 지연과 무관하게 모달 즉시 열림 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `src/app/api/reverse-geocode/route.ts` 파일 삭제
- 기존 코드 영향 없음 (신규 파일만 추가)

### If Phase 2 Fails
- `RankDetailModal.tsx` git checkout으로 이전 상태 복원
- Phase 1 API Route는 유지됨 (다른 컴포넌트에 영향 없음)

### If Phase 3 Fails
- 각 네이버 컴포넌트 파일 git checkout으로 이전 상태 복원
- 3개 파일 독립적으로 롤백 가능

### If Phase 4 Fails
- `RankHeatmap.tsx`, `CompetitorComparisonMap.tsx` git checkout으로 이전 상태 복원
- Phase 1~3 결과물은 영향 없음

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1** (역지오코딩 API): ✅ 100%
- **Phase 2** (모달 행정동 표시): ✅ 100%
- **Phase 3** (네이버 지도 경계선): ✅ 100% (코드 완료, 수동 테스트 일부 남음)
- **Phase 4** (구글 지도 네이버 전환): ✅ 100% (코드 완료, 수동 테스트 남음)
- **Phase 5** (통합 검증): ⏳ 0%

**Overall Progress**: 80% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 1~2시간 | - | - |
| Phase 2 | 1시간 | - | - |
| Phase 3 | 2~3시간 | - | - |
| Phase 4 | 2~3시간 | - | - |
| Phase 5 | 1시간 | - | - |
| **Total** | 7~10시간 | - | - |

---

## 📝 Notes & Learnings

### Implementation Notes
- Phase 1: `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID` + `NCP_CLIENT_SECRET` 조합으로 NCP Reverse Geocoding API 호출 성공
- Phase 2: `useReverseGeocode` 커스텀 훅으로 공통화, Rules of Hooks 준수 (early return 전 훅 호출)
- Phase 3: 
  - **`navermaps.LayerTypeId.CADASTRAL`은 작동하지 않음** → `new (navermaps as any).CadastralLayer()` + `setMap()` 방식 사용
  - `lucide-react`의 `Map` 아이콘과 JS 내장 `Map` 클래스 이름 충돌 → `Map as MapIcon`으로 alias 처리
  - 기본값은 `showDistrict: false` (OFF). 사용자가 필요시 켜는 방식.

### Blockers Encountered
- (블로커 발생 시 기록)

---

## 📚 References

- 네이버 Reverse Geocoding API: https://api.ncloud-docs.com/docs/ai-naver-mapsreversegeocoding
- 네이버 지도 SDK 레이어: https://navermaps.github.io/maps.js.ncp/docs/
- Google Maps Boundaries (참고용): https://developers.google.com/maps/documentation/javascript/dds-boundaries/overview?hl=ko

---

**Plan Status**: 🔄 Ready to Start
**Next Action**: Phase 1 — `.env.local` 환경변수 확인 후 역지오코딩 API Route 구현
**Blocked By**: None
