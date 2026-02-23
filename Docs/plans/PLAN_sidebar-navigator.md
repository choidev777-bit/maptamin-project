# Implementation Plan: 좌측 사이드바 네비게이터 개편

**Status**: ⏳ Pending User Approval
**Started**: 2026-02-23
**Last Updated**: 2026-02-23
**Estimated Completion**: 2026-02-25

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
기존 상단 헤더 바(DesktopNav) 네비게이션을 **좌측 사이드바**로 전환합니다.
사이드바는 3가지 모드(고정/접힘/호버)를 지원하며, 사용자 선호를 `localStorage`에 기억합니다.
모바일은 기존 MobileNav 드로어를 유지하되, 반응형 전환점을 `lg:`로 조정합니다.

### Success Criteria
- [ ] 데스크탑(lg: 이상)에서 좌측 사이드바가 정상 표시
- [ ] 3가지 모드(고정 240px, 접힘 64px, 호버 64px→240px) 전환 가능
- [ ] 모드 선택이 localStorage에 저장되고 새로고침 후에도 유지
- [ ] 현재 페이지가 사이드바에서 하이라이트됨
- [ ] 모바일(lg: 미만)에서 사이드바 숨겨지고 기존 MobileNav 표시
- [ ] 온보딩(`/onboarding`) 페이지에서 사이드바 숨김
- [ ] 미구독(free) 사용자에게 "구독하기" CTA 표시
- [ ] 구글 검색 링크에 플랜 잠금(🔒) 표시
- [ ] 지도 페이지에서 사이드바 토글 시 지도 리사이징 정상 동작
- [ ] `npm run build` 오류 없음
- [ ] 기존 페이지들 레이아웃 깨짐 없음

### User Impact
SaaS 대시보드 표준 UX인 좌측 사이드바로 전환하여, 항상 네비게이션이 보이고, 공간 효율이 높아지며, 기능이 늘어나도 확장 가능한 구조를 확보합니다.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `DashboardLayout`(Server) 유지 + `DashboardShell`(Client) 래퍼 추가 | coding-rules §1.1 SSR-first 준수. SSR 데이터 조회는 Server에, 사이드바 인터랙션은 Client에 분리 | 컴포넌트 한 단계 추가 (Server→Client 경계) |
| `localStorage`로 사이드바 모드 저장 | 글로벌 상태 라이브러리 금지(§4.1), DB 저장은 과도함 | SSR 시 초기 렌더링에서 모드를 모름 → 깜빡임 방지 필요 |
| 반응형 전환점 `lg:` (1024px) | 사이드바(240px) + 콘텐츠 최소 784px, md(768px)는 너무 좁음 | 768~1024px 태블릿이 모바일 UI로 변경 (기존 대비 변화) |
| 기존 MobileNav 드로어 유지 | 검증된 UX, 변경 범위 최소화 | 하단 탭 바 대비 접근성 낮음 (하지만 안정적) |
| CSS transition으로 사이드바 애니메이션 | JS 애니메이션 대비 GPU 가속, 성능 우수 | 복잡한 시퀀스는 어려움 (불필요하므로 OK) |
| `<main>` 레이아웃: `margin-left` 동적 변경 | 사이드바 너비에 콘텐츠 영역 자동 적응 | `max-w-7xl mx-auto` 중앙정렬 → 좌측 기준 배치로 변경 |

---

## 📦 Dependencies

### Required Before Starting
- [x] 기존 DesktopNav, MobileNav, WalletLabel, NavDropdown 구조 파악 완료
- [x] DashboardLayout Server Component 구조 파악 완료
- [x] 진단 기록 페이지(/history) 네비 링크 추가 완료 (이전 Phase)

### External Dependencies
- `lucide-react` — 아이콘 (이미 설치됨)
- `@radix-ui/react-dialog` — WalletLabel 팝업 (이미 설치됨)
- 추가 설치 패키지 없음

---

