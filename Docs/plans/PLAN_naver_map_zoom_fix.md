# Implementation Plan: 네이버 지도 프로덕션 줌아웃 버그 수정

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

### 문제 설명
네이버 지도 컴포넌트가 로컬 개발 환경(`npm run dev`)에서는 정상적인 줌 레벨(14)로 표시되지만, Vercel 프로덕션 배포 후에는 줌이 완전히 풀려 전체 서울/수도권이 보일 정도로 축소된 상태로 초기화됩니다.

### 근본 원인 분석
Next.js SSR(Server-side Rendering)로 인해 네이버 지도 컴포넌트가 **서버에서 먼저 렌더링**됩니다. 서버에는 브라우저 DOM이 없으므로 지도 컨테이너의 크기를 알 수 없습니다. 프로덕션 환경에서는 JS가 최적화되어 매우 빠르게 실행되기 때문에, **지도 SDK가 컨테이너의 물리적 크기가 확정되기 전에 초기화**되어 줌이 풀립니다.

로컬 환경에서는 HMR, 소스맵, React Strict Mode 등으로 JS 실행이 느려져서 "우연히" 정상 작동합니다.

### 성공 기준
- [ ] 배포 환경에서 네이버 순위 지도가 줌 14로 정상 표시됨
- [ ] 배포 환경에서 경쟁사 비교 지도가 줌 14로 정상 표시됨
- [ ] 로컬 환경에서도 기존과 동일하게 정상 작동함
- [ ] 사용자의 줌/패닝 조작이 정상적으로 동작함

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `next/dynamic(ssr: false)` 사용 | 지도 컴포넌트를 클라이언트에서만 렌더링하여 SSR 타이밍 문제를 원천 차단 | 초기 로딩 시 지도 영역에 잠시 로딩 UI가 보임(사실상 네이버 SDK 로딩 시간과 겹쳐 체감 차이 없음) |
| `idle` 이벤트 기반 줌 보정 | 지도가 완전히 초기화된 후 줌을 강제 설정하여 이중 안전장치 제공 | 극히 짧은 순간 줌 변경 애니메이션이 보일 수 있음 |
| `useEffect` 기반 줌 보정 제거 | 이전 시도에서 효과 없음이 확인됨 (타이밍이 여전히 너무 빠름) | 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [x] 기존 코드 분석 완료
- [x] `react-naver-maps` 공식 문서 확인 완료

### External Dependencies
- `react-naver-maps` (기존 사용 중, 변경 없음)
- `next/dynamic` (Next.js 내장, 추가 설치 불필요)

---

## 🚀 Implementation Phases

### Phase 1: `next/dynamic(ssr: false)`로 지도 컴포넌트 클라이언트 전용 렌더링
**Goal**: SSR 환경에서 지도가 렌더링되지 않도록 하여 타이밍 문제를 원천 차단
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### 영향 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/(dashboard)/naver-search/[id]/NaverResultsContent.tsx` | `NaverRankHeatmap`와 `NaverCompetitorComparisonMap`을 `dynamic(ssr: false)`로 임포트 |

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 1.1**: `NaverResultsContent.tsx`에서 지도 컴포넌트를 dynamic import로 변경
  - before:
    ```tsx
    import { NaverRankHeatmap } from '@/components/naver/NaverRankHeatmap'
    import { NaverCompetitorComparisonMap } from '@/components/naver/NaverCompetitorComparisonMap'
    ```
  - after:
    ```tsx
    import dynamic from 'next/dynamic'

    const NaverRankHeatmap = dynamic(
      () => import('@/components/naver/NaverRankHeatmap').then(mod => ({ default: mod.NaverRankHeatmap })),
      {
        ssr: false,
        loading: () => (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="w-full h-[500px] bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <div className="text-gray-400">지도 로딩 중...</div>
            </div>
          </div>
        )
      }
    )

    const NaverCompetitorComparisonMap = dynamic(
      () => import('@/components/naver/NaverCompetitorComparisonMap').then(mod => ({ default: mod.NaverCompetitorComparisonMap })),
      {
        ssr: false,
        loading: () => (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[500px] items-center justify-center">
            <div className="text-gray-400">지도 로딩 중...</div>
          </div>
        )
      }
    )
    ```

> ⚠️ **주의**: `NaverRankHeatmap`과 `NaverCompetitorComparisonMap`이 named export인지 default export인지 확인 필요. named export라면 `.then(mod => ({ default: mod.NaverRankHeatmap }))` 패턴 사용.

---

