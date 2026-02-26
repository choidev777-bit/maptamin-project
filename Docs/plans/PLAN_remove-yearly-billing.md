# Implementation Plan: 연간 구독(yearly) 제거 — 월간 전용 전환

**Status**: ✅ Done
**Started**: 2026-02-26
**Last Updated**: 2026-02-26 (전체 완료)
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

### Feature Description
NHN KCP PG사 심사에서 **연간 정기결제(yearly billing cycle)를 지원하지 않기 때문에** 입점이 반려되었습니다.
모든 프론트엔드 UI, 백엔드 API, 유틸 함수, DB RPC에서 `yearly` 옵션을 제거하고 **월간(monthly) 정기결제만** 남기도록 수정합니다.

### Success Criteria
- [ ] 랜딩 페이지 가격 섹션에서 월간/연간 토글이 제거되고 월간 가격만 표시
- [ ] 결제 체크아웃에서 항상 월간 결제로 처리
- [ ] 구독 관리 페이지에서 연간 관련 UI 제거
- [ ] 백엔드 API에서 billingCycle이 항상 'monthly'로 처리
- [ ] Supabase RPC에서 yearly 분기 제거
- [ ] `npm run build` 성공 (type error 없음)

### User Impact
- 사용자에게 보이는 결제 옵션이 월간만 남아 UX가 단순해짐
- KCP PG 심사 통과를 위한 필수 조건 충족

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `yearlyPrice` 필드를 PLAN_CONFIG에서 제거 | 불필요한 설정값 잔존 방지 | 향후 연간 구독 재도입 시 필드 재추가 필요 |
| `billing_cycle` DB 컬럼은 유지하되 값은 항상 'monthly' | DB 마이그레이션 없이 안전하게 처리 | 불필요한 컬럼이 잔존하지만 위험도 낮음 |
| `isYearly` 상태 및 토글 UI를 완전 제거 | 사용자 혼란 방지 | N/A |

---

## 📦 Dependencies

### Required Before Starting
- [ ] 현재 `main` 브랜치가 최신 상태인지 확인

### External Dependencies
- 없음 (코드 수정만 필요)

---

## 🧪 Test Strategy

### Testing Approach
이 작업은 기존 코드에서 "제거"가 주요 작업이므로, 기존 테스트 파일(PlanCard.test.tsx 등)의 yearly 관련 테스트 케이스를 업데이트하고 빌드 성공을 확인합니다.

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | 기존 테스트 업데이트 | PlanCard yearly 테스트 제거/수정 |
| **Build Check** | 100% 컴파일 | TypeScript 타입 에러 없음 |
| **Manual** | 핵심 플로우 | 랜딩 → 체크아웃 → 구독 관리 UI 확인 |

---

## 🚀 Implementation Phases

### Phase 1: 프론트엔드 — 랜딩 페이지 가격 UI에서 연간 옵션 제거
**Goal**: 랜딩 페이지의 PricingSection, PricingDetailSection에서 월간/연간 토글 및 연간 가격 표시를 제거
**Estimated Time**: 1시간
**Status**: ✅ Complete

#### Tasks

**🟢 GREEN: 수정 사항**
- [x] **Task 1.1**: `src/components/landing/PricingSection.tsx` 수정
  - `isYearly` state 및 토글 버튼 UI 제거
  - `yearly`, `yearlyTotal` 데이터 필드 제거
  - 가격 표시를 항상 `plan.monthly` 사용
  - CTA 링크에서 `&billing=yearly` 파라미터 제거
  - `isYearly && (...)` 조건부 연간 총액 표시 제거

- [x] **Task 1.2**: `src/components/landing/PricingDetailSection.tsx` 수정
  - Task 1.1과 동일한 패턴으로 제거
  - `isYearly` state, 토글 UI, `yearly`/`yearlyTotal` 데이터 제거

#### Quality Gate ✋

**Build & Tests**:
- [x] `npm run build` 성공
- [ ] 랜딩 페이지에서 월간 가격만 표시되는지 visual 확인

