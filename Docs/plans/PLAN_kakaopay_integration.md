# Implementation Plan: 카카오페이 결제 수단 추가

**Status**: 📋 계획 승인 대기
**Started**: 2026-03-08
**Last Updated**: 2026-03-08
**Estimated Completion**: 착수 후 약 3~4시간

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
결제 페이지(구독 체크아웃, 티켓 구매)에 **카카오페이** 결제 수단을 추가합니다.
현재 NHN KCP를 통한 신용/체크카드만 지원하지만, 카카오페이가 심사 중이므로 테스트 모드 채널을 통해 결제 모듈을 먼저 구현합니다.

### 목적
- **카카오페이 심사 통과**: 심사 담당자가 사이트에서 카카오페이 결제창이 뜨는지 확인 필요
- **결제 수단 다양화**: 사용자가 카드 결제 외에 카카오페이도 선택 가능

### Success Criteria
- [ ] 구독(정기결제) 체크아웃에서 카카오페이 선택 시 카카오페이 빌링키 발급 결제창이 정상 호출
- [ ] 티켓(일반결제) 구매에서 카카오페이 선택 시 카카오페이 일반 결제창이 정상 호출
- [ ] 기존 카드 결제 기능이 정상 유지 (regression 없음)
- [ ] 환경변수 추가만으로 테스트/실모드 전환 가능
- [ ] 기존 서버 API(`/api/payment/subscribe`, `/api/payment/ticket`)는 수정 불필요
- [ ] 모바일 REDIRECTION 환경에서도 결제 완료 후 서버 검증 및 티켓/구독 정상 처리

### User Impact
사용자가 결제 시 "신용/체크카드" 또는 "카카오페이" 중 원하는 결제 수단을 선택할 수 있습니다.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| UI에서 결제 수단 선택 → 해당 채널키+payMethod 분기 | 기존 코드 구조를 최소 변경하면서 카카오페이 추가 가능 | 결제 수단 추가 시 채널 키/환경변수 추가 필요 |
| 카카오페이는 `payMethod: 'EASY_PAY'` + 카카오페이 전용 채널키 사용 | 포트원 V2 카카오페이 공식 문서 요구사항 | 카드와 별도의 채널 키 관리 필요 |
| 서버 API Route 수정 없음 | 서버는 paymentId/billingKey로 결제를 조회/검증하므로, 결제 수단이 바뀌어도 서버 로직은 동일 | - |
| 환경변수 2개 추가 (일반결제/정기결제 × 카카오페이 채널키) | 테스트/실모드 전환이 환경변수 교체만으로 가능 | 환경변수 수가 늘어남 |
| 모바일 REDIRECTION 전용 랜딩 페이지 추가 | 카카오페이 모바일은 브라우저를 이탈하므로 Promise 방식 불가 | 신규 페이지 2개 필요 (티켓용, 구독용) |

---

## 📦 Dependencies

### Required Before Starting
- [x] 카카오페이 테스트 정기결제 채널 생성 완료 (TCSUBSCRIP)
- [x] 카카오페이 테스트 일반결제 채널 생성 완료 (TC0ONETIME)
- [ ] 포트원 콘솔에서 카카오페이 채널 키 2개 확인 (채널 관리 페이지)

### External Dependencies
- `@portone/browser-sdk/v2`: 이미 설치됨 (변경 없음)

---

## 🔬 현재 코드 분석 (증거 기반)

### 수정 대상 파일 목록

#### 1. 환경변수 (`.env.local` + Vercel 대시보드)
```
# 현재 상태 (L67-71):
NEXT_PUBLIC_PORTONE_STORE_ID=store-5e8ecbc4-...
NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY=channel-key-033ca786-...  # KCP 일반결제
NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY=channel-key-033ca786-...  # KCP 정기결제

# 추가 필요 (.env.local AND Vercel 대시보드 모두):
NEXT_PUBLIC_PORTONE_KAKAOPAY_TICKET_CHANNEL_KEY=channel-key-xxxxx  # 카카오페이 일반결제
NEXT_PUBLIC_PORTONE_KAKAOPAY_BILLING_CHANNEL_KEY=channel-key-xxxxx  # 카카오페이 정기결제
```

