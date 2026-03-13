# Implementation Plan: 개편 플랜 시스템 도입 (Daily Tracking Migration)

**Status**: ✅ 전체 완료 (Phase 0–4)
**Started**: 2026-03-12
**Last Updated**: 2026-03-13 (Phase 3 + Phase 4 완료)

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

현재 **주간(weekly) 1회** 정기 리포트 시스템을,
- **네이버**: 매일(daily) 1회 자동 추적
- **구글(프리미엄)**: 주 1회 (기존 유지)

으로 전환합니다. 동시에 플랜별 가격/티켓/한도를 확정 플랜 기준으로 업데이트합니다.

### 확정 플랜 기준

| 플랜 | 가격(VAT포함) | 네이버티켓 | 구글티켓 | 키워드 | 경쟁사 | 그리드 |
|------|-------------|---------|---------|------|------|------|
| 스타터 | 9,900원 | 2장 | 0장 | 네이버2 | 0 | 3x3 |
| 프로 | 29,000원 | 5장 | 0장 | 네이버5 | 5곳 | 5x5 |
| 프리미엄 | 79,000원 | 10장 | 10장 | 각5 | 무제한 | 7x7 |

### Success Criteria
- [ ] 솔라피에서 일간 리포트 알림톡 템플릿 심사 승인 완료
- [ ] `KAKAO_TEMPLATE_DAILY` 환경변수 설정 완료 (Vercel + GitHub Secrets)
- [ ] 네이버 스케줄: 매일 실행, 같은 날 중복 실행 없음
- [ ] 구글 스케줄(프리미엄): 지정 요일 주 1회 실행, 같은 주 중복 실행 없음
- [ ] `report_type: 'daily'`로 생성된 결과가 트렌드 그래프/인사이트에 반영됨
- [ ] DB CHECK 제약조건(`searches`, `notification_logs`)이 `'daily'` 허용
- [ ] PLAN_CONFIG와 DB plans 테이블이 확정 플랜과 일치
- [ ] `-1` 무제한 로직이 정상 작동 (경쟁사 등록 차단 버그 없음)
- [ ] 랜딩/구독/온보딩 페이지의 가격/피처 텍스트가 확정 플랜과 일치
- [ ] UI 텍스트가 "주간 리포트/보고서" → "자동 리포트/매일 보고서"로 업데이트됨
- [ ] 기존 테스트가 수정 후에도 모두 통과
- [ ] `npm run build` 에러 없이 성공

### 현재 상태 (작업 시작 전 확인됨)
- 실제 유료 가입자 없음 (테스트 계정만 존재)
- DB `get_max_concurrent_jobs()` = **70**
- 프리미엄 구글 = **주 1회**

---

## 🏗️ Architecture Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| 플랫폼별 빈도 분기 (naver=daily, google=weekly) | 구글은 API 비용이 높아 주 1회 유지 | 스케줄러 필터 로직이 복잡해짐 |
| `report_type`에 `'daily'` 추가 | 기존 `'weekly'`와 구분하여 필터링 정확성 확보 | 필터링 곳 7곳 수정 필요 |
| 경쟁사 무제한 = `-1` + 가드 로직 | DB `max_competitors`도 `-1`로 통일 | 비교 로직에 가드 필수 (안 하면 등록 차단 버그) |
| UI "주간 리포트" → "자동 리포트" 통일 | 네이버=데일리, 구글=주간 혼재이므로 중립적 표현 | 유료 가입자 없으므로 혼동 영향 없음 |
| 솔라피 일간 리포트 템플릿 신규 등록 | 주간 템플릿 본문에 "주간" 문구 포함 가능 → 데일리에 부적절 | 심사 대기 1~3 영업일 (Phase 0 선행) |
| 네이버 요일 선택: 복수 선택 + "매일" 버튼 | 사용자가 자유롢5게 빈도 조절 가능 | 기본값이 하나도 선택 안 됨 = 시스템 실행 안 함 |
| 구글 요일 선택: 단수 선택 (1개) | 주 1회 주기 유지, 사용자가 원하는 요일 지정 | 기본값 null = 시스템 실행 안 함 |

---

## 🚀 Implementation Phases

---

### Phase 0: 솔라피 알림톡 템플릿 선행 작업 ⚡ (코딩 전 필수)
**Goal**: 일간 리포트 알림톡 템플릿 심사 신청 → 승인 후 환경변수 설정
**Estimated Time**: 30분 (신청) + 심사 대기 1~3 영업일
**Status**: ✅ Done (2026-03-13)
**Blocker**: Phase 2의 알림톡 코드 수정은 이 템플릿 승인 후 배포 가능

---

#### Tasks

**Task 0-1: 솔라피 대시보드에서 일간 리포트 템플릿 신규 등록** ✅ 완료 (2026-03-12)

