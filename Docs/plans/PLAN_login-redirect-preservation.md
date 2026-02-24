# Implementation Plan: 로그인 후 리다이렉트 URL 보존

**Status**: ⏳ Pending
**Started**: 2026-02-24
**Last Updated**: 2026-02-24
**Estimated Completion**: 2026-02-24 (1시간 이내)

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

알림톡 링크를 클릭하면 카카오톡 인앱 브라우저에서 열리는데, 미로그인 상태에서 로그인 후 원래 가려던 URL(`/naver-search/[id]`) 대신 항상 `/dashboard`로 이동하는 문제를 해결한다.

### 현재 플로우 (문제)

```
알림톡 링크 → /naver-search/[id]
→ 미로그인 → middleware에서 /login으로 redirect (원래 URL 잃어버림)
→ 로그인 → /auth/callback → /dashboard (기본값)
→ 원래 보려던 페이지로 갈 수 없음 ❌
```

### 수정 후 플로우

```
알림톡 링크 → /naver-search/[id]
→ 미로그인 → middleware에서 /login?redirectTo=/naver-search/[id] 로 redirect
→ 로그인 버튼 클릭 → OAuth에 redirectTo 전달
→ /auth/callback?next=/naver-search/[id]
→ /naver-search/[id] 로 이동 ✅
```

### Success Criteria

- [ ] 알림톡 링크 클릭 → 미로그인 → 로그인 → 원래 리포트 페이지로 자동 이동
- [ ] 기존 로그인 플로우 (프라이싱 → 결제 → 체크아웃) 정상 작동 유지
- [ ] `npx next build` 성공

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `redirectTo` 쿼리 파라미터 방식 | 표준적인 웹 패턴, 상태 관리 불필요, URL만으로 동작 | 없음 (업계 표준) |
| middleware에서 원래 URL을 쿼리에 보존 | 서버 컴포넌트에서도 접근 가능, localStorage 불필요 | URL이 길어질 수 있음 |
| plan/billing 파라미터와 공존 | 기존 로직 유지하면서 redirectTo 추가 | 우선순위 결정 필요 (plan 있으면 plan 우선) |

---

## 📦 Dependencies

### Required Before Starting
- [x] 현재 인증 플로우 코드 분석 완료

### 수정 대상 파일 (4개)

| # | 파일 | 역할 |
|---|------|------|
| 1 | `src/middleware.ts` | 미로그인 시 원래 URL을 `redirectTo` 파라미터로 전달 |
| 2 | `src/app/(auth)/login/page.tsx` | `redirectTo` 파라미터를 로그인 버튼에 전달 |
| 3 | `src/components/auth/KakaoLoginButton.tsx` | `redirectTo`를 OAuth callback에 `next` 파라미터로 포함 |
| 4 | `src/components/auth/GoogleLoginButton.tsx` | 동일 |

### 수정 불필요 파일

| 파일 | 이유 |
|------|------|
| `src/app/(auth)/auth/callback/route.ts` | 이미 `next` 파라미터를 읽어서 리다이렉트함 ✅ |
| `src/lib/kakao/messaging.ts` | URL 생성은 정상 (`www.maptamin.com/naver-search/[id]`) ✅ |

---

## 🚀 Implementation Phases

### Phase 1: Middleware에서 원래 URL 보존
**Goal**: 미로그인 리다이렉트 시 원래 URL을 쿼리 파라미터로 전달
**Estimated Time**: 10분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 1.1**: `src/middleware.ts` 수정
  - 현재 코드:
    ```typescript
    if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }
    ```
  - 수정 후:
    ```typescript
    if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        // 원래 가려던 URL 보존 (단, /login 순환 방지)
        const originalPath = request.nextUrl.pathname + request.nextUrl.search
        url.searchParams.set('redirectTo', originalPath)
        return NextResponse.redirect(url)
    }
    ```

#### Quality Gate ✋
- [ ] `npx next build` 성공
- [ ] 기존 `/login?plan=starter` 플로우 영향 없음 확인

---

### Phase 2: Login 페이지 → 로그인 버튼에 redirectTo 전달
**Goal**: `redirectTo` 파라미터를 KakaoLoginButton/GoogleLoginButton에 전달
**Estimated Time**: 10분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: `src/app/(auth)/login/page.tsx` 수정
  - `searchParams`에서 `redirectTo` 추가로 읽기
  - 로그인 버튼 컴포넌트에 `redirectTo` prop 전달

- [ ] **Task 2.2**: `src/components/auth/KakaoLoginButton.tsx` 수정
  - `redirectTo` prop 추가
  - **우선순위 로직**:
    - `plan`이 있으면 → 기존대로 checkout 페이지로 (`plan` 우선)
    - `redirectTo`가 있으면 → `next=redirectTo`로 callback에 전달
    - 둘 다 없으면 → 기존대로 `/dashboard`

- [ ] **Task 2.3**: `src/components/auth/GoogleLoginButton.tsx` 수정
  - 동일한 `redirectTo` 로직 추가

#### Quality Gate ✋
- [ ] `npx next build` 성공
- [ ] 시나리오 테스트:
  - [ ] `/login?plan=starter` → 로그인 → `/dashboard/subscription/checkout?plan=starter` ✅
  - [ ] `/login?redirectTo=/naver-search/abc` → 로그인 → `/naver-search/abc` ✅
  - [ ] `/login` (파라미터 없음) → 로그인 → `/dashboard` ✅

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| plan과 redirectTo 충돌 | Low | Med | plan이 있으면 plan 우선 (기존 동작 유지) |
| Open Redirect 취약점 | Med | High | redirectTo가 `/`로 시작하는 상대경로만 허용 |
| 순환 리다이렉트 | Low | High | `/login`으로 redirectTo 설정 방지 |

### 보안: Open Redirect 방지
```typescript
// 잘못된 예: redirectTo=https://evil.com → 외부 사이트로 리다이렉트
// 방지: 상대 경로만 허용
if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    // 안전한 내부 경로만 사용
}
```

---

## 🔄 Rollback Strategy

4개 파일의 변경사항을 되돌리면 원래 동작(`/dashboard`로 리다이렉트)으로 복귀.
`git revert` 1회로 완료.

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ Pending
- **Phase 2**: ⏳ Pending

**Overall Progress**: 0%
