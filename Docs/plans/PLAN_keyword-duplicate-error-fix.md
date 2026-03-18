# Implementation Plan: 온보딩 키워드 중복 에러 개선

**Status**: ⏳ Pending
**Started**: 2026-03-18
**Last Updated**: 2026-03-18
**Estimated Completion**: 2026-03-18

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

온보딩 키워드 등록 단계(`StepKeywordRegister.tsx`)에서 발생하는 에러를 개선한다.

**현재 문제**:
- 사용자가 "지역명 키워드"와 "업종 키워드"에 **같은 키워드를 입력**하면 DB가 에러를 반환함
- 에러 메시지가 영문 DB 원문(`duplicate key value violates unique constraint...`)으로 그대로 노출됨
- 사용자가 에러 원인과 해결 방법을 전혀 알 수 없는 최악의 UX

**DB 제약 조건 (근거)**:
```sql
-- 015_v2_schema_upgrade.sql:87
UNIQUE(user_id, platform, keyword)  -- keyword_type은 포함되지 않음
```

→ `(user_id, platform, keyword)` 조합이 유일해야 하므로, 같은 키워드를 `industry` + `local` 두 타입으로 동시에 저장하면 충돌.

### ⚠️ 명시적 가정 (Karpathy Guideline #1)

1. **같은 키워드를 두 섹션에 동시 등록하는 것은 비즈니스적으로 의미 없음**으로 간주한다.
   - 이유: "용산역 쌀국수"는 지역명 키워드이지 업종 키워드가 아님. 업종 키워드는 "쌀국수"처럼 지역명이 없는 것이 적절함.
   - 반론 가능성: "동일 키워드를 두 타입으로 추적"하고 싶을 수도 있으나, DB 설계상 현재는 불가하고 UI 안내로 충분히 방지 가능.

