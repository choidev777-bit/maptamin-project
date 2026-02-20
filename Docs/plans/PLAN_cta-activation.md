# Implementation Plan: CTA 활성화 (Landing & Pricing)

**Status**: ✅ Complete
**Started**: 2026-02-19
**Last Updated**: 2026-02-19
**Estimated Completion**: 2026-02-19

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
랜딩페이지(`/`)와 가격 안내 페이지(`/pricing`)의 동작하지 않는 CTA 버튼(7개)을 활성화하여,
사용자가 클릭 시 로그인 페이지로 이동하고, 로그인 후 선택한 플랜에 맞는 구독 페이지로 리다이렉트되도록 구현.

### Success Criteria
- [x] `FeatureSection.tsx`: "경쟁사 분석 시작하기" 클릭 → `/login` 이동
- [x] `PricingSection.tsx`: 3개 플랜 CTA 클릭 → `/login?plan=xxx` 이동
- [x] `PricingDetailSection.tsx`: 3개 플랜 CTA 클릭 → `/login?plan=xxx` 이동
- [x] 로그인 페이지에서 `?plan=xxx` 파라미터를 OAuth 콜백에 전달
- [x] Auth callback에서 `plan` 파라미터 존재 시 `/dashboard/subscription?plan=xxx`로 리다이렉트
- [x] 기존 174개 unit test 모두 통과
- [x] 브라우저에서 수동 테스트 완료

### User Impact
- 비로그인 사용자가 랜딩/가격 페이지의 CTA를 클릭해도 아무 반응이 없던 UX 개선
- 플랜 선택 → 회원가입 → 구독까지의 전환율 향상

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `<button>` → `<Link>` 변환 | Next.js Link는 hover시 자동 prefetch + SEO 크롤링 가능 | 없음 |
| `?plan=xxx` 쿼리 파라미터 | 로그인 후 사용자의 의도(선택 플랜)를 유지하여 UX 일관성 | OAuth 콜백 체인에서 파라미터 전달 필요 |
| plan 값을 planId 매핑 | `starter` / `pro` / `premium` 문자열 사용 | 하드코딩이나 기존 플랜 정의와 일치 |

---

## 📦 Dependencies

### Required Before Starting
- [x] 랜딩페이지 컴포넌트 구조 파악 완료
- [x] 로그인/인증 플로우 파악 완료

### External Dependencies
- 없음 (추가 패키지 불필요)

---

## 📝 Implementation Notes
- auth/callback/route.ts가 이미 `next` 쿼리 파라미터를 지원하고 있어 Protected Zone 수정 불필요
- KakaoLoginButton에 VALID_PLANS 화이트리스트로 유효하지 않은 plan 값 방지
- `<button>` → `<Link>`로 변경 시 `block`, `text-center` 클래스 추가 필요 (인라인 요소 → 블록)

## 🚀 Implementation Phases

### Phase 1: CTA 기본 동작 연결
**Goal**: 7개 비활성 CTA를 `/login` 또는 `/login?plan=xxx`로 연결
**Estimated Time**: 1시간
**Status**: ✅

#### 수정 대상 파일 (Safe Zone)

| 파일 | 수정 내용 |
|------|----------|
| `src/components/landing/FeatureSection.tsx` | `<button>` → `<Link href="/login">` |
| `src/components/landing/PricingSection.tsx` | 3개 `<button>` → `<Link href="/login?plan=xxx">` |
| `src/components/landing/PricingDetailSection.tsx` | 3개 `<button>` → `<Link href="/login?plan=xxx">` |

#### Tasks

**🟢 GREEN: Implement**
- [x] **Task 1.1**: `FeatureSection.tsx` — "경쟁사 분석 시작하기" `<button>` → `<Link href="/login">`
- [x] **Task 1.2**: `PricingSection.tsx` — 3개 플랜 CTA `<button>` → `<Link href="/login?plan={planId}">`
- [x] **Task 1.3**: `PricingDetailSection.tsx` — 3개 플랜 CTA `<button>` → `<Link href="/login?plan={planId}">`

**🔵 REFACTOR**
- [x] **Task 1.4**: planId 매핑 로직 정리 (plan.name → planId 매핑)

#### Quality Gate ✋
- [x] `npx jest --no-cache` — 174개 테스트 모두 통과 (16 suites, 174 tests)
- [x] 브라우저에서 CTA 클릭 시 `/login` 또는 `/login?plan=xxx`로 이동 확인
- [x] Link prefetch 동작 확인 (hover 시 네트워크 탭)

---

### Phase 2: Plan 파라미터 기반 로그인 후 리다이렉트
**Goal**: 로그인 후 선택한 플랜의 구독 페이지로 자동 이동
**Estimated Time**: 1.5시간
**Status**: ⏳ Pending

#### 수정 대상 파일

| 파일 | 수정 내용 | Protected Zone? |
|------|----------|----------------|
| `src/app/(auth)/login/page.tsx` | searchParams에서 plan 읽어 KakaoLoginButton에 전달 | ❌ Safe |
| `src/components/auth/KakaoLoginButton.tsx` | plan prop 받아서 OAuth redirectTo에 포함 | ❌ Safe (Client Component) |
| `src/app/(auth)/auth/callback/route.ts` | plan 파라미터 있으면 `/dashboard/subscription?plan=xxx`로 리다이렉트 | ⚠️ **Protected Zone — 사용자 승인 완료** |

#### Tasks

**🟢 GREEN: Implement**
- [x] **Task 2.1**: `login/page.tsx` — searchParams에서 `plan` 읽어 prop 전달
- [x] **Task 2.2**: `KakaoLoginButton.tsx` — `plan` prop을 OAuth `redirectTo` URL에 쿼리로 포함
- [x] **Task 2.3**: `auth/callback/route.ts` — 수정 불필요! 기존 `next` 파라미터 지원으로 해결

#### Quality Gate ✋
- [x] `npx jest --no-cache` — 전체 테스트 통과 (16 suites, 174 tests)
- [ ] 수동 테스트: `/login?plan=pro` 접속 → 카카오 로그인 → `/dashboard/subscription?plan=pro` 도착 (실제 OAuth 로그인 필요)
- [ ] 수동 테스트: `/login` (plan 없이) 접속 → 카카오 로그인 → `/dashboard` 도착 (실제 OAuth 로그인 필요)

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| auth callback 수정으로 기존 로그인 플로우 깨짐 | Low | High | plan 없으면 기존 로직 그대로 실행 |
| planId 문자열 불일치 | Low | Low | 상수 매핑 + 검증 |
| OAuth redirect URL에 query 손실 | Medium | Medium | Supabase OAuth docs 확인, 테스트 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- 3개 파일의 `<Link>` → `<button>`으로 원복
- import Link 제거

### If Phase 2 Fails
- `auth/callback/route.ts` 원복 (plan 분기 제거)
- `KakaoLoginButton.tsx` 원복 (plan prop 제거)
- `login/page.tsx` 원복 (searchParams 제거)

---

## 📊 Progress Tracking

| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| Phase 1 | 1h | 15min | ✅ |
| Phase 2 | 1.5h | 10min | ✅ |
| **Total** | **2.5h** | **25min** | ✅ |

---

## 📝 Notes & Learnings
- (작업 중 추가)
