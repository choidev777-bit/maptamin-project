# Implementation Plan: 매장 변경 시 키워드·경쟁사·스케줄 초기화

**Status**: 🔄 In Progress
**Started**: 2026-02-23
**Last Updated**: 2026-02-23
**Estimated Completion**: 2026-02-23

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
매장 변경 시 해당 플랫폼의 키워드·경쟁사·주간 스케줄을 자동 초기화합니다.
매장과 키워드/경쟁사는 종속 관계이므로, 매장이 바뀌면 이전 데이터는 의미가 없어집니다.

### Success Criteria
- [ ] 매장 변경 시 해당 플랫폼의 `managed_keywords` 전체 삭제
- [ ] 매장 변경 시 해당 플랫폼의 `managed_competitors` 전체 삭제
- [ ] 매장 변경 시 해당 플랫폼의 `search_schedules` 비활성화 (`is_active=false`)
- [ ] 신규 매장 등록(온보딩)은 영향 없음 (기존 데이터 없으므로)
- [ ] 확인 모달은 프론트엔드(MyShopManager)에서 처리

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 백엔드(API)에서 초기화 처리 | 프론트에서 여러 API 호출 불필요, 원자성 보장 | API 로직이 약간 복잡해짐 |
| 해당 플랫폼만 초기화 | 네이버 매장 변경이 구글 데이터에 영향 안 줌 | 없음 |
| `search_schedules` 비활성화 (삭제 X) | 이력 보존, 재활성화 가능성 | 없음 |
| `searches` 기록은 유지 | 진단 기록은 보존 (그래프는 이미 place_id로 필터) | 없음 |

---

## 📦 Dependencies

### Required Before Starting
- [x] `managed_places`, `managed_keywords`, `managed_competitors`, `search_schedules` ERD 확인
- [x] 매장 변경 API (`/api/settings/my-shop` POST) 코드 확인
- [x] 프론트엔드 호출 지점 확인 (`MyShopManager.tsx`, `StepStoreRegister.tsx`, `DashboardPlatformCard.tsx`)

---

## 🚀 Implementation Phases

### Phase 1: 백엔드 API 수정 (`/api/settings/my-shop`)
**Goal**: 매장 변경(UPDATE) 시 키워드·경쟁사·스케줄 동시 초기화
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 1.1**: POST 핸들러의 UPDATE 분기에 초기화 로직 추가
  - File: `src/app/api/settings/my-shop/route.ts`
  - 위치: 기존 `existing` 체크 후 UPDATE 분기 (line 30~55)
  - 추가할 코드:
    ```tsx
    // 매장 변경 시 → 해당 플랫폼 키워드/경쟁사/스케줄 초기화
    await Promise.all([
        supabase.from('managed_keywords')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', platform),
        supabase.from('managed_competitors')
            .delete()
            .eq('user_id', user.id)
            .eq('platform', platform),
        supabase.from('search_schedules')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .eq('platform', platform),
    ])
    ```
  - 주의: INSERT 분기(신규 등록)에는 추가하지 않음

- [ ] **Task 1.2**: API 응답에 `resetPerformed` 플래그 추가
  - 프론트엔드가 초기화 완료를 인지할 수 있도록:
    ```tsx
    return NextResponse.json({ success: true, resetPerformed: true })
    ```

#### Quality Gate ✋

- [ ] `npx next build` 에러 없이 성공
- [ ] API 엔드포인트가 정상 응답하는지 확인

**Validation Commands**:
```bash
npx next build
```

---

### Phase 2: 프론트엔드 확인 모달 추가 (`MyShopManager.tsx`)
**Goal**: 매장 변경 전 "키워드/경쟁사가 초기화됩니다" 경고
**Estimated Time**: 20분
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 2.1**: `handleSave` 함수에 확인 모달 추가
  - File: `src/components/settings/MyShopManager.tsx`
  - 기존 매장이 있고 새 매장으로 변경하는 경우에만 confirm 표시:
    ```tsx
    const confirmed = confirm(
        '매장을 변경하면 기존 키워드와 경쟁사가 초기화됩니다.\n계속하시겠습니까?'
    )
    if (!confirmed) return
    ```

- [ ] **Task 2.2**: 온보딩 `StepStoreRegister`는 변경 불필요 확인
  - 온보딩은 신규 등록만 하므로 기존 매장이 없음 → confirm 불필요
  - 코드를 읽고 안전한지만 확인

#### Quality Gate ✋

- [ ] `npx next build` 에러 없이 성공
- [ ] 설정 → 매장 변경 → 확인 모달 표시 확인
- [ ] 온보딩 → 매장 등록 → 확인 모달 안 뜨는지 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| `search_schedules`에 `platform` 컬럼 없음 | Low | Medium | ERD 확인 완료 — `platform` 필드 존재 |
| `managed_keywords`에 `platform` 컬럼 없음 | Low | Medium | ERD 확인 완료 — `platform` 필드 존재 |
| 온보딩 시 원치 않는 초기화 | Low | High | INSERT 분기만 해당, UPDATE 분기에만 로직 추가 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- `route.ts`의 초기화 코드 제거 → 기존 동작 복귀
- 키워드/경쟁사 데이터는 이미 삭제된 경우 Supabase 백업에서 복구

### If Phase 2 Fails
- confirm 코드 제거 → UX만 변경, 기능에 영향 없음

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
| Phase 2 | 20분 | - | - |
| **Total** | 50분 | - | - |

---

## 📝 수정 대상 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/app/api/settings/my-shop/route.ts` | UPDATE 분기에 키워드/경쟁사 DELETE + 스케줄 비활성화 |
| `src/components/settings/MyShopManager.tsx` | 매장 변경 시 확인 모달 추가 |

---

**Plan Status**: 🔄 Ready for Approval
**Next Action**: 사용자 승인 후 Phase 1 구현 시작
**Blocked By**: 사용자 승인