## 🧪 Test Strategy

### Testing Approach
**UI 중심 리팩토링**: 비즈니스 로직 변경 없음 → 수동 테스트 위주, 빌드 검증 필수

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Manual Tests** | All user flows | 반응형, 모드 전환, 링크 동작 |
| **Build Check** | 100% | `npm run build` 성공 |
| **Visual Regression** | Key pages | 기존 페이지 레이아웃 깨짐 없음 |

---

## 🚀 Implementation Phases

### Phase 1: DashboardShell + Sidebar 코어 구조
**Goal**: Server/Client 경계를 올바르게 분리하고, 사이드바 기본 골격 생성
**Estimated Time**: 3시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**

- [ ] **Task 1.1**: `DashboardShell` Client Component 생성
  - File: `src/components/layout/DashboardShell.tsx`
  - `'use client'` 선언
  - Props: `children`, `user`, `subscription`, `shouldRedirectToOnboarding`
  - 사이드바 모드 상태 관리: `useState<'pinned' | 'collapsed' | 'hover'>('pinned')`
  - `localStorage` 에서 초기값 로드 + 변경 시 저장
  - **SSR 초기 렌더 깜빡임 방지**: 첫 렌더에서 기본값(pinned) 사용, `useEffect`에서 localStorage 값 적용
  - 레이아웃 구조:
    ```
    <div className="flex min-h-screen">
      {/* Desktop Sidebar - lg 이상에서만 표시 */}
      <aside> → <Sidebar /> (lg:block, hidden on mobile)
      
      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header - lg 미만에서만 표시 */}
        <header> → 로고 + MobileNav (lg:hidden)
        
        {/* Content */}
        <main> → {children}
      </div>
    </div>
    ```

- [ ] **Task 1.2**: `DashboardLayout` 수정 — `DashboardShell` 래퍼 적용
  - File: `src/app/(dashboard)/layout.tsx`
  - 변경 내용: 기존 `<header>` + `<main>` 구조를 `<DashboardShell>` 래퍼로 교체
  - **SSR 데이터 조회는 그대로 유지** (Server Component 역할)
  - `DashboardShell`에 `user`, `subscription` props 전달
  - `OnboardingGuard`는 그대로 최상위에 유지

- [ ] **Task 1.3**: `Sidebar` Client Component 생성 (기본 골격)
  - File: `src/components/layout/Sidebar.tsx`
  - Props: `mode`, `onModeChange`, `user`, `subscription`
  - 3가지 모드별 너비:
    - `pinned`: `w-60` (240px) — 아이콘 + 라벨
    - `collapsed`: `w-16` (64px) — 아이콘만
    - `hover`: 기본 `w-16`, 마우스 진입 시 `w-60` (transition)
  - 구성 요소 (빈 영역으로):
    - 상단: 로고 영역
    - 중앙: 네비게이션 링크 영역
    - 하단: 유저 프로필 + 로그아웃
  - 하단에 모드 토글 버튼: 📌(고정) ↔ 접힘 전환

- [ ] **Task 1.4**: 온보딩 페이지 사이드바 숨김 처리
  - `DashboardShell` 내에서 `usePathname()` 체크
  - `pathname.startsWith('/onboarding')` → 사이드바 숨김, 모바일 헤더도 최소화
  - 온보딩 중에는 사이드바 없이 풀 화면 사용

- [ ] **Task 1.5**: `<main>` 콘텐츠 영역 레이아웃 조정
  - 기존: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8`
  - 변경: `flex-1` + 적절한 padding (사이드바 너비에 맞게 자동 조정)
  - `max-w-7xl`은 유지하되 `mx-auto` 제거 or `ml-0`으로 좌측 기준 변경
  - **기존 페이지 레이아웃 깨짐 확인 필수** (대시보드, 검색, 결과, 설정, 히스토리 등)

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` 오류 없음
- [ ] 모든 기존 테스트 통과

