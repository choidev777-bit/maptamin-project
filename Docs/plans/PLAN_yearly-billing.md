# Implementation Plan: 연간 결제 시스템 + Checkout 페이지 완성

**Status**: ✅ Complete
**Started**: 2026-02-19
**Last Updated**: 2026-02-19
**Estimated Completion**: 2026-02-19

---

## 📋 Overview

### Feature Description
월간(monthly) 결제만 지원하던 구독 시스템에 **연간(yearly) 결제**를 추가하고,
랜딩 페이지의 CTA → 로그인 → Checkout 결제 페이지까지 **billing cycle 정보가 전달**되도록 수정.

### 가격 체계 (VAT 별도)

| 플랜 | 월간 가격 | 연간 합계 (11개월) | 연간 월 환산 |
|------|---------|-----------------|------------|
| 스타터 | 9,900원 | 108,900원 | 9,075원 |
| 프로 | 29,000원 | 319,000원 | 26,583원 |
| 프리미엄 | 99,000원 | 1,089,000원 | 90,750원 |

실제 결제 금액 = 가격 + VAT 10%

### Success Criteria
- [x] 월간 결제: 기존과 동일하게 동작 (가격 + VAT)
- [x] 연간 결제: price × 11 + VAT 한번에 결제, 365일 구독
- [x] CTA 플로우: 연간 토글 → CTA → 로그인 → checkout에서 연간 가격 표시
- [x] DB에 billing_cycle 저장
- [x] Webhook에서 연간/월간 구분하여 다음 결제 예약
- [x] 기존 테스트 통과 (174개)
- [ ] 브라우저 수동 테스트

---

## 🚀 Implementation Phases

### Phase 1: DB 마이그레이션 ⚠️ Protected Zone
**Goal**: subscription_billing에 billing_cycle 컬럼 추가, activate_subscription RPC 업데이트
**Estimated Time**: 20분
**Status**: ⏳ Pending

#### 수정 대상

| 파일 | 작업 | Protected? |
|------|------|------------|
| `supabase/migrations/019_billing_cycle.sql` | **새로 생성** | ⚠️ Protected (허락 완료) |

#### Tasks
- [ ] **Task 1.1**: 새 마이그레이션 파일 생성
  - `subscription_billing`에 `billing_cycle TEXT DEFAULT 'monthly'` 컬럼 추가
  - `activate_subscription` RPC에 `p_billing_cycle` 파라미터 추가
  - 연간이면 period_end = NOW() + 365일, 월간이면 30일

#### Quality Gate ✋
- [ ] 마이그레이션 SQL 문법 확인
- [ ] 기존 데이터 영향 없음 (DEFAULT 'monthly')

---

### Phase 2: 백엔드 API 수정
**Goal**: subscribe API와 webhook이 billing_cycle을 처리
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### 수정 대상

| 파일 | 수정 내용 | Protected? |
|------|----------|------------|
| `src/lib/pricing/config.ts` | `yearlyPrice` 필드 추가 | ❌ Safe |
| `src/app/api/payment/subscribe/route.ts` | `billingCycle` 파라미터, 연간 가격 계산, period 설정 | ❌ Safe |
| `src/app/api/payment/webhook/route.ts` | `billing_cycle` 읽어서 기간/금액 계산 | ❌ Safe |

#### Tasks
- [ ] **Task 2.1**: `PLAN_CONFIG`에 `yearlyPrice` 추가 (price × 11)
- [ ] **Task 2.2**: `subscribe/route.ts` — `billingCycle` 받아서 금액/기간 분기
- [ ] **Task 2.3**: `webhook/route.ts` — `billing_cycle` 기반 다음 결제 예약

#### Quality Gate ✋
- [ ] `npx jest --no-cache` — 기존 테스트 통과

---

### Phase 3: 프론트엔드 CTA 플로우
**Goal**: 연간/월간 토글 상태를 checkout까지 전달
**Estimated Time**: 20분
**Status**: ⏳ Pending

#### 수정 대상

| 파일 | 수정 내용 | Protected? |
|------|----------|------------|
| `src/components/landing/PricingSection.tsx` | CTA Link에 `&billing=yearly` 동적 추가 | ❌ Safe |
| `src/components/landing/PricingDetailSection.tsx` | 동일 | ❌ Safe |
| `src/app/(auth)/login/page.tsx` | `billing` 파라미터 전달 | ❌ Safe |
| `src/components/auth/KakaoLoginButton.tsx` | `billing` 포함 리다이렉트 | ❌ Safe |

#### Tasks
- [ ] **Task 3.1**: `PricingSection.tsx` — isYearly 상태에 따라 Link href에 `&billing=yearly` 추가
- [ ] **Task 3.2**: `PricingDetailSection.tsx` — 동일
- [ ] **Task 3.3**: `login/page.tsx` — `billing` searchParam 읽어서 prop 전달
- [ ] **Task 3.4**: `KakaoLoginButton.tsx` — `billing` prop, redirectTo에 포함

#### Quality Gate ✋
- [ ] `npx jest --no-cache` — 테스트 통과
- [ ] 브라우저: 연간 토글 → CTA 클릭 → URL에 billing=yearly 포함 확인

---

### Phase 4: Checkout 페이지 업데이트
**Goal**: billing cycle에 따라 올바른 가격 표시 + 결제 요청
**Estimated Time**: 20분
**Status**: ⏳ Pending

#### 수정 대상

| 파일 | 수정 내용 | Protected? |
|------|----------|------------|
| `src/app/(dashboard)/dashboard/subscription/checkout/page.tsx` | `billing` param 읽어서 전달 | ❌ Safe |
| `src/components/dashboard/CheckoutContent.tsx` | 월간/연간 가격 분기, API에 billingCycle 전달 | ❌ Safe |

#### Tasks
- [ ] **Task 4.1**: `checkout/page.tsx` — `billing` searchParam 추가, CheckoutContent에 전달
- [ ] **Task 4.2**: `CheckoutContent.tsx` — billingCycle prop 기반 가격/라벨 표시 + API 요청에 포함

#### Quality Gate ✋
- [ ] `npx jest --no-cache` — 테스트 통과
- [ ] 브라우저: checkout?plan=pro&billing=yearly → 연간 가격 표시 확인
- [ ] 브라우저: checkout?plan=pro → 월간 가격 표시 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 기존 월간 구독자 영향 | Low | High | DEFAULT 'monthly'로 기존 데이터 자동 호환 |
| 연간 결제 후 환불 복잡성 | Medium | Medium | 추후 환불 정책 별도 구현 |
| PortOne 연간 예약 결제 | Low | Medium | 기존 schedulePayment 함수 재사용 (timeToPay만 변경) |

---

## 🔄 Rollback Strategy
- Phase 1 실패: 마이그레이션 되돌리기 (DROP COLUMN, RPC 원복)
- Phase 2~4 실패: 각 파일 git checkout으로 원복

---

## 📊 Progress Tracking

| Phase | Estimated | Actual | Status |
|-------|-----------|--------|--------|
| Phase 1 | 20min | 3min | ✅ |
| Phase 2 | 30min | 5min | ✅ |
| Phase 3 | 20min | 5min | ✅ |
| Phase 4 | 20min | 5min | ✅ |
| **Total** | **1h 30min** | **18min** | ✅ |
