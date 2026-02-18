# Implementation Plan: 구독 해지 UI

**Status**: 🔄 In Progress
**Started**: 2026-02-18
**Last Updated**: 2026-02-18
**Estimated Completion**: 2026-02-18

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
설정 페이지에서 유료 구독을 해지(free 전환)할 수 있는 UI 구현.
현재 PG 미연동 → 즉시 free 전환. PG 연동 후 "다음 결제일에 전환"으로 변경 예정.

### Success Criteria
- [ ] 유료 구독 사용자가 설정 페이지에서 "구독 해지" 버튼 확인 가능
- [ ] 해지 확인 모달에서 경고 문구 확인 후 해지 가능
- [ ] 해지 시 plan_id가 'free'로 변경되고 스케줄 비활성화
- [ ] 무료 사용자에게는 해지 버튼 미표시
- [ ] 빌드 에러 없음

### User Impact
PG 심사 시 "구독 해지 가능 여부"를 확인받을 수 있으며, 실제 사용자에게도 해지 수단 제공.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 즉시 free 전환 | PG 미연동 상태에서 현실적 | PG 연동 후 "다음 결제일 전환"으로 교체 필요 |
| API Route 분리 | 서버에서 인증 확인 후 DB 업데이트 (보안) | 클라이언트 직접 update보다 한 단계 추가 |
| DeleteAccountSection 패턴 참고 | Radix Dialog 이미 사용 중, 일관성 유지 | - |
| 데이터 삭제 안 함 | 재구독 시 복원 가능 | plan만 free로 변경 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `@radix-ui/react-dialog` 이미 설치됨
- [x] `user_subscriptions` 테이블 존재
- [x] `search_schedules` 테이블 존재

### External Dependencies
없음 (신규 패키지 불필요)

---

## 🚀 Implementation Phases

### Phase 1: API 라우트 + 유틸 함수
**Goal**: `/api/subscription/cancel` API 구현 + canCancelSubscription 유틸
**Estimated Time**: 1~2 hours
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: `canCancelSubscription()` 유틸 함수 테스트
  - File: `src/lib/utils/subscription.test.ts`
  - 테스트 케이스: free→false, starter→true, pro→true, premium→true

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.2**: `canCancelSubscription()` 함수 추가
  - File: `src/lib/utils/subscription.ts`
- [ ] **Task 1.3**: API Route 구현
  - File: `src/app/api/subscription/cancel/route.ts`
  - 동작: 인증확인 → plan_id='free' → 스케줄 비활성화

#### Quality Gate ✋
- [ ] 테스트 통과
- [ ] 빌드 에러 없음

---

### Phase 2: 구독 해지 UI 컴포넌트
**Goal**: 설정 페이지에 해지 버튼 + 확인 모달 구현
**Estimated Time**: 1~2 hours
**Status**: ⏳ Pending

#### Tasks
- [ ] **Task 2.1**: CancelSubscriptionSection 컴포넌트 생성
  - File: `src/components/settings/CancelSubscriptionSection.tsx`
  - 패턴: DeleteAccountSection.tsx 참고
- [ ] **Task 2.2**: SettingsContent.tsx에 컴포넌트 삽입
  - File: `src/app/(dashboard)/settings/SettingsContent.tsx`
  - 위치: "구독 플랜" 섹션 아래

#### Quality Gate ✋
- [ ] 빌드 에러 없음
- [ ] UI 정상 렌더링 확인

---

### Phase 3: 통합 검증
**Goal**: 전체 흐름 검증
**Estimated Time**: 30분~1시간
**Status**: ⏳ Pending

#### Tasks
- [ ] npm run build 통과
- [ ] 무료 사용자: 해지 버튼 안 보임
- [ ] 유료 사용자: 해지 → free 전환
- [ ] 해지 후 설정 페이지 정상 렌더링

---

## 📊 Progress Tracking

- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%

**Overall Progress**: 0% complete
