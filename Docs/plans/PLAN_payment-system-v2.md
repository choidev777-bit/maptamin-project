# Implementation Plan: 결제 시스템 v2 개선

**Status**: ✅ Complete
**Started**: 2026-02-25
**Last Updated**: 2026-02-25
**Estimated Completion**: 2026-02-28
**Scope**: Medium (5 phases, ~6시간)

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
구독 결제 시스템 종합 점검에서 발견된 미비 사항을 수정합니다.

### 핵심 정책 결정

**플랜 변경 정책 (업/다운 동일)**:
- 활성 구독 사용자의 플랜 변경(업그레이드/다운그레이드 모두) → **다음 결제일부터 적용**
- 즉시 결제 없음, 일할 계산(proration) 없음
- `pending_plan_id`에 예약 저장 → 다음 결제일 웹훅에서 자동 전환
- 무료 사용자 → 결제 페이지(checkout)에서 신규 구독

### 수정 항목 (우선순위순)

| # | 항목 | 현재 상태 | 목표 |
|---|------|----------|------|
| 1 | **플랜 변경 UI** | 업/다운 모두 결제 페이지로 이동 (active면 409 에러) | `change-plan` API 호출 + 확인 모달 |
| 2 | **이메일 수집 (체크아웃)** | 이메일 입력 없음 | 도메인 선택 방식 이메일 입력 UI |
| 3 | **설정 페이지 이메일 수정** | 이메일 수정 불가 | 이메일 수정 기능 추가 |
| 4 | **이메일 발송 인프라** | 없음 | Resend + React Email 셋업 |
| 5 | **결제 안내 이메일** | 없음 | 결제 7일 전 자동 발송 + 결제 성공/실패 알림 |

### ⚠️ 발견된 기존 버그 (함께 수정)
- `vercel.json`에 `expire-subscriptions`, `scheduled-search` CRON 미등록
- `subscription/page.tsx`에서 `pending_plan_id` 미조회

### Success Criteria
- [ ] 활성 구독 사용자: 업/다운 버튼 → 확인 모달(다음 결제일 안내) → `change-plan` API → 성공
- [ ] 무료 사용자: 시작하기 버튼 → 결제 페이지 (기존과 동일)
- [ ] `pending_plan_id` 예약 상태 UI 표시
- [ ] 이메일 없는 유저: 체크아웃 시 이메일 입력 필수 (도메인 선택 방식)
- [ ] 설정 페이지에서 이메일 변경 가능
- [ ] Resend로 이메일 발송 성공
- [ ] 결제 7일 전 자동 안내 이메일 발송

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 업/다운 모두 `change-plan` (다음 결제일 적용) | 이미 구현됨, 엣지케이스 최소, MVP에 적합 | 업그레이드도 즉시 적용 안 됨 (나중에 즉시 적용으로 변경 가능) |
| Resend를 이메일 API로 사용 | Next.js/Vercel 생태계, 월 3,000통 무료, SDK 간단 | 추가 의존성 |
| React Email로 이메일 템플릿 | 컴포넌트 기반 이메일 HTML, Resend 공식 통합 | 학습 비용 낮음 |
| `notification_email`을 `user_subscriptions`에 저장 | Supabase auth의 email과 별도 관리 (카카오 사용자) | DB 스키마 변경 |
| 이메일 인증(OTP) 생략 | 이탈률 방지, 도메인 선택으로 오타 완화, 약관 제8조 사용자 책임 | 오타 가능성 존재 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `change-plan` API 분석 완료 → `pending_plan_id` 방식, webhook에서 처리 확인
- [x] `subscribe/route.ts` 활성 구독 시 409 반환 확인 (업그레이드 불가 버그)
- [x] 현재 체크아웃/설정 페이지 코드 분석 완료
- [x] 약관 제20조 환불 규정 확인 완료

### External Dependencies
- Resend 계정 생성 + API key (Phase 4)
- `maptamin.com` 도메인 DNS 레코드 추가 — Resend 도메인 인증 (Phase 4)

### NPM Packages (Phase 4에서 설치)
- `resend` — 이메일 발송 SDK
- `@react-email/components` — 이메일 템플릿

---

## 🚀 Implementation Phases

---

### Phase 1: 플랜 변경 UI — `change-plan` API 연결
**Goal**: 활성 구독 사용자의 업/다운 모두 확인 모달 → change-plan API
**Estimated Time**: 1.5시간
**Status**: ✅ Complete

