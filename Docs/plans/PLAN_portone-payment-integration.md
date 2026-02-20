# Implementation Plan: PortOne 결제 연동 (티켓 구매)

**Status**: ✅ Complete
**Started**: 2026-02-19
**Last Updated**: 2026-02-19
**Estimated Completion**: 2026-02-21

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
PortOne V2 SDK + NHN KCP를 활용한 실시간 진단 티켓 결제 시스템 구현.
사용자가 `/dashboard/shop` 페이지에서 티켓을 선택하고 결제하면, 서버가 결제를 검증한 뒤 DB의 `remaining_tickets_naver` 또는 `remaining_tickets_google`을 증가시킴.

### Success Criteria
- [ ] 사용자가 결제 버튼을 누르면 PortOne 결제창이 열림
- [ ] 테스트 모드에서 결제 완료 시 티켓 수량이 실제로 증가함
- [ ] 결제 검증 실패 시 티켓이 지급되지 않음 (보안)
- [ ] 환불 API가 정상 작동하여 티켓을 차감함
- [ ] 결제 내역이 DB에 기록됨

### User Impact
유료 사용자가 추가 진단 티켓을 구매하여 네이버/구글 검색 순위 진단을 더 많이 실행할 수 있게 됨.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| PortOne SDK(프론트) + REST API(백엔드) 분리 | API Secret은 서버에만 존재하여 보안 유지 | 프론트/백엔드 코드 2곳 관리 |
| 서버 측 결제 검증 필수 | 프론트엔드 조작으로 무료 티켓 발급 방지 | 결제 완료 후 약간의 지연 (API 호출) |
| `ticket-price.ts` 가격 상수 공유 | 프론트/백엔드 가격 불일치 방지 | 없음 |
| `payment_history` 테이블로 결제 기록 | 환불 처리, 감사 추적, CS 대응에 필수 | DB 마이그레이션 필요 (사용자 승인 후) |
| 결제 완료 후 `router.refresh()` | 서버 컴포넌트 데이터 재조회로 즉시 반영 | 전체 페이지 재렌더링 |

---

## 📦 Dependencies

### Required Before Starting
- [x] PortOne 콘솔에서 채널 설정 완료 (KCP V2 일반결제 T0000)
- [x] `.env.local`에 `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET` 입력 완료
- [x] 기존 `TicketShopContent.tsx` UI 컴포넌트 구현 완료
- [x] 기존 `ticket-price.ts` 가격 유틸리티 구현 완료

### External Dependencies
- `@portone/browser-sdk`: latest (V2 SDK)

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: Write tests FIRST, then implement to make them pass

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥80% | 결제 유틸리티, 가격 계산, 검증 로직 |
| **Integration Tests** | Critical paths | API 라우트 → DB 업데이트 흐름 |
| **Manual Tests** | Key user flows | 실제 테스트 결제 → 티켓 증가 확인 |

### Test File Organization
```
src/
├── lib/portone/
│   ├── client.ts          (프론트 SDK 래퍼)
│   ├── server.ts          (서버 API 래퍼)
│   └── server.test.ts     (서버 유틸 테스트)
├── app/api/payment/
│   ├── ticket/
│   │   ├── route.ts       (결제 검증 API)
│   │   └── route.test.ts  (API 테스트)
│   └── refund/
│       ├── route.ts       (환불 API)
│       └── route.test.ts  (API 테스트)
```

---

## 🚀 Implementation Phases

### Phase 1: SDK 설치 & 결제 유틸리티
**Goal**: PortOne SDK 설치, 프론트/백엔드 결제 헬퍼 함수 생성
**Estimated Time**: 1~2 hours
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: 서버 측 결제 검증 유틸리티 테스트 작성
  - File(s): `src/lib/portone/server.test.ts`
  - Expected: Tests FAIL (red) — `server.ts`가 아직 없음
  - Details:
    - `verifyPayment(paymentId)` 호출 시 정상 응답 반환
    - 잘못된 paymentId 시 에러 반환
    - API Secret 누락 시 에러 반환
    - 결제 금액 불일치 감지

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.2**: `@portone/browser-sdk` npm 패키지 설치
  - Command: `npm install @portone/browser-sdk`
- [ ] **Task 1.3**: `src/lib/portone/client.ts` 생성
  - 프론트엔드 결제 요청 함수 (`requestTicketPayment`)
  - 환경 변수에서 `storeId`, `channelKey` 읽기
  - `paymentId` 자동 생성 (`payment_${uuid}`)
  - `orderName`, `totalAmount`, `currency`, `payMethod` 설정
