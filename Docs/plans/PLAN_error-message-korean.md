# Implementation Plan: 전체 서비스 에러 메시지 한국어 통일

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

맵타민 전체 서비스에서 사용자에게 영문 DB/JS 에러 메시지가 노출되는 8개 파일, 12개 지점을 파악하여 한국어 친화 메시지로 통일한다.

**배경**: `StepKeywordRegister.tsx`의 에러 메시지 수정 작업 중 발견된 패턴이 전체 서비스에 걸쳐 동일하게 존재함.

### ⚠️ 명시적 가정 (Karpathy Guideline #1)

1. **API route 자체는 수정하지 않는다.** API 에러 메시지(`api/settings/my-shop`, `api/settings/competitors`)가 영문 DB 에러를 반환하더라도, 이를 소비하는 프론트엔드 컴포넌트에서 차단한다.
   - 이유: API route 수정은 별도 스코프이며, 에러 핸들링의 "최후 방어선"은 항상 UI여야 함.

2. **`error.tsx`는 수정하지 않는다.** 이미 `process.env.NODE_ENV === 'development'` 조건으로 올바르게 처리되어 있음:
   ```tsx
   // error.tsx:37
   {process.env.NODE_ENV === 'development' && (
       <p className="text-sm text-red-600">{error.message}</p>
   )}
   ```
   → 프로덕션에서 영문 에러 노출 없음. 수정 불필요.

3. **`naver-search/new` 및 `search/new`의 `alert(error.message || 'Korean')` 패턴은 수정하지 않는다.** 해당 API가 이미 한국어 `message` 필드를 반환하므로 실제로 문제가 발생하지 않음:
   ```typescript
   // naver/search/route.ts:102
   message: '이번 달 실시간 진단 티켓이 모두 소진되었습니다.'
   ```

4. **각 상황에 맞는 구체적 문구를 사용한다.** 모든 에러를 "오류가 발생했습니다"로 통일하지 않음. 사용자가 어떤 상황인지 이해할 수 있도록 문맥에 맞는 문구 사용.

### Success Criteria

- [ ] 아래 8개 파일 수정 완료 후 빌드 통과
- [ ] 각 페이지에서 에러 발생 시 한국어 메시지만 표시됨 (영문 DB/JS 에러 노출 없음)
- [ ] 기존 정상 플로우에 변화 없음

### User Impact

서비스 어느 화면에서 오류가 발생해도 영문 기술 메시지 대신 사용자가 이해 가능한 한국어 안내가 표시된다.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 프론트엔드 catch/error 처리만 변경 | 최소 변경. API 수정 없이 사용자 노출 차단 | API는 여전히 영문 에러 반환하나 사용자에겐 노출 안 됨 |
| 각 상황별 구체적 문구 사용 | 사용자가 맥락 이해 가능 | 파일마다 문구가 다름 (일관성보다 명확성 우선) |
| Phase 1개로 처리 | 모든 변경이 동일한 1줄 패턴. Phase 분리 불필요 | - |

---

## 📦 Dependencies

### Required Before Starting
- [x] 없음. 단독 시작 가능.

---

## 🚀 Implementation Phases

### Phase 1: 전체 서비스 에러 메시지 한국어 통일
**Goal**: 8개 파일, 12줄 수정. 각 위치에서 JS/DB 에러 원문 대신 한국어 메시지 표시.
**Estimated Time**: 30분
**Status**: ⏳ Pending

---

#### 변경 대상 및 구체 문구

---

**Task 1.1 — `StepStoreRegister.tsx:100`**
- File: `src/components/onboarding/StepStoreRegister.tsx`
- 현재 코드:
  ```typescript
  } catch (err: any) {
      setError(err.message)
  }
  ```
- 변경 후:
  ```typescript
  } catch (err: any) {
      setError('매장 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
  ```

---

**Task 1.2 — `StepCompetitorRegister.tsx:126`**
- File: `src/components/onboarding/StepCompetitorRegister.tsx`
- 현재 코드:
  ```typescript
  } catch (err: any) {
      setError(err.message)
  }
  ```
- 변경 후:
  ```typescript
  } catch (err: any) {
      setError('경쟁사 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
  ```

---

**Task 1.3 — `StepScheduleSetting.tsx:170`**
- File: `src/components/onboarding/StepScheduleSetting.tsx`
- 현재 코드:
  ```typescript
  } catch (err: any) {
      setError(err.message)
  }
  ```
- 변경 후:
  ```typescript
  } catch (err: any) {
      setError('일정 설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
  ```

---

**Task 1.4 — `MyShopSelector.tsx:33, 54`**
- File: `src/components/schedule/MyShopSelector.tsx`
- 현재 코드 (33번):
  ```typescript
  setError(err.message)
  ```
- 변경 후 (33번):
  ```typescript
  setError('매장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  ```
- 현재 코드 (54번 JSX — "오류:" 접두어 중복 방지):
  ```tsx
  <p className="text-red-600">오류: {error}</p>
  ```
- 변경 후 (54번):
  ```tsx
  <p className="text-red-600">{error}</p>
  ```
- 이유: 에러 메시지 자체가 이미 한국어 완전한 문장이므로 "오류:" 접두어가 있으면 `오류: 매장 정보를 불러오지 못했습니다.`와 같이 어색해짐.

---