**Manual Test Checklist**:
- [ ] 랜딩 `/` → 가격 섹션에서 토글 버튼이 사라졌는지 확인
- [ ] 월간 가격(9,900원 / 29,000원 / 99,000원)만 표시되는지 확인
- [ ] CTA 버튼 클릭 시 URL에 `billing=yearly` 파라미터가 없는지 확인

---

### Phase 2: 프론트엔드 — 대시보드 결제/구독 관리 UI에서 연간 옵션 제거
**Goal**: CheckoutContent, SubscriptionContent, PlanCard에서 연간 결제 관련 UI/로직 제거
**Estimated Time**: 1.5시간
**Status**: ✅ Complete

#### Tasks

**🟢 GREEN: 수정 사항**
- [ ] **Task 2.1**: `src/components/dashboard/CheckoutContent.tsx` 수정
  - `billingCycle` 파싱 로직: `searchParams.get('billing')` → 항상 `'monthly'` 사용
  - `isValidCycle` 검증에서 `yearly` 제거
  - `totalAmount`를 항상 `plan.price` 사용 (`plan.yearlyPrice` 참조 제거)
  - `cycleText`를 항상 `'월'` 고정
  - `billingCycle === 'yearly'` 조건부 UI 제거 (연간 결제 라벨, 월 환산 가격 표시)

- [ ] **Task 2.2**: `src/components/dashboard/SubscriptionContent.tsx` 수정
  - `isYearly` state 및 토글 버튼 제거 (월간/연간 전환)
  - `handleSubscribe`에서 `billingCycleParam` → 항상 `'monthly'`
  - `billingCycle === 'yearly'` 조건부 결제 금액 표시 제거
  - 플랜 카드 목록에서 `isYearly` prop 제거

- [ ] **Task 2.3**: `src/components/dashboard/PlanCard.tsx` 수정
  - `PlanCardPlan` 타입에서 `yearly`, `yearlyTotal` 필드 제거
  - `PlanCardProps`에서 `isYearly` prop 제거
  - 가격 표시를 항상 `plan.monthly` 사용
  - `isYearly && (...)` 조건부 연간 총액 표시 제거

- [ ] **Task 2.4**: `src/components/dashboard/PlanCard.test.tsx` 수정
  - mock 데이터에서 `yearly`, `yearlyTotal` 제거
  - `isYearly={true}` 테스트 케이스 제거
  - `isYearly={false}`을 기본값으로 변경 (prop 자체 제거)

- [ ] **Task 2.5**: `src/components/dashboard/SubscriptionContent.test.tsx` 수정
  - `billing=yearly` assertion 수정 → `billing` 파라미터 없이 라우팅 확인

- [ ] **Task 2.6**: `src/components/auth/KakaoLoginButton.tsx` 수정
  - `billing === 'yearly' ? '&billing=yearly' : ''` 분기 제거
  - `billing` prop은 유지하되 yearly 분기만 제거 (항상 빈 문자열)

- [ ] **Task 2.7**: `src/components/auth/GoogleLoginButton.tsx` 수정
  - Task 2.6과 동일한 패턴으로 yearly 분기 제거

- [ ] **Task 2.8**: `src/app/(auth)/login/page.tsx` 정리 (선택)
  - `billing` searchParams 파싱 및 prop 전달 라인 제거 (더 이상 사용처 없음)

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] `npm test` — PlanCard 테스트 통과

**Manual Test Checklist**:
- [ ] `/dashboard/subscription` → 월간/연간 토글이 사라졌는지 확인
- [ ] `/dashboard/subscription/checkout?plan=starter` → 월간 가격만 표시
- [ ] 플랜 변경 모달에서 월간 가격만 표시

---

### Phase 3: 백엔드 API & 유틸 — yearly 분기 제거, monthly 고정
**Goal**: 서버 API와 유틸 함수에서 billingCycle 관련 yearly 분기를 제거하고 항상 monthly로 처리
**Estimated Time**: 1.5시간
**Status**: ✅ Complete

#### Tasks

