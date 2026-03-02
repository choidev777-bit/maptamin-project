# Implementation Plan: 정규식 fallback Apollo State 추출 보완

**Status**: 🔄 In Progress
**Started**: 2026-03-02
**Last Updated**: 2026-03-02

---

**⚠️ CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. ➡️ Only then proceed to next phase

⛔ **DO NOT skip quality gates or proceed with failing checks**

---

## 📋 Overview

### Problem Statement (증거 기반)

**L61**: 스크립트 차단 (`'script'` 포함)
```typescript
if (['stylesheet', 'script', 'image', 'media', 'font'].includes(resourceType)) {
    return route.abort();
}
```

**L71~77**: `window.__APOLLO_STATE__`에 직접 접근 → **스크립트가 차단되어 있으므로 null 반환**

**L85**: 정규식 fallback 실행
```typescript
const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]+?});\s*<\/script>/);
```

**이 정규식의 문제**: `{[\s\S]+?}` 는 **lazy** 매칭입니다.
- `{[\s\S]+?}` 는 "가능한 한 짧은 문자열"을 캡처합니다
- Apollo State JSON은 `{"ROOT_QUERY": {...}, "RestaurantListSummary:123:123": {...}, ...}` 형태
- JSON 내부에는 수많은 `}` 가 존재
- lazy 매칭은 **첫 번째로 만나는 `};\s*</script>` 패턴에서 멈춤**
- 이 때문에 JSON이 중간에 잘려서 불완전하게 됨
- `JSON.parse()`가 실패하거나, 파싱 되더라도 ROOT_QUERY가 누락됨

### 해결 방향

정규식을 lazy에서 **greedy**로 변경: `{[\s\S]+?}` → `{[\s\S]+}`

또는 더 안전한 방법: 스크립트 차단을 유지하되, HTML 소스에서 `__APOLLO_STATE__`를 포함한 인라인 스크립트 전체를 정확히 추출하는 방식으로 변경.

### 가정 (검증 필요)
1. **가정 A**: `window.__APOLLO_STATE__`는 인라인 `<script>` 태그 내에 정의됨 (외부 JS 파일이 아님)
   - 맞다면: 스크립트 차단과 무관하게 HTML에 포함됨
   - 틀리다면: 정규식 fallback도 작동하지 않을 것 → 이미 작동하고 있으므로 이 가정은 맞음
2. **가정 B**: `window.__APOLLO_STATE__`가 인라인 스크립트에 있는데 L71의 `page.evaluate`에서 null이 나오는 이유
   - 원인 후보 1: 외부 스크립트가 인라인 코드를 초기화하는데, 그 스크립트가 차단됨
   - 원인 후보 2: `waitUntil: 'domcontentloaded'` 가 인라인 스크립트 실행 전에 evaluate 실행됨
   - **둘 다 가능하며, 어느 쪽이든 정규식이 HTML 소스에서 올바르게 추출하면 해결됨**

### Success Criteria
- [ ] 정규식이 __APOLLO_STATE__ 전체 JSON을 올바르게 캡처 (ROOT_QUERY 포함)
- [ ] 기존 테스트 17개 전부 통과
- [ ] 새 테스트: 정규식 fallback 경로에서도 ROOT_QUERY 기반 추출이 동작하는지 검증
- [ ] 로컬에서 "빵" 키워드로 달콤붕어살롱 순위 포함 확인

---

## 🚀 Implementation Phases

### Phase 1: 정규식 문제 재현 및 테스트 작성
**Goal**: 문제 재현 + 실패 테스트 작성
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

**사전 검증**
- [ ] **Task 1.0**: 실제 네이버 페이지 HTML에서 `__APOLLO_STATE__`의 정확한 위치와 형식 확인 (인라인 vs 외부)
  - 브라우저에서 HTML 소스 보기로 확인
  - 확인 사항: `</script>` 직전에 `;`가 있는지, JSON 구조가 어떻게 닫히는지

**🔴 RED: Write Failing Tests**
- [ ] **Task 1.1**: 정규식 fallback 경로의 테스트 추가
  - File: `src/lib/naver/__tests__/scraper_ex2.extraction.test.ts`
  - 테스트 케이스: `page.evaluate`가 null을 반환하고, `page.content()`가 `__APOLLO_STATE__` 인라인 스크립트를 포함한 HTML을 반환하는 시나리오
  - HTML mock에 ROOT_QUERY 포함된 Apollo State를 넣고, 정규식 경로에서 ROOT_QUERY 기반 추출이 동작하는지 확인
  - Expected: 정규식 패턴이 잘못되어 FAIL (현재 lazy 매칭 문제)

#### Quality Gate ✋
- [ ] 새 테스트가 FAIL 확인 (Red 상태)
- [ ] 기존 17개 테스트 여전히 통과

**Validation Commands**:
```bash
npx jest src/lib/naver/__tests__/ --no-coverage
```

---

### Phase 2: 정규식 패턴 수정
**Goal**: 정규식을 수정하여 Phase 1 테스트 통과
**Estimated Time**: 30분
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Fix the regex**
- [ ] **Task 2.1**: L85 정규식 패턴 수정
  - File: `src/lib/naver/scraper_ex2.ts` L85
  - 수정 범위: 정규식 패턴 1줄
  - 방향: Task 1.0의 검증 결과에 따라 결정
    - 옵션 A: lazy → greedy 변경 (`+?` → `+`)
    - 옵션 B: 더 정교한 패턴 (JSON 구조 경계 인식)

#### Quality Gate ✋
- [ ] Phase 1의 새 테스트 통과 (Green 상태)
- [ ] 기존 17개 + 새 테스트 전부 통과
- [ ] 로컬에서 실테스트: "빵" 키워드로 달콤붕어살롱 순위 포함 확인

**Validation Commands**:
```bash
npx jest src/lib/naver/__tests__/ --no-coverage
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| greedy 매칭이 너무 많은 텍스트를 캡처 | Low | Medium | `</script>` 경계가 명확하므로 안전 |
| JSON.parse() 실패 | Low | Low | try-catch 이미 존재 (L90~95) |
| 네이버가 인라인 대신 외부 JS로 변경 | Low | High | 그 경우 evaluate 경로와 정규식 둘 다 실패 → 별도 대응 필요 |

---

## 📊 수정 범위

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/naver/scraper_ex2.ts` | L85 정규식 패턴 1줄 수정 |
| `src/lib/naver/__tests__/scraper_ex2.extraction.test.ts` | 정규식 fallback 테스트 1개 추가 |

**총 수정: 2개 파일, 핵심 변경 1줄**

---

**Plan Status**: ⏳ Pending Approval
**Next Action**: 사용자 승인 후 Phase 1 시작
