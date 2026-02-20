# Implementation Plan: 티켓 상점 시스템 (Ticket Shop UI)

**Status**: ✅ Complete
**Started**: 2026-02-18
**Last Updated**: 2026-02-19
**Estimated Completion**: 2026-02-20

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
대시보드 네비게이션의 `WalletLabel`을 개선하여 네이버/구글 티켓을 분리 표시하고,
클릭 시 팝업으로 상세 티켓 정보를 보여주며, "추가 구매하기" 버튼으로 상점 페이지(`/dashboard/shop`)에서
자유 수량으로 티켓을 구매(결제 UI까지)할 수 있는 시스템을 구현한다.

### Success Criteria
- [ ] WalletLabel에 네이버/구글 티켓이 분리 표시됨
- [ ] WalletLabel 클릭 시 다이얼로그 팝업으로 상세 티켓 정보 표시
- [ ] 팝업에서 "추가 구매하기" 버튼 클릭 → `/dashboard/shop` 이동
- [ ] 상점 페이지에서 1장 단위로 자유 수량 선택 가능
- [ ] 결제 버튼 클릭 시 준비 중 안내 (PG 연동 전)
- [ ] 데스크톱/모바일 네비게이션 모두 동일하게 적용

### User Impact
사용자가 티켓 잔량을 플랫폼별로 직관적으로 파악하고,
부족 시 바로 추가 구매 흐름으로 진입할 수 있어 UX 개선.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| WalletLabel을 클라이언트 컴포넌트로 유지 | 이미 `useEffect`로 Supabase에서 실시간 조회 중이므로 기존 패턴 유지 | SSR 최적화 불가하지만, 소량 데이터라 괜찮음 |
| Radix UI Dialog 사용 | 프로젝트에서 이미 `@radix-ui/react-dialog` 사용 중 (CancelSubscriptionSection, DeleteAccountSection) | 추가 패키지 설치 불필요 |
| 상점 페이지를 서버 컴포넌트 + 클라이언트 컴포넌트 분리 | Vercel best practice (server-serialization): 서버에서 구독 정보 fetch → 클라이언트 컴포넌트로 전달 | - |
| 티켓 가격 1,500원 균일 (네이버/구글 동일) | 사용자 입장에서 심플하고, 모든 플랜에서 마진 51% 이상 확보 | 구글 티켓 원가가 2배 높지만 균일가 선택 |

---

## 📦 Dependencies

### Required Before Starting
- [ ] 기존 WalletLabel.tsx가 정상 동작하는 상태
- [ ] `@radix-ui/react-dialog` 패키지 설치 확인 (이미 설치됨)

### External Dependencies
- 없음 (기존 패키지로 구현 가능)

---

## 🧪 Test Strategy

### Testing Approach
**TDD Principle**: 핵심 비즈니스 로직(가격 계산)에 대해 테스트 작성 → 구현

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥80% | 가격 계산 로직, 수량 검증 |
| **Manual Tests** | Critical paths | UI 인터랙션, 반응형 레이아웃 |

---

## 🚀 Implementation Phases

### Phase 1: WalletLabel 네이버/구글 분리 표시
**Goal**: WalletLabel에 네이버/구글 티켓을 별도로 표시하고, 클릭 가능한 인터랙션 추가
**Estimated Time**: 2시간
**Status**: ✅ Complete

#### Scope
- **수정 파일**: `src/components/layout/WalletLabel.tsx`
- 기존: `12장` (합산 표시)
- 변경 후: `N 5 | G 3` 또는 아이콘+숫자로 네이버/구글 분리 표시
- 프리미엄이 아닌 플랜(스타터/프로)은 구글 티켓 0이므로 네이버만 표시
- 클릭 시 Radix Dialog 팝업 열기

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 1.1**: WalletLabel 분리 표시 UI 구현
  - File: `src/components/layout/WalletLabel.tsx`
  - 변경사항:
    - `totalTickets` 합산 대신 `remaining_tickets_naver` / `remaining_tickets_google` 각각 표시
    - 구글 티켓이 0인 플랜은 네이버만 표시 (스타터/프로)
    - 프리미엄은 네이버 + 구글 둘 다 표시
    - 전체 영역을 `button`으로 감싸서 클릭 가능하게 변경