**Manual Testing**:
- [ ] 대시보드 페이지(`/dashboard`) — 사이드바 표시 + 콘텐츠 정상
- [ ] 진단 기록(`/history`) — 레이아웃 깨짐 없음
- [ ] 검색 설정(`/naver-search/new`) — 지도 표시 정상
- [ ] 검색 결과(`/naver-search/[id]`) — 히트맵 표시 정상
- [ ] 설정(`/settings`) — 레이아웃 정상
- [ ] 구독 관리(`/dashboard/subscription`) — 레이아웃 정상
- [ ] 온보딩(`/onboarding`) — 사이드바 숨김 확인
- [ ] 모바일 뷰 (Chrome DevTools 375px) — 사이드바 숨김, MobileNav 표시
- [ ] 태블릿 뷰 (768~1024px) — 모바일 UI 표시 확인
- [ ] 사이드바 모드 전환 (pinned → collapsed → pinned) 동작
- [ ] 새로고침 후 모드 유지 (localStorage)

---

### Phase 2: 사이드바 콘텐츠 통합 (링크 + 티켓 + 프로필)
**Goal**: 사이드바에 모든 필수 요소 배치 및 인터랙션 완성
**Estimated Time**: 3시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**

- [ ] **Task 2.1**: `SidebarNavItem` 컴포넌트 생성
  - File: `src/components/layout/SidebarNavItem.tsx`
  - Props: `href`, `icon`, `label`, `isActive`, `isCollapsed`, `isLocked?`, `badge?`
  - `usePathname()` 기반 활성 상태 하이라이팅
  - **활성 라우트 매칭 규칙**:
    - `/dashboard` → "대시보드" (exact match만, `/dashboard/subscription` 제외)
    - `/dashboard/subscription`, `/dashboard/subscription/checkout` → "구독 관리"
    - `/history` → "진단 기록"
    - `/naver-search/*` → "네이버 검색"
    - `/search/*` → "구글 검색"
    - `/settings` → "설정"
  - 접힌 상태: 아이콘만 표시 + 호버 시 tooltip (라벨)
  - 펼쳐진 상태: 아이콘 + 라벨
  - 잠금 상태(`isLocked`): 아이콘 옆 🔒 + 클릭 시 업그레이드 안내

- [ ] **Task 2.2**: `SidebarSearchGroup` (서브메뉴) 컴포넌트 생성
  - File: `src/components/layout/SidebarSearchGroup.tsx`
  - 기존 `NavDropdown` 대체 — 세로 접이식 서브메뉴
  - "내 순위 검색" 클릭 시 하위 링크 펼침/접힘 (accordion)
  - 하위 항목: "네이버 지도 검색", "구글 지도 검색"
  - **접힌 사이드바에서의 동작**: 
    - 아이콘 클릭 → 팝오버(오른쪽)로 서브메뉴 표시
    - 팝오버는 마우스가 벗어나면 300ms 딜레이 후 닫힘
  - **호버 모드에서의 동작**:
    - 호버로 사이드바 펼쳐진 후 → 일반 accordion처럼 동작

- [ ] **Task 2.3**: 사이드바 티켓/구독 영역 구현
  - File: `Sidebar.tsx` 내부 or `SidebarTicketSection.tsx`
  - **구독 사용자**: 
    - 네이버 티켓 잔량 ("N 12" + 프로그레스 바)
    - 구글 티켓 잔량 ("G 8" + 프로그레스 바, 프리미엄만)
    - 현재 플랜명 표시 ("프로 플랜")
    - 클릭 시 기존 `WalletLabel` Dialog 열기 (추가 구매 / 업그레이드)
  - **미구독 사용자**:
    - "구독하기" CTA 버튼 (프라이머리 색상, 눈에 띄게)
    - 클릭 → `/dashboard/subscription` 이동
  - **접힌 상태**: 티켓 아이콘(🎫)만 표시 + 호버 시 잔량 tooltip

