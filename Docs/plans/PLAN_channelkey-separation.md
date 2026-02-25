# Implementation Plan: PortOne channelKey 분리 (일반결제 / 정기결제)

**Status**: 🔄 In Progress
**Started**: 2026-02-25
**Last Updated**: 2026-02-25
**Estimated Completion**: 2026-02-25
**Scope**: Small (2 phases, ~1시간)

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
현재 `client.ts` (일반결제)와 `subscription-client.ts` (정기결제)가 동일한 `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` 환경변수를 사용하고 있음.
포트원 콘솔 확인 결과, 일반결제와 정기결제는 **별도 채널**로 등록되어 있으며, 각각 다른 MID와 channelKey를 가짐:

| 채널 | 이름 | MID | channelKey |
|------|------|-----|------------|
| 일반결제 | 맵타민 티켓 테스트 | `T0000` | `channel-key-d7b61f25-6606-4335-b9aa-aa7141dd1e95` |
| 정기결제 | 맵타민 구독결제 테스트 | `A52Q7` | `channel-key-67ce7802-d410-40d7-8271-5813cd7ab8ae` |

기존 범용 `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`를 제거하고, 용도별 명시적 환경변수로 분리:
- `NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY` → 일반결제 (티켓 구매)
- `NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY` → 정기결제 (구독)

### Success Criteria
- [ ] `client.ts`: `NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY` 사용
- [ ] `subscription-client.ts`: `NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY` 사용
- [ ] 기존 `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` 제거 (혼동 방지)
- [ ] 빌드 성공 (타입 에러 없음)
- [ ] 기존 테스트 모두 통과
- [ ] 일반결제와 정기결제가 동시에 작동

### User Impact
PG 심사 시 일반결제(티켓 구매)와 정기결제(구독)가 동시에 작동하여, 심사관이 두 결제 방식을 모두 확인할 수 있게 됨.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 둘 다 명시적 이름 사용 (TICKET / BILLING) | 범용 이름 제거로 용도가 즉시 파악됨 | 파일 2개 수정 필요 |
| 기존 `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` 제거 | 혼동 방지, 단일 진실 소스 | 없음 |
| 서버 사이드(`billing.ts`) 변경 없음 | 서버 API는 `PORTONE_API_SECRET`만 사용, channelKey 불필요 확인 완료 | 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [x] 포트원 콘솔에서 채널 정보 확인 (2개 채널, 별도 MID 확인 완료)
- [x] `billing.ts` 서버 코드가 channelKey를 사용하지 않음 확인 완료

### External Dependencies
- `@portone/browser-sdk/v2`: 이미 설치됨 (변경 없음)

---

## 🚀 Implementation Phases

### Phase 1: 환경변수 분리 + 코드 수정
**Goal**: 두 클라이언트 파일이 각각 명시적 환경변수를 사용하도록 변경
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 1.1**: `.env.local` 환경변수 변경
  - File(s): `.env.local`
  - 변경 내용:
    ```diff
    - NEXT_PUBLIC_PORTONE_CHANNEL_KEY=channel-key-67ce7802-d410-40d7-8271-5813cd7ab8ae
    + # PortOne Channel Keys (용도별 분리)
    + NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY=channel-key-d7b61f25-6606-4335-b9aa-aa7141dd1e95
    + NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY=channel-key-67ce7802-d410-40d7-8271-5813cd7ab8ae
    ```

- [ ] **Task 1.2**: `client.ts` 환경변수 변경 (일반결제)
  - File(s): `src/lib/portone/client.ts`
  - 변경 내용:
    ```typescript
    // Before:
    const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || '';
    
    // After:
    const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY || '';
    ```
  - 주석도 보강: `// 일반결제(티켓 구매)용 채널 키`

- [ ] **Task 1.3**: `subscription-client.ts` 환경변수 변경 (정기결제)
  - File(s): `src/lib/portone/subscription-client.ts`
  - 변경 내용:
    ```typescript
    // Before:
    const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || '';
    
    // After:
    const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY || '';
    ```
  - 주석도 보강: `// 정기결제(구독)용 채널 키`

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**Build & Tests**:
- [ ] **Build**: `npm run build` 성공 (타입 에러 없음)
- [ ] **All Tests Pass**: `npm test` 통과