- [ ] **Task 1.4**: `src/lib/portone/server.ts` 생성
  - `verifyPayment(paymentId)` — PortOne REST API로 결제 조회
  - `cancelPayment(paymentId, reason)` — PortOne REST API로 결제 취소
  - `Authorization: PortOne ${PORTONE_API_SECRET}` 헤더 구성
  - API 호스트: `https://api.portone.io`

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.5**: 코드 정리
  - [ ] 타입 정의 분리 (`PaymentVerifyResult`, `PaymentCancelResult` 등)
  - [ ] 에러 핸들링 표준화
  - [ ] JSDoc 주석 추가

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**TDD Compliance**:
- [ ] Tests written FIRST and initially failed
- [ ] Production code written to make tests pass
- [ ] Code improved while tests still pass
- [ ] Coverage ≥80% for `server.ts`

**Build & Tests**:
- [ ] `npm run build` — 빌드 에러 없음
- [ ] `npx jest src/lib/portone` — 모든 테스트 통과
- [ ] 기존 테스트 깨지지 않음

**Code Quality**:
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 경고/에러 없음

**Manual Testing**:
- [ ] `import * as PortOne from "@portone/browser-sdk/v2"` 정상 import 확인
- [ ] 환경 변수 `PORTONE_API_SECRET` 읽기 확인

**Validation Commands**:
```bash
npm run build
npx jest src/lib/portone --coverage
npx jest src/lib/pricing --coverage
```

---

### Phase 2: 결제 검증 API 라우트
**Goal**: 결제 완료 후 서버에서 검증하고 DB 티켓 수량 업데이트
**Estimated Time**: 2~3 hours
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 2.1**: 결제 API 라우트 테스트 작성
  - File(s): `src/app/api/payment/ticket/route.test.ts`
  - Expected: Tests FAIL (red) — `route.ts`가 아직 없음
  - Details:
    - 정상 결제 → 200 + 티켓 증가
    - 미인증 사용자 → 401
    - 잘못된 paymentId → 400
    - 결제 금액 불일치 → 400 (조작 방지)
    - 이미 처리된 결제 → 409 (중복 방지)
    - 포트원 API 오류 → 502

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 2.2**: `src/app/api/payment/ticket/route.ts` 생성
  - `POST /api/payment/ticket` 엔드포인트
  - Request body: `{ paymentId, platform, quantity }`
  - 처리 흐름:
    1. Supabase auth로 사용자 인증 확인
    2. `verifyPayment(paymentId)`로 포트원에 결제 검증 요청
    3. 응답의 `status === "PAID"` 확인
    4. 응답의 `amount.total === calculateTicketPrice(quantity)` 금액 일치 확인
    5. `user_subscriptions` 테이블에서 `remaining_tickets_{platform}` 증가
    6. `payment_history` 테이블에 결제 내역 저장
    7. 성공 응답 반환

- [ ] **Task 2.3**: 중복 결제 방지 로직
  - `payment_history` 테이블에서 `paymentId` 중복 체크
  - 이미 처리된 결제면 409 반환

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 2.4**: 코드 정리
  - [ ] 에러 응답 표준화 (`{ error: string, code: string }`)
  - [ ] 로깅 추가 (결제 성공/실패 기록)
  - [ ] 트랜잭션 안전성 검토

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 3 until ALL checks pass**

**TDD Compliance**:
- [ ] Tests written FIRST and initially failed
- [ ] Production code written to make tests pass
- [ ] Code improved while tests still pass
- [ ] Coverage ≥80% for `route.ts`

**Build & Tests**:
- [ ] `npm run build` — 빌드 에러 없음
- [ ] `npx jest src/app/api/payment` — 모든 테스트 통과
- [ ] 기존 테스트 깨지지 않음

**Security**:
- [ ] API Secret이 프론트엔드 코드에 노출되지 않음
- [ ] 인증되지 않은 사용자 접근 차단됨
- [ ] 결제 금액 조작 방지 로직 동작 확인

**Validation Commands**:
```bash
npm run build
npx jest src/app/api/payment --coverage
```

---