- [ ] **Task 2.4**: 사이드바 유저 프로필 + 로그아웃
  - 사이드바 최하단 고정 (sticky bottom)
  - 펼쳐진 상태: 아바타(이미지 or 이니셜) + 이름 + 로그아웃 아이콘
  - 접힌 상태: 아바타만 + 호버 시 이름 tooltip
  - 로그아웃 동작: 기존 MobileNav의 `handleLogout` 동일

- [ ] **Task 2.5**: 사이드바 로고 영역
  - 펼쳐진 상태: 기존 `MaptaminLogo` (3×3 그리드 + "Maptamin" 텍스트)
  - 접힌 상태: 그리드 아이콘만 (텍스트 숨김)
  - 클릭 → `/dashboard` 이동

- [ ] **Task 2.6**: 네비게이션 링크 목록 배치
  - 순서:
    1. 대시보드 (`Home`)
    2. 진단 기록 (`History`)
    3. 내 순위 검색 (접이식 그룹)
       - 네이버 지도 검색
       - 구글 지도 검색 (잠금 가능)
    4. ── 구분선 ──
    5. 설정 (`Settings`)
    6. 구독 관리 (`CreditCard`)

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 3 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` 오류 없음

**Manual Testing**:
- [ ] 모든 6개 네비 링크 클릭 → 올바른 페이지 이동
- [ ] 현재 페이지 하이라이트 정상 (6개 라우트 각각 확인)
- [ ] `/naver-search/abc123` → "네이버 검색" 하이라이트
- [ ] `/dashboard/subscription` → "구독 관리" 하이라이트 ("대시보드" 아님)
- [ ] 서브메뉴(내 순위 검색) 펼침/접힘 정상
- [ ] 접힌 사이드바에서 서브메뉴 팝오버 표시
- [ ] 티켓 잔량 표시 정상 (구독 사용자)
- [ ] 미구독 사용자: "구독하기" CTA 표시
- [ ] 구글 검색 잠금(🔒) 표시 (스타터/프로 플랜)
- [ ] 로그아웃 버튼 동작
- [ ] 접힌 상태에서 아이콘 호버 시 tooltip 표시

---

### Phase 3: 호버 모드 + 애니메이션 + 엣지케이스

**Goal**: 호버 확장 모드 완성, CSS 전환 애니메이션, 모든 엣지케이스 처리
**Estimated Time**: 2~3시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**

- [ ] **Task 3.1**: 호버 모드 구현
  - `onMouseEnter` / `onMouseLeave` 이벤트
  - **진입**: 즉시 확장 (transition: width 200ms ease)
  - **이탈**: 300ms 딜레이 후 접힘 (`setTimeout` + cleanup)
  - 딜레이 중 마우스 재진입 시 타이머 취소 (flickering 방지)

- [ ] **Task 3.2**: 호버 모드 엣지케이스 처리
  - **WalletLabel Dialog 열림 상태**: Dialog가 열려 있으면 사이드바 접힘 방지
    - Dialog의 `onOpenChange`로 상태 추적
    - Dialog open 중에는 hover collapse 비활성
  - **서브메뉴 팝오버 열림 상태**: 팝오버 open 중에는 접힘 방지
  - **터치 디바이스 감지**: 
    - `@media (hover: none)` → 호버 모드 비활성, 고정/접힘만 선택 가능
    - 또는 첫 터치 이벤트 발생 시 호버 모드 자동 해제

- [ ] **Task 3.3**: CSS 전환 애니메이션
  - 사이드바 width 전환: `transition: width 200ms ease-in-out`
  - `<main>` margin 전환: `transition: margin-left 200ms ease-in-out`
  - 사이드바 내부 라벨 fade: `transition: opacity 150ms` (접힐 때 라벨이 사라지는 효과)
  - **CLS 최소화**: `will-change: width` 힌트

- [ ] **Task 3.4**: 지도 컴포넌트 리사이징 대응
  - 사이드바 전환 시 `transitionend` 이벤트 + `window.dispatchEvent(new Event('resize'))`
  - 이렇게 하면 Naver Maps / Google Maps가 자동으로 리사이즈 감지
  - **대안**: `ResizeObserver`를 사용하는 컴포넌트가 있으면 자동 대응됨 (확인 필요)

- [ ] **Task 3.5**: 키보드 접근성
  - `Tab` 키로 사이드바 링크 간 이동 가능
  - 접힌 사이드바에서 `Enter`/`Space`로 서브메뉴 팝오버 열림
  - 모드 토글 버튼 `aria-label` 추가 ("사이드바 고정", "사이드바 접기")
  - 사이드바 `<nav role="navigation" aria-label="메인 메뉴">`

- [ ] **Task 3.6**: z-index 정리
  - 사이드바: `z-40` (콘텐츠 위, 모달 아래)
  - 모바일 헤더: `z-50` (기존 유지)
  - 서브메뉴 팝오버: `z-50`
  - Dialog/모달: `z-50` (기존 유지)
  - 호버 확장 시 오버레이: 없음 (콘텐츠 위에 사이드바만 확장, 콘텐츠는 이동 안함)

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 4 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` 오류 없음

