# Implementation Plan: 온보딩 v2 (유료 구독자 온보딩 플로우)

**Status**: 🔄 In Progress
**Started**: 2026-02-22
**Last Updated**: 2026-02-22
**Estimated Completion**: 2026-02-24
**Scope**: Large (6 Phases, ~20 hours)

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
기존 온보딩을 기획서(`Docs/plans/onboarding-flow-plan.md`)에 맞게 전면 리팩토링합니다.

**현재 상태**:
- 4 Step Wizard (매장→키워드→경쟁사→스케줄)
- `handleScheduleComplete`에서 DB 저장이 `TODO`로 남아있음
- 그리드 설정 Step 없음
- 요약 확인 화면 없음
- 웰컴 리포트 실행 미구현
- 이탈 복구(재진입 시 이어가기) 미구현
- 전화번호 입력이 Step 1(StepStoreRegister)에 이미 존재

**목표 상태**:
- 5~6 Step Wizard (매장→키워드→경쟁사→그리드→스케줄→요약 확인)
- 각 Step 완료 시 즉시 DB 커밋
- 재진입 시 DB 기반으로 마지막 미완료 Step부터 이어가기
- 요약 확인 화면 + [수정] 바로가기
- 완료 시 웰컴 리포트 즉시 실행 (무료, 티켓 미차감)
- 웰컴 리포트 폴링 UI + 결과 페이지 이동

### Success Criteria
- [ ] **접근 제어**: 비회원/무료 유저/온보딩 완료 유저의 `/onboarding` 직접 접근 차단
- [ ] 5~6 Step 온보딩 플로우가 플랜별(Starter/Pro/Premium) 동적으로 동작
- [ ] 각 Step 완료 시 DB에 즉시 커밋
- [ ] 이탈 후 재진입 시 마지막 미완료 Step부터 이어가기
- [ ] 요약 확인 화면에서 모든 설정 확인 + 수정 가능
- [ ] "완료" 시 웰컴 리포트 무료 실행 (티켓 미차감)
- [ ] 웰컴 리포트 생성 상태를 폴링하고 완료 시 결과 페이지로 이동
- [ ] 기존 테스트 깨지지 않음 (`npm test` pass)
- [ ] `npm run build` 성공

### User Impact
온보딩 완료 즉시 **주간 리포트 자동화 파이프라인**이 세팅되고, 무료 웰컴 리포트를 받아볼 수 있어 첫 사용 경험(FTUE)이 극적으로 향상됩니다.

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| `useState` Wizard 패턴 유지 (Context/Zustand 미사용) | `coding-rules.md` §4.1 준수. 기존 코드 일관성 | Step 간 데이터 공유가 props/state로만 가능 |
| Step 단위 DB 즉시 커밋 | 이탈 복구 가능. 기존 패턴(`POST /api/settings/my-shop`)과 일치 | 완료 전 부분 데이터가 DB에 존재 |
| 그리드 설정을 `search_schedules.grid_config`에 저장 | 기존 스키마 변경 없이 활용 가능 | 그리드 설정만 별도 테이블 없음 |
| 전화번호를 Step 5(스케줄)로 이동 | 기획서 요구사항. 알림톡 스케줄과 논리적 그룹핑 | Step 1에서 전화번호 수집 코드 제거 필요 |
| 웰컴 리포트 API에 `report_type='welcome'` 분기 추가 | 티켓 미차감 정책 구현. 기존 API 구조 최소 변경 | `/api/naver/search` 라우트 수정 필요 (Protected Zone) |
| 온보딩 접근 제어 가드 (3중 방어) | 비회원(`middleware.ts`), 무료 유저(`plan_id='free'`), 완료 유저(`onboarding_completed=true`) 차단 | 온보딩 완료 후 설정 변경은 `/settings`에서만 가능 |

---

## 🎨 UI/Design Guide

> **참고 페이지**: `/dashboard`, `/dashboard/subscription`의 기존 UI 디자인과 일관성을 유지합니다.

### 색상 체계 (Color Palette)