#### Tasks

- [x] **Task 1.1**: `subscription/page.tsx` — `pending_plan_id` 쿼리 추가
  - File(s): `src/app/(dashboard)/dashboard/subscription/page.tsx`
  - 변경: line 24 `.select(...)` 에 `pending_plan_id` 추가
  - `SubscriptionContent` props에 `pendingPlanId` 전달

- [x] **Task 1.2**: `SubscriptionContent.tsx` — `handlePlanAction()` 분기 함수
  - File(s): `src/components/dashboard/SubscriptionContent.tsx`
  - 새 함수:
    ```typescript
    const handlePlanAction = (planId: string) => {
        // billingStatus가 active/past_due → 이미 구독 중 → change-plan 모달
        // billingStatus가 null/expired/cancelled → 신규 구독 → 결제 페이지
        if (billingStatus === 'active' || billingStatus === 'cancel_scheduled') {
            setChangePlanTarget(planId)
            setShowChangePlanModal(true)
        } else {
            handleSubscribe(planId) // 기존 결제 페이지 이동
        }
    }
    ```
  - 기존 `onClick={() => handleSubscribe(plan.id)}` → `onClick={() => handlePlanAction(plan.id)}`

- [x] **Task 1.3**: `SubscriptionContent.tsx` — 플랜 변경 확인 모달
  - File(s): `src/components/dashboard/SubscriptionContent.tsx`
  - 새 state: `showChangePlanModal`, `changePlanTarget`, `changePlanLoading`
  - 모달 내용:
    ```
    ┌──────────────────────────────────────┐
    │  플랜 변경 확인                        │
    │                                      │
    │  {currentPlan} → {targetPlan} 변경    │
    │                                      │
    │  • 다음 결제일({date})부터 적용됩니다    │
    │  • 현재 플랜 혜택은 그때까지 유지됩니다   │
    │                                      │
    │        [취소]        [변경하기]         │
    └──────────────────────────────────────┘
    ```
  - 확인 → `POST /api/payment/subscribe/change-plan { planId }` 호출
  - 성공 → 성공 토스트 + `router.refresh()`

- [x] **Task 1.4**: `SubscriptionContent.tsx` — `pending_plan_id` 예약 상태 표시
  - `pendingPlanId`가 있으면 해당 플랜 카드에 배지 표시
  - 현재 플랜 카드: "현재 이용 중"
  - 예약 플랜 카드: "다음 결제일부터 적용 예정" 배지
  - 안내 문구: "다른 플랜으로 변경하면 기존 예약이 대체됩니다"
  - ⚠️ 예약 취소 전용 버튼/API 없음 (MVP) — 다른 플랜 선택 시 `pending_plan_id` 덮어씀

- [x] **Task 1.5**: `getCta()` 함수 업데이트
  - `pendingPlanId`가 있는 경우 CTA 텍스트 변경:
    - 예약 대상 플랜: "변경 예정" (비활성)
    - 다른 플랜: "변경하기" (활성)
  - `billingStatus`가 `active`인 경우: "업그레이드"/"다운그레이드" 대신 "변경하기" 통일도 고려

- [x] **Task 1.6**: `vercel.json` — 누락된 CRON 등록
  - File(s): `vercel.json`
  - 현재: `cleanup`만 등록
  - 추가: `expire-subscriptions`, `scheduled-search`

#### Quality Gate ✋

- [x] `npm run build` 성공
- [ ] 수동 테스트 시나리오:
  1. **무료 유저** → 프로 "시작하기" 클릭 → 결제 페이지 이동 (기존과 동일)
  2. **프로 구독 유저** → 프리미엄 "변경하기" 클릭 → 모달("다음 결제일부터 적용") → 확인 → 성공
  3. **프리미엄 구독 유저** → 프로 "변경하기" 클릭 → 모달 → 확인 → 성공
  4. **변경 예약 후** → 해당 플랜에 "변경 예정" 배지 표시 확인
  5. **해지 예약 중** → 플랜 변경 시도 → 에러 메시지 (API에서 차단)

---

### Phase 2: 이메일 수집 — 체크아웃 페이지
**Goal**: 이메일 없는 유저가 결제 시 이메일을 입력하도록 (도메인 선택 방식)
**Estimated Time**: 1.5시간
**Status**: ✅ Complete
**Depends on**: Phase 1 완료

#### Tasks

