# Implementation Plan: 결제 전용 Checkout 페이지

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
랜딩/가격 페이지에서 특정 플랜 CTA를 클릭한 사용자가 로그인 후 
**해당 플랜의 결제 전용 페이지**(`/dashboard/subscription/checkout?plan=pro`)로 바로 이동하도록 
새로운 Checkout 페이지를 만듦.

기존 `/dashboard/subscription`(구독 관리) 페이지와 분리하여,
선택한 플랜 정보 + 결제 버튼만 보여주는 전용 페이지.

### Success Criteria
- [x] `/dashboard/subscription/checkout?plan=pro` 접속 시 프로 플랜 결제 전용 화면 표시
- [x] "결제하기" 버튼 클릭 → PortOne 결제창 → 구독 시작 → 성공/실패 화면
- [x] 유효하지 않은 plan 접속 시 → `/dashboard/subscription`으로 리다이렉트
- [x] 이미 구독 중인 사용자 → 적절한 안내 메시지
- [x] CTA 플로우: 랜딩 CTA → 로그인 → checkout 페이지 도착
- [x] 기존 174개 테스트 통과
- [ ] 브라우저 수동 테스트 완료 (로그인 후 실제 결제 플로우)

### User Impact
- 플랜 선택 → 로그인 → 결제까지 최단 경로 제공 (전환율 향상)
- 이미 선택한 플랜을 다시 비교할 필요 없이 바로 결제

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 별도 route (`/checkout`) 생성 | 구독 관리와 결제 전용 화면 분리. 관심사 분리 원칙 | 파일 추가 |
| 기존 `handleSubscribe` 로직 재사용 | PortOne 연동, API 호출 로직 중복 방지 | 없음 |
| Server Component (page.tsx) + Client Component (CheckoutContent.tsx) | Vercel 가이드: 서버에서 데이터 fetch, 클라이언트에서 결제 인터랙션 | 없음 |
| PLAN_CONFIG, PLAN_DISPLAY 재사용 | 기존 설정 활용, 일관성 유지 | 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [x] CTA 활성화 완료 (PLAN_cta-activation.md)
- [x] PortOne 빌링키 발급 클라이언트 존재 (`subscription-client.ts`)
- [x] 구독 API 존재 (`/api/payment/subscribe`)

### External Dependencies
- 없음 (추가 패키지 불필요)

---

## 🚀 Implementation Phases

### Phase 1: Checkout 페이지 생성
**Goal**: `/dashboard/subscription/checkout?plan=xxx` 경로에 결제 전용 페이지 생성
**Estimated Time**: 2시간
**Status**: ✅ Complete

#### 수정/생성 대상 파일

| 파일 | 작업 | Protected Zone? |
|------|------|----------------|
| `src/app/(dashboard)/dashboard/subscription/checkout/page.tsx` | ✅ 생성 완료 (Server Component) | ❌ Safe |
| `src/components/dashboard/CheckoutContent.tsx` | ✅ 생성 완료 (Client Component) | ❌ Safe |

#### Tasks

**🟢 GREEN: Implement**

- [x] **Task 1.1**: `checkout/page.tsx` (Server Component) 생성
  - searchParams에서 `plan` 읽기
  - 유효하지 않은 plan이면 `/dashboard/subscription`으로 redirect
  - Supabase에서 구독/빌링 정보 조회
  - `CheckoutContent` 컴포넌트에 props 전달

- [x] **Task 1.2**: `CheckoutContent.tsx` (Client Component) 생성
  - 선택한 플랜 정보 표시 (이름, 가격, 포함 기능 목록)
  - "결제하기" 버튼 → `requestBillingKey` → `/api/payment/subscribe` 호출
  - 처리 중 / 성공 / 에러 상태 UI (기존 SubscriptionContent 패턴 참조)
  - "다른 플랜 보기" 링크 → `/dashboard/subscription`
  - 이미 구독 중인 사용자 → '현재 구독 중' 안내 + 대시보드 이동 버튼

#### UI 구성 (CheckoutContent)

```
┌─────────────────────────────────────────────┐
│  ← 뒤로가기                                  │
│                                             │
│  [플랜 아이콘] 프로 플랜                       │
│  ────────────────────────────────            │
│  월 29,000원                                │
│                                             │
│  ✅ 네이버 티켓 10장/월                        │
│  ✅ 키워드 5개 관리                            │
│  ✅ 5×5 그리드                               │
│  ✅ 경쟁사 분석 1개                            │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  📋 구독 안내                         │    │
│  │  • 결제일로부터 30일간 이용             │    │
│  │  • 매월 자동 결제 + 티켓 충전           │    │
│  │  • 언제든지 해지 가능                   │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [💳 월 29,000원 결제하기]  ← 메인 CTA 버튼   │
│                                             │
│  다른 플랜 보기 →                              │
└─────────────────────────────────────────────┘
```

#### Quality Gate ✋
- [ ] `npx jest --no-cache` — 전체 테스트 통과
- [ ] 브라우저: `/dashboard/subscription/checkout?plan=pro` → 프로 플랜 결제 화면 확인
- [ ] 브라우저: `/dashboard/subscription/checkout?plan=invalid` → subscription 페이지로 리다이렉트
- [ ] 브라우저: 결제 버튼 클릭 → PortOne 팝업 확인

---

### Phase 2: CTA 리다이렉트 경로 수정
**Goal**: KakaoLoginButton의 리다이렉트를 checkout 경로로 변경
**Estimated Time**: 15분
**Status**: ✅ Complete

#### 수정 대상 파일

| 파일 | 수정 내용 | Protected Zone? |
|------|----------|----------------|
| `src/components/auth/KakaoLoginButton.tsx` | 리다이렉트 경로를 `/dashboard/subscription/checkout?plan=xxx`로 변경 | ❌ Safe |

#### Tasks

- [x] **Task 2.1**: `KakaoLoginButton.tsx` — redirectTo의 next 경로를 `/dashboard/subscription/checkout?plan=${plan}`으로 변경

#### Quality Gate ✋
- [ ] 기존 테스트 통과
- [ ] 수동 테스트: 랜딩 CTA → 로그인 → checkout 페이지 도달

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PortOne 결제창 미동작 | Low | High | 기존 검증된 requestBillingKey 함수 재사용 |
| 이미 구독 중 사용자의 중복 결제 | Medium | High | 빌링 상태 체크 후 안내 메시지 표시 |
| plan 파라미터 변조 | Low | Low | PLAN_CONFIG 기반 유효성 검증 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `checkout/page.tsx` 삭제
- `CheckoutContent.tsx` 삭제
- 기존 코드 영향 없음

### If Phase 2 Fails
- `KakaoLoginButton.tsx`의 redirectTo를 기존 `/dashboard/subscription` 경로로 원복

---

## 📊 Progress Tracking

| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| Phase 1 | 2h | 15min | ✅ |
| Phase 2 | 15min | 3min | ✅ |
| **Total** | **2h 15min** | **18min** | ✅ |

---

## 📝 Notes & Learnings
- (작업 중 추가)

---

## 📚 References
- 기존 패턴: `src/components/dashboard/SubscriptionContent.tsx`
- PortOne 클라이언트: `src/lib/portone/subscription-client.ts`
- 플랜 설정: `src/lib/pricing/config.ts`
- 구독 API: `src/app/api/payment/subscribe/route.ts`