| Token | Color | Hex | 용도 |
|-------|-------|-----|------|
| **Primary** | Mint Green | `#00C896` | 프로그레스 바 활성 Step, CTA 버튼("다음 단계로"), 성공 아이콘, 강조 테두리 |
| **Primary Hover** | Dark Mint | `#00B386` | Primary 버튼 호버 상태 |
| **Primary Light** | Mint 10% | `#00C896/10` | 완료 아이콘 배경, 뱃지 배경 |
| **Secondary** | Dark Charcoal | `#001011` | 일반 버튼("정보 변경", "플랜 변경"), 월/연 토글 활성 상태 |
| **Background** | Light Gray | `#F9FAFB` | 페이지 전체 배경 (대시보드와 동일) |
| **Card BG** | White | `#FFFFFF` | 카드, 입력 영역, 모달 배경 |
| **Border** | Gray 100~200 | `border-gray-100` ~ `border-gray-200` | 카드 테두리, 입력 필드 테두리 |
| **Text Primary** | Gray 900 | `text-gray-900` | 제목, 주요 텍스트 |
| **Text Secondary** | Gray 500~600 | `text-gray-500` ~ `text-gray-600` | 설명, 부제목 |
| **Naver Brand** | Naver Green | `#03C75A` | 네이버 플랫폼 뱃지/아이콘 |
| **Google Brand** | Google Blue | `#4285F4` | 구글 플랫폼 뱃지/아이콘 |
| **Warning** | Amber | `border-amber-200`, `bg-amber-50` | 30일 락 경고 배너 |

### 카드 스타일

```
카드 컨테이너: rounded-xl (12px) ~ rounded-2xl (16px)
테두리: border border-gray-100 또는 border-gray-200
그림자: 없음 또는 매우 미세 (shadow-none ~ shadow-sm)
내부 패딩: p-6 (24px)
카드 간 간격: space-y-6 (24px)
```

### 버튼 스타일

| 버튼 종류 | 클래스 | 용도 |
|----------|-------|------|
| **Primary CTA** | `bg-[#00C896] text-white rounded-xl py-4 font-bold shadow-lg shadow-[#00C896]/25 hover:bg-[#00B386]` | "다음 단계로 →", "완료하고 첫 리포트 받기" |
| **Secondary** | `bg-[#001011] text-white rounded-lg py-3 font-semibold hover:bg-[#001011]/90` | "등록하기", 확인 다이얼로그 "확인" |
| **Ghost/Outline** | `border border-gray-200 bg-white text-gray-700 rounded-lg py-3 hover:bg-gray-50` | "나중에 할게요", "취소", "[수정]" |
| **Disabled** | `disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none` | 비활성 상태 |

### 프로그레스 바 스타일

```
활성 Step 원: border-2 border-[#00C896] bg-white text-[#00C896] shadow-md shadow-[#00C896]/20
완료 Step 원: bg-[#00C896] text-white (체크 아이콘)
미완료 Step 원: border-2 border-gray-200 bg-white text-gray-400
연결선 (완료): bg-[#00C896]
연결선 (미완료): bg-gray-200
```

### 타이포그래피

```
페이지 제목: text-lg font-bold sm:text-xl text-gray-900
Step 제목 (h2): text-xl font-bold sm:text-2xl text-gray-900
설명 텍스트: text-sm text-gray-600
안내 배너: text-sm font-medium (경고는 text-amber-800)
입력 필드: text-base text-gray-900 placeholder:text-gray-400
```

### 레이아웃

```
온보딩 컨테이너: mx-auto max-w-2xl py-4 sm:py-8
카드 내부: rounded-xl border border-gray-200 bg-white p-6
반응형: 모바일 우선, sm: 브레이크포인트에서 확대
```

---

## 📦 Dependencies

### Required Before Starting
- [x] 온보딩 기획서 확정 (`Docs/plans/onboarding-flow-plan.md`)
- [x] 기존 온보딩 코드 분석 완료
- [x] DB 스키마 호환성 검증 완료 (신규 테이블 불필요)

### External Dependencies
- 기존 패키지만 사용. 새로운 패키지 추가 없음.

---

## 🧪 Test Strategy

### Testing Approach
TDD Principle: 핵심 비즈니스 로직(Step 결정, 이탈 복구, 웰컴 리포트 분기)에 대해 테스트 우선 작성.
UI 컴포넌트는 통합 테스트 + 수동 브라우저 검증.