**Task 1.5 — `MyShopManager.tsx:63, 92`**
- File: `src/components/settings/MyShopManager.tsx`
- 현재 코드 (63번):
  ```typescript
  alert(error.error || '매장 등록 실패')
  ```
- 변경 후 (63번):
  ```typescript
  alert('매장 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
  ```
- 현재 코드 (92번):
  ```typescript
  alert(error.error || '삭제 실패')
  ```
- 변경 후 (92번):
  ```typescript
  alert('매장 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
  ```

---

**Task 1.6 — `CompetitorManager.tsx:58, 81`**
- File: `src/components/settings/CompetitorManager.tsx`
- 현재 코드 (58번):
  ```typescript
  alert(error.error || '경쟁사 등록 실패')
  ```
- 변경 후 (58번):
  ```typescript
  alert('경쟁사를 등록하지 못했습니다. 잠시 후 다시 시도해주세요.')
  ```
- 현재 코드 (81번):
  ```typescript
  alert(error.error || '삭제 실패')
  ```
- 변경 후 (81번):
  ```typescript
  alert('경쟁사 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.')
  ```

---

**Task 1.7 — `DeleteAccountSection.tsx:31`**
- File: `src/components/settings/DeleteAccountSection.tsx`
- 현재 코드:
  ```typescript
  throw new Error(data.error || 'Failed to delete account')
  ```
- 변경 후:
  ```typescript
  throw new Error(data.error || '계정 삭제에 실패했습니다.')
  ```
- 이유: `data.error`가 없을 경우 영문 `'Failed to delete account'`가 catch → `setError(err.message)` → 사용자에게 노출됨.

---

**Task 1.8 — `SettingsContent.tsx:72`**
- File: `src/app/(dashboard)/settings/SettingsContent.tsx`
- 현재 코드:
  ```typescript
  if (!response.ok) throw new Error(data.error || 'Failed to delete account')
  ```
- 변경 후:
  ```typescript
  if (!response.ok) throw new Error(data.error || '계정 삭제에 실패했습니다.')
  ```
- 이유: `DeleteAccountSection.tsx`와 동일 로직이 복제되어 있는 코드. catch → `setDeleteError(err.message)` → 사용자에게 노출됨.

---

#### Quality Gate ✋

**⚠️ STOP: 아래 항목 모두 통과 후 완료 처리**

**빌드 검증**:
```bash
npm run build
```
- [ ] TypeScript 컴파일 에러 없음
- [ ] 빌드 성공

**수동 테스트 체크리스트**:

| 화면 | 테스트 방법 | 기대 결과 |
|---|---|---|
| 온보딩 매장 등록 | 네트워크 끊고 저장 시도 | 한국어 에러 표시 |
| 온보딩 경쟁사 등록 | 네트워크 끊고 저장 시도 | 한국어 에러 표시 |
| 온보딩 스케줄 설정 | 네트워크 끊고 저장 시도 | 한국어 에러 표시 |
| 설정 > 매장 관리 | 매장 등록/삭제 시 에러 유발 | 한국어 alert 표시 |
| 설정 > 경쟁사 관리 | 경쟁사 등록/삭제 시 에러 유발 | 한국어 alert 표시 |
| 설정 > 계정 삭제 | 네트워크 끊고 삭제 시도 | 한국어 에러 표시 (영문 'Failed to delete account' 노출 안 됨) |
| 일정 설정 > 매장 선택 | 매장 로드 실패 시 | "오류:" 접두어 없이 한국어 에러만 표시 |
| 전체 정상 플로우 | 정상 입력값으로 각 화면 동작 | 기존과 동일하게 정상 작동 |

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| 다른 곳에서 동일 에러 메시지를 파싱해 분기처리하는 코드가 있을 경우 | Low | Medium | grep으로 `err.message`/`error.error` 소비처 재확인 |
| 빌드 에러 | Low | Low | 각 파일 수정 후 `npm run build` |

---

## 🔄 Rollback Strategy

```bash
git checkout src/components/onboarding/StepStoreRegister.tsx
git checkout src/components/onboarding/StepCompetitorRegister.tsx
git checkout src/components/onboarding/StepScheduleSetting.tsx
git checkout src/components/schedule/MyShopSelector.tsx
git checkout src/components/settings/MyShopManager.tsx
git checkout src/components/settings/CompetitorManager.tsx
git checkout src/components/settings/DeleteAccountSection.tsx
git checkout src/app/(dashboard)/settings/SettingsContent.tsx
```

---

## 📊 Progress Tracking

- **Phase 1**: ⏳ 0%

**Overall Progress**: 0% complete

---

## 📝 범위 밖 (의도적으로 포함하지 않은 항목)

| 항목 | 이유 |
|---|---|
| `error.tsx` | `NODE_ENV === 'development'` 조건으로 이미 보호됨 |
| `naver-search/new`, `search/new`의 `alert(error.message)` | API가 이미 한국어 message 반환 |
| `payment-return` 페이지 | 한국어 fallback 이미 존재하며 PortOne 에러 메시지는 별도 검토 필요 |
| `CompetitorManagementView.tsx` | catch에서 고정 한국어 alert 사용. throw의 영문 메시지는 console에만 출력되어 사용자 노출 없음 |
| API route 자체 수정 | 별도 스코프 |

---

**Plan Status**: ⏳ Pending
**Next Action**: 코딩 시작 승인 후 Phase 1 진행
**Blocked By**: 없음