#### 2. 프론트엔드 일반결제: `src/lib/portone/client.ts`
```typescript
// 현재 (L103): payMethod 하드코딩
payMethod: 'CARD',
// → 결제 수단에 따라 'CARD' 또는 'EASY_PAY' 분기

// 현재 (L47): 채널 키 1개
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY || '';
// → 카카오페이 채널 키 추가, 선택된 수단에 따라 분기

// 신규 추가: 모바일 REDIRECTION용 redirectUrl 파라미터
// redirectUrl: `${window.location.origin}/dashboard/shop/payment-return`
```

#### 3. 프론트엔드 정기결제: `src/lib/portone/subscription-client.ts`
```typescript
// 현재 (L88): billingKeyMethod 하드코딩
billingKeyMethod: 'CARD',
// → 'CARD' 또는 'EASY_PAY' 분기

// 현재 (L43): 채널 키 1개
const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY || '';
// → 카카오페이 채널 키 추가

// 신규 추가: 모바일 REDIRECTION용 redirectUrl 파라미터
// redirectUrl: `${window.location.origin}/dashboard/subscription/payment-return`
```

#### 4. 체크아웃 UI: `src/components/dashboard/CheckoutContent.tsx`
```tsx
// 현재 (L165-176): 카드만 선택된 표시 (선택 불가)
// → 카드/카카오페이 선택 UI로 변경
// → 선택된 수단을 requestBillingKey에 전달
```

#### 5. 티켓 구매 UI: `src/components/dashboard/TicketShopContent.tsx`
```tsx
// 현재 (L300-316): 결제 버튼만 있음
// → 결제 수단 선택 UI 추가
// → 선택된 수단을 requestTicketPayment에 전달
```

#### 6. 신규: 모바일 결제 복귀 랜딩 페이지 (중요 - 이슈 3)
```
# 신규 생성 필요:
src/app/(dashboard)/dashboard/shop/payment-return/page.tsx
  → URL 파라미터(paymentId, platform, quantity)로 /api/payment/ticket 호출
  → 성공 시 /dashboard/shop/result로 이동
  → 실패 시 /dashboard/shop으로 이동 + 에러 메시지

src/app/(dashboard)/dashboard/subscription/payment-return/page.tsx
  → URL 파라미터(billingKey, planId)로 /api/payment/subscribe 호출
  → 성공 시 온보딩 or /dashboard/subscription으로 이동
  → 실패 시 /dashboard/subscription/checkout으로 이동 + 에러 메시지
```

### 서버 API (수정 불필요한 이유)
```typescript
// server.ts (L82): paymentId로 조회만 함
export async function verifyPayment(paymentId: string): Promise<PortOnePaymentData>

// billing.ts (L76): billingKey로 결제만 처리
export async function payWithBillingKey(params: BillingKeyPaymentParams): Promise<any>

// ticket/route.ts (L79): paymentId로 검증 → 결제 수단 무관
paymentData = await verifyPayment(paymentId)

// subscribe/route.ts (L124): billingKey로 결제 → 결제 수단 무관
paymentResult = await payWithBillingKey({ paymentId, billingKey, ... })

// webhook/route.ts (L108): paymentId 접두사 기반 필터링 → 결제 수단 무관
if (!paymentId.startsWith('sub_')) { return }
```

---

## 🔍 검토에서 발견된 이슈 및 대응

### 이슈 1: 카카오페이 구독 시 결제 수단 정보 표시 (중간 심각도)
**문제**: `subscribe/route.ts` L104에서 빌링키 정보를 `methods[0].card`로 추출하는데,
카카오페이는 `card` 객체가 없을 수 있어 `cardLast4`/`cardBrand`가 null이 됨.
→ 구독 관리 UI(`SubscriptionContent.tsx` L667-681)에서 "등록된 카드 없음"으로 표시.
**대응**: Phase 2에서 UI를 카카오페이 케이스 대응하도록 수정 (또는 후속 작업으로 분리 가능).