**Manual Testing**:
- [ ] 호버 모드: 마우스 진입 → 확장, 이탈 → 300ms 후 접힘
- [ ] 호버 모드: 빠르게 진입/이탈 반복 → flickering 없음
- [ ] 호버 모드: Dialog 열린 상태에서 마우스 이탈 → 사이드바 유지
- [ ] 호버 모드: 서브메뉴 팝오버 열린 상태에서 마우스 이탈 → 사이드바 유지
- [ ] 애니메이션: 모드 전환 시 부드러운 전환 (끊김 없음)
- [ ] 지도 페이지: 사이드바 토글 후 지도 크기 정상 조정
- [ ] 키보드: Tab 키로 사이드바 내 링크 순회 가능
- [ ] Chrome DevTools (375px) — 사이드바 완전 숨겨짐

---

### Phase 4: 레거시 정리 + 문서 업데이트
**Goal**: 기존 DesktopNav 제거, 문서 동기화, 최종 검수
**Estimated Time**: 1~2시간
**Status**: ⏳ Pending

#### Tasks

**🔵 REFACTOR: Clean Up**

- [ ] **Task 4.1**: 레거시 컴포넌트 제거/정리
  - `DesktopNav.tsx` → 삭제 (사이드바가 완전히 대체)
  - `NavDropdown.tsx` → 삭제 (SidebarSearchGroup이 대체)
  - `DashboardLayout`에서 `DesktopNav` import 제거
  - **주의**: `MobileNav`는 유지 (모바일 전용)
  - **주의**: `WalletLabel`은 유지 (사이드바 + Dialog에서 재사용)

- [ ] **Task 4.2**: MobileNav 업데이트 (필요 시)
  - 사이드바와 동일한 링크 순서로 맞춤
  - "구독 관리" 링크 추가 (현재 없음)
  - 브레이크포인트 `md:hidden` → `lg:hidden` 변경

- [ ] **Task 4.3**: `architecture_data_flow.md` 업데이트
  - Dashboard Layout 섹션: 상단 헤더 → 좌측 사이드바 구조 반영
  - File Index: 새 파일들 추가 (DashboardShell, Sidebar, SidebarNavItem 등)
  - 기존 DesktopNav, NavDropdown 삭제 반영

- [ ] **Task 4.4**: `component_tree.md` 업데이트
  - Dashboard Layout 섹션 전면 수정
  - layout/ 디렉토리: DesktopNav 삭제, Sidebar/DashboardShell/SidebarNavItem/SidebarSearchGroup 추가
  - 컴포넌트 수 업데이트 (DesktopNav, NavDropdown 삭제 → Sidebar, DashboardShell, SidebarNavItem, SidebarSearchGroup, SidebarTicketSection 추가)
  - Mermaid 다이어그램 업데이트