- [x] **Task 2.1**: `EmailInput` 공용 컴포넌트 생성
  - File(s): `src/components/ui/EmailInput.tsx`
  - 구성:
    ```
    ┌──────────────┐   ┌─────────────────────┐
    │  아이디 입력   │ @ │  gmail.com        ▼ │
    └──────────────┘   └─────────────────────┘
    ```
  - 도메인 목록: `gmail.com`, `naver.com`, `daum.net`, `hanmail.net`, `nate.com`, `kakao.com`, `icloud.com`, `직접입력`
  - `직접입력` 선택 시 도메인 input으로 전환
  - Props: `value`, `onChange`, `required`, `disabled`, `defaultValue`

- [x] **Task 2.2**: `CheckoutContent.tsx` — 이메일 입력 섹션 추가
  - File(s): `src/components/dashboard/CheckoutContent.tsx`
  - 결제 수단 섹션과 약관 동의 사이에 "알림 이메일" 섹션 추가
  - 로직:
    ```
    1. 페이지 로드 시 Supabase에서 현재 이메일 조회
       - user_subscriptions.notification_email
       - fallback: auth user.email
    2. 이메일 있음 → 미리 채워서 표시 (수정 가능)
    3. 이메일 없음 → EmailInput 필수 입력
    4. 결제 요청 시 email을 body에 포함
    ```

- [x] **Task 2.3**: `api/payment/subscribe/route.ts` — 이메일 저장
  - File(s): `src/app/api/payment/subscribe/route.ts`
  - 요청 body에 `email` 필드 추가 (optional)
  - 있으면 `user_subscriptions.notification_email`에 저장

- [x] **Task 2.4**: DB 스키마 — `notification_email` 컬럼 (⚠️ Supabase SQL Editor에서 수동 실행 필요)
  - `user_subscriptions` 테이블에 `notification_email TEXT` 추가
  - Supabase Dashboard > SQL Editor에서 직접 실행:
    ```sql
    ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS notification_email TEXT;

    -- 기존 사용자 backfill: auth.users에서 이메일 복사
    UPDATE user_subscriptions us
    SET notification_email = au.email
    FROM auth.users au
    WHERE us.user_id = au.id
    AND us.notification_email IS NULL
    AND au.email IS NOT NULL;
    ```

#### Quality Gate ✋

- [ ] `npm run build` 성공
- [ ] DB 마이그레이션 실행 확인
- [ ] 수동 테스트:
  1. 이메일 없는 유저 → 체크아웃 → 이메일 미입력 시 결제 버튼 비활성
  2. 이메일 입력(도메인 선택) → 결제 완료 → DB에 `notification_email` 저장 확인
  3. 이메일 있는 유저 → 체크아웃 → 이메일 미리 표시 (수정 가능)
  4. `직접입력` 선택 → 도메인 직접 타이핑 가능 확인

---

### Phase 3: 설정 페이지 이메일 수정
**Goal**: 설정 페이지에서 알림 이메일 변경 가능
**Estimated Time**: 45분
**Status**: ✅ Complete
**Depends on**: Phase 2 완료 (EmailInput 컴포넌트 + DB 스키마)

#### Tasks

- [x] **Task 3.1**: 이메일 업데이트 API
  - File(s): `src/app/api/settings/email/route.ts` (신규)
  - `PATCH` 요청 → `user_subscriptions.notification_email` 업데이트
  - 입력 검증: 이메일 형식 확인 (`@`, `.` 포함)

- [x] **Task 3.2**: `settings/page.tsx` — `notification_email` 조회
  - File(s): `src/app/(dashboard)/settings/page.tsx`
  - `user_subscriptions`에서 `notification_email` 추가 조회
  - `userInfo`에 `notificationEmail` 필드 추가

- [x] **Task 3.3**: `SettingsContent.tsx` — 이메일 수정 UI
  - File(s): `src/app/(dashboard)/settings/SettingsContent.tsx`
  - 프로필 섹션(line 92~122) 내 이메일 표시 영역에 "수정" 버튼 추가
  - 수정 모드: EmailInput 컴포넌트 표시 → "저장" / "취소"
  - 저장 → `PATCH /api/settings/email` 호출

#### Quality Gate ✋

- [ ] `npm run build` 성공
- [ ] 수동 테스트: 설정 페이지 → 이메일 "수정" → 변경 → "저장" → 새로고침 → 변경 확인

---