### 이슈 2: Vercel 환경변수 추가 누락 (낮은 심각도)
**문제**: 계획서에 `.env.local`만 언급, 실제 배포 시 Vercel 대시보드에도 추가 필요.
**대응**: 배포 체크리스트에 명시.

### 이슈 3: 모바일 REDIRECTION 후 서버 검증 미실행 (높은 심각도) ⚠️
**문제**: 카카오페이 모바일은 REDIRECTION 방식으로, 브라우저가 카카오페이로 이동했다가 돌아옴.
현재 `TicketShopContent.tsx` L53-82와 `CheckoutContent.tsx` L99-139는 모두
`await requestTicketPayment(...)` / `await requestBillingKey(...)` Promise가 resolve된 후
서버 검증을 실행하는 구조인데, **모바일에서는 이 Promise가 절대 resolve되지 않음**.
→ 모바일에서 카카오페이 결제 완료 후 티켓/구독이 지급되지 않는 치명적 버그.
**대응**: `redirectUrl` 파라미터 추가 + 모바일 복귀 랜딩 페이지 신규 구현 필요 (Phase 0).

---

## 🚀 Implementation Phases

### Phase 0: 모바일 REDIRECTION 랜딩 페이지 구현 [신규 - 이슈 3 대응]
**Goal**: 모바일 카카오페이 결제 완료 후 복귀하는 URL 핸들러 페이지 2개 구현
**Estimated Time**: 1.5시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**
- [ ] **Task 0.1**: 티켓용 결제 복귀 페이지 생성
  - File(s): `src/app/(dashboard)/dashboard/shop/payment-return/page.tsx` (신규)
  - Goal: 카카오페이 모바일 결제 완료 후 서버 검증 후 결과 페이지로 이동
  - Details:
    - URL 파라미터: `paymentId`, `platform`, `quantity`
    - 마운트 즉시 `/api/payment/ticket` POST 호출
    - 성공 → `/dashboard/shop/result?quantity=...&amount=...&platform=...`
    - 실패 → `/dashboard/shop`으로 이동 + 에러 토스트
    - 로딩 스피너 표시

