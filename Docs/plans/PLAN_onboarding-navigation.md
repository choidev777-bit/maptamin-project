# Implementation Plan: 온보딩 페이지 네비게이션 활성화

**Status**: ⏳ 대기 중
**Started**: 2026-02-26
**Last Updated**: 2026-02-26
**Estimated Completion**: 2026-02-26

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

### 문제 상황
결제 완료 후 온보딩 단계에서 `DashboardShell.tsx`가 사이드바와 모바일 네비게이션을 **의도적으로 숨기고 있음**.
이로 인해 유저가 온보딩 중에:
- ❌ 로그아웃 불가
- ❌ 구독 관리/환불 페이지 접근 불가
- ❌ 설정 페이지 접근 불가

### 원인 코드
`src/components/layout/DashboardShell.tsx`:
```tsx
const isOnboarding = pathname.startsWith('/onboarding')

{!isOnboarding && (<Sidebar ... />)}     // 사이드바 숨김
{!isOnboarding && (<MobileNav ... />)}   // 모바일 네비 숨김
```

### Feature Description
온보딩 중에도 **기존 사이드바/모바일 네비**를 그대로 표시하되, 온보딩 중 접근 불가한 메뉴는 시각적으로 비활성화(잠금)하여 혼란을 방지.

### Success Criteria
- [ ] 온보딩 중 사이드바(데스크톱) + 모바일 네비 표시됨
- [ ] 로그아웃 가능
- [ ] 구독 관리 (`/dashboard/subscription`) 이동 가능
- [ ] 설정 (`/settings`) 이동 가능
- [ ] 접근 불가 메뉴 (대시보드, 진단기록, 실시간 검색, 리포트설정)는 잠금(비활성) 처리
- [ ] 모바일에서도 동일하게 동작
- [ ] 기존 온보딩 UX 유지 (본문 영역 정상 작동)

### User Impact
- 결제 직후 환불 경로에 항상 접근 가능 (전자상거래법 준수)
- 로그아웃 가능
- "갇힌 느낌" 해소

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 기존 사이드바 재사용 | 새 컴포넌트 불필요, 코드 변경 최소화 | 접근 불가 메뉴의 잠금 처리 필요 |
| `isLocked` 기존 패턴 활용 | Sidebar에 이미 `isLocked` → `SidebarLink` 잠금 렌더링 로직 존재 | 추가 개발 없이 재사용 가능 |
| OnboardingGuard exempt 경로 확장 | `/dashboard/settings`도 온보딩 중 접근 허용 필요 | 최소 변경 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `DashboardShell.tsx` 구조 파악 완료
- [x] `Sidebar.tsx` 메뉴 구조 + `isLocked` 패턴 파악 완료
- [x] `MobileNav.tsx` 메뉴 구조 파악 완료
- [x] `OnboardingGuard.tsx` exempt 경로 파악 완료

### External Dependencies
- 없음 (기존 의존성만 사용)

---

## 🚀 Implementation Phases

### Phase 1: 온보딩 중 사이드바/모바일 네비 표시 + 메뉴 잠금
**Goal**: 온보딩 페이지에서 기존 사이드바와 모바일 네비를 표시하되, 접근 불가 메뉴를 잠금 처리
**Estimated Time**: 1 hour
**Status**: ⏳ Pending

#### 수정 파일 및 내용

**파일 1: `src/components/layout/OnboardingGuard.tsx`**
- exempt 경로에 `/settings` 추가

현재:
```tsx
const isExemptPath = pathname.startsWith('/onboarding')
    || pathname.startsWith('/dashboard/subscription')
```
변경:
```tsx
const isExemptPath = pathname.startsWith('/onboarding')
    || pathname.startsWith('/dashboard/subscription')
    || pathname.startsWith('/settings')
```

---

**파일 2: `src/components/layout/DashboardShell.tsx`**
- `isOnboarding` 변수는 유지 (mainMarginLeft 계산에 사용)
- 사이드바 / 모바일 헤더의 `{!isOnboarding && (...)}` 조건 제거 → 항상 표시
- `isOnboarding` 상태를 Sidebar와 MobileNav에 prop으로 전달

현재:
```tsx
{!isOnboarding && (
    <div className="hidden lg:block">
        <Sidebar ... />
    </div>
)}
{!isOnboarding && (
    <header className="lg:hidden ...">
        ...
        <MobileNav ... />
    </header>
)}
```
변경:
```tsx
<div className="hidden lg:block">
    <Sidebar ... isOnboarding={isOnboarding} />
</div>
<header className="lg:hidden ...">
    ...
    <MobileNav ... isOnboarding={isOnboarding} />
</header>
```