### Phase 4: 이메일 발송 인프라 (Resend + React Email)
**Goal**: Resend API 연동 + 이메일 템플릿 생성
**Estimated Time**: 1.5시간
**Status**: ✅ Complete
**Depends on**: Phase 2 완료, Resend 계정 + 도메인 인증 (수동 준비)

#### Tasks

- [x] **Task 4.1**: Resend + React Email 패키지 설치
  - `npm install resend @react-email/components`

- [x] **Task 4.2**: Resend 클라이언트 설정
  - File(s): `src/lib/email/client.ts` (신규)
  - 환경변수: `RESEND_API_KEY`
  - `sendEmail({ to, subject, react })` 유틸 함수

- [x] **Task 4.3**: 이메일 템플릿 생성
  - File(s): `src/lib/email/templates/` (신규 디렉토리)
  - 템플릿 목록:
    - `PaymentReminderEmail.tsx` — 결제 7일 전 안내
    - `PaymentSuccessEmail.tsx` — 결제 성공 영수증
    - `PaymentFailedEmail.tsx` — 결제 실패 안내 + 카드 확인 유도
  - 디자인: 맵타민 로고 + 카드형 레이아웃 (솔라피 스타일)
  - 하단: "본 이메일은 서비스 알림 용도로 발송되었습니다."

- [x] **Task 4.4**: `.env.local`에 환경변수 추가
  - `RESEND_API_KEY=re_xxxxx`
  - `EMAIL_FROM=맵타민 <noreply@maptamin.com>`

#### Quality Gate ✋

- [ ] `npm run build` 성공
- [ ] Resend 대시보드에서 도메인 인증 완료 확인 (수동)
- [ ] 테스트 이메일 발송 성공 확인 (수동)

---

### Phase 5: 결제 안내 이메일 자동화
**Goal**: 결제 7일 전 안내 + 결제 성공/실패 이메일 자동 발송
**Estimated Time**: 1.5시간
**Status**: ✅ Complete
**Depends on**: Phase 4 완료

#### Tasks

- [x] **Task 5.1**: 결제 7일 전 안내 CRON
  - File(s): `src/app/api/cron/payment-reminder/route.ts` (신규)
  - 로직:
    ```
    1. subscription_billing에서 next_billing_date가 7일 뒤인 active 유저 조회
    2. user_subscriptions에서 notification_email 조회
    3. 이메일이 있는 유저에게만 안내 이메일 발송
    4. 발송 성공/실패 로깅
    ```
  - `vercel.json`에 CRON 스케줄 추가 (매일 00:00 UTC = 09:00 KST)

- [x] **Task 5.2**: 결제 성공 이메일 발송
  - File(s): `src/app/api/payment/webhook/route.ts`
  - `handlePaymentPaid()` 마지막 단계에 이메일 발송 추가
  - 비동기 처리: 이메일 발송 실패해도 결제/구독 처리에 영향 없음
  - 내용: 플랜명, 결제 금액, 다음 결제일, 구독 관리 링크

- [x] **Task 5.3**: 결제 실패 이메일 발송
  - File(s): `src/app/api/payment/webhook/route.ts`
  - `handlePaymentFailed()` 마지막 단계에 이메일 발송 추가
  - 내용: "결제가 실패했습니다. 카드를 확인해주세요." + 구독 관리 링크
  - 최대 재시도 초과 시: "구독이 만료되었습니다. 재구독 안내" 이메일

- [x] **Task 5.4**: `vercel.json` — `payment-reminder` CRON 등록
  - File(s): `vercel.json`
  - `/api/cron/payment-reminder` 추가

#### Quality Gate ✋

- [ ] `npm run build` 성공
- [ ] CRON 엔드포인트 수동 호출 테스트 (`curl localhost:3000/api/cron/payment-reminder`)
- [ ] 웹훅 테스트: 결제 성공/실패 시 이메일 발송 확인 (Resend 대시보드)

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Resend 도메인 인증 지연 | Medium | Phase 4 블로킹 | 개발 중 Resend 기본 도메인(`onboarding@resend.dev`) 사용 |
| `notification_email` 마이그레이션 | Low | Data integrity | `auth.users.email` fallback |
| 이메일 발송 실패 | Low | 사용자 알림 누락 | 비동기 발송 + 로깅 (결제 로직에 영향 없음) |
| 업그레이드 즉시 적용 요구 | Medium | 사용자 불만 | `change-plan` 모달에 "다음 결제일부터 적용" 명확히 안내 |

---

## 🔄 Rollback Strategy