1. [솔라피 대시보드](https://console.solapi.com) 접속
2. 알림톡 템플릿 관리 → 신규 등록
3. 기존 WEEKLY 템플릿 본문을 참고하되, "주간" → "일간" 등 문구 변경
4. 치환 변수: `#{가게명}`, `#{플랫폼명}`, `#{분석일시}`, `#{리포트URL}` (기간 변수 제거)
5. 심사 제출

> ✅ **신청 완료**: 템플릿명 "일간 리포트 안내", 변수 4개 확인, 즉시 검수요청 활성화. 현재 심사 대기 중 (1~3 영업일 소요).

**Task 0-2: 심사 승인 후 환경변수 설정**

승인된 템플릿 ID를 아래 2곳에 등록:
1. **Oracle VM `/home/ubuntu/maptamin/.env`** → `KAKAO_TEMPLATE_DAILY=KA01TP...` (실제 알림톡 발송 주체)
2. **로컬 `.env.local`** → `KAKAO_TEMPLATE_DAILY=KA01TP...` (로컬 개발용)

> ⚠️ Vercel/GitHub Secrets 등록은 불필요합니다. 알림톡은 Oracle VM Worker(`run-search.ts`)에서만 발송됩니다.

**~~Task 0-3: GitHub Actions `cron.yml`에 환경변수 추가~~** → N/A (Oracle VM 전환됨)

**Task 0-4: 기존 WEEKLY 템플릿 삭제**

심사 승인 + 코드 배포 완료 후:
1. 솔라피 대시보드에서 WEEKLY 템플릿 삭제
2. Vercel/GitHub/로컬에서 `KAKAO_TEMPLATE_WEEKLY` 환경변수 제거

> ⚠️ **주의**: WEEKLY 삭제는 Phase 2 코드 배포 이후에 실행. 순서를 어기면 구글 주간 알림톡 발송 실패.

#### Quality Gate ✋
- [x] 솔라피 일간 템플릿 심사 **신청 완료** (2026-03-12) — 승인 대기 중
- [ ] 솔라피에서 일간 템플릿 심사 **승인**됨
- [ ] `KAKAO_TEMPLATE_DAILY` 3곳에 등록 (Vercel, GitHub, 로컬)
- [ ] `cron.yml`에 `KAKAO_TEMPLATE_DAILY` 추가됨

---

### Phase 1: DB 동기화 + PLAN_CONFIG + 무제한 가드 로직
**Goal**: DB 제약조건/plans/PLAN_CONFIG + `-1` 무제한 비교 로직 수정
**Estimated Time**: 1.5시간
**Status**: ✅ Done

---

#### Tasks

**Task 1-1: `027_sync_daily_tracking.sql` 생성**

```sql
-- =============================================
-- Migration: 027_sync_daily_tracking.sql
-- =============================================

-- 1. searches.report_type CHECK에 'daily' 추가
ALTER TABLE searches DROP CONSTRAINT IF EXISTS searches_report_type_check;
ALTER TABLE searches ADD CONSTRAINT searches_report_type_check
  CHECK (report_type IN ('daily', 'weekly', 'realtime', 'welcome'));

-- 2. notification_logs.type CHECK에 'daily' 추가
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
  WHERE conrelid = 'notification_logs'::regclass
    AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%type%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notification_logs DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_type_check
  CHECK (type IN ('welcome', 'daily', 'weekly', 'realtime'));

-- 3. plans 테이블 확정 플랜 기준으로 업데이트
UPDATE plans SET price=9900, monthly_tickets_naver=2, monthly_tickets_google=0,
  max_keywords_naver=2, max_keywords_google=0, max_competitors=0, max_grid_size=3
WHERE id='starter';
UPDATE plans SET price=29000, monthly_tickets_naver=5, monthly_tickets_google=0,
  max_keywords_naver=5, max_keywords_google=0, max_competitors=5, max_grid_size=5
WHERE id='pro';
UPDATE plans SET price=79000, monthly_tickets_naver=10, monthly_tickets_google=10,
  max_keywords_naver=5, max_keywords_google=5, max_competitors=-1,
  max_grid_size=7, channels='naver+google'
WHERE id='premium';

-- 4. DB 기본값 변경 (기존 '{1,2,3,4,5,6,7}' → 빈 배열 '{}')
ALTER TABLE search_schedules ALTER COLUMN crawling_days SET DEFAULT '{}';

-- 5. get_max_concurrent_jobs 파일 동기화 (DB는 이미 70)
CREATE OR REPLACE FUNCTION get_max_concurrent_jobs()
RETURNS INTEGER AS $$ BEGIN RETURN 70; END; $$ LANGUAGE plpgsql IMMUTABLE;
```

---

**Task 1-2: `src/lib/pricing/config.ts` 수정**

현재 → 변경:
```
pro.ticketsNaver: 10 → 5
pro.competitorsNaver: 3 → 5
premium.price: 99000 → 79000
premium.ticketsNaver: 15 → 10
premium.ticketsGoogle: 15 → 10
premium.competitorsNaver: 10 → -1
premium.competitorsGoogle: 10 → -1
```

---

**Task 1-3: 🚨 `-1` 무제한 가드 로직 (치명적!)**

`competitorsNaver: -1`로 설정하면 기존 비교 로직이 깨짐 → 가드 추가 필요

**(a) `src/app/api/settings/competitors/route.ts` 63, 76행:**

현재:
```typescript
if (maxForPlatform === 0) {
    return NextResponse.json({ error: '...' }, { status: 403 });
}
// ...
if ((existing?.length || 0) >= maxForPlatform) {  // -1이면 0 >= -1 → true (버그!)
```
변경:
```typescript
if (maxForPlatform === 0) {
    return NextResponse.json({ error: '...' }, { status: 403 });
}
// -1 = 무제한
if (maxForPlatform !== -1 && (existing?.length || 0) >= maxForPlatform) {
```

**(b) `src/lib/utils/subscription.ts` 43행:**

현재:
```typescript
return (config.competitorsNaver + config.competitorsGoogle) > 0;
// -1 + -1 = -2 → false (프리미엄인데 경쟁사 비활성 판정!)
```
변경:
```typescript
return config.competitorsNaver > 0 || config.competitorsNaver === -1
    || config.competitorsGoogle > 0 || config.competitorsGoogle === -1;
```

**(c) `src/components/onboarding/StepCompetitorRegister.tsx` 36~40행:**

현재:
```typescript
const PLAN_COMPETITOR_LIMITS: Record<string, number> = {
    starter: 0,
    pro: 1,      // → 5
    premium: 10,  // → -1 (무제한) 또는 999
}
```
변경: PLAN_CONFIG에서 직접 읽도록 리팩토링하거나, 값 업데이트 + `-1`이면 제한 없음 처리

56, 63행의 비교 로직도 수정:
```typescript
// 현재:
if (naverCompetitors.length >= maxCompetitors) return
// 변경:
if (maxCompetitors !== -1 && naverCompetitors.length >= maxCompetitors) return
```

---

**(d) `src/components/settings/CompetitorManager.tsx` — `-1` 무제한 가드**

설정 페이지의 경쟁사 관리 컴포넌트도 동일한 비교 버그:

188행:
```typescript
// 현재:
{competitors.length < maxForPlatform && (  // -1이면 항상 false → 추가 버튼 안 보임
// 변경:
{(maxForPlatform === -1 || competitors.length < maxForPlatform) && (
```

139행:
```typescript
// 현재:
등록 {competitors.length}/{maxForPlatform}  // → "등록 0/-1" 표시
// 변경:
등록 {competitors.length}/{maxForPlatform === -1 ? '∞' : maxForPlatform}
```

#### Quality Gate ✋
```bash
npx jest src/lib/pricing/__tests__/config.test.ts
npm run build
```
- [ ] `config.test.ts` 통과
- [ ] `npm run build` 성공
- [ ] 프리미엄에서 경쟁사 등록 시 차단되지 않는지 확인 (온보딩 + 설정 페이지 모두)

---

### Phase 2: 스케줄러 로직 — 플랫폼별 분기 처리
**Goal**: 네이버=매일, 구글=주 1회로 스케줄러 로직 분기
**Estimated Time**: 2시간
**Status**: ✅ Done

---

#### 핵심 설계

**네이버 스케줄 필터링 로직 (확정)**
```
네이버:
├── crawling_days 배열이 비어 있으면 skip (= 활성화 안 됨)
├── crawling_days 배열에 오늘 요일(currentDay)이 없으면 skip
├── 오늘 KST 날짜에 이미 실행했으면 skip (last_run_at 비교)
└── free 플랜이면 skip

구글:
├── crawling_day가 null이면 skip (= 활성화 안 됨)
├── crawling_day가 오늘 요일과 매치하지 않으면 skip
├── 이번 주에 이미 실행했으면 skip (ISO 주차 비교)
└── free 플랜이면 skip
```

**네이버 DB 저장 방식:**
- `crawling_days = []` → 활성화 안 됨 (= 실행 안 함)
- `crawling_days = [1]` → 매주 월요일만
- `crawling_days = [0,1,2,3,4,5,6]` → 매일 ("매일" 버튼 누르면 이 값)

**구글 DB 저장 방식:**
- `crawling_day = null` → 활성화 안 됨
- `crawling_day = 1` → 매주 월요일

#### Tasks

**Task 2-1: `src/app/api/cron/scheduled-search/route.ts` 수정**

**(a) `getKstDateString()` 함수 추가 + 플랫폼별 분기:**

현재 (90~110행):
```typescript
const currentWeek = getISOWeekKST()
const jobs = (allSchedules || []).filter(s => {
    // 요일 매칭 + ISO 주차 체크 (모든 플랫폼 동일)
    if (!dayMatch) return false
    if (s.last_run_at) {
        const lastRunWeek = getISOWeekKST(s.last_run_at)
        if (lastRunWeek === currentWeek) return false
    }
    return true
})
```

변경: **플랫폼별 분기**
```typescript
function getKstDateString(utcDateStr?: string): string {
    const d = utcDateStr
        ? new Date(new Date(utcDateStr).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
        : getKstNow()
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const currentDateStr = getKstDateString()
const currentWeek = getISOWeekKST()

const jobs = (allSchedules || []).filter(s => {
    // free 플랜 skip
    if (freeUserIds.has(s.user_id)) return false

    if ((s.platform || 'naver') === 'naver') {
        // 배열 비어 있으면 skip (활성화 안 됨)
        const days: number[] = s.crawling_days || []
        if (days.length === 0) return false

        // 오늘 요일이 선택된 요일에 포함되지 않으면 skip
        if (!days.includes(currentDay)) return false

        // 오늘 이미 실행했으면 skip
        if (s.last_run_at && getKstDateString(s.last_run_at) === currentDateStr) return false
    } else {
        // 구글: crawling_day가 null이면 skip
        if (s.crawling_day === null || s.crawling_day === undefined) return false

        // 요일 매치
        if (s.crawling_day !== currentDay) return false

        // 같은 ISO 주차면 skip
        if (s.last_run_at && getISOWeekKST(s.last_run_at) === currentWeek) return false
    }

    return true
})
```

**(b) report_type 동적 설정** (164행):
```typescript
// 현재: report_type: 'weekly',
// 변경:
report_type: (job.platform || 'naver') === 'google' ? 'weekly' : 'daily',
```

---

**Task 2-2: `scripts/run-search.ts` 수정**

- `getKstDateString()` 함수 추가 + 플랫폼별 분기 (route.ts와 동일 패턴)
  - 네이버: `crawling_days` 배열 매치 + KST 날짜 실행 여부
  - 구글: `crawling_day` 단수 매치 + ISO 주차 실행 여부
- `report_type` 동적 설정
- 알림톡 발송 조건 (356행): `'daily'` 추가
- 재시도 판단 조건 (383행): `'daily'` 추가

---

**Task 2-3: `scripts/run-search.ts` — 알림톡 템플릿 분기 수정**

현재 (89~93행): `report_type`이 `weekly`가 아니면 무조건 WELCOME 템플릿 사용
```typescript
const isWeekly = search.report_type === 'weekly';
const templateId = isWeekly
    ? process.env.KAKAO_TEMPLATE_WEEKLY
    : process.env.KAKAO_TEMPLATE_WELCOME;
```

변경: 3분기 (daily → DAILY 템플릿, weekly → WEEKLY 템플릿, welcome → WELCOME 템플릿):
```typescript
function getTemplateId(reportType: string): string | undefined {
    switch (reportType) {
        case 'daily': return process.env.KAKAO_TEMPLATE_DAILY;
        case 'weekly': return process.env.KAKAO_TEMPLATE_WEEKLY;
        case 'welcome': return process.env.KAKAO_TEMPLATE_WELCOME;
        default: return undefined;
    }
}
const templateId = getTemplateId(search.report_type);
```

114~116행도 수정 — daily에서는 `#{리포트기간}` 제거:
```typescript
// 현재:
if (isWeekly) {
    variables['#{리포트기간}'] = formatReportPeriod();
}
// 변경:
if (search.report_type === 'weekly') {
    variables['#{리포트기간}'] = formatReportPeriod();
}
```

---

**Task 2-4: `src/lib/kakao/messaging.ts` — `sendDailyReport()` 함수 추가**

`sendWeeklyReport`를 복제하여 `sendDailyReport` 추가:
```typescript
export async function sendDailyReport(
    userId: string, placeName: string,
    searchId: string, platform: string = 'naver',
): Promise<void> {
    const phone = await getUserPhone(userId);
    const templateId = process.env.KAKAO_TEMPLATE_DAILY;
    if (!templateId) throw new Error('KAKAO_TEMPLATE_DAILY 환경 변수가 설정되지 않았습니다.');

    const platformName = platform === 'naver' ? '네이버' : '구글';
    const analysisDate = formatKstDate(getKstNow());
    const reportUrl = getReportUrl(searchId, platform);

    await sendAlimtalk(phone, templateId, {
        '#{가게명}': placeName,
        '#{플랫폼명}': platformName,
        '#{분석일시}': analysisDate,
        '#{리포트URL}': reportUrl,
    });
}
```

> 주의: `sendWeeklyReport`는 구글 주간용으로 당분간 유지. WEEKLY 템플릿 삭제는 Phase 0 Task 0-4에서.

---

**Task 2-5: `src/lib/services/schedule-manager.ts` — 레거시, 수정 불필요**

> ✅ **확인 완료**: `grep_search` 결과 `ScheduleManager.runScheduledSearches()`를 호출하는 API 라우트가 **없음**. 103행, 114행에 `type: 'weekly'` 하드코딩되어 있으나 **현재 미사용 레거시** → 수정 불필요.
>
> ⚠️ **주의**: 향후 이 파일을 활성화할 시에는 `sendWeeklyReport()` → `sendDailyReport()` 분기 및 `type: 'weekly'` → 플랫폼 변수로 대체 필요.

---

**Task 2-6: `src/lib/services/notification-service.ts` — 확인 필요**

현재 62행에서 `notification_logs`를 조회할 때 `type: 'weekly'`만 필터링:
```typescript
.eq('type', 'weekly');  // ← 'daily' 알림은 영원히 조회 안 됨!
```

vercel.json에 이 서비스를 호출하는 cron이 없어서 현재는 사용되지 않는 것으로 보이지만, 확인 필요:
- 호출됨 → `.in('type', ['weekly', 'daily'])` 로 변경
- 호출 안 됨 → 수정 불필요

#### Quality Gate ✋
```bash
npm run build
```
- [ ] `npm run build` 성공
- [ ] `schedule-manager.ts` 호출 여부 확인 완료
- [ ] `notification-service.ts` 호출 여부 확인 완료
- [ ] `KAKAO_TEMPLATE_DAILY` 환경변수가 설정되어 있는지 확인

---

### Phase 3: 타입 + 필터링 + UI 뱃지
**Goal**: `'daily'` report_type을 타입/유틸/UI에 반영
**Estimated Time**: 1시간
**Status**: ✅ Done (2026-03-13)

---

#### Tasks

**Task 3-1: `src/lib/types/index.ts`**
- 23행: `report_type`에 `'daily'` 추가
- 189행: `NotificationLog.type`에 `'daily'` 추가

**Task 3-2: `src/lib/utils/rank-trend.ts` (35행)**
- `'daily'` 필터 추가

**Task 3-3: `src/lib/utils/insights.ts` (20행)**
- `'daily'` 필터 추가

**Task 3-4: `src/app/(dashboard)/dashboard/page.tsx` (50행)**
- `weeklySearchIds` → `scheduledSearchIds` (daily + weekly)
- 96행: `nextReportDate` 7일→1일로 변경

**Task 3-5: `src/app/(dashboard)/history/page.tsx` (62행)**
- weekly → daily+weekly 필터

**Task 3-6: `SearchHistorySection.tsx` + `HistoryTable.tsx`**
- REPORT_TYPE_MAP에 `daily: { label: '데일리', className: 'bg-sky-50 text-sky-600' }` 추가

**Task 3-7: `src/lib/utils/__tests__/rank-trend.test.ts`**
- `'daily'` 포함 테스트 케이스 추가

---

**Task 3-8: `src/app/api/kakao/send-report/route.ts` (27행)**

현재:
```typescript
type: 'welcome' | 'weekly';
```
변경:
```typescript
type: 'welcome' | 'weekly' | 'daily';
```
> 이 API는 현재 직접 호출되는 곳은 없으나, 타입 안전성 유지를 위해 업데이트.

#### Quality Gate ✋
```bash
npx jest src/lib/utils/__tests__/rank-trend.test.ts
npm run build
```
- [x] 테스트 통과
- [x] `npm run build` 성공

---

### Phase 4: 랜딩/구독/온보딩 페이지 — 가격·피처·텍스트 업데이트
**Goal**: 하드코딩된 가격/피처/텍스트를 확정 플랜에 맞춤
**Estimated Time**: 2시간
**Status**: ✅ Done (2026-03-13)

---

#### Part A: 가격·피처 하드코딩 수정 (3개 파일)

**Task 4-1: `src/components/landing/PricingSection.tsx`**

| 행 | 현재 | 변경 |
|----|------|------|
| 35행 | `주간 보고서 자동 발송` | `매일 보고서 자동 발송` |
| 53행 | `주간 보고서 자동 발송` | `매일 보고서 자동 발송` |
| 54행 | `실시간 진단 티켓 월 10회` | `실시간 진단 티켓 월 5회` |
| 55행 | `경쟁사 3곳 분석` | `경쟁사 5곳 분석` |
| 64행 | `monthly: '99,000원'` | `monthly: '79,000원'` |
| 69행 | `관리 키워드 10개` | `관리 키워드 5개 (각 채널)` |
| 70행 | `실시간 진단 티켓 월 15회` | `실시간 진단 티켓 월 10회 (각 채널)` |
| 71행 | `주간 보고서 자동 발송` | `네이버 매일 + 구글 주간 보고서` |
| 72행 | `경쟁사 10곳 심층 분석` | `경쟁사 무제한 분석` |

**Task 4-2: `src/components/landing/PricingDetailSection.tsx`**

COMPARISON 배열 (15~47행) + PLANS 배열 (99~153행) + TERMS (71행) 전부 동일 패턴으로 업데이트.

특히 비교 테이블:
```typescript
// 현재:
{ label: '리포트 주기', starter: '주 1회', pro: '주 1회', premium: '주 1회' },
{ label: '실시간 진단 티켓', starter: '월 2회', pro: '월 10회', premium: '월 15회 (각 채널)' },
{ label: '경쟁사 분석', starter: '—', pro: '1곳', premium: '10곳' },

// 변경:
{ label: '리포트 주기', starter: '매일', pro: '매일', premium: '네이버 매일 / 구글 주 1회' },
{ label: '실시간 진단 티켓', starter: '월 2회', pro: '월 5회', premium: '월 10회 (각 채널)' },
{ label: '경쟁사 분석', starter: '—', pro: '5곳', premium: '무제한' },
```

용어 설명 (71행):
```typescript
// 현재:
desc: '정기 리포트(주 1회) 외에, 지금 당장...',
// 변경:
desc: '정기 리포트(매일) 외에, 지금 당장...',
```

**Task 4-3: `src/components/dashboard/SubscriptionContent.tsx` (51~104행)**

PricingSection.tsx와 동일 패턴으로 PLANS 배열 업데이트.

---

#### Part B: 대시보드/설정 UI 텍스트 (4개 파일)

**Task 4-4: `src/app/(dashboard)/report-settings/ReportSettingsContent.tsx`**

| 행 | 현재 | 변경 |
|----|------|------|
| 124, 270행 | `주간 리포트 설정` | `자동 리포트 설정` |
| 348행 | `주간 리포트 활성화` | `자동 리포트 활성화` |
| 389행 | `매주 이 시간에 자동으로 순위를 분석합니다` | 플랫폼별 (네이버: `선택한 요일에 자동 분석합니다`, 구글: `매주 해당 요일에 분석합니다`) |
| 393행 | `분석 요일 (주 택): 1개 선택` + 단수 토글 | 네이버: **복수 선택** + **`"매일"`** 버튼 (7개 전체), 기본값 아무것도 선택 안 됨 |
| 393행 | (same) | 구글: 단수 선택 유지, "분석 요일 1개를 선택해주세요" 문구 유지 |
| 442행 | `매주 {요일}요일` 미리보기 | 네이버: `{dayLabels.join(', ')} {crawlingTime}에 자동 분석`, 구글: 기존 유지 |

**요일 선택 UI 상세 (Task 4-4 네이버 탭):**
```tsx
{/* 매일 버튼 */}
<button onClick={() => setCrawlingDays([0,1,2,3,4,5,6])}
    className={`rounded-lg px-4 py-2 text-sm font-medium ...
        ${crawlingDays.length === 7 ? 'bg-[#00C896] text-white' : 'border border-gray-200'}`}>
    매일
</button>

{/* 요일 토글 (7개, 복수 선택) */}
{DAYS.map(day => (
    <button key={day.value}
        onClick={() => {
            if (crawlingDays.includes(day.value))
                setCrawlingDays(crawlingDays.filter(d => d !== day.value))
            else
                setCrawlingDays([...crawlingDays, day.value])
        }}
        className={`...
            ${crawlingDays.includes(day.value) ? 'bg-[#00C896] text-white' : 'border border-gray-200'}`}>
        {day.label}
    </button>
))}

{/* 미리보기 */}
{crawlingDays.length > 0 ? (
    <p>매주 <strong>{dayLabels.join(', ')}</strong>에 자동 분석됩니다</p>
) : (
    <p className="text-amber-600">요일을 1개 이상 선택해주세요</p>
)}
```

**Task 4-4 추가 수정: state + handleSave + handleTabChange 변경**

**(a) state 변경 (154~155행):**
```typescript
// 현재 — 단수:
const [crawlingDay, setCrawlingDay] = useState<number | null>(
    currentSchedule?.crawling_day ?? (currentSchedule?.crawling_days?.[0] ?? null)
)
// 변경 — 네이버: 배열, 구글: 단수 (탭별 분리):
const [naverCrawlingDays, setNaverCrawlingDays] = useState<number[]>(
    naverSchedule?.crawling_days ?? []
)
const [googleCrawlingDay, setGoogleCrawlingDay] = useState<number | null>(
    googleSchedule?.crawling_day ?? null
)
```

**(b) handleSave 유효성 검사 + 페이로드 변경 (215~240행):**
```typescript
// 현재 — 단수 체크:
if (crawlingDay === null) {
    setError('분석 요일을 선택해주세요.')
    return
}
// 변경 — 네이버/구글 분기:
// 네이버: 빈 배열이면서 is_active=true이면 경고
if (activeTab === 'naver' && naverCrawlingDays.length === 0 && isActive) {
    setError('자동 리포트를 받을 요일을 1개 이상 선택해주세요.')
    return
}
// 구글: null이면서 is_active=true이면 경고
if (activeTab === 'google' && googleCrawlingDay === null && isActive) {
    setError('분석 요일을 선택해주세요.')
    return
}

// 페이로드도 분기:
body: JSON.stringify({
    platform: activeTab,
    crawling_days: activeTab === 'naver' ? naverCrawlingDays : [googleCrawlingDay].filter(Boolean),
    crawling_time: crawlingTime,
    ...
})
```

> **엣지케이스**: `is_active = false`인 상태에서 요일 0개로 저장은 **허용**. 스케줄러 자체가 실행 안 하므로 문제없음. `is_active = true`일 때만 검증.

**(c) handleTabChange 동기화 변경 (196~205행):**
```typescript
// 현재:
setCrawlingDay(schedule?.crawling_day ?? (schedule?.crawling_days?.[0] ?? null))
// 변경: 탭별로 각자 state 그대로 유지 (naverCrawlingDays / googleCrawlingDay 분리되어 있으므로 별도 setCrawlingDay 불필요)
// handleTabChange에서 setCrawlingDay 호출 제거
```

**Task 4-5: `src/components/onboarding/StepScheduleSetting.tsx`**

| 행 | 현재 | 변경 |
|----|------|------|
| 177행 | `주간 리포트를 받아볼 요일과 시간을 설정해주세요.` | `자동 리포트를 받을 요일과 시간을 설정해주세요.` |
| 202행 | `매주 이 시간에...` | 제거 혹은 플랫폼별 변경 |
| 206행 | 요일 선택 UI (단수) | 네이버: **복수 선택 + "매일" 버튼**, 기본값 [] |

**온보딩에서 네이버 요일 선택 UI 상세 (Task 4-5):**
```tsx
{/* 네이버 요일 선택 */}
<label>분석 요일 (여러 개 선택 가능)</label>

{/* 매일 버튼 */}
<button onClick={() => setCrawlingDays([0,1,2,3,4,5,6])}>매일</button>

{/* 요일 7개 복수 선택 */}
{DAYS.map(day => (
    <button key={day.value} onClick={() => toggleDay(day.value)}
        className={crawlingDays.includes(day.value) ? '선택됨' : ''}>
        {day.label}
    </button>
))}

{/* 기본값: 아무것도 선택되지 않은 상태 */}
initialState: crawlingDays = []

{/* 프리미엄 구글 요일 선택: 단수 유지 */}
{isPremium && activeTab === 'google' && (
    <div>
        <label>분석 요일 1개를 선택해주세요</label>
        {DAYS.map(day => (
            <button key={day.value} onClick={() => setGoogleCrawlingDay(day.value)}>
                {day.label}
            </button>
        ))}
    </div>
)}
```

**온보딩 API 호출 시 저장 기준 (Task 4-5 핵심 변경):**

**(a) state 변경 (40행):**
```typescript
// 현재 — 단수:
const [crawlingDay, setCrawlingDay] = useState<number | null>(null)
const canProceed = crawlingDay !== null && phoneValid

// 변경 — 네이버: 배열, 구글: 단수:
const [naverCrawlingDays, setNaverCrawlingDays] = useState<number[]>([])  // 기본값: 빈 배열
const [googleCrawlingDay, setGoogleCrawlingDay] = useState<number | null>(null)

// canProceed 변경:
// → 네이버: 요일 0개도 저장 가능 (스케줄러가 실행 안 함). 단, 최소 1개 권장 → 경고만 표시, 막지는 않음
// → 전화번호는 필수 유지
const canProceed = phoneValid  // 요일 0개여도 저장 가능
```

**(b) DB INSERT 페이로드 변경 (85~98행 네이버, 110~123행 구글):**
```typescript
// 네이버 INSERT — 현재:
.insert({
    ...asis,
    crawling_day: crawlingDay,   // ← 단수만, crawling_days 없음
    is_active: true,
})

// 네이버 INSERT — 변경:
.insert({
    ...asis,
    crawling_days: naverCrawlingDays,  // ← 배열 (빈 배열 허용)
    crawling_day: naverCrawlingDays[0] ?? null,  // 하위 호환용
    is_active: naverCrawlingDays.length > 0,  // 요일 선택 안 하면 비활성
})

// 구글 INSERT — 현재:
.insert({
    crawling_day: crawlingDay,   // ← 단수
})

// 구글 INSERT — 변경:
.insert({
    crawling_day: googleCrawlingDay,  // ← null 허용
    crawling_days: googleCrawlingDay !== null ? [googleCrawlingDay] : [],
    is_active: googleCrawlingDay !== null,  // 요일 선택 안 하면 비활성
})
```

> **엣지케이스**: 네이버 요일 0개로 온보딩 완료 시 → `is_active: false`로 저장 → 스케줄러 실행 안 함. 사용자가 나중에 리포트 설정에서 요일 선택 후 활성화 가능.

**(c) 공유 인터페이스 변경 (`src/app/(dashboard)/onboarding/onboarding-utils.ts` 26~33행):**
```typescript
// 현재:
export interface ScheduleData {
    crawlingDay: number          // ← 단수 필수
    crawlingTime: string
    ...
}

// 변경:
export interface ScheduleData {
    naverCrawlingDays: number[]          // ← 복수 필수
    googleCrawlingDay?: number | null    // ← 단수, 선택적
    crawlingTime: string
    notifyImmediate: boolean
    phone?: string
}
```
*주의: 위 인터페이스 변경에 따라 `StepScheduleSetting.tsx`에서 `onComplete()`를 호출하는 부분(155행)의 페이로드도 `naverCrawlingDays`와 `googleCrawlingDay`를 넘겨주는 형태로 맞추어 수정해야 합니다.*

**Task 4-6: `src/components/dashboard/DashboardMetricsToggle.tsx` (68행)**

`주간 리포트 요약` → `리포트 요약`

---

**Task 4-8: `src/components/dashboard/DashboardHeader.tsx` (14~16행)**

현재:
```typescript
const statusText = hasActiveWeeklyReport
    ? '주간 자동 보고서: 켜짐'
    : '주간 자동 보고서: 꺼짐'
```
변경:
```typescript
const statusText = hasActiveWeeklyReport
    ? '자동 보고서: 켜짐'
    : '자동 보고서: 꺼짐'
```

---

**Task 4-9: `src/components/onboarding/StepKeywordRegister.tsx` (154행)**

현재:
```tsx
이 키워드는 <strong>주간 리포트</strong>와 <strong>실시간 진단</strong>에 모두 사용됩니다.
```
변경:
```tsx
이 키워드는 <strong>자동 리포트</strong>와 <strong>실시간 진단</strong>에 모두 사용됩니다.
```

**Task 4-7: `src/components/history/HistoryPageContent.tsx`**

| 행 | 현재 | 변경 |
|----|------|------|
| 61행 | `주간 리포트 기반...` | `자동 리포트 기반...` |
| 113행 | `주간 리포트가 2회 이상...` | `자동 리포트가 2회 이상...` |
| 154행 | `<option value="weekly">주간 리포트</option>` | `<option value="daily">데일리</option>` 추가 |

---

**Task 4-10: `src/app/(dashboard)/onboarding/page.tsx` (340행)**

현재:
```tsx
매주 자동으로 [플레이스 순위 지도] 리포트를 받을 수 있어요.
```
변경:
```tsx
매일 자동으로 [플레이스 순위 지도] 리포트를 받을 수 있어요.
```
> 온보딩 인트로 화면에서만 노출되는 텍스트. `handleConfirm`, `data.schedule` 등의 로직 변경은 불필요.

#### Quality Gate ✋
```bash
npm run build
```
- [x] `npm run build` 성공
- [x] 랜딩 페이지에서 프리미엄 가격이 79,000원으로 표시
- [x] 프로 경쟁사가 "5곳"으로 표시
- [x] 프리미엄 경쟁사가 "무제한"으로 표시
- [x] 네이버 탭: "매일" 버튼 + 복수 요일 선택 UI + 기본값 빈 배열
- [x] 구글 탭: 단수 요일 선택 + "분석 요일 1개를 선택해주세요" 문구
- [x] 온보딩 네이버: "매일" 버튼 + 복수 선택, 기본값 []
- [x] 구글 `crawling_days = []` 혹은 `crawling_day = null`이면 스케줄러에서 실행 안 함 확인
- [x] `is_active = true` + 요일 0개 저장 시 에러메시지 표시 확인 (리포트 설정 페이지)
- [x] 온보딩에서 네이버 요일 0개 저장 시 `is_active: false`로 저장되는지 확인
- [x] `ReportSettingsContent` state가 `crawlingDays: number[]` + `googleCrawlingDay: number|null`로 분리되어 있는지 확인
- [x] 온보딩 인트로(340행) "매주" → "매일" 변경 확인

---

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| DB CHECK 제약조건 누락으로 INSERT 실패 | ~~High~~ 해결됨 | Critical | Phase 1에서 ALTER TABLE |
| `-1` 무제한이 비교 로직 깨뜨림 | ~~High~~ 해결됨 | Critical | Phase 1에서 가드 로직 추가 |
| 랜딩 페이지 가격 불일치 | ~~High~~ 해결됨 | High | Phase 4에서 하드코딩 업데이트 |
| 솔라피 일간 템플릿 심사 지연/반려 | Medium | **Blocker** | Phase 0 선행, 반려 시 본문 수정 후 재신청 |
| 네이버 스케줄에 `platform` 미설정 | Medium | Low | `platform \|\| 'naver'` 기본값 |
| 같은 날 cron 2회 호출 시 중복 | Medium | Medium | KST 날짜 비교 |
| WEEKLY 템플릿 조기 삭제 시 구글 주간 알림 실패 | Medium | High | Phase 0-4: 코드 배포 이후에만 삭제 |
| `schedule-manager.ts` 아직 호출됨 | Low | Medium | Phase 2에서 확인 |
| `notification-service.ts`가 `type:'weekly'`만 조회 | Low | Medium | Phase 2에서 확인 |

---

## 🔄 Rollback Strategy

### Phase 1 실패 시
```sql
ALTER TABLE searches DROP CONSTRAINT IF EXISTS searches_report_type_check;
ALTER TABLE searches ADD CONSTRAINT searches_report_type_check
  CHECK (report_type IN ('weekly', 'realtime', 'welcome'));
```
- `config.ts`, `competitors/route.ts`, `subscription.ts`: `git revert`

### Phase 2~4 실패 시
- 해당 파일들: `git revert HEAD`

---

## 📊 수정 대상 파일 총정리

### Phase 0: 솔라피 + 환경변수 (1개 파일 + 외부 작업)
| 대상 | 작업 |
|------|------|
| `솔라피 대시보드` | [외부] 일간 리포트 템플릿 심사 등록 |
| `Vercel / GitHub Secrets / .env.local` | [외부] `KAKAO_TEMPLATE_DAILY` 환경변수 추가 |
| `.github/workflows/cron.yml` | [MODIFY] `KAKAO_TEMPLATE_DAILY` 환경변수 추가 |

### Phase 1: DB + Config + 무제한 가드 (7개)
| 파일 | 작업 |
|------|------|
| `supabase/migrations/027_sync_daily_tracking.sql` | [NEW] CHECK 제약조건 + plans |
| `src/lib/pricing/config.ts` | [MODIFY] PLAN_CONFIG 값 업데이트 |
| `src/app/api/settings/competitors/route.ts` | [MODIFY] `-1` 무제한 가드 |
| `src/lib/utils/subscription.ts` | [MODIFY] `-1` 무제한 가드 |
| `src/components/onboarding/StepCompetitorRegister.tsx` | [MODIFY] 한도값 + `-1` 가드 |
| `src/components/settings/CompetitorManager.tsx` | [MODIFY] `-1` 무제한 가드 + "∞" 표시 |
| `src/lib/pricing/__tests__/config.test.ts` | [MODIFY] 테스트 업데이트 (필요시) |

### Phase 2: 스케줄러 + 알림톡 (6개)
| 파일 | 작업 |
|------|------|
| `src/app/api/cron/scheduled-search/route.ts` | [MODIFY] 플랫폼별 분기 |
| `scripts/run-search.ts` | [MODIFY] 플랫폼별 분기 + 템플릿 3분기 |
| `src/lib/kakao/messaging.ts` | [MODIFY] `sendDailyReport()` 함수 추가 |
| `src/lib/services/schedule-manager.ts` | [VERIFY] 호출 여부 확인 |
| `src/lib/services/notification-service.ts` | [VERIFY] 호출 여부 확인 → `type` 필터 수정 |

### Phase 3: 타입 + 필터링 + UI 뱃지 (8개)
| 파일 | 작업 |
|------|------|
| `src/lib/types/index.ts` | [MODIFY] 'daily' 추가 |
| `src/lib/utils/rank-trend.ts` | [MODIFY] 'daily' 필터 |
| `src/lib/utils/insights.ts` | [MODIFY] 'daily' 필터 |
| `src/app/(dashboard)/dashboard/page.tsx` | [MODIFY] 필터 + nextReportDate |
| `src/app/(dashboard)/history/page.tsx` | [MODIFY] 필터 |
| `src/components/dashboard/SearchHistorySection.tsx` | [MODIFY] REPORT_TYPE_MAP |
| `src/components/history/HistoryTable.tsx` | [MODIFY] REPORT_TYPE_MAP |
| `src/app/api/kakao/send-report/route.ts` | [MODIFY] type에 'daily' 추가 |

### Phase 4: 랜딩/구독/온보딩 텍스트 (9개)
| 파일 | 작업 |
|------|------|
| `src/components/landing/PricingSection.tsx` | [MODIFY] 가격/피처/텍스트 |
| `src/components/landing/PricingDetailSection.tsx` | [MODIFY] 비교표/피처/용어 |
| `src/components/dashboard/SubscriptionContent.tsx` | [MODIFY] 가격/피처 |
| `src/app/(dashboard)/report-settings/ReportSettingsContent.tsx` | [MODIFY] 텍스트 + 요일 분기 |
| `src/components/onboarding/StepScheduleSetting.tsx` | [MODIFY] 텍스트 + 요일 분기 |
| `src/components/dashboard/DashboardMetricsToggle.tsx` | [MODIFY] 텍스트 |
| `src/components/history/HistoryPageContent.tsx` | [MODIFY] 텍스트 + 필터옵션 |
| `src/components/dashboard/DashboardHeader.tsx` | [MODIFY] "주간 자동 보고서" → "자동 보고서" |
| `src/components/onboarding/StepKeywordRegister.tsx` | [MODIFY] "주간 리포트" → "자동 리포트" |

### 테스트 (1개)
| 파일 | 작업 |
|------|------|
| `src/lib/utils/__tests__/rank-trend.test.ts` | [MODIFY] daily 포함 테스트 |

**총 수정 대상: SQL 1개 + 코드 29개 + 외부 작업 3건 = 30개 항목**

---

## 📊 Progress Tracking

- **Phase 0 (Solapi Template)**: ⏳ 0% — ⚡ 먼저 시작!
- **Phase 1 (DB+Config+Guard)**: ⏳ 0% — Phase 0 대기 중 병렬 가능
- **Phase 2 (Scheduler+Alimtalk)**: ⏳ 0% — Phase 0 완료 필요
- **Phase 3 (Type+Filter+Badge)**: ⏳ 0% — Phase 1 이후
- **Phase 4 (Landing+UI Text)**: ⏳ 0% — Phase 1 이후

**Overall Progress**: 0% complete

> 💡 Phase 0(솔라피 신청)을 먼저 시작하고, 심사 대기 중에 Phase 1/3/4 병렬 진행 가능.

---

## 📝 Notes & Learnings

- DB 동시처리: 실제값 70, 파일(026) 20 → 027에서 동기화
- 유료 가입자 없음 → 안전하게 변경 가능
- 프리미엄 구글 = 주 1회 → 플랫폼별 분기 필요
- **[1차 검토]** `searches`, `notification_logs` CHECK 제약조건에 'daily' 필수
- **[1차 검토]** `schedule-manager.ts` 레거시 파일 확인 필요
- **[1차 검토]** UI "주간 리포트" 텍스트 10곳+ 잔존
- **[2차 검토]** 랜딩/구독 3개 파일에 가격·티켓·경쟁사 수 하드코딩 (PLAN_CONFIG 안 읽음)
- **[2차 검토]** 온보딩 경쟁사 한도 하드코딩 (pro: 1→5, premium: 10→무제한)
- **[2차 검토]** `competitorsNaver: -1` 비교 로직 버그 (0 >= -1 → true → 등록 차단)
- **[2차 검토]** 랜딩 "주간 보고서" → "매일 보고서" 문구 변경 필요
- **[3차 검토]** `notification-service.ts`가 `.eq('type', 'weekly')`로 daily 알림 누락 가능 → 호출 여부 확인 후 수정
- **[3차 검토]** `messaging.ts`의 `formatReportPeriod()`가 7일 기간 표시 — 데일리와 불일치 (낮은 우선순위)
- **[4차 검토]** `send-report/route.ts` type 유니온에 'daily' 누락 → Phase 3에서 타입 보강
- **[4차 검토]** `DashboardHeader.tsx` "주간 자동 보고서" 텍스트 → Phase 4에서 업데이트
- **[4차 검토]** `StepKeywordRegister.tsx` "주간 리포트" 텍스트 → Phase 4에서 업데이트
- **[5차 검토]** 솔라피 알림톡 템플릿 — 일간 전용 신규 등록 필요 (심사 1~3 영업일) → Phase 0 선행
- **[5차 검토]** `run-search.ts` 템플릿 분기가 weekly/welcome만 → daily 추가 필요
- **[5차 검토]** `messaging.ts`에 `sendDailyReport()` 함수 추가 필요
- **[5차 검토]** `CompetitorManager.tsx` (설정 페이지) — `-1` 무제한 가드 누락
- **[5차 검토]** `cron.yml`에 `KAKAO_TEMPLATE_DAILY` 환경변수 추가 필요
- **[5차 검토]** WEEKLY 템플릿 삭제는 코드 배포 이후에만 실행 (순서 중요)
- **[6차 검토]** `StepScheduleSetting.tsx` INSERT 페이로드에 `crawling_days` 배열 누락 → Phase 4 Task 4-5에서 수정
- **[6차 검토]** `ReportSettingsContent.tsx` state가 `crawlingDay: number|null` → `naverCrawlingDays: number[]` + `googleCrawlingDay: number|null` 분리 필요 → Task 4-4
- **[6차 검토]** `is_active=true` + 요일 0개 저장 시 에러메시지 표시 필요 (is_active=false는 허용)
- **[6차 검토]** `handleTabChange` state 동기화에서 `setCrawlingDay` 관련 코드 제거 필요 → Task 4-4
- **[6차 검토]** 온보딩에서 네이버 요일 0개면 `is_active: false`로 INSERT 하는 보호 로직 필요
- **[7차 검토]** DB의 `search_schedules.crawling_days` 기본값이 `'{1,2,3,4,5,6,7}'`이어서 빈값 INSERT 시 매일 실행되는 문제 → Task 1-1 O27 SQL에서 `DEFAULT '{}'`로 변경
- **[7차 검토]** `onboarding-utils.ts`의 `ScheduleData` 인터페이스가 단수(`crawlingDay: number`)여서 타입 에러 발생 → Task 4-5에서 인터페이스 변경 및 호출부 수정 추가
- **[8차 검토]** `onboarding/page.tsx` 340행 "매주 자동으로" → "매일 자동으로" 문구 변경 필요 → Task 4-10 신규 추가
- **[8차 검토]** `schedule-manager.ts`는 호출 라우트 미존재 증명 → **레거시 파일 (수정 불필요)**. 개준 활성화 시 `sendDailyReport()` 분기 + `type` 플랫폼변수 대체 필요.