### Test Pyramid for This Feature
| Test Type | Coverage Target | Purpose |
|-----------|-----------------|---------|
| **Unit Tests** | ≥80% | `getSteps()`, `computeStartStep()`, 유틸 함수 |
| **Integration Tests** | 핵심 경로 | API 라우트 웰컴 리포트 분기 |
| **Manual Browser Tests** | 전체 플로우 | 5~6 Step 진행, 이탈 복구, 웰컴 리포트 |

### Test File Organization
```
src/
├── app/(dashboard)/onboarding/
│   └── onboarding.test.ts         ← [NEW] Step 결정, 이탈 복구 로직 유닛 테스트
├── app/api/naver/search/
│   └── route.test.ts              ← [MODIFY] 웰컴 리포트 분기 테스트 추가
└── components/onboarding/
    └── StepSummary.test.tsx        ← [NEW] 요약 화면 렌더링 테스트
```

### Existing Tests to Preserve
```
src/app/api/naver/search/route.test.ts      ← 기존 테스트 유지 + 웰컴 리포트 케이스 추가
src/components/search/KeywordInput.test.tsx  ← 변경 없음
```

---

## 🚀 Implementation Phases

---

### Phase 1: 온보딩 핵심 로직 리팩토링 (접근 제어 + Step 구조 + 이탈 복구)
**Goal**: `onboarding/page.tsx` 리팩토링 — 접근 제어 가드, 6 Step 구조, `getSteps()` 확장, `computeStartStep()` 구현
**Estimated Time**: 4 hours
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 1.0**: 접근 제어 가드 테스트
  - File: `src/app/(dashboard)/onboarding/onboarding.test.ts` [NEW]
  - 테스트 시나리오:
    - `plan_id='free'` → `/dashboard`로 리다이렉트
    - `onboarding_completed=true` → `/dashboard`로 리다이렉트
    - `plan_id='starter'` + `onboarding_completed=false` → 온보딩 정상 접근

- [ ] **Test 1.1**: `getSteps()` 확장 테스트
  - File: `src/app/(dashboard)/onboarding/onboarding.test.ts` [NEW]
  - 테스트 시나리오:
    - `starter` → 5 steps (매장, 키워드, 그리드, 스케줄, 확인) — 경쟁사 Skip
    - `pro` → 6 steps (매장, 키워드, 경쟁사, 그리드, 스케줄, 확인)
    - `premium` → 6 steps (매장, 키워드, 경쟁사, 그리드, 스케줄, 확인)

- [ ] **Test 1.2**: `computeStartStep()` 이탈 복구 로직 테스트
  - File: `src/app/(dashboard)/onboarding/onboarding.test.ts` [NEW]
  - 테스트 시나리오:
    - 모든 데이터 비어있음 → Step 0 (매장)
    - `managed_places` 있음 → Step 1 (키워드)
    - `managed_places` + `managed_keywords` 있음 → Step 2 (경쟁사 or 그리드)
    - 모든 데이터 있음 → 마지막 Step (확인)

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 1.3**: 온보딩 접근 제어 가드 구현
  - File: `src/app/(dashboard)/onboarding/page.tsx` [MODIFY]
  - `fetchPlan()` 내부에서 다음 2가지 가드 추가:
    ```typescript
    // 가드 1: 무료 유저 차단
    if (!sub || sub.plan_id === 'free') {
        router.replace('/dashboard')
        return
    }
    // 가드 2: 이미 온보딩 완료한 유저 차단
    if (sub.onboarding_completed) {
        router.replace('/dashboard')
        return
    }
    ```
  - 기존 `middleware.ts`가 비회원은 이미 차단 (1차 방어)
  - 이 가드가 무료 유저 + 완료 유저 차단 (2차 방어)

- [ ] **Task 1.4**: `getSteps()` 확장 — 그리드 Step, 확인 Step 추가
  - File: `src/app/(dashboard)/onboarding/page.tsx` [MODIFY]
  - 기존 4 Step → 6 Step (starter는 5 Step)
  - 새 Step ID: `'grid'`, `'summary'`