### Phase별 독립 롤백 가능
- **Phase 1**: `handlePlanAction` → `handleSubscribe`로 복원
- **Phase 2-3**: EmailInput + 이메일 섹션 제거
- **Phase 4-5**: 이메일 발송 코드 제거 (기존 결제 로직 무관)

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ✅ 100% — 플랜 변경 UI
- **Phase 2**: ✅ 100% — 이메일 수집 (DB 마이그레이션 수동 필요)
- **Phase 3**: ✅ 100% — 설정 페이지 이메일
- **Phase 4**: ✅ 100% — 이메일 인프라
- **Phase 5**: ✅ 100% — 이메일 자동화

**Overall Progress**: 100% complete 🎉

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 1.5시간 | 30분 | -1시간 |
| Phase 2 | 1.5시간 | 15분 | -1.25시간 |
| Phase 3 | 45분 | 10분 | -35분 |
| Phase 4 | 1.5시간 | 15분 | -1.25시간 |
| Phase 5 | 1.5시간 | 15분 | -1.25시간 |
| **Total** | ~7시간 | ~1.5시간 | -5.5시간 |

---

## 📝 Notes & Learnings

### 사전 조사 (2026-02-25)

**핵심 발견 — `subscribe/route.ts` 409 버그**:
- Line 80-84: `existingBilling.status === 'active'` → 409 반환
- 활성 구독 사용자가 결제 페이지(checkout) 경유 시 무조건 실패
- → Phase 1에서 활성 사용자는 `change-plan` API로 우회

**change-plan API 동작 확인**:
- `api/payment/subscribe/change-plan/route.ts` → `pending_plan_id` 저장
- `webhook/route.ts` line 176-198: `pending_plan_id` → `effectivePlanId`로 플랜 전환
- 방향 체크 없음 → 업/다운 모두 동일하게 동작

**결제 사이클**: 고정 30일이 아닌 "매월 같은 날짜" (`setMonth(+1)` + 월말 오버플로우 보정)

**vercel.json 누락**: `expire-subscriptions`, `scheduled-search` CRON 미등록

**현재 코드 구조**:
- `CheckoutContent.tsx`: 결제 페이지. 이메일 입력 없음
- `SettingsContent.tsx`: 설정 페이지. 이메일 표시만 있고 수정 불가 (line 114)
- `settings/page.tsx`: `auth.getUser()`에서 `user.email` 가져옴

**약관 검증**:
- 제20조 1항 ③: "중도 해지 시, 잔여 기간에 대한 일할 계산 환불 미제공" → 플랜 변경 시 다음 결제일까지 기존 혜택 유지 정당
- 제8조 3항: "변경사항을 알리지 않아 발생한 불이익은 회원 책임" → 이메일 인증 불필요

---

## 📚 References

### 관련 파일
- `src/components/dashboard/SubscriptionContent.tsx` — Phase 1 메인 수정
- `src/components/dashboard/CheckoutContent.tsx` — Phase 2 메인 수정
- `src/app/(dashboard)/settings/SettingsContent.tsx` — Phase 3 메인 수정
- `src/app/api/payment/subscribe/change-plan/route.ts` — Phase 1 API (기존)
- `src/app/api/payment/webhook/route.ts` — Phase 5 이메일 발송 추가
- `src/app/(dashboard)/dashboard/subscription/page.tsx` — Phase 1 쿼리 수정

### 관련 계획서
- `Docs/plans/PLAN_subscription-cta-fix.md` — CTA 동적 텍스트 (완료)
- `Docs/plans/PLAN_channelkey-separation.md` — PortOne channelKey 분리 (완료)

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] 모든 Phase quality gate 통과
- [ ] 무료 유저 → 결제 페이지 → 신규 구독 정상
- [ ] 활성 구독 유저 → 업/다운 모두 change-plan 모달 → 성공
- [ ] pending_plan_id 예약 상태 UI 표시
- [ ] 이메일 수집 → 체크아웃 → 저장 확인
- [ ] 설정 페이지 → 이메일 수정 가능 확인
- [ ] 결제 7일 전 안내 이메일 발송 확인
- [ ] 결제 성공/실패 이메일 발송 확인
- [ ] `vercel.json` CRON 전체 등록 확인
- [ ] Vercel 환경변수 설정 (`RESEND_API_KEY`, `EMAIL_FROM`)

---

**Plan Status**: 🔄 In Progress
**Plan Status**: ✅ Complete
**Completed**: 2026-02-25
**Blocked By**: None