⚠️ **주의 1**: `mainMarginLeft`의 `isOnboarding` 삼항 연산은 **제거해야 함**.
온보딩에서도 사이드바가 표시되므로, 같은 마진 로직 적용 필요:
```tsx
// 변경 전
const mainMarginLeft = isOnboarding
    ? '0px'
    : sidebarMode === 'pinned' ? '240px' : '64px'

// 변경 후
const mainMarginLeft = sidebarMode === 'pinned' ? '240px' : '64px'
```

⚠️ **주의 2**: 모바일 헤더의 로고 링크(`<a href="/dashboard">`)를 온보딩 중에는 `/onboarding`으로 변경:
```tsx
// 변경 전
<a href="/dashboard" className="flex items-center gap-2">

// 변경 후
<a href={isOnboarding ? '/onboarding' : '/dashboard'} className="flex items-center gap-2">
```

---

**파일 3: `src/components/layout/Sidebar.tsx`**
- Props에 `isOnboarding?: boolean` 추가
- `isOnboarding`이 `true`일 때, 접근 불가 메뉴에 `isLocked: true` 적용
- 기존 `SidebarLink` 컴포넌트가 `isLocked` 렌더링을 이미 지원 (회색 + `cursor-not-allowed` + 자물쇠 아이콘)

잠금 대상 메뉴 (온보딩 중):
| 메뉴 | `isLocked` |
|------|----------|
| 대시보드 (`/dashboard`) | ✅ 잠금 |
| 진단 기록 (`/history`) | ✅ 잠금 |
| 리포트 설정 (`/report-settings`) | ✅ 잠금 |
| 실시간 순위 진단 (네이버/구글) | ✅ 잠금 |
| 설정 (`/settings`) | 허용 |
| 구독 관리 (`/dashboard/subscription`) | 허용 |
| 로그아웃 | 허용 |

변경:
```tsx
const mainRoutes: NavRoute[] = [
    { href: '/dashboard', label: '대시보드', icon: Home, match: 'exact', isLocked: isOnboarding },
    { href: '/history', label: '진단 기록', icon: History, match: 'startsWith', isLocked: isOnboarding },
    { href: '/report-settings', label: '리포트 설정', icon: CalendarClock, match: 'startsWith', isLocked: !subscribed || isOnboarding },
]

const searchSubRoutes: NavRoute[] = [
    { href: '/naver-search', label: '네이버', icon: NaverPlatformIcon, match: 'startsWith', isLocked: isOnboarding },
    { href: '/search', label: '구글', icon: GooglePlatformIcon, match: 'startsWith', isLocked: !canGoogle || isOnboarding },
]
```
- 검색 그룹 아코디언 버튼도 온보딩 중이면 비활성화 처리 필요:
```tsx
// 온보딩 중이면 아코디언 토글 비활성
<button
    onClick={isOnboarding ? undefined : () => setSearchGroupOpen(!searchGroupOpen)}
    disabled={isOnboarding}
    className={`... ${isOnboarding ? 'text-gray-400 cursor-not-allowed' : '...'}`}
>
```

⚠️ **로고 링크 처리**: 사이드바 로고(`<Link href="/dashboard">`)를 온보딩 중에는 `/onboarding`으로 변경:
```tsx
// 변경 전
<Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">

// 변경 후
<Link href={isOnboarding ? '/onboarding' : '/dashboard'} className="flex items-center gap-3 overflow-hidden">
```

---

**파일 4: `src/components/layout/MobileNav.tsx`**
- Props에 `isOnboarding?: boolean` 추가
- 온보딩 중 접근 불가 메뉴에 잠금 스타일 적용 (회색 + 클릭 비활성)
- 접근 가능 메뉴: 설정, 로그아웃 (구독 관리는 MobileNav에 없으나 검토 필요)

잠금 대상:
| 메뉴 | 잠금 |
|------|------|
| 대시보드 | ✅ 잠금 |
| 진단 기록 | ✅ 잠금 |
| 내 순위 검색 (네이버/구글) | ✅ 잠금 |
| 설정 | 허용 |
| 로그아웃 | 허용 |

⚠️ **추가 확인**: MobileNav에 "구독 관리" 메뉴가 현재 없음.
WalletLabel 컴포넌트에 구독 관리 링크가 포함되어 있는지 확인 → 없다면 MobileNav에 "구독 관리" 메뉴 항목 추가 필요.

---

#### Tasks

