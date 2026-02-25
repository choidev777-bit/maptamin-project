# Implementation Plan: PG 심사용 이메일/비밀번호 로그인 추가

**Status**: ⏳ 대기 중
**Started**: 2026-02-26
**Last Updated**: 2026-02-26
**Estimated Completion**: 2026-02-26

---

**⚠️ 이 기능은 PG 심사 완료 후 반드시 제거해야 합니다.**

---

## 📋 Overview

### Feature Description
PG사/카드사 심사관이 맵타민 서비스에 로그인하여 결제 페이지를 확인할 수 있도록, 로그인 페이지에 임시로 이메일/비밀번호 로그인 기능을 추가.

### 심사용 계정 정보
- **이메일**: `test123@maptamin.com` (Supabase는 이메일 형식만 허용하므로 `test123` → `test123@maptamin.com`으로 변환)
- **비밀번호**: `12345` (⚠️ Supabase 기본 최소 비밀번호 길이가 6자이므로 대시보드에서 확인 필요. 안 되면 `123456`으로 변경)

### Success Criteria
- [ ] 로그인 페이지에 이메일/비밀번호 입력 필드 표시
- [ ] `test123@maptamin.com` / `12345`(또는 `123456`)로 로그인 가능
- [ ] 로그인 후 `/dashboard`로 이동
- [ ] 기존 카카오/구글 로그인 정상 동작 유지

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| Supabase 네이티브 이메일 인증 사용 | 별도 인증 로직 불필요, Supabase가 모두 처리 | Supabase 대시보드에서 Email Provider 활성화 필수 |
| 로그인 페이지에 폼 직접 추가 | 별도 페이지 불필요, 기존 소셜 로그인과 나란히 배치 | 심사 후 제거 필요 |

---

## 📦 Dependencies

### 사전 수동 작업 (Supabase 대시보드)
- [ ] **Step 1**: Supabase 대시보드 → Authentication → Providers → Email 활성화
- [ ] **Step 2**: "Confirm email" 옵션 **비활성화** (심사 계정은 이메일 인증 불필요)
- [ ] **Step 3**: 최소 비밀번호 길이 확인 (기본 6자 → 5자로 변경하거나, 비밀번호를 `123456`으로 설정)
- [ ] **Step 4**: Supabase 대시보드 → Authentication → Users → "Create user" → `test123@maptamin.com` / 비밀번호 입력
- [ ] **Step 5**: 생성된 유저의 `user_subscriptions` 행 생성 (free 플랜)

### External Dependencies
- 없음

---

## 🚀 Implementation Phases

### Phase 1: 이메일/비밀번호 로그인 폼 추가
**Goal**: 로그인 페이지에 이메일/비밀번호 입력 + 로그인 버튼 추가
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### 수정 파일 및 내용

**파일 1: `src/components/auth/EmailLoginForm.tsx` (신규)**
- 클라이언트 컴포넌트 (`'use client'`)
- 이메일 input + 비밀번호 input + 로그인 버튼
- `supabase.auth.signInWithPassword()` 호출
- 성공 시 `router.push('/dashboard')`
- 실패 시 에러 메시지 표시
- UI: 기존 소셜 로그인 버튼과 어울리는 심플한 스타일

**파일 2: `src/app/(auth)/login/page.tsx` (수정)**
- `EmailLoginForm` 컴포넌트를 소셜 로그인 버튼 아래에 추가
- 구분선 ("또는") 추가

#### Tasks

- [ ] **Task 1.1**: `EmailLoginForm.tsx` 컴포넌트 생성
- [ ] **Task 1.2**: `login/page.tsx`에 EmailLoginForm 추가 + 구분선
- [ ] **Task 1.3**: 수동 작업 — Supabase 대시보드에서 Email Provider 활성화 + 테스트 유저 생성

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] 기존 테스트 통과

**Manual Testing**:
- [ ] 이메일/비밀번호로 로그인 성공 → `/dashboard` 이동
- [ ] 잘못된 비밀번호 → 에러 메시지 표시
- [ ] 카카오 로그인 정상 동작 (기존 기능 유지)
- [ ] 구글 로그인 정상 동작 (기존 기능 유지)
- [ ] 모바일 레이아웃 정상

**Validation Commands**:
```bash
npm run build
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Supabase Email Provider 미활성화 | Medium | High | 대시보드에서 반드시 활성화 확인 |
| 비밀번호 최소 길이 6자 제한 | Medium | Low | `123456`으로 변경 또는 Supabase 설정 변경 |
| 심사 후 제거 망각 | Medium | Low | 계획서에 명시 + TODO 주석 추가 |

---

## 🔄 Rollback Strategy (심사 후 제거)

### 제거 절차
1. `src/components/auth/EmailLoginForm.tsx` 삭제
2. `src/app/(auth)/login/page.tsx`에서 `EmailLoginForm` import 및 구분선 제거
3. Supabase 대시보드 → Email Provider 비활성화 (선택)
4. Supabase 대시보드 → 심사용 유저 삭제 (선택)

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%

**Overall Progress**: 0% complete

---

## 📝 Notes

### 핵심 사항
- ⚠️ **PG 심사 완료 후 반드시 제거**
- Supabase `signInWithPassword`는 이메일 형식만 허용 → ID를 `test123@maptamin.com`으로 사용
- Supabase 기본 비밀번호 최소 길이 6자 → `12345`가 안 될 수 있음 → `123456` 대안

### 수정 파일 요약
| 파일 | 변경 내용 |
|------|-----------|
| `EmailLoginForm.tsx` | 신규 — 이메일/비밀번호 로그인 폼 |
| `login/page.tsx` | 수정 — EmailLoginForm 추가 |
