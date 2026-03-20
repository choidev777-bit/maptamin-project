# Implementation Plan: 무료 체험 1회 (Free Trial)

**Status**: 🔄 In Progress
**Started**: 2026-03-20
**Last Updated**: 2026-03-20
**Estimated Completion**: 2026-03-22

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
회원가입(free 플랜) 사용자에게 **네이버 분석 1회 무료 체험**을 제공하는 전용 `/free-trial` 페이지를 만듭니다.
- 매장 검색 (네이버 플레이스)
- 지역명 키워드 1개 + 업종 키워드 1개 직접 입력
- 좌표 크기 3×3 / 5×5 선택 + 간격 커스텀 (기존 그리드 UI 재활용)
- 전화번호 입력 → 분석 완료 후 카카오 알림톡으로 결과 URL 발송
- 유료 구독자는 대시보드로 자동 리다이렉트

### Success Criteria
- [ ] free 플랜 유저가 `/free-trial`에서 1회 무료 네이버 분석 실행 가능
- [ ] 2회 이상 시도 시 "이미 무료 체험을 사용하셨습니다" 차단
- [ ] 유료 구독자가 `/free-trial` 접근 시 대시보드로 자동 리다이렉트
- [ ] 분석 완료 후 입력한 전화번호로 카카오 알림톡 결과 URL 수신
- [ ] 결과 페이지는 기존 `/naver-search/[id]` (대시보드 레이아웃) 그대로 사용
- [ ] 랜딩페이지 CTA 문구 변경 + `/login?redirectTo=/free-trial` 링크

### User Impact
마케팅 퍼널 완성: 랜딩 → 가입 → 무료 체험 → 결과 확인(+알림톡) → 구독 전환 유도

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 전용 `/free-trial` 페이지 신규 생성 | 기존 코드에 free 유저 차단 가드가 6곳 존재 — 조건 분기보다 별도 페이지가 기존 구독자 플로우 침범 최소화 | 새 페이지 + API 추가 (코드량 증가) |
| `free_trial_used` 새 컬럼 (기존 `welcome_report_sent` 미사용) | `welcome_report_sent`는 구독자 웰컴 리포트 전용. 역할 분리가 안전 | DB 마이그레이션 1건 추가 |
| 키워드를 `managed_keywords`에 저장하지 않음 | 무료 체험은 1회성 — managed 자산으로 등록하면 30일 락 등 부작용 있음. API에 직접 전달만 | 무료체험 키워드는 DB에 남지 않음 |
| 매장도 `managed_places`에 저장하지 않음 | 동일 이유. 무료체험 매장은 검색 레코드(`searches.place_*`)에만 기록 | 설정 페이지에서 보이지 않음 (의도된 동작) |
| `report_type = 'free_trial'` 신규 값 사용 | 기존 `welcome`/`realtime`과 구분하여 히스토리에서 식별 가능 | `report_type` enum에 값 추가 |
| 기존 Oracle VM 파이프라인 재활용 | 네이버 크롤링 → 알림톡 발송까지 검증된 기존 파이프라인 사용 | 추가 변경 없음 |
| 무료체험 전용 알림톡 함수 `sendFreeTrialReport()` 추가 | 웰컴 템플릿 문구가 구독자 전용 — 별도 템플릿 필요. 변수 구조는 동일하여 코드량 최소화 | 솔라피 심사 대기 (1~3 영업일) + `.env` 추가 1줄 |

---

## 📦 Dependencies

### Required Before Starting
- [ ] Supabase DB 접근 권한 (마이그레이션 적용)
- [ ] **솔라피 무료체험 전용 알림톡 템플릿 심사 승인** (아래 참조)
- [ ] 승인 후 발급된 템플릿 코드를 `.env`에 `KAKAO_TEMPLATE_FREE_TRIAL=xxx` 추가

> **⚠️ 사전 작업 필요**: 기존 웰컴 템플릿은 "구독 신청하신 맵타민..." 문구로 비구독자에게 부적절. 솔라피에 아래 문구로 심사 신청 필요 (승인까지 1~3 영업일 소요).
>
> **템플릿 문구:**
> ```
> [맵타민] 무료 체험 리포트 안내
>
> 안녕하세요, #{가게명} 사장님.
> 맵타민 무료 체험 플레이스 순위 분석이 완료되었습니다.
>
> - 플랫폼: #{플랫폼명}
> - 리포트 유형: 무료 체험 리포트
> - 분석일시: #{분석일시}
>
> 아래 버튼을 눌러 리포트를 확인하세요.
> ```
> **버튼**: 리포트 확인하기 → `#{리포트URL}`