- [ ] **Task 0.2**: 구독용 결제 복귀 페이지 생성
  - File(s): `src/app/(dashboard)/dashboard/subscription/payment-return/page.tsx` (신규)
  - Goal: 카카오페이 모바일 빌링키 발급 완료 후 서버 구독 처리 후 이동
  - Details:
    - URL 파라미터: `billingKey`, `planId`, `email`, `termsAgreedAt`
    - 마운트 즉시 `/api/payment/subscribe` POST 호출
    - 성공 → 온보딩 미완료면 `/onboarding`, 완료면 `/dashboard/subscription?success=true`
    - 실패 → `/dashboard/subscription/checkout?plan=...`으로 이동 + 에러 메시지
    - 로딩 스피너 표시

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 1 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` — 빌드 에러 없음

**Manual Testing**:
- [ ] 직접 URL 접근 시 파라미터 없으면 적절한 페이지로 리다이렉트

---

### Phase 1: 환경변수 + 결제 클라이언트 수정
**Goal**: 카카오페이 채널 키 추가 및 결제 수단 선택에 따른 분기 로직 구현 + `redirectUrl` 추가
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: `client.ts`의 결제 수단 분기 테스트 작성
  - File(s): `src/lib/portone/client.test.ts` (신규)
  - Expected: Tests FAIL — `paymentMethod` 파라미터가 아직 없음
  - Details:
    - 결제 수단 'card' → channelKey가 KCP 채널 키, payMethod가 'CARD'
    - 결제 수단 'kakaopay' → channelKey가 카카오페이 채널 키, payMethod가 'EASY_PAY'
    - 결제 수단 미지정 → 기본값 'card'

- [ ] **Test 1.2**: `subscription-client.ts`의 결제 수단 분기 테스트 작성
  - File(s): `src/lib/portone/subscription-client.test.ts` (신규)
  - Expected: Tests FAIL — `paymentMethod` 파라미터가 아직 없음
  - Details:
    - 결제 수단 'card' → channelKey가 KCP 채널 키, billingKeyMethod가 'CARD'
    - 결제 수단 'kakaopay' → channelKey가 카카오페이 채널 키, billingKeyMethod가 'EASY_PAY'

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.3**: `.env.local` 및 Vercel 대시보드에 카카오페이 채널 키 추가
  - File(s): `.env.local`
  - Goal: 카카오페이 테스트 채널 키 2개 추가
  - Details:
    ```
    NEXT_PUBLIC_PORTONE_KAKAOPAY_TICKET_CHANNEL_KEY=<포트원 콘솔에서 확인>
    NEXT_PUBLIC_PORTONE_KAKAOPAY_BILLING_CHANNEL_KEY=<포트원 콘솔에서 확인>
    ```
  - ⚠️ Vercel 대시보드에도 동일하게 추가할 것

- [ ] **Task 1.4**: `client.ts` 수정 — 결제 수단 파라미터 + `redirectUrl` 추가
  - File(s): `src/lib/portone/client.ts`
  - Goal: `TicketPaymentRequest` 타입에 `paymentMethod` 추가, 분기 로직 구현
  - Details:
    - `PaymentMethod` 타입 추가: `'card' | 'kakaopay'`
    - `TicketPaymentRequest.paymentMethod?: PaymentMethod` (기본값 'card')
    - paymentMethod에 따라 channelKey와 payMethod 분기
    - 카카오페이: `payMethod: 'EASY_PAY'`, `channelKey: KAKAOPAY_TICKET_CHANNEL_KEY`
    - 카드: `payMethod: 'CARD'`, `channelKey: TICKET_CHANNEL_KEY` (기존)
    - 카카오페이 선택 시 `redirectUrl` 파라미터 추가:
      `redirectUrl: \`\${window.location.origin}/dashboard/shop/payment-return?platform=...&quantity=...\``

- [ ] **Task 1.5**: `subscription-client.ts` 수정 — 결제 수단 파라미터 + `redirectUrl` 추가
  - File(s): `src/lib/portone/subscription-client.ts`
  - Goal: `IssueBillingKeyRequest` 타입에 `paymentMethod` 추가, 분기 로직 구현
  - Details:
    - `paymentMethod?: PaymentMethod` (기본값 'card')
    - 카카오페이: `billingKeyMethod: 'EASY_PAY'`, `channelKey: KAKAOPAY_BILLING_CHANNEL_KEY`
    - 카카오페이 빌링키: `issueName` 필수 (이미 구현됨 L90)
    - 카카오페이 선택 시 `redirectUrl` 파라미터 추가:
      `redirectUrl: \`\${window.location.origin}/dashboard/subscription/payment-return?planId=...&email=...\``

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.6**: `PaymentMethod` 타입을 공유 파일로 분리
  - File(s): `src/lib/portone/types.ts` (신규)
  - Goal: 두 파일에서 공통으로 사용하는 타입 중복 제거

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` — 빌드 에러 없음
- [ ] 기존 테스트 통과: `npx jest src/lib/portone/`
- [ ] 신규 테스트 통과

**Manual Testing**:
- [ ] `paymentMethod: 'card'` → 기존 동작 동일 확인
- [ ] `paymentMethod: 'kakaopay'` → EASY_PAY + 카카오페이 채널 키 확인

---

### Phase 2: 체크아웃 UI 수정 (구독 정기결제)
**Goal**: 구독 체크아웃 페이지에서 결제 수단 선택 UI 추가
**Estimated Time**: 1.5시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**
- [ ] **Task 2.1**: CheckoutContent.tsx에 결제 수단 선택 UI 추가
  - File(s): `src/components/dashboard/CheckoutContent.tsx`
  - Goal: "결제 수단" 섹션에 카드/카카오페이 선택 라디오 추가
  - Details:
    - 기존 카드 표시 영역(L165-176)을 선택 가능한 UI로 변경
    - 카카오페이 옵션 추가 (카카오 노란색 `#FEE500` 브랜딩)
    - `selectedPaymentMethod` state 추가 (기본값: 'card')
    - `handlePayment` 함수에서 `requestBillingKey`에 `paymentMethod` 전달
    - 카카오페이 선택 시 `email`, `termsAgreedAt`을 `redirectUrl` 쿼리파라미터로 포함