- [ ] **Task 1.5**: `computeStartStep()` 함수 구현
  - File: `src/app/(dashboard)/onboarding/page.tsx` [MODIFY]
  - 진입 시 DB 조회 → 최초 미완료 Step 인덱스 반환
  - `useEffect` 내부에서 `fetchPlan()`과 함께 호출

- [ ] **Task 1.6**: `OnboardingData` 타입 확장
  - Grid 데이터 타입 추가: `grid?: { naverGrid: GridPoint[], googleGrid?: GridPoint[], distance: number }`

**🔵 REFACTOR: Clean Up Code**
- [ ] **Task 1.7**: Step 로직을 별도 유틸 파일로 추출
  - File: `src/app/(dashboard)/onboarding/onboarding-utils.ts` [NEW]
  - `getSteps()`, `computeStartStep()` export

#### Quality Gate ✋

**Validation Commands**:
```bash
npm test -- --testPathPattern="onboarding"
npm run build
npm run lint
```

**Manual Test Checklist**:
- [ ] **비회원**: 시크릿 모드에서 `/onboarding` URL 직접 접근 → `/login`으로 리다이렉트 확인
- [ ] **무료 유저**: `plan_id='free'` 유저로 `/onboarding` 접근 → `/dashboard`로 리다이렉트 확인
- [ ] **완료 유저**: `onboarding_completed=true` 유저로 `/onboarding` 접근 → `/dashboard`로 리다이렉트 확인
- [ ] **유료 미완료 유저**: 정상적으로 온보딩 페이지 접근 + 프로그레스 바에 5~6개 Step 표시
- [ ] 기존 Step들(매장, 키워드, 경쟁사, 스케줄)이 정상 렌더링

---

### Phase 2: Step별 DB 즉시 커밋 구현
**Goal**: Step 1~3 완료 시 즉시 DB 저장, Step 5 완료 시 스케줄/전화번호 저장
**Estimated Time**: 3 hours
**Status**: ⏳ Pending

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 2.1**: API 호출 모킹 테스트 (Step 1 매장 등록 시 `POST /api/settings/my-shop` 호출 확인)
  - File: `src/app/(dashboard)/onboarding/onboarding.test.ts` [MODIFY]

**🟢 GREEN: Implement to Make Tests Pass**
- [ ] **Task 2.2**: Step 1 (매장 등록) — DB 즉시 커밋 + UI 리팩토링
  - File: `src/components/onboarding/StepStoreRegister.tsx` [MODIFY]
  - `handleNext()` 내부에서 `POST /api/settings/my-shop` 호출 후 `onComplete()` 호출
  - **전화번호 입력 UI를 Step 1에서 제거** → Step 5로 이동
  - **⚠️ Premium UI 변경**: 기존 서브스텝 전환 패턴(`useState<'naver' | 'google'>`) 제거
    → **단일 화면으로 변경**: 위쪽 네이버 매장 검색 + 아래쪽 구글 매장 검색 동시 표시

- [ ] **Task 2.3**: Step 2 (키워드 등록) — DB 즉시 커밋
  - File: `src/components/onboarding/StepKeywordRegister.tsx` [MODIFY]
  - `onComplete()` 호출 전에 `supabase.from('managed_keywords').insert(...)` 실행

- [ ] **Task 2.4**: Step 3 (경쟁사 등록) — DB 즉시 커밋
  - File: `src/components/onboarding/StepCompetitorRegister.tsx` [MODIFY]
  - `onComplete()` 호출 전에 `POST /api/settings/competitors` 실행

- [ ] **Task 2.5**: Step 5 (스케줄 + 전화번호) — DB 커밋
  - File: `src/components/onboarding/StepScheduleSetting.tsx` [MODIFY]
  - 전화번호 입력 필드 추가 (Step 1에서 이동)
  - `user_subscriptions.phone` UPDATE
  - **⚠️ Premium 2건 INSERT**: `search_schedules` + `notification_schedules`를 **플랫폼별**(naver, google) 각각 INSERT
    - Starter/Pro: naver 1건씩 (search_schedules 1건 + notification_schedules 1건)
    - Premium: naver + google 각 1건씩 (search_schedules 2건 + notification_schedules 2건)
    - 각 레코드에 platform 컬럼과 해당 플랫폼의 grid_config 포함