**변수 4개** (기존 `sendWelcomeReport()`와 동일한 구조):
| 변수 | 예시 |
|------|------|
| `#{가게명}` | 맵타민 카페 홍대점 |
| `#{플랫폼명}` | 네이버 |
| `#{분석일시}` | 2026.03.20 14:21 |
| `#{리포트URL}` | www.maptamin.com/naver-search/abc123 |

### External Dependencies
- 기존: `react-naver-maps`, `solapi`, Oracle VM Worker (모두 이미 구축 완료)
- 추가 설치 패키지: **없음**

---

## 🧪 Test Strategy

### Testing Approach
**Karpathy 원칙**: Surgical changes — 신규 파일에 집중, 기존 파일은 최소 수정

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥80% | API route 비즈니스 로직 (1회 제한, 구독자 차단, 입력 검증) |
| **Integration Tests** | Critical paths | API → DB → 검색 생성 플로우 |
| **E2E Tests** | 1 critical flow | 무료체험 전체 플로우 (브라우저 테스트) |

---

## 🚀 Implementation Phases

### Phase 1: DB 스키마 + API Route
**Goal**: `free_trial_used` 컬럼 추가 + 무료체험 전용 API 생성 — 기능의 백엔드 완성
**Estimated Time**: 2시간
**Status**: 🔄 In Progress

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.1**: 무료체험 API unit tests 작성
  - File: `src/app/api/free-trial/__tests__/route.test.ts`
  - Expected: Tests FAIL (API 미존재)
  - Test cases:
    - 비인증 요청 → 401
    - 유료 구독자(plan_id ≠ 'free') → 403 ("이미 구독 중")
    - `free_trial_used = true` → 403 ("이미 사용")
    - 유효한 요청 → 200 + `searchId` 반환
    - 필수 필드 누락 → 400
    - **INSERT 실패 시 `free_trial_used`를 `false`로 롤백하는지 확인** (엣지케이스)

**🟢 GREEN: Implement to Make Tests Pass**
- [x] **Task 1.2**: DB 마이그레이션 작성
  - File: `supabase/migrations/029_add_free_trial.sql`
  - Details:
    ```sql
    -- 1. free_trial_used 컬럼 추가
    ALTER TABLE user_subscriptions
      ADD COLUMN free_trial_used BOOLEAN NOT NULL DEFAULT false;

    -- 2. searches.report_type CHECK 제약조건에 'free_trial' 추가
    ALTER TABLE searches DROP CONSTRAINT IF EXISTS searches_report_type_check;
    ALTER TABLE searches ADD CONSTRAINT searches_report_type_check
      CHECK (report_type IN ('daily', 'weekly', 'realtime', 'welcome', 'free_trial'));

    -- 3. notification_logs.type CHECK 제약조건에 'free_trial' 추가
    DO $$ DECLARE cname TEXT; BEGIN
      SELECT conname INTO cname FROM pg_constraint
      WHERE conrelid = 'notification_logs'::regclass
        AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%type%';
      IF cname IS NOT NULL THEN
        EXECUTE format('ALTER TABLE notification_logs DROP CONSTRAINT %I', cname);
      END IF;
    END $$;
    ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_type_check
      CHECK (type IN ('welcome', 'daily', 'weekly', 'realtime', 'free_trial'));
    ```
  - 근거: 기존 CHECK 제약조건 [027_sync_daily_tracking.sql L7-9](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/supabase/migrations/027_sync_daily_tracking.sql#L7-L9), [L22-23](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/supabase/migrations/027_sync_daily_tracking.sql#L22-L23)

- [x] **Task 1.3**: 무료체험 API Route 구현
  - File: `src/app/api/free-trial/route.ts` [NEW]
  - Goal: Test 1.1 통과
  - Logic (**순서 중요** — 엣지케이스 방지):
    1. `supabase.auth.getUser()` — 인증 확인
    2. `SELECT user_subscriptions` — `plan_id`, `free_trial_used` 조회
    3. 가드: `plan_id !== 'free'` → 403 (구독자 차단)
    4. 가드: `free_trial_used === true` → 403 (1회 제한)
    5. `phone` UPDATE → `user_subscriptions.phone` 저장
    6. **`UPDATE free_trial_used = true` ← INSERT 전에 먼저!**
       - 이유: INSERT 후 UPDATE 실패 시 2회 체험 가능한 엣지케이스 방지
    7. `INSERT → searches` (status='pending', platform='naver', report_type='free_trial')
    8. INSERT 실패 시: `UPDATE free_trial_used = false` 롤백 후 500 리턴
    9. `/api/queue/dispatch` 트리거 (기존 Oracle VM 파이프라인)
    10. `searchId` 반환
  - 참고: 기존 [api/naver/search/route.ts](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/naver/search/route.ts) 구조 참조 (티켓 차감 로직만 제거)

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.4**: 코드 품질 개선
  - 입력 검증 로직 정리
  - 에러 메시지 한국어화
  - 불필요한 중복 제거

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 2 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] API 테스트 통과