### Phase 3: 프론트엔드 결제 연결
**Goal**: 상점 페이지 결제 버튼 → PortOne 결제창 → 검증 API 호출 → 완료 UI
**Estimated Time**: 2~3 hours
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 3.1**: `requestTicketPayment` 함수 테스트
  - File(s): `src/lib/portone/client.test.ts`
  - Expected: Tests FAIL (red)
  - Details:
    - 올바른 파라미터로 SDK 호출되는지 확인
    - 결제 성공 시 paymentId 반환
    - 사용자 취소 시 null 반환

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 3.2**: `TicketShopContent.tsx` 수정 — `handlePurchase()` 교체
  - File(s): `src/components/dashboard/TicketShopContent.tsx`
  - 흐름:
    1. 로딩 상태 활성화 (`isPurchasing: true`)
    2. `requestTicketPayment(platform, quantity)` 호출 → 결제창 오픈
    3. 결제 완료 시 `POST /api/payment/ticket` 호출 (검증)
    4. 검증 성공 → 성공 토스트 + `router.refresh()` (티켓 갱신)
    5. 검증 실패 → 에러 토스트
    6. 사용자 취소 → 로딩 해제
    7. 에러 → 에러 메시지 표시

- [ ] **Task 3.3**: UI 상태 추가
  - `isPurchasing` 상태 — 결제 진행 중 버튼 비활성화 + 스피너
  - `purchaseResult` 상태 — 성공/실패 메시지 표시
  - 결제 완료 후 성공 알림 (토스트 또는 모달)

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 3.4**: 코드 정리
  - [ ] 에러 메시지 사용자 친화적으로 개선
  - [ ] 로딩 UX 최적화
  - [ ] 접근성(a11y) 확인

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 4 until ALL checks pass**

**TDD Compliance**:
- [ ] Tests written FIRST and initially failed
- [ ] Production code written to make tests pass
- [ ] Code improved while tests still pass

**Build & Tests**:
- [ ] `npm run build` — 빌드 에러 없음
- [ ] 모든 테스트 통과
- [ ] 기존 테스트 깨지지 않음

**Manual Testing** (테스트 결제):
- [ ] 결제 버튼 클릭 → KCP 결제창 열림
- [ ] 테스트 카드로 결제 완료 → 티켓 수량 증가 확인
- [ ] 결제창에서 취소 → 정상 복귀 (에러 없음)
- [ ] 결제 중 버튼 비활성화 확인
- [ ] 결제 완료 후 성공 메시지 표시 확인

**Validation Commands**:
```bash
npm run build
npx jest --coverage
```

---

### Phase 4: 환불 API & 결제 내역 관리
**Goal**: 환불 처리 API + 결제 내역 DB 테이블 설계
**Estimated Time**: 1~2 hours
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 4.1**: 환불 API 테스트 작성
  - File(s): `src/app/api/payment/refund/route.test.ts`
  - Expected: Tests FAIL (red)
  - Details:
    - 정상 환불 → 200 + 티켓 차감
    - 미인증 → 401
    - 존재하지 않는 결제 → 404
    - 이미 환불된 결제 → 409
    - 7일 초과 → 400 (약관 위반)

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 4.2**: `src/app/api/payment/refund/route.ts` 생성
  - `POST /api/payment/refund` 엔드포인트
  - Request body: `{ paymentId, reason }`
  - 처리 흐름:
    1. 인증 확인
    2. `payment_history`에서 결제 내역 조회
    3. 구매 후 7일 이내인지 확인 (이용약관 제20조)
    4. 해당 티켓이 미사용인지 확인
    5. `cancelPayment(paymentId, reason)` 호출
    6. `remaining_tickets_{platform}` 차감
    7. `payment_history` 상태를 `refunded`로 업데이트

- [ ] **Task 4.3**: `payment_history` 테이블 마이그레이션 SQL 설계 (파일 생성만, 실행은 사용자 승인 후)
  - File(s): `Docs/plans/migration_payment_history.sql` (참고용 설계만)
  - 컬럼: `id, user_id, payment_id, platform, quantity, amount, status, portone_payment_id, created_at, refunded_at`
  - ⚠️ **주의**: 실제 마이그레이션 실행은 사용자 승인 후 별도 진행

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 4.4**: 코드 정리
  - [ ] 환불 이유 로깅
  - [ ] 에러 핸들링 표준화
  - [ ] 관리자 알림 연동 포인트 주석 추가 (향후 확장)

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed until ALL checks pass**