- [ ] **Task 2.6**: 30일 락 AlertDialog 추가
  - File: `src/components/onboarding/StepStoreRegister.tsx` [MODIFY]
  - 등록 클릭 시 `@/components/ui/dialog` 기반 확인 다이얼로그

**🔵 REFACTOR**
- [ ] **Task 2.7**: 에러 핸들링 통일 — 각 Step에서 DB 실패 시 사용자에게 알림

#### Quality Gate ✋

**Validation Commands**:
```bash
npm test -- --testPathPattern="onboarding"
npm run build
```

**Manual Test Checklist**:
- [ ] Step 1 완료 후 Supabase `managed_places`에 레코드 생성 확인
- [ ] Step 2 완료 후 `managed_keywords`에 레코드 생성 확인
- [ ] 온보딩 도중 브라우저 새로고침 → 재진입 시 이전 Step 데이터 보존 + 이어가기

---

### Phase 3: 그리드 설정 Step + 요약 확인 화면 구현
**Goal**: Step 4(그리드 설정) 컴포넌트와 Step 6(요약 확인) 컴포넌트 신규 작성
**Estimated Time**: 4 hours
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**
- [ ] **Task 3.1**: `StepGridSetting.tsx` 신규 생성
  - File: `src/components/onboarding/StepGridSetting.tsx` [NEW]
  - 기존 `NaverMapGridConfigurator` / `MapGridConfigurator` 재사용
  - Props: `planId`, `naverPlace`, `googlePlace?`, `onComplete`
  - 플랜별 최대 그리드 사이즈 자동 적용
  - **⚠️ Premium 플랫폼별 개별 그리드**: 네이버/구글 매장 좌표가 다를 수 있으므로
    각 플랫폼별 독립적인 중심점으로 그리드 생성
    - 네이버 탭: `naverPlace` 좌표 기준 그리드 → `naverGrid` state
    - 구글 탭: `googlePlace` 좌표 기준 그리드 → `googleGrid` state
    - `onComplete({ naverGrid, googleGrid?, distance })` 반환
  - **⚠️ 이탈 시 데이터 소실 (허용된 트레이드오프)**:
    Step 4의 그리드 데이터는 로컬 state에만 보관하므로, 이 Step에서 이탈 시
    재진입하면 그리드를 다시 설정해야 합니다. (그리드 재설정은 부담이 적으므로 허용)

- [ ] **Task 3.2**: `StepSummary.tsx` 신규 생성
  - File: `src/components/onboarding/StepSummary.tsx` [NEW]
  - Props: 전체 `OnboardingData`, `planId`, `steps`, `onEdit(stepIndex)`, `onConfirm()`
  - 요약 카드 UI (기획서 §3 요약 확인 화면 참고)
  - 각 항목 옆 [수정] 버튼 → `onEdit(stepIndex)` 호출

- [ ] **Task 3.3**: `onboarding/page.tsx`에 새 Step 연결
  - File: `src/app/(dashboard)/onboarding/page.tsx` [MODIFY]
  - `StepGridSetting`, `StepSummary` import 및 렌더링
  - 요약 화면에서 [수정] 클릭 시 `setCurrentStepIndex(n)` 호출

**🔴 RED: Write Tests**
- [ ] **Test 3.4**: `StepSummary` 렌더링 테스트
  - File: `src/components/onboarding/StepSummary.test.tsx` [NEW]
  - 모든 설정이 표시되는지 확인
  - [수정] 버튼 클릭 시 `onEdit` 호출 확인

#### Quality Gate ✋

**Validation Commands**:
```bash
npm test -- --testPathPattern="onboarding|StepSummary"
npm run build
```

**Manual Test Checklist**:
- [ ] Step 4에서 지도 + 그리드 포인트가 정상 표시
- [ ] 요약 화면에서 등록한 매장/키워드/경쟁사/그리드/스케줄 정보 모두 표시
- [ ] [수정] 클릭 시 해당 Step으로 이동, 데이터 보존

---

### Phase 4: 웰컴 리포트 무료 실행 API 구현
**Goal**: `/api/naver/search` (및 `/api/search`)에 `report_type='welcome'` 분기 추가 — 티켓 미차감
**Estimated Time**: 3 hours
**Status**: ⏳ Pending