- [ ] **Task 1.2**: 티켓 상세 팝업 (Dialog) 구현
  - File: `src/components/layout/WalletLabel.tsx` (같은 파일 내 Dialog 추가)
  - 참조 패턴: `src/components/settings/CancelSubscriptionSection.tsx`의 Radix Dialog 패턴
  - 팝업 내용:
    - 제목: "실시간 진단 티켓"
    - 네이버 티켓 잔량 / 월 제공량
    - 구글 티켓 잔량 / 월 제공량 (프리미엄만)
    - 현재 플랜 이름 표시
    - "추가 구매하기" 버튼 → `/dashboard/shop` 이동
    - "플랜 업그레이드" 링크 → `/dashboard/upgrade` 이동

**🔵 REFACTOR: 정리**
- [ ] **Task 1.3**: 코드 정리
  - 불필요한 `totalTickets` 변수 제거
  - Dialog 관련 로직 정리
  - 인라인 문서 추가

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` 에러 없음
- [ ] 기존 테스트 통과 (`npm test`)
- [ ] TypeScript 타입 에러 없음

**Manual Testing**:
- [ ] 데스크톱: WalletLabel에 네이버/구글 분리 표시 확인
- [ ] 데스크톱: 클릭 시 팝업 열림 확인
- [ ] 모바일: MobileNav 내 WalletLabel 동일 동작 확인
- [ ] 무료 플랜: "구독 필요" 표시 유지되는지 확인
- [ ] 스타터/프로: 네이버 티켓만 표시되는지 확인
- [ ] 프리미엄: 네이버 + 구글 표시되는지 확인
- [ ] 팝업에서 "추가 구매하기" 클릭 시 `/dashboard/shop`으로 이동 (404 OK)

**Validation Commands**:
```bash
npm run build
npm test
```

---

### Phase 2: 상점 페이지 (Ticket Shop Page)
**Goal**: `/dashboard/shop`에서 플랫폼별 티켓 수량 선택 및 결제 버튼 UI 구현
**Estimated Time**: 3시간
**Status**: ✅ Complete

#### Scope
- **생성 파일**:
  - `src/app/(dashboard)/dashboard/shop/page.tsx` (서버 컴포넌트 - 구독 정보 fetch)
  - `src/components/dashboard/TicketShopContent.tsx` (클라이언트 컴포넌트 - 인터랙션)

#### Tasks

**🔴 RED: 테스트 작성**
- [ ] **Test 2.1**: 가격 계산 유틸 함수 테스트
  - File: `src/lib/pricing/cost-calculator.test.ts` (신규 또는 기존 파일에 추가)
  - 테스트 케이스:
    - `calculateTicketPrice(1)` → 1,500
    - `calculateTicketPrice(5)` → 7,500
    - `calculateTicketPrice(0)` → 0 (또는 에러)
    - `calculateTicketPrice(-1)` → 에러 처리
    - `calculateTicketPrice(100)` → 150,000

**🟢 GREEN: 구현**
- [ ] **Task 2.2**: 가격 계산 유틸 함수
  - File: `src/lib/pricing/cost-calculator.ts` (기존 파일에 추가)
  - `TICKET_PRICE = 1500` 상수 정의
  - `calculateTicketPrice(quantity: number): number` 함수

- [ ] **Task 2.3**: 상점 서버 페이지
  - File: `src/app/(dashboard)/dashboard/shop/page.tsx`
  - 서버 컴포넌트에서 구독 정보 fetch (plan_id, remaining_tickets_naver, remaining_tickets_google)
  - `TicketShopContent`에 데이터 전달
  - Metadata: `title: '티켓 구매 - 맵타민'`

- [ ] **Task 2.4**: 상점 클라이언트 컴포넌트
  - File: `src/components/dashboard/TicketShopContent.tsx`
  - UI 구성:
    - 뒤로가기 버튼 (router.back())
    - 제목: "실시간 진단 티켓 구매"
    - 현재 보유 티켓 표시 (네이버 N장 / 구글 N장)
    - 플랫폼 선택 (네이버/구글 탭 또는 토글)
      - 구글은 프리미엄만 선택 가능 (다른 플랜은 잠금 표시)
    - 수량 선택: `-` / 숫자 입력 / `+` 버튼 (최소 1장)
    - 합계 금액 실시간 표시: `{수량} × 1,500원 = {합계}원`
    - **결제하기 버튼**: 클릭 시 `alert('결제 시스템 준비 중입니다.\n빠른 시일 내에 오픈 예정입니다!')` (PG 연동 전까지)
  - 참조 패턴: `src/app/(dashboard)/dashboard/upgrade/UpgradePageContent.tsx`의 레이아웃/스타일

**🔵 REFACTOR: 정리**
- [ ] **Task 2.5**: 코드 품질 개선
  - 수량 입력 유효성 검증 (min 1, 정수만)
  - 가격 표시 포맷 (천 단위 콤마)
  - 컴포넌트 접근성 (aria-label 등)
  - 인라인 문서 추가

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 3 until ALL checks pass**

**TDD Compliance**:
- [ ] 가격 계산 테스트가 먼저 작성되고, 구현으로 통과됨
- [ ] 커버리지 80% 이상 (비즈니스 로직)

**Build & Tests**:
- [ ] `npm run build` 에러 없음
- [ ] `npm test` 모든 테스트 통과
- [ ] TypeScript 타입 에러 없음

**Manual Testing**:
- [ ] `/dashboard/shop` 접속 시 페이지 정상 렌더링
- [ ] 수량 +/- 버튼 동작, 직접 입력 가능
- [ ] 합계 금액 실시간 업데이트
- [ ] 스타터/프로에서 구글 탭 잠금 표시 확인
- [ ] 프리미엄에서 네이버/구글 모두 선택 가능 확인
- [ ] 결제 버튼 클릭 시 alert 표시
- [ ] 모바일 반응형 레이아웃 확인

**Validation Commands**:
```bash
npm run build
npm test
```

---

### Phase 3: 통합 연결 및 네비게이션 정리
**Goal**: 티켓 팝업 → 상점 페이지 흐름 연결 및 전체 UX 정리
**Estimated Time**: 1시간
**Status**: ✅ Complete

#### Tasks

**🟢 GREEN: 구현**
- [ ] **Task 3.1**: 팝업 → 상점 자연스러운 연결
  - WalletLabel 팝업의 "추가 구매하기" 버튼 클릭 시 Dialog 닫기 → `/dashboard/shop` 이동
  - 상점 페이지에서 "돌아가기" 클릭 시 이전 페이지로 복귀

- [ ] **Task 3.2**: 상점 페이지 진입 시 팝업 자동 닫힘 처리 확인
  - router.push 시 Dialog state 자동 정리 확인

- [ ] **Task 3.3**: 로딩 상태 처리
  - File: `src/app/(dashboard)/dashboard/shop/loading.tsx`
  - 참조 패턴: 기존 `loading.tsx` 파일들의 스켈레톤 패턴

**🔵 REFACTOR: 최종 정리**
- [ ] **Task 3.4**: 전체 코드 리뷰 및 정리
  - 불필요한 console.log 제거
  - 컴포넌트 네이밍 일관성 확인
  - TODO 코멘트 추가 (PG 연동 시 수정 필요한 부분)

#### Quality Gate ✋

**⚠️ STOP: ALL checks must pass before marking complete**

**Build & Tests**:
- [ ] `npm run build` 에러 없음
- [ ] `npm test` 모든 테스트 통과

**Manual Testing (전체 E2E 흐름)**:
- [ ] 대시보드 진입 → WalletLabel에 분리 표시 확인
- [ ] WalletLabel 클릭 → 팝업 열림 → 상세 정보 확인
- [ ] "추가 구매하기" 클릭 → `/dashboard/shop` 이동
- [ ] 수량 선택 → 금액 확인 → 결제 버튼 클릭 → alert
- [ ] 뒤로가기 → 대시보드 복귀
- [ ] 모바일에서 동일 흐름 테스트
- [ ] 무료/스타터/프로/프리미엄 각각 정상 동작 확인

**Validation Commands**:
```bash
npm run build
npm test
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| WalletLabel 레이아웃 깨짐 (기존 Nav 영향) | Medium | Medium | 데스크톱/모바일 둘 다 수동 테스트, 원본 코드 백업 |
| Radix Dialog z-index 충돌 | Low | Low | 기존 Dialog 패턴(z-50) 동일하게 사용 |
| 상점 페이지 접근 제어 누락 | Low | High | 무료 사용자가 접근해도 결제 시 알림으로 처리 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `src/components/layout/WalletLabel.tsx` 원본 복원
- Git에서 해당 파일만 `git checkout -- src/components/layout/WalletLabel.tsx`