**TDD Compliance**:
- [ ] Tests written FIRST and initially failed
- [ ] Production code written to make tests pass
- [ ] Code improved while tests still pass
- [ ] Coverage ≥80%

**Build & Tests**:
- [ ] `npm run build` — 빌드 에러 없음
- [ ] `npx jest src/app/api/payment` — 모든 테스트 통과
- [ ] 기존 테스트 깨지지 않음

**Security**:
- [ ] 본인 결제만 환불 가능 (타인 결제 접근 차단)
- [ ] 7일 초과 환불 차단
- [ ] 사용된 티켓 환불 차단

**Validation Commands**:
```bash
npm run build
npx jest src/app/api/payment --coverage
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| PortOne 테스트 모드 제한 | Low | Medium | 테스트 MID(T0000) 사용, 공식 문서 참조 |
| 결제 검증 중 네트워크 오류 | Medium | High | 멱등키(Idempotency-Key) 사용, 재시도 로직 |
| 결제 완료 후 DB 업데이트 실패 | Low | High | 트랜잭션 사용, 실패 시 자동 환불 고려 |
| 중복 결제 처리 | Medium | High | `payment_history`에서 paymentId 중복 체크 |
| 프론트엔드 금액 조작 | Medium | Critical | 서버에서 `ticket-price.ts` 기준으로 금액 재검증 |
| DB 마이그레이션 충돌 | Low | Medium | 설계만 먼저, 실행은 사용자 승인 후 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `npm uninstall @portone/browser-sdk`
- Delete: `src/lib/portone/client.ts`, `src/lib/portone/server.ts`, `src/lib/portone/server.test.ts`

### If Phase 2 Fails
- Delete: `src/app/api/payment/ticket/route.ts`, `route.test.ts`
- Phase 1 유틸리티는 유지 (독립적)

### If Phase 3 Fails
- `TicketShopContent.tsx`의 `handlePurchase()` → 원래 `alert()` 코드로 복원
- Phase 1, 2 코드는 유지 (독립적)

### If Phase 4 Fails
- Delete: `src/app/api/payment/refund/route.ts`, `route.test.ts`
- 마이그레이션 SQL은 설계 파일이므로 삭제만 하면 됨
- Phase 1~3 코드는 유지 (독립적)

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ✅ 100%
- **Phase 2**: ✅ 100%
- **Phase 3**: ✅ 100%
- **Phase 4**: ✅ 100%

**Overall Progress**: 100% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 1~2 hours | - | - |
| Phase 2 | 2~3 hours | - | - |
| Phase 3 | 2~3 hours | - | - |
| Phase 4 | 1~2 hours | - | - |
| **Total** | 6~10 hours | - | - |

---

## 📝 Notes & Learnings

### Implementation Notes
- (구현 중 추가 예정)

### Blockers Encountered
- (구현 중 추가 예정)

---

## 📚 References

### Documentation
- [PortOne KCP V2 연동 가이드](../references/portone_kcp_v2_guide.md)
- [PortOne REST API V2](https://developers.portone.io/api/rest-v2/payment?v=v2)
- [PortOne Browser SDK](https://developers.portone.io/sdk/ko/v2-sdk/readme)

### Related Files (Existing)
- `src/lib/pricing/ticket-price.ts` — 가격 상수 및 유틸리티
- `src/components/dashboard/TicketShopContent.tsx` — 상점 UI (수정 대상)
- `src/app/(dashboard)/dashboard/shop/page.tsx` — 상점 서버 페이지
- `src/components/layout/WalletLabel.tsx` — 잔여 티켓 표시
- `src/app/api/subscription/cancel/route.ts` — 구독 해지 API (패턴 참고)
- `.env.local` — PortOne 키 저장 위치

### Protected Zone Files (수정 금지)
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/middleware.ts`
- `src/lib/types/index.ts`
- `supabase/migrations/*.sql`

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All phases completed with quality gates passed
- [ ] Full integration testing performed (테스트 결제 → 검증 → 티켓 증가)
- [ ] Documentation updated
- [ ] Security review completed (API Secret 노출 없음, 금액 검증 동작)
- [ ] 환불 API 정상 작동 확인
- [ ] 결제 내역 DB 설계 완료
- [ ] Plan document updated with final status

---

**Plan Status**: ⏳ Pending
**Next Action**: Phase 1 — SDK 설치 & 결제 유틸리티 생성
**Blocked By**: None