- [ ] **Task 2.2**: 구독 관리 UI의 결제 수단 표시 업데이트 (이슈 1 대응)
  - File(s): `src/components/dashboard/SubscriptionContent.tsx`
  - Goal: 카카오페이 빌링키로 구독 시 "등록된 카드 없음" 대신 "카카오페이" 표시
  - Details:
    - L665-681 영역: `cardBrand`/`cardLast4`가 null일 때 fallback을 "등록된 카드 없음" 대신 결제 수단 타입에 따라 적절히 표시
    - DB에서 결제 수단 정보를 추가로 저장하거나, null일 때 "카카오페이" 추론 로직 추가
    - 단순하게: null이면 "카카오페이"로 표시 (현재 카드만 있다고 가정 가능한 시점)

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 3 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` — 빌드 에러 없음
- [ ] 기존 체크아웃 동작 regression 없음

**Manual Testing**:
- [ ] 카드 선택 → 기존 KCP 결제창 정상 호출
- [ ] 카카오페이 선택 → 카카오페이 결제창 정상 호출
- [ ] 결제 수단 전환 시 UI 정상 반영
- [ ] (모바일) 카카오페이 결제 완료 → `/dashboard/subscription/payment-return` 랜딩 → 구독 활성화 확인

---

### Phase 3: 티켓 구매 UI 수정 (일반결제)
**Goal**: 티켓 구매 페이지에서 결제 수단 선택 UI 추가
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**
- [ ] **Task 3.1**: TicketShopContent.tsx에 결제 수단 선택 UI 추가
  - File(s): `src/components/dashboard/TicketShopContent.tsx`
  - Goal: 결제 버튼 위에 결제 수단 선택 UI 추가
  - Details:
    - Phase 2에서 만든 선택 UI 패턴 재사용
    - `selectedPaymentMethod` state 추가
    - `handlePurchase` 함수에서 `requestTicketPayment`에 `paymentMethod` 전달

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 3.2**: 결제 수단 선택 UI를 공용 컴포넌트(`PaymentMethodSelector`)로 추출

#### Quality Gate ✋

**⚠️ STOP: ALL checks must pass before marking complete**

**Build & Tests**:
- [ ] `npm run build` — 빌드 에러 없음
- [ ] 전체 테스트 통과: `npx jest`

**Manual Testing**:
- [ ] 티켓 구매: 카드 선택 → KCP 결제창 정상 호출
- [ ] 티켓 구매: 카카오페이 선택 → 카카오페이 결제창 정상 호출
- [ ] 결제 완료 후 티켓 정상 반영
- [ ] (모바일) 카카오페이 결제 완료 → `/dashboard/shop/payment-return` 랜딩 → 티켓 정상 지급 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| 카카오페이 테스트 채널키 미설정 시 결제 실패 | Low | High | 환경변수 누락 시 카카오페이 옵션 비활성화 처리 |
| 카카오페이 결제 완료 후 서버 검증 실패 | Low | Medium | 서버는 paymentId로 조회하므로 결제 수단 무관 |
| 기존 카드 결제 regression | Low | High | 기존 코드 최소 변경, `paymentMethod` 기본값을 'card'로 설정 |
| 모바일 REDIRECTION 후 세션/인증 만료 | Low | High | payment-return 페이지에서 Supabase 세션 확인, 만료 시 로그인 후 재시도 안내 |
| redirectUrl 파라미터에 민감 정보(email) 포함 | Medium | Medium | URL 파라미터 대신 sessionStorage 활용 검토 |
| Vercel 환경변수 미추가로 배포 후 실패 | Medium | High | 배포 체크리스트에 필수 항목으로 명시 |

---

## 🔄 Rollback Strategy

### If Phase 0 Fails
- 신규 페이지 파일 삭제 (다른 코드에 영향 없음)

### If Phase 1 Fails
- `.env.local`에서 카카오페이 환경변수 제거 (Vercel도)
- `client.ts`, `subscription-client.ts` git revert
- 기존 동작 즉시 복구 (paymentMethod 기본값이 'card')

### If Phase 2 Fails
- `CheckoutContent.tsx` git revert
- Phase 1 코드는 유지 가능 (기본값 'card')

### If Phase 3 Fails
- `TicketShopContent.tsx` git revert
- Phase 1, 2 코드는 유지 가능

---

## 📊 Progress Tracking

### Completion Status
- **Phase 0**: ⏳ 0%
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%

**Overall Progress**: 0% complete

---

## 📝 Notes & Learnings

### 중요 제약사항 (카카오페이 공식 문서 기반)
1. `payMethod` / `billingKeyMethod`를 **`EASY_PAY`**로 설정해야 함
2. PC: **IFRAME**, mobile: **REDIRECTION** (windowType 미지정 시 자동 적용)
3. `currency`는 **KRW만** 지원
4. `issueName` (빌링키 발급 시 결제창 제목): **필수 입력** (이미 구현됨 L90)
5. `locale`은 **KO_KR만** 지원

### 검토 결과 발견된 이슈 (3회 검토 반영)
- **이슈 1** (중간): 카카오페이 구독 시 cardLast4/cardBrand null → UI에 "등록된 카드 없음" 표시 → Phase 2 Task 2.2로 대응
- **이슈 2** (낮음): Vercel 환경변수 누락 위험 → Task 1.3에 명시
- **이슈 3** (높음): 모바일 REDIRECTION 시 서버 검증 미실행 → Phase 0 추가로 대응

---

## 📚 References

### Documentation
- [포트원 V2 카카오페이 연동 가이드](https://developers.portone.io/opi/ko/integration/pg/v2/kakaopay?v=v2)

### 관련 코드 파일
- [client.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/portone/client.ts) — 티켓 일반결제 클라이언트
- [subscription-client.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/portone/subscription-client.ts) — 구독 정기결제 클라이언트
- [CheckoutContent.tsx](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/components/dashboard/CheckoutContent.tsx) — 구독 체크아웃 UI
- [TicketShopContent.tsx](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/components/dashboard/TicketShopContent.tsx) — 티켓 구매 UI
- [server.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/portone/server.ts) — 서버 결제 검증 (수정 불필요)
- [billing.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/portone/billing.ts) — 서버 빌링키 결제 (수정 불필요)
- [subscribe/route.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/payment/subscribe/route.ts) — 구독 API (수정 불필요)
- [ticket/route.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/payment/ticket/route.ts) — 티켓 API (수정 불필요)
- [webhook/route.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/payment/webhook/route.ts) — 웹훅 (수정 불필요)

---

## ✅ 배포 체크리스트

- [ ] `.env.local`에 카카오페이 채널 키 2개 추가
- [ ] **Vercel 대시보드**에 카카오페이 채널 키 2개 추가 (필수!)
- [ ] 카카오페이 결제창 정상 호출 확인 (구독 + 티켓)
- [ ] 기존 카드 결제 regression 없음
- [ ] 모바일에서 결제 REDIRECTION 후 티켓/구독 정상 처리 확인
- [ ] 카카오페이 심사 담당자에게 테스트 요청

---

**Plan Status**: 📋 계획 승인 대기
**Review Count**: 3회 완료
**Next Action**: 사용자 승인 후 Phase 0 시작
**Blocked By**: 포트원 콘솔에서 카카오페이 채널 키 확인 필요