**Code Quality**:
- [ ] **Type Safety**: TypeScript 타입 에러 없음
- [ ] **Linting**: `npm run lint` 통과

**Manual Testing**:
- [ ] 일반결제(티켓 구매) 결제창이 정상 호출됨
- [ ] 정기결제(구독) 빌링키 발급 결제창이 정상 호출됨
- [ ] 두 결제가 서로 다른 channelKey를 사용하는지 확인 (브라우저 개발자 도구 Network 탭)

**Validation Commands**:
```bash
npm run build
npm test
npm run lint
```

---

### Phase 2: 문서 업데이트 + Vercel 환경 설정
**Goal**: 아키텍처 문서 반영 + 운영 환경 환경변수 설정
**Estimated Time**: 15분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: `architecture_data_flow.md` 업데이트
  - File(s): `Docs/important_files/architecture_data_flow.md`
  - PortOne Integration 섹션 (§18 File Index) 수정:
    - `client.ts` → `NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY` (일반결제)
    - `subscription-client.ts` → `NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY` (정기결제)

- [ ] **Task 2.2**: Vercel 환경변수 설정
  - Vercel Dashboard → Settings → Environment Variables
  - 기존 `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` 삭제 (또는 유지해도 무방, 코드에서 미참조)
  - `NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY` 추가 (Production + Preview)
  - `NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY` 추가 (Production + Preview)

#### Quality Gate ✋

- [ ] 문서에 channelKey 분리 내용이 정확히 반영됨
- [ ] Vercel에 새 환경변수 2개 추가 완료
- [ ] Vercel 배포 후 일반결제 + 정기결제 모두 작동 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| 새 env 변수 미설정으로 결제 실패 | Low | High | 빌드 후 수동 테스트로 즉시 확인 |
| Vercel에 env 추가 누락 | Low | High | Phase 2에서 명시적 체크 |
| PG 심사 시 테스트 채널 key가 달라질 수 있음 | Low | Medium | 심사 전 채널 key 재확인 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
**Steps to revert**:
- `client.ts`와 `subscription-client.ts`: `CHANNEL_KEY` 라인을 원래대로 복원
  ```typescript
  const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || '';
  ```
- `.env.local`: 기존 `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` 라인 복원
- 즉시 원래 동작으로 복구됨 (1분 이내)

### If Phase 2 Fails
- 문서 변경만이므로 git revert로 복구
- Vercel 환경변수는 삭제하면 됨

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 30분 | - | - |
| Phase 2 | 15분 | - | - |
| **Total** | 45분 | - | - |

---

## 📝 Notes & Learnings

### 사전 조사 결과 (2026-02-25)
- 포트원 MCP로 확인: 대표상점(`store-5e8ecbc4-...`)에 KCP_V2 채널 2개 등록됨
- 채널 1 (일반결제): MID `T0000`, channelKey `channel-key-d7b61f25-...`
- 채널 2 (정기결제): MID `A52Q7`, channelKey `channel-key-67ce7802-...`
- `billing.ts` (서버)는 channelKey 미사용 확인 → 서버 코드 변경 불필요
- 간편결제(토스페이, 카카오페이, 네이버페이)는 KCP 결제창을 통해 자동 노출 → 별도 처리 불필요

---

## 📚 References

### 관련 파일
- `src/lib/portone/client.ts` — 일반결제 (티켓 구매) 프론트엔드
- `src/lib/portone/subscription-client.ts` — 정기결제 (구독) 프론트엔드
- `src/lib/portone/billing.ts` — 서버 사이드 빌링 API (변경 없음)
- `src/lib/portone/server.ts` — 서버 사이드 결제 검증 (변경 없음)

### 포트원 문서
- [서비스 필수 구축요건](https://help.portone.io/content/requirements)

---

## ✅ Final Checklist

**Before marking plan as COMPLETE**:
- [ ] Phase 1, 2 모두 quality gate 통과
- [ ] 일반결제 + 정기결제 동시 작동 확인
- [ ] Vercel 배포 환경에서도 작동 확인
- [ ] 아키텍처 문서 업데이트 완료

---

**Plan Status**: ⏳ Pending
**Next Action**: Phase 1 — 환경변수 분리 + 코드 수정
**Blocked By**: None