> [!WARNING]
> **Protected Zone 수정**: `src/app/api/naver/search/route.ts`는 Protected Zone(coding-rules.md §11)입니다.
> 이 Phase에서는 최소한의 분기만 추가하며, 기존 로직은 변경하지 않습니다.

#### Tasks

**🔴 RED: Write Failing Tests First**
- [ ] **Test 4.1**: 웰컴 리포트 시 티켓 미차감 테스트
  - File: `src/app/api/naver/search/route.test.ts` [MODIFY]
  - 테스트: `report_type='welcome'`일 때 `deduct_ticket` RPC 호출 안 함
  - 테스트: `report_type='welcome'`일 때 `searches.report_type = 'welcome'`으로 INSERT
  - **🔴 보안 테스트**: `welcome_report_sent=true`인 유저가 `report_type='welcome'` 재호출 시 → 403 에러 반환
  - **🔴 보안 테스트**: `report_type='welcome'`을 2번 연속 호출 시 → 2번째는 403 에러

**🟢 GREEN: Implement**
- [ ] **Task 4.2**: `/api/naver/search/route.ts` 수정
  - File: `src/app/api/naver/search/route.ts` [MODIFY]
  - body에서 `reportType` 파라미터 수신
  - **🔴 CRITICAL 보안 검증**: `reportType === 'welcome'`일 때 반드시 서버사이드에서 검증:
    ```typescript
    if (reportType === 'welcome') {
        // 1. welcome_report_sent 플래그 확인
        const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('welcome_report_sent')
            .eq('user_id', user.id)
            .single()
        
        if (sub?.welcome_report_sent) {
            return NextResponse.json(
                { error: 'WELCOME_REPORT_ALREADY_SENT' },
                { status: 403 }
            )
        }
        // 티켓 체크/차감 Skip
    } else {
        // 기존 티켓 차감 로직
    }
    ```
  - `searches` INSERT 시 `report_type: reportType || 'realtime'`

- [ ] **Task 4.3**: `/api/search/route.ts` 수정 (구글 검색 API — Premium 전용)
  - File: `src/app/api/search/route.ts` [MODIFY]
  - 동일한 `report_type='welcome'` 분기 + **동일한 보안 검증** 추가

**🔵 REFACTOR**
- [ ] **Task 4.4**: 공통 로직 추출 검토

#### Quality Gate ✋

**Validation Commands**:
```bash
npm test -- --testPathPattern="naver/search"
npm run build
```

**Manual Test Checklist**:
- [ ] Postman/cURL로 `report_type='welcome'` POST 시 티켓 미차감 확인
- [ ] 기존 `report_type='realtime'` POST는 정상 티켓 차감 확인
- [ ] **보안**: `welcome_report_sent=true` 상태에서 `report_type='welcome'` 재호출 → 403 에러 확인
- [ ] **보안**: `report_type='welcome'`을 2번 연속 호출 → 2번째 403 확인

---

### Phase 5: 완료 화면 + 웰컴 리포트 폴링 UI
**Goal**: 온보딩 완료 버튼 클릭 시 웰컴 리포트 트리거 + 폴링 + 결과 페이지 연결
**Estimated Time**: 3 hours
**Status**: ⏳ Pending

#### Tasks

**🟢 GREEN: Implement**
- [ ] **Task 5.1**: `OnboardingComplete.tsx` 완료 화면 컴포넌트 신규 생성
  - File: `src/components/onboarding/OnboardingComplete.tsx` [NEW]
  - 웰컴 리포트 `searchId` 받아서 `SearchStatusPoller` 로직 재사용 (폴링)
  - 완료 시: "🎉 첫 리포트가 완성되었어요!" + 결과 보러가기 버튼
  - 실패 시: "⚠️ 다시 시도하기" 버튼
  - Confetti/축하 마이크로 애니메이션