### If Phase 2 Fails
- `src/app/(dashboard)/dashboard/shop/` 디렉토리 삭제
- `src/components/dashboard/TicketShopContent.tsx` 삭제
- `src/lib/pricing/cost-calculator.ts` 추가 코드 제거

### If Phase 3 Fails
- Phase 1, 2 완료 상태로 복원
- `loading.tsx` 삭제

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ✅ 100%
- **Phase 2**: ✅ 100%
- **Phase 3**: ✅ 100%

**Overall Progress**: 100% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 2 hours | - | - |
| Phase 2 | 3 hours | - | - |
| Phase 3 | 1 hour | - | - |
| **Total** | **6 hours** | - | - |

---

## 📝 Notes & Learnings

### 파일 수정/생성 요약

| 구분 | 파일 경로 | 작업 |
|------|----------|------|
| 수정 | `src/components/layout/WalletLabel.tsx` | 분리 표시 + Dialog 팝업 |
| 생성 | `src/app/(dashboard)/dashboard/shop/page.tsx` | 상점 서버 페이지 |
| 생성 | `src/app/(dashboard)/dashboard/shop/loading.tsx` | 로딩 스켈레톤 |
| 생성 | `src/components/dashboard/TicketShopContent.tsx` | 상점 클라이언트 컴포넌트 |
| 수정 | `src/lib/pricing/cost-calculator.ts` | 티켓 가격 상수 + 계산 함수 추가 |
| 생성 | `src/lib/pricing/cost-calculator.test.ts` | 가격 계산 테스트 (기존 없으면 생성) |