2. **`insert` → `upsert` 전환은 이 태스크에서 하지 않는다.**
   - 온보딩 이탈 복구 시 키워드 스텝은 항상 빈 화면으로 시작하고(`computeStartStep`에서 hasKeywords가 true면 keyword스텝 skip), 이미 키워드가 있는 상태에서 재저장하는 경로가 실제로 발생하지 않음.
   - 불필요한 복잡성을 추가하지 않는다 (Karpathy Guideline #2).

3. **DB 스키마 변경 없음** — `UNIQUE(user_id, platform, keyword, keyword_type)` 확장은 이 태스크의 범위 밖.

### Success Criteria
- [ ] "지역명 키워드"와 "업종 키워드"에 같은 키워드 입력 시, "다음 단계로" 버튼 클릭 전에 화면에 한국어 경고가 표시됨
- [ ] DB 요청 자체가 이 경우에 전송되지 않음 (프론트엔드에서 차단)
- [ ] DB 에러가 발생한 경우에도 (예상치 못한 상황) 한국어 메시지로 변환하여 표시됨
- [ ] 기존 정상 플로우(중복 없는 경우) 동작에 변화 없음

### User Impact
사용자가 실수로 같은 키워드를 두 곳에 입력했을 때, 무엇이 잘못됐는지 즉시 이해할 수 있는 한국어 안내가 표시된다.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 프론트엔드 유효성 검사만 추가 | DB 제약 에러 자체가 발생하지 않도록 원천 차단. 최소 변경. | DB 제약이 완전히 해결되는 건 아니나, 이 경로에서 충분함 |
| 에러 메시지 한국어 변환 추가 | 예상치 못한 DB 에러 발생 시에도 사용자 친화적 처리 | 모든 DB 에러 코드를 다 매핑하진 않음 (필요한 것만) |
| `insert` 유지 (upsert 아님) | 실제 중복 삽입 경로가 현재 없음. 불필요한 복잡성 추가 금지 | 나중에 다른 경로에서 중복 발생 시 별도 대응 필요 |

---

## 📦 Dependencies

### Required Before Starting
- [x] 없음. 단독으로 시작 가능.

### External Dependencies
- 없음. 라이브러리 추가 불필요.

---

## 🚀 Implementation Phases

### Phase 1: 프론트엔드 중복 키워드 유효성 검사 추가
**Goal**: `handleNext` 실행 시 지역명/업종 키워드 간 중복 검사 후 한국어 안내 표시
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### 변경 대상 파일
- `src/components/onboarding/StepKeywordRegister.tsx`

#### Tasks

**🟢 GREEN: 구현 (이 범위는 단순 유효성 검사로 TDD 불필요)**

- [ ] **Task 1.1**: `handleNext` 함수 내 중복 키워드 교차 검사 추가
  - File: `src/components/onboarding/StepKeywordRegister.tsx`
  - 위치: `handleNext` 내부, DB insert 전 (78번째 줄 이전)
  - 구현 내용:
    ```typescript
    // 지역명 키워드와 업종 키워드 간 중복 검사
    const naverSet = new Set(filteredNaver)
    const duplicates = filteredLocalNaver.filter(k => naverSet.has(k))
    if (duplicates.length > 0) {
      setError(`"${duplicates[0]}"은(는) 업종 키워드와 지역명 키워드에 중복으로 입력되어 있습니다. 한 곳에만 입력해주세요.`)
      setSaving(false)
      return
    }
    ```

- [ ] **Task 1.2**: DB 에러 메시지 한국어 변환
  - File: `src/components/onboarding/StepKeywordRegister.tsx`
  - 위치: 89번째 줄 `catch` 블록
  - 현재 코드:
    ```typescript
    } catch (err: any) {
        setError(err.message)  // ← DB 영문 에러 그대로 노출
    ```
  - 변경 내용:
    ```typescript
    } catch (err: any) {
        const msg = err.message || ''
        if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
            setError('이미 등록된 키워드가 있습니다. 페이지를 새로고침 후 다시 시도해주세요.')
        } else {
            setError('키워드 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        }
    }
    ```

**🔵 REFACTOR: 없음**
- 이 변경은 충분히 단순하여 리팩토링 불필요.

#### Quality Gate ✋

**⚠️ STOP: 아래 항목 모두 통과 후 완료 처리**

**수동 테스트 체크리스트**:
- [ ] **정상 케이스**: 지역명/업종에 다른 키워드 입력 → 정상적으로 다음 단계 이동
- [ ] **중복 케이스**: "용산역 쌀국수"를 지역명/업종 양쪽에 입력 → "다음 단계로" 클릭 시 한국어 경고 표시, DB 요청 없음
- [ ] **빌드 통과**: `npm run dev` 에서 TypeScript 컴파일 에러 없음
- [ ] **기본 플로우 회귀 없음**: 정상 키워드만 입력 시 다음 단계 정상 진행

**빌드 검증 명령어**:
```bash
npm run build
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| `filteredLocalNaver`가 비어 있는 플랜에서 오작동 | Low | Low | `filteredLocalNaver.length === 0`이면 검사 자체를 skip |
| 공백/대소문자 차이로 중복 미감지 | Low | Low | `keyword.trim()`은 이미 적용됨. 대소문자는 한국어이므로 무관 |
| 기존 정상 케이스 회귀 | Low | Medium | 수동 테스트 체크리스트로 검증 |

---

## 🔄 Rollback Strategy

### Phase 1 실패 시

`StepKeywordRegister.tsx`의 변경 내용을 git으로 되돌림:

```bash
git checkout src/components/onboarding/StepKeywordRegister.tsx
```

---

## 📊 Progress Tracking

- **Phase 1**: ⏳ 0%

**Overall Progress**: 0% complete

---

## 📝 Notes & Learnings

### 현재 코드 구조 분석

- `handleNext` (38번째 줄): 비동기 저장 함수. `insert`만 사용, 유효성 검사 없음.
- `error` state (30번째 줄): 에러 표시용 state 이미 존재 → 추가 state 불필요.
- `filteredLocalNaver` (50번째 줄): 이미 trim된 지역명 키워드 배열.
- `filteredNaver` (48번째 줄): 이미 trim된 업종 키워드 배열.

### 범위 의도적 제한

- DB 스키마(`keyword_type` 포함 UNIQUE) 변경: **범위 밖** — 마이그레이션 위험 대비 효과 낮음
- `upsert` 전환: **범위 밖** — 현재 실제 발생 경로 없음
- 구글 키워드와의 교차 중복 검사: **범위 밖** — 구글/네이버는 DB에서 `platform`이 다르므로 제약 없음

---

**Plan Status**: ⏳ Pending
**Next Action**: 코딩 시작 승인 후 Phase 1 진행
**Blocked By**: 없음