- [ ] **Task 5.2**: `onboarding/page.tsx`에서 완료 로직 연결
  - File: `src/app/(dashboard)/onboarding/page.tsx` [MODIFY]
  - 요약 화면 "완료" 클릭 → `completeOnboarding()` 함수 실행:
    1. `UPDATE user_subscriptions SET onboarding_completed = true`
    2. `POST /api/naver/search` (report_type='welcome')
    3. (Premium) `POST /api/search` (report_type='welcome')
    4. `UPDATE user_subscriptions SET welcome_report_sent = true`
    5. `isComplete = true` → `OnboardingComplete` 렌더링
  - **⚠️ Premium 부분 성공 정책**:
    - 네이버 웰컴 리포트 성공 + 구글 웰컴 리포트 실패 시:
      → 네이버 결과는 정상 표시, 구글은 "⚠️ 구글 리포트 생성 실패. 다시 시도" 버튼 별도 표시
    - 양쪽 모두 실패 시: 전체 "다시 시도" 버튼 표시
    - 부분 성공도 `welcome_report_sent = true`로 처리 (무한 재시도 방지)
    - `OnboardingComplete` 컴포넌트는 `naverSearchId`, `googleSearchId?`를 각각 받아 독립 폴링

**🔵 REFACTOR**
- [ ] **Task 5.3**: 로딩/에러 상태 정리

#### Quality Gate ✋

**Validation Commands**:
```bash
npm test
npm run build
```

**Manual Test Checklist**:
- [ ] 온보딩 전체 플로우 완주 (Step 1 → 요약 → 완료)
- [ ] 웰컴 리포트 폴링 중 "리포트 생성 중..." 표시
- [ ] 결과 페이지(`/naver-search/[id]`)로 정상 이동

---

### Phase 6: 통합 테스트 + 문서 업데이트
**Goal**: 전체 플로우 E2E 검증, 아키텍처 문서 업데이트
**Estimated Time**: 2 hours
**Status**: ⏳ Pending

#### Tasks

- [ ] **Task 6.1**: 전체 기존 테스트 실행 + 깨진 테스트 수정
  - `npm test` — 18개 기존 테스트 모두 통과 확인

- [ ] **Task 6.2**: `component_tree.md` 업데이트
  - File: `Docs/important_files/component_tree.md` [MODIFY]
  - 온보딩 §9 섹션에 새 컴포넌트 추가:
    - `StepGridSetting`, `StepSummary`, `OnboardingComplete`

- [ ] **Task 6.3**: `architecture_data_flow.md` 업데이트
  - File: `Docs/important_files/architecture_data_flow.md` [MODIFY]
  - §5 온보딩 섹션에 웰컴 리포트 플로우 추가
  - DB Operations 테이블 업데이트

- [ ] **Task 6.4**: 수동 브라우저 전체 플로우 검증

#### Quality Gate ✋

**Validation Commands**:
```bash
npm test
npm run build
npm run lint
```

**Manual Test Checklist**:
- [ ] Starter 플랜: 5 Step 온보딩 (경쟁사 Skip)
- [ ] Pro 플랜: 6 Step 온보딩
- [ ] Premium 플랜: 6 Step 온보딩 (네이버+구글)
- [ ] 온보딩 도중 이탈 → 재진입 → 이어가기
- [ ] 웰컴 리포트 생성 → 결과 페이지 이동

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Protected Zone API 수정 시 기존 결제/검색 로직 깨짐 | Medium | High | 기존 `route.test.ts` 통과 확인 필수. 최소 분기만 추가 |
| **🔴 웰컴 리포트 API 무한 호출 악용** | **High** | **High** | `welcome_report_sent` 서버사이드 검증 필수 (Phase 4 Task 4.2) |
| `NaverMapGridConfigurator` 온보딩 컨텍스트에서 동작 이상 | Low | Medium | 기존 `/naver-search/new`에서의 동작 패턴 그대로 복제 |
| 웰컴 리포트 크롤링이 실제 외부 API 의존 | Medium | Medium | 개발 중에는 `searches` INSERT까지만 검증. 크롤링은 기존 인프라에 위임 |
| DB 재진입 복원 로직에서 부분 데이터 상태 제대로 감지 못함 | Medium | Medium | `computeStartStep()` 유닛 테스트로 모든 조합 커버 |
| Premium 웰컴 리포트 부분 성공 (네이버 OK, 구글 Fail) | Medium | Low | 부분 성공도 허용. 실패 플랫폼만 재시도 버튼 표시 |
| Step 4(그리드) 이탈 시 데이터 소실 | Low | Low | 허용된 트레이드오프. 그리드 재설정 부담 적음 |