- [ ] **Task 4.5**: 최종 전체 페이지 검수
  - 모든 라우트 방문하여 레이아웃 확인
  - 모든 모드 전환 확인
  - 컴포넌트 수 최종 카운트

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 오류 없음
- [ ] 사용되지 않는 import/파일 없음

**Manual Testing (전체 라우트)**:
- [ ] `/dashboard` — 정상
- [ ] `/dashboard/subscription` — 정상
- [ ] `/dashboard/subscription/checkout` — 정상
- [ ] `/history` — 정상
- [ ] `/naver-search/new` — 정상
- [ ] `/naver-search/[id]` (결과 페이지) — 정상
- [ ] `/search/new` — 정상
- [ ] `/search/[id]` (결과 페이지) — 정상
- [ ] `/settings` — 정상
- [ ] `/onboarding` — 사이드바 숨김 확인
- [ ] 모바일 뷰 (375px) — 전 라우트 정상

**Documentation**:
- [ ] architecture_data_flow.md 최신 반영
- [ ] component_tree.md 최신 반영

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| `<main>` 레이아웃 변경으로 기존 페이지 깨짐 | **High** | **High** | Phase 1에서 모든 라우트 수동 테스트, `max-w-7xl` 유지하되 margin 조정 |
| SSR 초기 렌더 시 사이드바 깜빡임 (localStorage 비동기) | Medium | Medium | 기본값(pinned) 사용 → useEffect에서 교정, CSS transition으로 부드럽게 |
| 호버 모드에서 Dialog/팝오버 충돌 | Medium | Medium | Dialog open 상태 추적, open 중 hover collapse 비활성 |
| 지도 리사이즈 대응 미흡 | Medium | High | `transitionend` + `window resize` 이벤트 발행, 결과 페이지에서 집중 테스트 |
| 768~1024px 사용자 경험 변화 | Low | Low | 의도적 결정이므로 문서화, 사이드바 공간 확보 위한 불가피한 선택 |
| 호버 모드 터치 디바이스 오작동 | Low | Medium | `@media (hover: none)` → 호버 모드 선택 불가 처리 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
**가장 리스크 높은 Phase — 레이아웃 전면 변경**
- `DashboardShell.tsx` 삭제
- `Sidebar.tsx` 삭제
- `layout.tsx` git revert → 기존 header 구조 복원
- `SidebarNavItem.tsx` 등 새 파일 삭제

### If Phase 2 Fails
- Phase 1 완성 상태로 복원 (빈 사이드바)
- 새 서브컴포넌트 파일들 삭제

### If Phase 3 Fails
- 호버 모드 코드 제거, 고정/접힘만 유지
- 애니메이션 CSS 제거 (기능은 유지, 전환만 즉시 적용)

### If Phase 4 Fails
- 레거시 파일 삭제 취소 (git restore)
- 문서 변경 revert

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%
- **Phase 4**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 3시간 | - | - |
| Phase 2 | 3시간 | - | - |
| Phase 3 | 2~3시간 | - | - |
| Phase 4 | 1~2시간 | - | - |
| **Total** | 9~11시간 | - | - |

---

## 📝 Notes & Learnings

### 파일 구조 (최종 예상)
```
src/components/layout/
├── DashboardShell.tsx        ← NEW: Client 래퍼 (사이드바 + main 배치)
├── Sidebar.tsx               ← NEW: 사이드바 메인 (3모드)
├── SidebarNavItem.tsx        ← NEW: 개별 링크 아이템
├── SidebarSearchGroup.tsx    ← NEW: 접이식 서브메뉴 (내 순위 검색)
├── SidebarTicketSection.tsx  ← NEW: 티켓/구독 상태 영역
├── MobileNav.tsx             ← KEEP: 모바일 드로어 (lg:hidden 변경)
├── WalletLabel.tsx           ← KEEP: 티켓 Dialog (사이드바에서도 재사용)
├── OnboardingGuard.tsx       ← KEEP: 온보딩 리다이렉트
├── DesktopNav.tsx            ← DELETE: 사이드바가 대체
└── NavDropdown.tsx           ← DELETE: SidebarSearchGroup이 대체
```