**🟢 GREEN: 수정 사항**
- [ ] **Task 3.1**: `src/lib/pricing/config.ts` 수정
  - `PLAN_CONFIG` 타입 및 데이터에서 `yearlyPrice` 필드 제거
  - `getPlanPrice()` 함수에서 `billingCycle` 파라미터 제거, 항상 `plan.price` 반환

- [ ] **Task 3.2**: `src/lib/utils/billing.ts` 수정
  - `calculateNextBillingDate()` 함수에서 `billingCycle` 파라미터 제거
  - `yearly` 분기(1년 추가) 제거, 항상 1개월 추가 로직만 유지

- [ ] **Task 3.3**: `src/app/api/payment/subscribe/route.ts` 수정
  - request body에서 `billingCycle` 파싱 제거, 내부적으로 항상 `'monthly'` 사용
  - `paymentAmount` 계산을 항상 `plan.price` 사용
  - `calculateNextBillingDate()` 호출에서 `billingCycle` 인자 제거
  - RPC `activate_subscription` 호출에서 `p_billing_cycle` → 항상 `'monthly'`

- [ ] **Task 3.4**: `src/app/api/payment/webhook/route.ts` 수정
  - `handlePaymentPaid()`에서 `billing_cycle` 조회/사용 제거, 항상 monthly로 처리
  - `handlePaymentFailed()`에서 `billing_cycle` 조회/사용 제거
  - `calculateNextBillingDate()` 호출에서 billingCycle 인자 제거
  - `getPlanPrice()` 호출에서 billingCycle 인자 제거

- [ ] **Task 3.5**: `src/app/api/payment/subscribe/reactivate/route.ts` 수정
  - `billing_cycle` 조회/사용 제거
  - `getPlanPrice()` 호출에서 인자 제거

- [ ] **Task 3.6**: `src/app/(dashboard)/dashboard/subscription/page.tsx` 수정
  - `billing_cycle` 조회 제거
  - `SubscriptionContent` prop에서 `billingCycle` 제거

- [ ] **Task 3.7**: `src/app/api/cron/payment-reminder/route.ts` 수정
  - `billing_cycle` 조회/사용 제거
  - `billing.billing_cycle === 'yearly'` 조건 제거

- [ ] **Task 3.8**: `src/lib/types/index.ts` 수정 (해당하는 경우)
  - `PlanV2` 타입에서 `yearlyPrice` 관련 필드 제거

#### Quality Gate ✋

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] `npm test` 전체 통과
- [ ] TypeScript 타입 에러 없음

**Manual Test Checklist**:
- [ ] 로컬에서 구독 API 테스트 (billingCycle 없이 요청해도 정상 동작)

---

### Phase 4: DB RPC 업데이트 (Supabase 마이그레이션)
**Goal**: Supabase RPC `activate_subscription`에서 yearly 분기를 제거하고, billing_cycle 컬럼의 CHECK 제약을 monthly만 허용하도록 수정
**Estimated Time**: 0.5시간
**Status**: ✅ Complete

#### Tasks

**🟢 GREEN: 수정 사항**
- [ ] **Task 4.1**: 새 마이그레이션 SQL 파일 생성 (예: `024_remove_yearly_billing.sql`)
  - `activate_subscription` RPC에서 `p_billing_cycle` 파라미터의 `yearly` 분기 제거
  - 기간 계산을 항상 `NOW() + INTERVAL '1 month'` 사용
  - `billing_cycle` 컬럼에 항상 `'monthly'` 값 저장
  - (선택) CHECK 제약을 `CHECK (billing_cycle = 'monthly')`로 변경

- [ ] **Task 4.2**: 기존 데이터 마이그레이션
  - 이미 `yearly`로 저장된 행이 있다면 `'monthly'`로 UPDATE
  - ⚠️ 현재 프로덕션에 yearly 구독자가 없다면 이 단계는 스킵 가능

#### Quality Gate ✋