### Phase 2: `idle` 이벤트 기반 줌 보정 (이중 안전장치)
**Goal**: 지도가 완전히 초기화/렌더링된 후 줌을 강제 교정하는 안전장치 추가  
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### 영향 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/naver/NaverRankHeatmap.tsx` | `MapContent` 내부에서 `idle` 이벤트 리스너로 줌 보정 |
| `src/components/naver/NaverCompetitorComparisonMap.tsx` | 동일 패턴 적용 |

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 2.1**: `NaverRankHeatmap.tsx`의 `MapContent`에서 기존 `useEffect` 줌 로직을 `idle` 이벤트 기반으로 변경
  - before:
    ```tsx
    useEffect(() => {
        if (map && !initializedRef.current) {
            initializedRef.current = true
            map.setCenter(new navermaps.LatLng(center.lat, center.lng))
            map.setZoom(14)
        }
    }, [map, navermaps, center])
    ```
  - after:
    ```tsx
    useEffect(() => {
        if (!map || initializedRef.current) return
        // 지도가 완전히 로드된 후(idle 이벤트) 줌 보정
        const listener = naver.maps.Event.addListener(map, 'idle', () => {
            if (!initializedRef.current) {
                initializedRef.current = true
                map.setCenter(new navermaps.LatLng(center.lat, center.lng))
                map.setZoom(14)
            }
            naver.maps.Event.removeListener(listener)
        })
        return () => naver.maps.Event.removeListener(listener)
    }, [map, navermaps, center])
    ```

- [ ] **Task 2.2**: `NaverCompetitorComparisonMap.tsx`에 동일한 패턴 적용

---

### Phase 3: 코드 정리 및 검증
**Goal**: 불필요한 이전 수정 코드 제거 및 최종 검증
**Estimated Time**: 15분
**Status**: ⏳ Pending

#### Tasks

**🔵 REFACTOR: 정리**
- [ ] **Task 3.1**: 불필요해진 import 정리 (`useRef`, `useEffect` 등 사용하지 않게 된 것이 있으면 제거)
- [ ] **Task 3.2**: 이전에 시도했던 주석/코드 잔재 정리

#### Quality Gate ✋

**⚠️ STOP: 모든 체크 항목을 통과해야 완료**

**Build & Tests**:
- [ ] `npm run build` 오류 없이 성공
- [ ] 기존 테스트 통과

**Manual Testing (로컬)**:
- [ ] 네이버 순위 지도가 줌 14로 정상 표시
- [ ] 경쟁사 비교 지도가 줌 14로 정상 표시
- [ ] 사용자 줌/패닝 조작 정상 동작
- [ ] 마커 클릭 시 모달 정상 동작

**Manual Testing (배포)**:
- [ ] ⭐ 배포 환경에서 네이버 순위 지도가 줌 14로 정상 표시
- [ ] ⭐ 배포 환경에서 경쟁사 비교 지도가 줌 14로 정상 표시
- [ ] 배포 환경에서 콘솔 에러(React Error #418) 없음

**Validation Commands**:
```bash
npm run build
npm run lint
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| `dynamic(ssr: false)` 적용 시 지도 로딩 깜빡임 | Medium | Low | `loading` fallback UI를 지도 컨테이너와 동일한 크기로 제공하여 레이아웃 시프트 방지 |
| `idle` 이벤트가 발생하지 않는 경우 | Low | Medium | `setTimeout` 폴백을 추가하여 3초 내에 idle이 없으면 강제 줌 설정 |
| Named export / Default export 불일치 | Low | High | 기존 export 방식을 확인하여 `dynamic` import 패턴 일치시킴 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `NaverResultsContent.tsx`의 import를 원래 static import로 복원
- `next/dynamic` 관련 코드 제거

### If Phase 2 Fails
- `idle` 이벤트 리스너 제거
- 기존 `useEffect` 기반 로직으로 복원

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%

**Overall Progress**: 0% complete

---

## 📝 Notes & Learnings

### 이전 시도 기록
| 시도 | 방법 | 결과 |
|------|------|------|
| 1차 | `suppressHydrationWarning` + 날짜 포맷 수정 | ❌ 효과 없음 |
| 2차 | `useRef` + `useEffect`로 줌 강제 | ❌ ref가 올바른 map 인스턴스를 받지 못함 |
| 3차 | `useState` setter 패턴(`ref={setMap}`) + `useEffect` | ❌ useEffect 타이밍이 여전히 너무 빠름 |
| 4차 | `MapDiv`에 인라인 `height: 500px` 명시 | ❌ 효과 없음 (CSS가 아닌 SDK 초기화 타이밍이 핵심 문제) |

### 핵심 인사이트
- 문제의 본질은 **CSS 높이가 아니라 SSR → Hydration 과정에서 지도 SDK가 초기화되는 타이밍**임
- `next/dynamic(ssr: false)`로 지도를 완전히 클라이언트 렌더링으로 전환하면 SSR 관련 모든 타이밍 문제를 원천 차단할 수 있음
- `idle` 이벤트는 네이버 지도가 모든 타일 로딩과 렌더링을 완료한 후 발생하는 이벤트로, 가장 안전한 줌 보정 시점

---

## 📚 References

### Documentation
- [react-naver-maps 공식 문서](https://zeakd.github.io/react-naver-maps/)
- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)
- [Naver Maps JavaScript API v3 - Events](https://navermaps.github.io/maps.js.ncp/docs/naver.maps.Map.html)

---

**Plan Status**: 🔄 In Progress
**Next Action**: Phase 1 구현 (사용자 승인 후)
**Blocked By**: 사용자 승인
