# Implementation Plan: Dispatch 안정성 개선 (fire-and-forget → await)

**Status**: ⏳ Pending
**Started**: 2026-02-24
**Last Updated**: 2026-02-24
**Estimated Completion**: 2026-02-24 (30분 이내)

---

## 📋 Overview

### Feature Description

`/api/naver/search`와 `/api/search` 라우트에서 dispatch 호출이 `fire-and-forget` (비동기, 결과 미대기) 방식으로 구현되어 있어, Vercel Serverless 환경에서 dispatch가 누락되는 경우가 발생. `await`로 변경하여 확실한 실행을 보장한다.

### 현재 문제

```typescript
// 현재 (불안정)
fetch(`${baseUrl}/api/queue/dispatch`, { ... })
  .catch(err => console.error(...))
// ← await 없음, 함수 종료 시 fetch가 완료되지 않을 수 있음
```

### 수정 후

```typescript
// 수정 후 (안정)
try {
    await fetch(`${baseUrl}/api/queue/dispatch`, { ... })
} catch (err) {
    console.error('[Search] Dispatcher trigger failed:', err)
}
// ← dispatch가 완료된 후에만 응답 반환
```

### Success Criteria

- [ ] 웰컴 리포트 온보딩 시 GitHub Actions dispatch 정상 작동
- [ ] 실시간 진단에서도 기존과 동일하게 정상 작동
- [ ] `npx next build` 성공

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| fire-and-forget → await | Vercel Serverless에서 응답 후 함수 종료 시 미완료 fetch 방지 | 응답 시간이 dispatch 시간(~200ms)만큼 약간 늘어남 |
| 에러를 try-catch로 감싸기 | dispatch 실패 시에도 검색 생성 자체는 성공으로 반환 | 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [x] Phase 2 (messaging.ts) 완료
- [x] GitHub Secrets 등록 완료
- [x] SUPABASE_SERVICE_ROLE_KEY 정상 확인

---

## 🚀 Implementation Phase

### Phase 1: Dispatch await 변경
**Goal**: 2개 라우트의 dispatch 호출을 await로 변경
**Estimated Time**: 15분
**Status**: ⏳ Pending

#### 대상 파일 (2개)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `src/app/api/naver/search/route.ts` | fire-and-forget → try/await/catch |
| 2 | `src/app/api/search/route.ts` | 동일 |

#### Tasks

- [ ] **Task 1.1**: `src/app/api/naver/search/route.ts` — dispatch 호출을 `await`로 변경
- [ ] **Task 1.2**: `src/app/api/search/route.ts` — dispatch 호출을 `await`로 변경 (동일 패턴이 있는 경우)
- [ ] **Task 1.3**: `npx next build` 빌드 확인

#### Quality Gate ✋

- [ ] `npx next build` 성공
- [ ] 배포 후 온보딩 웰컴 리포트 → GitHub Actions dispatch 확인
- [ ] 실시간 진단 → GitHub Actions dispatch 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| await 추가로 응답 지연 | Low | Low | dispatch는 ~200ms. 사용자 체감 없음 |
| dispatch 실패 시 검색 생성 실패 | Low | Med | try-catch로 감싸서 검색 생성은 항상 성공 |

---

## 🔄 Rollback Strategy

`await`를 제거하고 원래 fire-and-forget으로 되돌리면 됨. 1줄 변경.