**Build & Tests**:
- [ ] 마이그레이션 SQL이 Supabase에 정상 적용되는지 확인
- [ ] `activate_subscription` RPC가 billingCycle 없이 정상 호출되는지 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| 기존 yearly 구독자 데이터 존재 | Low (아직 프로덕션 아님) | Medium | Phase 4.2에서 데이터 마이그레이션 처리 |
| TypeScript 타입 에러 연쇄 | Medium | Low | Phase 3에서 타입 정의 먼저 수정 후 구현 파일 수정 |
| SubscriptionContent 렌더링 깨짐 | Low | Medium | 수정 후 반드시 visual 테스트 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `git checkout` — PricingSection.tsx, PricingDetailSection.tsx

### If Phase 2 Fails
- `git checkout` — CheckoutContent.tsx, SubscriptionContent.tsx, PlanCard.tsx, PlanCard.test.tsx, SubscriptionContent.test.tsx, KakaoLoginButton.tsx, GoogleLoginButton.tsx, login/page.tsx

### If Phase 3 Fails
- `git checkout` — 각 API route 및 유틸 파일

### If Phase 4 Fails
- 마이그레이션 SQL 롤백 (이전 RPC 함수 재적용)

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
| Phase 1 | 1h | - | - |
| Phase 2 | 1.5h | - | - |
| Phase 3 | 1.5h | - | - |
| Phase 4 | 0.5h | - | - |
| **Total** | **4.5h** | - | - |

---

## 📝 영향 받는 파일 목록 (전체)

### 프론트엔드 (UI)
| 파일 | 수정 내용 |
|------|-----------|
| `src/components/landing/PricingSection.tsx` | isYearly 토글, yearly 데이터, CTA URL 파라미터 제거 |
| `src/components/landing/PricingDetailSection.tsx` | 동일 |
| `src/components/dashboard/CheckoutContent.tsx` | billingCycle 파싱/분기 → monthly 고정 |
| `src/components/dashboard/SubscriptionContent.tsx` | isYearly 토글, 연간 가격 표시, billingCycleParam 제거 |
| `src/components/dashboard/PlanCard.tsx` | isYearly prop, yearly/yearlyTotal 필드 제거 |
| `src/components/dashboard/PlanCard.test.tsx` | yearly 테스트 케이스 제거/수정 |
| `src/components/dashboard/SubscriptionContent.test.tsx` | billing=yearly assertion 수정 |
| `src/components/auth/KakaoLoginButton.tsx` | billing === 'yearly' 분기 제거 |
| `src/components/auth/GoogleLoginButton.tsx` | 동일 |
| `src/app/(auth)/login/page.tsx` | billing prop 전달 정리 (선택) |

### 백엔드 (API & Utils)
| 파일 | 수정 내용 |
|------|-----------|
| `src/lib/pricing/config.ts` | yearlyPrice 필드, getPlanPrice billingCycle 파라미터 제거 |
| `src/lib/utils/billing.ts` | calculateNextBillingDate billingCycle 파라미터 → monthly 전용 |
| `src/app/api/payment/subscribe/route.ts` | billingCycle 파싱/분기 제거, monthly 고정 |
| `src/app/api/payment/webhook/route.ts` | billing_cycle 조회/분기 제거 |
| `src/app/api/payment/subscribe/reactivate/route.ts` | billing_cycle 조회/분기 제거 |
| `src/app/(dashboard)/dashboard/subscription/page.tsx` | billingCycle prop 제거 |
| `src/app/api/cron/payment-reminder/route.ts` | billing_cycle 조회/yearly 조건 제거 |

### DB (Supabase)
| 파일 | 수정 내용 |
|------|-----------|
| 새 마이그레이션 SQL | activate_subscription RPC에서 yearly 분기 제거 |

---

## 📝 Notes & Learnings

### Implementation Notes
- KCP 반려 사유: "당사는 월단위 정기결제만 지원 가능, 연구독 입점 불가"
- 수정 완료 후 KCP 재심사 연락: 1544-8662

### KCP 재심사 체크리스트
- [ ] 코드 수정 완료
- [ ] 프로덕션 배포 완료
- [ ] KCP 전화 연락 (1544-8662)

---

**Plan Status**: 🔄 In Progress
**Next Action**: Phase 1 착수 (사용자 승인 후)
**Blocked By**: 사용자 승인 대기