- [ ] **Task 1.1**: `OnboardingGuard.tsx`에 `/settings` exempt 경로 추가
- [ ] **Task 1.2**: `DashboardShell.tsx`에서 `!isOnboarding` 조건 제거 + `isOnboarding` prop 전달 + `mainMarginLeft` 수정 + 모바일 헤더 로고 링크 변경
- [ ] **Task 1.3**: `Sidebar.tsx`에 `isOnboarding` prop 추가 + 메뉴 잠금 로직 적용 + 로고 링크 변경
- [ ] **Task 1.4**: `MobileNav.tsx`에 `isOnboarding` prop 추가 + 메뉴 잠금 로직 적용 + 구독 관리 메뉴 추가 (없는 경우)
- [ ] **Task 1.5**: 코드 정리 및 반응형 확인

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] 기존 테스트 통과

**Manual Testing (Desktop)**:
- [ ] 온보딩 페이지에서 좌측 사이드바 정상 표시
- [ ] 잠금 메뉴 (대시보드, 진단기록, 검색, 리포트설정) → 회색 + 클릭 불가 + 자물쇠 아이콘
- [ ] 허용 메뉴 (설정, 구독 관리) → 정상 클릭 + 페이지 이동
- [ ] 로그아웃 → 정상 동작 → `/login` 이동
- [ ] 구독 관리 → `/dashboard/subscription` 이동 → 사이드바 표시 → 브라우저 뒤로가기 → 온보딩 복귀
- [ ] 온보딩 스텝 진행 정상 (사이드바가 본문 영역을 가리지 않음)
- [ ] 사이드바 접기/펼치기 정상 동작

**Manual Testing (Mobile)**:
- [ ] 온보딩 페이지에서 상단 헤더 + 햄버거 메뉴 표시
- [ ] 메뉴 열기 → 잠금/허용 메뉴 구분 정상
- [ ] 설정, 로그아웃, 구독 관리 정상 동작
- [ ] 온보딩 본문이 정상 표시 (헤더에 공간 차지)

**Validation Commands**:
```bash
npm run build
npm test
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| 온보딩 본문 레이아웃 깨짐 | Low | Medium | `mainMarginLeft` 수정으로 사이드바 공간 확보. 온보딩 `max-w-2xl` 본문은 사이드바 안쪽에서 정상 표시 |
| MobileNav에 구독 관리 없음 | Medium | Medium | MobileNav 메뉴에 구독 관리 항목 추가 |
| 검색 아코디언 비활성 처리 미흡 | Low | Low | 아코디언 버튼에 `disabled` + 스타일 변경 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
**Steps to revert**:
- `OnboardingGuard.tsx`: `/settings` exempt 제거
- `DashboardShell.tsx`: `!isOnboarding` 조건 복원 + `mainMarginLeft` 원상복구
- `Sidebar.tsx`: `isOnboarding` prop 제거 + 메뉴 `isLocked` 원복
- `MobileNav.tsx`: `isOnboarding` prop 제거 + 잠금 로직 원복

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%

**Overall Progress**: 0% complete

---

## 📝 Notes & Learnings

### 핵심 발견
- `Sidebar.tsx`의 `SidebarLink`에 이미 `isLocked` 패턴이 존재 (회색 + `cursor-not-allowed` + Lock 아이콘) → 재사용 가능
- `OnboardingGuard.tsx`의 `isExemptPath`에 `/dashboard/subscription`이 이미 포함됨
- `MobileNav.tsx`에는 "구독 관리" 메뉴가 빠져있음 → 추가 필요

### 수정 파일 요약
| 파일 | 변경 내용 |
|------|-----------|
| `OnboardingGuard.tsx` | `/settings` exempt 추가 (1줄) |
| `DashboardShell.tsx` | `!isOnboarding` 조건 제거 + prop 전달 + margin 수정 |
| `Sidebar.tsx` | `isOnboarding` prop + 메뉴 잠금 + 검색 아코디언 비활성 |
| `MobileNav.tsx` | `isOnboarding` prop + 메뉴 잠금 + 구독 관리 메뉴 추가 |

---

## 📚 References

### 관련 파일
- `src/components/layout/DashboardShell.tsx` — 온보딩 시 네비 숨김 로직
- `src/components/layout/OnboardingGuard.tsx` — 온보딩 리다이렉트 + exempt 경로
- `src/components/layout/Sidebar.tsx` — 데스크톱 사이드바 (isLocked 패턴)
- `src/components/layout/MobileNav.tsx` — 모바일 네비게이션
- `src/app/(dashboard)/onboarding/page.tsx` — 온보딩 메인 페이지