---

## 🔄 Rollback Strategy

### If Phase 1-3 Fails
- `git stash` 또는 `git checkout` 으로 `onboarding/page.tsx` 및 서브컴포넌트 원복
- 새로 생성한 파일 (`StepGridSetting.tsx`, `StepSummary.tsx`, `OnboardingComplete.tsx`) 삭제

### If Phase 4 Fails (API 수정)
- `/api/naver/search/route.ts`의 웰컴 리포트 분기 제거
- 기존 `route.test.ts` 통과 확인 후 커밋

### If Phase 5 Fails
- 완료 화면을 기존 단순 "온보딩 완료!" 화면으로 복원
- 웰컴 리포트 트리거는 별도 이슈로 분리

---

## 📊 Progress Tracking

### Completion Status
- **Phase 1**: ⏳ 0%
- **Phase 2**: ⏳ 0%
- **Phase 3**: ⏳ 0%
- **Phase 4**: ⏳ 0%
- **Phase 5**: ⏳ 0%
- **Phase 6**: ⏳ 0%

**Overall Progress**: 0% complete

### Time Tracking
| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1 | 4 hours | - | - |
| Phase 2 | 3 hours | - | - |
| Phase 3 | 4 hours | - | - |
| Phase 4 | 3 hours | - | - |
| Phase 5 | 3 hours | - | - |
| Phase 6 | 2 hours | - | - |
| **Total** | **19 hours** | - | - |

---

## 📊 Files Change Summary

### New Files (6)
| File | Description |
|------|-------------|
| `src/app/(dashboard)/onboarding/onboarding-utils.ts` | Step 결정, 이탈 복구 유틸 |
| `src/app/(dashboard)/onboarding/onboarding.test.ts` | 온보딩 유닛 테스트 |
| `src/components/onboarding/StepGridSetting.tsx` | Step 4: 그리드 설정 컴포넌트 |
| `src/components/onboarding/StepSummary.tsx` | Step 6: 요약 확인 컴포넌트 |
| `src/components/onboarding/StepSummary.test.tsx` | 요약 화면 테스트 |
| `src/components/onboarding/OnboardingComplete.tsx` | 완료 화면 (폴링 + Confetti) |

### Modified Files (7)
| File | Description |
|------|-------------|
| `src/app/(dashboard)/onboarding/page.tsx` | 6 Step 구조, DB 커밋, 완료 로직 |
| `src/components/onboarding/StepStoreRegister.tsx` | DB 커밋 추가, 전화번호 제거, AlertDialog |
| `src/components/onboarding/StepKeywordRegister.tsx` | DB 즉시 커밋 |
| `src/components/onboarding/StepCompetitorRegister.tsx` | DB 즉시 커밋 |
| `src/components/onboarding/StepScheduleSetting.tsx` | 전화번호 이동, 그리드 저장 |
| `src/app/api/naver/search/route.ts` | 웰컴 리포트 분기 (⚠️ Protected Zone) |
| `src/app/api/search/route.ts` | 웰컴 리포트 분기 |

### Documentation Updates (2)
| File | Description |
|------|-------------|
| `Docs/important_files/component_tree.md` | 새 컴포넌트 추가 |
| `Docs/important_files/architecture_data_flow.md` | 웰컴 리포트 플로우 추가 |

---

## 📝 Notes & Learnings

_To be filled during implementation._

---

## 📚 References

- [온보딩 기획서](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/Docs/plans/onboarding-flow-plan.md)
- [Architecture Data Flow](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/Docs/important_files/architecture_data_flow.md)
- [Coding Rules](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/Docs/important_files/coding-rules.md)
- [ERD Design](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/Docs/important_files/erd_design.md)
- [Component Tree](file:///c:/Users/thisi/Documents/maptamin-local-seo-saas/Docs/important_files/component_tree.md)

---

**Plan Status**: ⏳ Pending User Approval
**Next Action**: 사용자 승인 후 Phase 1 시작
**Blocked By**: None