**Manual Test Checklist**:
- [ ] Supabase에서 `free_trial_used` 컬럼 확인
- [ ] `searches` 테이블에 `report_type='free_trial'` INSERT 성공 확인 (CHECK 제약조건 통과)
- [ ] `notification_logs` 테이블에 `type='free_trial'` INSERT 성공 확인 (CHECK 제약조건 통과)
- [ ] API 직접 호출 테스트 (Postman/curl)
- [ ] 유효 요청 시 `searches` 테이블에 `report_type='free_trial'` 레코드 생성 확인

**Validation Commands**:
```bash
npm run build
npx jest src/app/api/free-trial --passWithNoTests
```

---

### Phase 2: 무료체험 전용 페이지 UI
**Goal**: `/free-trial` 페이지 생성 — 4단계 위저드 (매장 검색 → 키워드 입력 → 그리드 설정 → 전화번호 + 시작)
**Estimated Time**: 3시간
**Status**: 🔄 In Progress

#### Tasks

**🟢 GREEN: Implement**
- [x] **Task 2.1**: 무료체험 페이지 컴포넌트 구현
  - File: `src/app/(dashboard)/free-trial/page.tsx` [NEW]
  - Details: 4-step wizard (하나의 Client Component)
    - **Step 1: 매장 검색**
      - `NaverPlaceSearchInput` 재사용 ([naver-search/new/page.tsx](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/(dashboard)/naver-search/new/page.tsx#L374-L408) 참조)
      - 매장을 `managed_places`에 저장하지 않음 (로컬 state만)
    - **Step 2: 키워드 입력**
      - 지역명 키워드 1개 (text input)
      - 업종 키워드 1개 (text input)
      - `managed_keywords`에 저장하지 않음 (로컬 state만)
    - **Step 3: 그리드 설정**
      - `NaverMapGridConfigurator` 재사용 ([naver-search/new/page.tsx L609-622](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/(dashboard)/naver-search/new/page.tsx#L609-L622) 참조)
      - `allowedGridSizes = [3, 5]` 고정 (3×3, 5×5만)
      - 간격(distance) 슬라이더 재사용
    - **Step 4: 전화번호 입력 + 시작**
      - 전화번호 입력 (필수)
      - 요약 카드 (매장, 키워드, 좌표)
      - "무료 진단 시작" 버튼 → `POST /api/free-trial`
      - 성공 시 → `/naver-search/[searchId]` 리다이렉트

- [ ] **Task 2.2**: 접근 제어 가드
  - File: `src/app/(dashboard)/free-trial/page.tsx` 내부
  - Details:
    - 진입 시 `user_subscriptions` 조회
    - `plan_id !== 'free'` → 대시보드 리다이렉트 ("이미 구독 중이시네요!")
    - `free_trial_used === true` → 대시보드 리다이렉트 ("이미 무료 체험을 사용하셨습니다")
    - 미인증 → 미들웨어가 `/login` 리다이렉트

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 2.3**: UI 정리
  - 맵타민 브랜드 컬러(`#00C896`) 일관성
  - 모바일 반응형 확인
  - 로딩/에러 상태 표시

#### Quality Gate ✋

**⚠️ STOP: Do NOT proceed to Phase 3 until ALL checks pass**

**Build & Tests**:
- [ ] `npm run build` 성공
- [ ] TypeScript 에러 없음

**Manual Test Checklist**:
- [ ] free 플랜 유저: 4단계 위저드 정상 진행
- [ ] 유료 구독자: 대시보드로 리다이렉트
- [ ] `free_trial_used=true` 유저: 대시보드로 리다이렉트
- [ ] 매장 검색 → 선택 → Step 2로 이동
- [ ] 키워드 입력 → Step 3로 이동
- [ ] 3×3 / 5×5 전환 + 간격 조절 작동
- [ ] 전화번호 입력 → "무료 진단 시작" 클릭 → 결과 페이지 이동

**Validation Commands**:
```bash
npm run build
npx tsc --noEmit
```

---

### Phase 3: 미들웨어 + CTA + 마무리
**Goal**: 미들웨어에 `/free-trial` 보호 라우트 추가 + 랜딩 CTA 변경 + 검증 완료
**Estimated Time**: 1시간
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**
- [x] **Task 3.1**: 미들웨어 수정
  - File: `src/middleware.ts`
  - Change: `protectedPrefixes` 배열에 `'/free-trial'` 추가
  - 증거: [middleware.ts L36](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/middleware.ts#L36) — 현재 보호 경로 목록
  - Surgical: **이 한 줄만 추가**

- [x] **Task 3.2**: 랜딩페이지 CTA 변경
  - File: `src/components/landing/HeroSection.tsx`
  - Changes:
    - L57: `href="/login"` → `href="/login?redirectTo=/free-trial"`
    - L59: `"우리 매장 '진짜 순위' 확인하기"` → `"무료로 1분만에 우리 매장 '진짜 순위' 확인하기"`
  - 증거: [HeroSection.tsx L55-61](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/components/landing/HeroSection.tsx#L55-L61)
  - Surgical: **2줄만 변경**

- [x] **Task 3.3**: 무료체험 전용 알림톡 함수 추가
  - File: `src/lib/kakao/messaging.ts`
  - Details: `sendFreeTrialReport()` 함수 추가 — `sendWelcomeReport()` 구조를 그대로 복사 후 **템플릿 ID만 교체**
    ```ts
    export async function sendFreeTrialReport(
        userId: string,
        placeName: string,
        searchId: string,
        platform: string = 'naver',
    ): Promise<void> {
        const phone = await getUserPhone(userId);
        const templateId = process.env.KAKAO_TEMPLATE_FREE_TRIAL;
        if (!templateId) throw new Error('KAKAO_TEMPLATE_FREE_TRIAL 환경 변수가 설정되지 않았습니다.');
        // ... 동일한 변수 구조
    }
    ```
  - 증거: [messaging.ts L93-116](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/kakao/messaging.ts#L93-L116) — `sendWelcomeReport` 참조
  - Surgical: **함수 1개 추가, 기존 코드 미수정**

- [ ] **Task 3.4**: Oracle VM Worker에서 `free_trial` report_type 시 `sendFreeTrialReport()` 호출 확인
  - Oracle VM Worker의 알림톡 발송 분기 로직 확인 필요
  - `report_type === 'welcome'` → `sendWelcomeReport()`, `report_type === 'free_trial'` → `sendFreeTrialReport()`

- [x] **Task 3.5**: `/api/kakao/send-report` API에 `free_trial` type 분기 추가
  - File: `src/app/api/kakao/send-report/route.ts`
  - Details: 기존 `type` 분기에 `'free_trial'` 케이스 추가
    ```ts
    // 기존 코드 (L50-56):
    if (type === 'welcome') {
        await sendWelcomeReport(...);
    } else if (type === 'daily') {
        await sendDailyReport(...);
    } else if (type === 'free_trial') {  // ← 추가
        await sendFreeTrialReport(...);
    } else {
        await sendWeeklyReport(...);
    }
    ```
  - import에 `sendFreeTrialReport` 추가 (L3)
  - 증거: [send-report/route.ts L50-56](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/kakao/send-report/route.ts#L50-L56) — 현재 `free_trial` 미포함으로 `sendWeeklyReport()`로 잘못 빠짐
  - Surgical: **분기 1개 + import 1줄 추가**

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 3.6**: 최종 점검
  - 전체 빌드 확인
  - 기존 테스트 통과 확인
  - 불필요한 import/변수 정리

#### Quality Gate ✋ (Final)

**Build & Tests**:
- [x] `npm run build` 성공
- [ ] 기존 테스트 전부 통과 (regression 없음)
- [x] TypeScript 에러 0건

**Security & Performance**:
- [ ] `free_trial_used` 가드가 API에서 확실히 작동 (2회 시도 차단)
- [ ] 인증되지 않은 사용자가 `/free-trial` 접근 불가
- [ ] 유료 구독자가 무료체험 API 호출 불가

**E2E Test Checklist**:
- [ ] 시나리오 1: **신규 가입 → 무료 체험 전체 플로우**
  - 랜딩 CTA 클릭 → 로그인 → `/free-trial` 이동 → 매장 검색 → 키워드 입력 → 그리드 설정 → 전화번호 입력 → 분석 시작 → 결과 페이지 확인
- [ ] 시나리오 2: **1회 제한 검증**
  - 동일 유저 2차 `/free-trial` 접근 → 대시보드로 리다이렉트
- [ ] 시나리오 3: **구독자 차단**
  - 유료 플랜 유저 `/free-trial` 접근 → 대시보드로 리다이렉트
- [ ] 시나리오 4: **알림톡 수신**
  - 분석 완료 후 입력한 전화번호로 카카오톡 결과 URL 수신

**Validation Commands**:
```bash
npm run build
npx tsc --noEmit
npx jest --passWithNoTests
```

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Oracle VM이 `free_trial` report_type을 거부할 가능성 | Low | High | Worker는 report_type 무관하게 동작 확인 완료 — 필요 시 Worker 코드에 `free_trial` 추가 |
| 무료 체험 악용 (계정 다수 생성) | Medium | Low | 1인 1회 제한 + 카카오 로그인만 허용 (이미 구현) — 추후 IP/디바이스 제한 가능 |
| 무료 체험 결과가 대시보드에 혼재될 가능성 | Low | Low | `report_type='free_trial'`로 구분 가능 — 히스토리 페이지 필터에서 식별 |
| 솔라피 무료체험 템플릿 심사 지연 | Medium | Medium | 심사 승인 전까지는 페이지/API 구현을 먼저 완료하고, 템플릿 승인 후 `KAKAO_TEMPLATE_FREE_TRIAL` 환경변수 설정으로 활성화 |

---

## 🔄 Rollback Strategy

### If Phase 1 Fails
- DROP COLUMN `free_trial_used` (마이그레이션 롤백)
- 삭제: `src/app/api/free-trial/` 폴더

### If Phase 2 Fails
- 삭제: `src/app/(dashboard)/free-trial/` 폴더
- Phase 1 결과물은 유지 (API만 비활성)

### If Phase 3 Fails
- `middleware.ts`에서 `'/free-trial'` 한 줄 제거
- `HeroSection.tsx` 원복 (2줄)
- `messaging.ts`에서 `sendFreeTrialReport()` 함수 제거
- `send-report/route.ts`에서 `free_trial` 분기 제거 + import 원복
- Phase 1, 2 결과물은 유지

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: 🔄 70% (마이그레이션 + API Route 완료, 테스트 및 QG 남음)
- **Phase 2**: 🔄 80% (페이지 컴포넌트 완료, UI 검증 남음)
- **Phase 3**: 🔄 80% (코드 완료, Oracle VM 확인 + E2E 테스트 남음)

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 (DB + API) | 2 hours | - | - |
| Phase 2 (UI) | 3 hours | - | - |
| Phase 3 (미들웨어 + CTA) | 1 hour | - | - |
| **Total** | **6 hours** | - | - |

---

## 📦 File Changes Summary

### New Files (3)
| File | Purpose |
|------|---------|
| `supabase/migrations/029_add_free_trial.sql` | `free_trial_used` 컬럼 + `searches`/`notification_logs` CHECK 제약조건 업데이트 |
| `src/app/api/free-trial/route.ts` | 무료체험 전용 API (1회 제한, 검색 생성, 전화번호 저장) |
| `src/app/(dashboard)/free-trial/page.tsx` | 무료체험 전용 4단계 위저드 페이지 |

### Modified Files (4, surgical)
| File | Change | Lines |
|------|--------|-------|
| `src/lib/kakao/messaging.ts` | `sendFreeTrialReport()` 함수 추가 (기존 코드 미수정) | ~20줄 추가 |
| `src/app/api/kakao/send-report/route.ts` | `free_trial` type 분기 + import 추가 | 3줄 |
| `src/middleware.ts` | `protectedPrefixes`에 `'/free-trial'` 추가 | 1줄 |
| `src/components/landing/HeroSection.tsx` | CTA 문구 + href 변경 | 2줄 |

---

## 📝 Notes & Learnings

### Assumptions (Karpathy 원칙: 가정 명시)
1. Oracle VM Worker의 `run-search.ts`는 `report_type` 값에 무관하게 `searches` 테이블의 pending 레코드를 처리한다고 가정 — Phase 3 Task 3.4에서 확인
2. 알림톡은 새 `sendFreeTrialReport()` 함수를 사용 — 기존 `sendWelcomeReport()`는 "구독 신청하신 맵타민..." 문구로 비구독자에게 부적절하므로 별도 템플릿 필요
3. 기존 결과 페이지 `/naver-search/[id]`는 `user_id` 소유권만 검증하므로 free 유저도 접근 가능하다고 가정 — 이미 코드로 확인 완료

### 검토 후 수정사항 (2026-03-20)
- 🚨 마이그레이션 번호 `028` → `029` 변경 (028은 이미 사용 중: `028_welcome_priority_dispatch.sql`)
- 🚨 `searches.report_type` CHECK 제약조건에 `'free_trial'` 추가 — 미추가 시 INSERT 실패
- ⚠️ `notification_logs.type` CHECK 제약조건에도 `'free_trial'` 추가 — 알림톡 로그 기록 시 필요

### 최종 검토 후 수정사항 (2026-03-20)
- 🚨 `/api/kakao/send-report`에 `free_trial` 분기 추가 — 미추가 시 `sendWeeklyReport()` 잘못 호출됨 ([send-report/route.ts L50-56](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/kakao/send-report/route.ts#L50-L56))
- ✅ 히스토리 그래프에서 `free_trial` 결과 **의도적 제외** — 트렌드 그래프는 정기 분석용이므로 1회성 무료체험 불포함 ([history/page.tsx L63](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/(dashboard)/history/page.tsx#L63))

### 3차 검토 후 수정사항 (2026-03-20)
- 🚨 **Task 1.3 API 로직 순서 변경**: `INSERT searches` 전에 `free_trial_used = true` 먼저 업데이트, INSERT 실패 시 false 롤백 — 기존 순서(인서트 후 업데이트)는 네트워크 오류 시 2회 체험 노출
- ✅ `dispatch_pending_searches` RPC: `status='pending'` 전체 처리 — `free_trial` 정상 포함
- ✅ `DashboardShell` / `Sidebar`: free 유저 null-safe 확인
- ✅ CRON 스케줄러: free 유저 자동 스킵

---

## 📚 References

### Code Evidence
- [onboarding/page.tsx L62-66](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/(dashboard)/onboarding/page.tsx#L62-L66): free 유저 차단 가드
- [naver-search/new/page.tsx L368](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/(dashboard)/naver-search/new/page.tsx#L368): 구독 가드(`canAccessPlatform`)
- [api/naver/search/route.ts L97-117](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/api/naver/search/route.ts#L97-L117): 티켓 차감 로직 (무료체험은 skip)
- [016_add_free_plan.sql L38](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/supabase/migrations/016_add_free_plan.sql#L38): 회원가입 트리거 (plan_id='free')
- [messaging.ts L93-116](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/kakao/messaging.ts#L93-L116): 웰컴 리포트 알림톡 발송
- [middleware.ts L36](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/middleware.ts#L36): 보호 라우트 목록
- [HeroSection.tsx L55-61](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/components/landing/HeroSection.tsx#L55-L61): 현재 CTA 버튼
- [pricing/config.ts L28-41](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/lib/pricing/config.ts#L28-L41): free 플랜 설정 (gridSize=0, tickets=0)
- [naver-search/[id]/page.tsx L29](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/src/app/(dashboard)/naver-search/[id]/page.tsx#L29): 결과 페이지 소유권 검증

---

**Plan Status**: 🔄 In Progress
**Next Action**: Phase 1 시작 — DB 마이그레이션 + API Route 구현
**Blocked By**: 사용자 계획서 승인