### 핵심 상수
- `TICKET_PRICE = 1500` (네이버/구글 동일, VAT 별도)

### PG 연동 시 수정 필요 지점 (TODO)
- `TicketShopContent.tsx`: 결제 버튼 onClick → PG SDK 호출로 교체
- `/api/payment/ticket` 라우트 생성 필요
- `user_subscriptions.remaining_tickets_*` 업데이트 로직 필요

---

## 📚 References

### 참조 파일 (기존 패턴)
- Dialog 패턴: `src/components/settings/CancelSubscriptionSection.tsx`
- 업그레이드 페이지 레이아웃: `src/app/(dashboard)/dashboard/upgrade/UpgradePageContent.tsx`
- 가격 설정: `src/lib/pricing/config.ts`
- 구독 유틸: `src/lib/utils/subscription.ts`
- 구독 Hook: `src/hooks/useSubscription.ts`

### Vercel Best Practices 적용 항목
- `server-serialization`: 서버 컴포넌트에서 최소 데이터만 클라이언트로 전달
- `bundle-barrel-imports`: 직접 import 사용
- `rerender-functional-setstate`: 수량 상태 업데이트에 함수형 setState 사용

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] All phases completed with quality gates passed
- [ ] 데스크톱 + 모바일 반응형 테스트 완료
- [ ] 무료/스타터/프로/프리미엄 각 플랜별 테스트 완료
- [ ] `npm run build` 성공
- [ ] `npm test` 통과
- [ ] PG 연동 전까지의 TODO 코멘트 명확히 남김

---

**Plan Status**: ✅ Complete
**Next Action**: PG 연동 계획 수립
**Blocked By**: None