### 활성 라우트 매칭 규칙 (구현 시 참조)
```typescript
const ROUTE_MAP = [
  { href: '/dashboard', match: 'exact' },
  { href: '/history', match: 'startsWith' },
  { href: '/naver-search', match: 'startsWith' },  // /new, /[id] 모두 매칭
  { href: '/search', match: 'startsWith' },          // /new, /[id] 모두 매칭
  { href: '/settings', match: 'startsWith' },
  { href: '/dashboard/subscription', match: 'startsWith' },  // 대시보드보다 우선
]
// 매칭 순서: 긴 경로부터 체크 (우선순위)
```

### 사이드바 모드 시각화
```
[고정 Pinned]         [접힘 Collapsed]     [호버 Hover]
┌─────────┬─────┐   ┌──┬──────────┐    ┌──┬──────────┐
│ 🏠 대시보드 │     │   │🏠│          │    │🏠│          │
│ 📊 진단기록 │     │   │📊│          │    │📊│ ← hover  │
│ 🔍 순위검색 │     │   │🔍│          │    │  │          │
│  ├─ 네이버  │     │   │  │          │    │  │          │
│  └─ 구글🔒  │     │   │⚙│          │    │⚙│          │
│ ⚙ 설정     │     │   │💳│          │    │💳│          │
│ 💳 구독관리 │     │   │  │          │    │  │          │
│ ────────  │     │   │──│          │    │──│          │
│ 🎫 N12 G8 │     │   │🎫│          │    │🎫│ N12 G8   │
│ 👤 홍길동  │     │   │👤│          │    │👤│ 홍길동    │
│  📌 고정   │     │   │📌│          │    │📌│          │
└─────────┴─────┘   └──┴──────────┘    └──┴──────────┘
   240px    flex-1      64px   flex-1      64px → 240px
```

---

## 📚 References

### Documentation
- [architecture_data_flow.md](../../Docs/important_files/architecture_data_flow.md) — §1 Layout, §17 File Index
- [component_tree.md](../../Docs/important_files/component_tree.md) — §2 Dashboard Layout, §17 Directory Index
- [coding-rules.md](../../Docs/important_files/coding-rules.md) — §1.1 SSR-first, §2.2 Boundary, §4.1 No Global State
- [erd_design.md](../../Docs/important_files/erd_design.md) — user_subscriptions 스키마

### Vercel Best Practices Applied
- `server-serialization` — Server에서 최소 데이터만 Client로 전달
- `rerender-lazy-state-init` — localStorage 함수 초기화로 불필요한 호출 방지
- `bundle-dynamic-imports` — 사이드바 자체는 가볍지만, 필요 시 heavy 서브컴포넌트 분리
- `rendering-content-visibility` — 접힌 상태에서 라벨 텍스트에 `content-visibility: hidden` 적용 가능

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All phases completed with quality gates passed
- [ ] Full integration testing performed (모든 라우트)
- [ ] Documentation updated (architecture_data_flow.md, component_tree.md)
- [ ] 레거시 파일 정리 완료 (DesktopNav, NavDropdown 삭제)
- [ ] Bundle size impact verified (DesktopNav 삭제로 감소 예상)
- [ ] Mobile responsiveness tested (375px, 768px, 1024px, 1440px)
- [ ] Accessibility: aria-label, keyboard navigation
- [ ] Plan document archived

---

**Plan Status**: ⏳ Pending User Approval
**Next Action**: 유저 승인 후 Phase 1 시작
**Blocked By**: None
