---
name: verify-subscription-gating
description: 구독 기반 UI 게이팅의 일관성을 검증합니다. 구독/플랜 관련 UI 변경 후, 검색 페이지 수정 후, 설정 페이지 수정 후 사용.
---

# 구독 기반 UI 게이팅 검증

## Purpose

1. **플랜별 접근 제어** — free 유저는 검색 차단, Starter는 Naver만, Premium은 Naver+Google 접근 가능한지 확인
2. **업그레이드 프롬프트** — 잠긴 기능 접근 시 업그레이드 유도 UI가 표시되는지 확인
3. **키워드 선택 플로우** — 검색 페이지에서 직접 입력이 아닌, 등록된 키워드 체크박스 선택 방식을 사용하는지 확인
4. **그리드 크기 제한** — 플랜별 허용 그리드 크기(3×3, 5×5, 7×7)가 올바르게 제한되는지 확인
5. **useSubscription 훅 사용** — 클라이언트 컴포넌트에서 구독 상태 관련 로직이 `useSubscription` 훅을 사용하는지 확인

## When to Run

- 검색 페이지 (`search/new`, `naver-search/new`) 수정 후
- 설정 페이지 (`settings`) 수정 후
- 대시보드 컴포넌트 수정 후
- 구독 관련 유틸리티 (`subscription.ts`, `useSubscription.ts`) 수정 후
- 업그레이드 관련 컴포넌트 (`UpgradePrompt.tsx`, `SubscriptionBanner.tsx`) 수정 후

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/utils/subscription.ts` | 구독 상태 확인 헬퍼 함수 (isSubscribed, canAccessPlatform, getAllowedGridSizes 등) |
| `src/hooks/useSubscription.ts` | 클라이언트 구독 상태 훅 (Supabase 실시간 조회) |
| `src/app/(dashboard)/search/new/page.tsx` | Google 검색 페이지 (구독 게이팅 + 키워드 선택) |
| `src/app/(dashboard)/naver-search/new/page.tsx` | Naver 검색 페이지 (구독 게이팅 + 키워드 선택) |
| `src/app/(dashboard)/dashboard/page.tsx` | 대시보드 (플랫폼 카드 잠금 처리) |
| `src/app/(dashboard)/settings/page.tsx` | 설정 페이지 (서버 컴포넌트, planStats 전달) |
| `src/app/(dashboard)/settings/SettingsContent.tsx` | 설정 UI (플랜별 기능 표시/잠금) |
| `src/components/dashboard/DashboardPlatformCard.tsx` | 대시보드 플랫폼 카드 (isLocked 처리) |
| `src/components/dashboard/SubscriptionBanner.tsx` | free 유저용 구독 유도 배너 |
| `src/components/dashboard/UpgradePrompt.tsx` | 업그레이드 프롬프트 모달 |
| `src/components/layout/WalletLabel.tsx` | 네비게이션 바 구독 상태 표시 |
| `src/components/settings/KeywordManager.tsx` | 키워드 관리 컴포넌트 (플랜별 제한) |
| `src/components/settings/CompetitorManager.tsx` | 경쟁사 관리 컴포넌트 (플랜별 제한) |
| `src/lib/pricing/config.ts` | 플랜 설정 (PLAN_CONFIG) |

## Workflow

### Step 1: 검색 페이지 구독 게이팅 확인 (Naver)

**도구:** Grep  
**파일:** `src/app/(dashboard)/naver-search/new/page.tsx`

**검사:** free 유저 접근 차단 및 구독 체크 로직이 존재하는지 확인

```bash
grep -n "useSubscription\|canAccessPlatform\|subscription.loading" "src/app/(dashboard)/naver-search/new/page.tsx"
```

**PASS 기준:**
- `useSubscription` 훅 import 및 사용
- `canAccessPlatform('naver')` 체크로 접근 제어
- `subscription.loading` 로딩 상태 처리
- 차단 시 업그레이드 안내 UI 존재

**FAIL 기준:** 구독 체크 없이 누구나 검색 가능

---

### Step 2: 검색 페이지 구독 게이팅 확인 (Google)

**도구:** Grep  
**파일:** `src/app/(dashboard)/search/new/page.tsx`

**검사:** Premium 이하 유저 접근 차단 로직이 존재하는지 확인

```bash
grep -n "useSubscription\|canAccessPlatform\|subscription.loading" "src/app/(dashboard)/search/new/page.tsx"
```

**PASS 기준:**
- `useSubscription` 훅 import 및 사용
- `canAccessPlatform('google')` 체크로 접근 제어
- 차단 시 "Premium 플랜" 안내 메시지 존재

**FAIL 기준:** 구독 체크 없이 누구나 Google 검색 가능

---

### Step 3: 키워드 입력 → 체크박스 선택 전환 확인

**도구:** Grep  
**파일:** `src/app/(dashboard)/naver-search/new/page.tsx`, `src/app/(dashboard)/search/new/page.tsx`

**검사:** 키워드 직접 입력(KeywordInput) 대신 등록 키워드 체크박스 선택 방식을 사용하는지 확인

```bash
grep -n "KeywordInput" "src/app/(dashboard)/naver-search/new/page.tsx"
grep -n "KeywordInput" "src/app/(dashboard)/search/new/page.tsx"
grep -n "managed_keywords\|registeredKeywords\|selectedKeywords" "src/app/(dashboard)/naver-search/new/page.tsx"
grep -n "managed_keywords\|registeredKeywords\|selectedKeywords" "src/app/(dashboard)/search/new/page.tsx"
```

**PASS 기준:**
- `KeywordInput` import가 없음 (제거됨)
- `managed_keywords` 테이블에서 키워드 조회
- `registeredKeywords` 상태와 `selectedKeywords` Set 사용
- 체크박스 UI (`type="checkbox"`) 존재

**FAIL 기준:** `KeywordInput` 컴포넌트를 여전히 사용

---

### Step 4: 그리드 크기 제한 확인

**도구:** Grep  
**파일:** `src/app/(dashboard)/naver-search/new/page.tsx`, `src/app/(dashboard)/search/new/page.tsx`

**검사:** 플랜별 그리드 크기 제한이 적용되는지 확인

```bash
grep -n "getAllowedGridSizes\|allowedGridSizes\|GRID_TEMPLATES" "src/app/(dashboard)/naver-search/new/page.tsx"
grep -n "getAllowedGridSizes\|allowedGridSizes\|GRID_TEMPLATES" "src/app/(dashboard)/search/new/page.tsx"
```

**PASS 기준:**
- `getAllowedGridSizes` import 및 사용
- `GRID_TEMPLATES`에 3, 5, 7 크기 정의
- 허용되지 않는 크기는 `disabled` 처리
- 🔒 아이콘으로 잠긴 그리드 크기 표시

**FAIL 기준:** 그리드 크기 제한 없이 모든 사이즈 사용 가능

---

### Step 5: 대시보드 플랫폼 카드 잠금 상태 확인

**도구:** Grep  
**파일:** `src/components/dashboard/DashboardPlatformCard.tsx`, `src/app/(dashboard)/dashboard/page.tsx`

**검사:** 구독하지 않은 유저에게 플랫폼 카드가 잠김 처리되는지 확인

```bash
grep -n "isLocked\|locked" src/components/dashboard/DashboardPlatformCard.tsx
grep -n "isLocked\|canAccessPlatform" "src/app/(dashboard)/dashboard/page.tsx"
```

**PASS 기준:**
- `DashboardPlatformCard`에 `isLocked` prop 존재
- `isLocked`가 true일 때 오버레이 또는 잠금 UI 표시
- `dashboard/page.tsx`에서 `canAccessPlatform` 또는 `isSubscribed` 결과를 `isLocked`로 전달

**FAIL 기준:** 잠금 상태 처리 없이 모든 카드 접근 가능

---

### Step 6: SubscriptionBanner free 유저 전용 확인

**도구:** Grep  
**파일:** `src/components/dashboard/SubscriptionBanner.tsx`

**검사:** free 유저에게만 표시되는 구독 유도 배너가 존재하는지 확인

```bash
grep -n "upgrade\|구독\|플랜" src/components/dashboard/SubscriptionBanner.tsx
```

**PASS 기준:**
- 업그레이드 유도 메시지 존재
- `/dashboard/upgrade` 또는 `/pricing` 링크 존재
- 컴포넌트가 client component (`'use client'`)

**FAIL 기준:** 배너가 없거나 업그레이드 링크 누락

---

### Step 7: WalletLabel 구독 상태 반영 확인

**도구:** Grep  
**파일:** `src/components/layout/WalletLabel.tsx`

**검사:** free 유저에게 "구독 필요" 표시, 구독 유저에게 티켓 수 표시되는지 확인

```bash
grep -n "isSubscribed\|plan_id\|구독 필요\|Lock" src/components/layout/WalletLabel.tsx
```

**PASS 기준:**
- `plan_id` 조회 로직 존재
- `isSubscribed` 함수를 사용하여 구독 여부 판별
- 미구독 시 "구독 필요" 또는 잠금 아이콘 표시
- 구독 시 티켓 잔량 표시

**FAIL 기준:** 모든 유저에게 동일한 UI 표시

---

### Step 8: 설정 페이지 플랜 표시 확인

**도구:** Grep  
**파일:** `src/app/(dashboard)/settings/page.tsx`, `src/app/(dashboard)/settings/SettingsContent.tsx`

**검사:** 설정 페이지에서 free 플랜이 올바르게 표시되고, 플랜별 기능 게이팅이 작동하는지 확인

```bash
grep -n "free\|plan" "src/app/(dashboard)/settings/page.tsx"
grep -n "free\|subscribed\|canCompetitors\|canGoogle" "src/app/(dashboard)/settings/SettingsContent.tsx"
```

**PASS 기준:**
- `settings/page.tsx`에서 fallback planId가 `'free'`
- `SettingsContent.tsx`에서 `'free'` 플랜 스타일링 존재
- 플랜별 기능 게이팅 (경쟁사, 키워드 등) 조건 분기 존재
- 잠긴 기능 클릭 시 업그레이드 프롬프트 표시

**FAIL 기준:** free 플랜 처리 없음 또는 fallback이 'starter'

---

### Step 9: useSubscription 훅 일관성 확인

**도구:** Grep  
**파일:** `src/hooks/useSubscription.ts`

**검사:** 훅이 필수 기능을 모두 제공하는지 확인

```bash
grep -n "canAccessPlatform\|getAllowedGridSizes\|canManageCompetitors\|getMaxKeywords\|isSubscribed\|planId" src/hooks/useSubscription.ts
```

**PASS 기준:**
- `planId` 반환
- `canAccessPlatform` 메서드 제공
- `getAllowedGridSizes` 메서드 제공
- `canManageCompetitors` 메서드 제공
- `loading` 상태 제공
- default planId가 `'free'`

**FAIL 기준:** 필수 메서드 누락 또는 default가 'free'가 아님

---

### Step 10: KeywordManager 플랜 제한 확인

**도구:** Grep  
**파일:** `src/components/settings/KeywordManager.tsx`

**검사:** 키워드 관리 컴포넌트가 플랜별 한도를 존중하는지 확인

```bash
grep -n "limitNaver\|limitGoogle\|onUpgradeClick\|lock\|30" src/components/settings/KeywordManager.tsx
```

**PASS 기준:**
- Naver/Google 키워드 한도 prop 사용
- 한도 초과 시 추가 불가 처리
- 30일 잠금 타이머 로직 존재
- Google 키워드 Premium 전용 잠금 처리

**FAIL 기준:** 한도 체크 없이 무제한 키워드 추가 가능

---

### Step 11: subscription.ts ↔ useSubscription.ts 동기화 확인

**도구:** Grep  
**파일:** `src/lib/utils/subscription.ts`, `src/hooks/useSubscription.ts`

**검사:** 유틸리티 함수와 훅이 동기화되어 있는지 확인

```bash
grep -n "export function" src/lib/utils/subscription.ts
grep -n "from.*subscription" src/hooks/useSubscription.ts
```

**PASS 기준:**
- `subscription.ts`의 export 함수가 `useSubscription.ts`에서 import됨
- 훅이 유틸리티 함수를 래핑하여 사용 (직접 구현 아닌 위임)

**FAIL 기준:** 훅이 유틸리티를 import하지 않고 로직을 독자 구현

## Output Format

```markdown
## 구독 게이팅 검증 결과

| # | 검사 항목 | 대상 파일 | 결과 | 상세 |
|---|-----------|-----------|------|------|
| 1 | Naver 검색 구독 게이팅 | naver-search/new/page.tsx | PASS/FAIL | ... |
| 2 | Google 검색 구독 게이팅 | search/new/page.tsx | PASS/FAIL | ... |
| 3 | 키워드 체크박스 전환 | 검색 페이지 전체 | PASS/FAIL | ... |
| 4 | 그리드 크기 제한 | 검색 페이지 전체 | PASS/FAIL | ... |
| 5 | 대시보드 카드 잠금 | DashboardPlatformCard.tsx | PASS/FAIL | ... |
| 6 | SubscriptionBanner | SubscriptionBanner.tsx | PASS/FAIL | ... |
| 7 | WalletLabel 구독 상태 | WalletLabel.tsx | PASS/FAIL | ... |
| 8 | 설정 페이지 플랜 표시 | settings/ | PASS/FAIL | ... |
| 9 | useSubscription 훅 | useSubscription.ts | PASS/FAIL | ... |
| 10 | KeywordManager 제한 | KeywordManager.tsx | PASS/FAIL | ... |
| 11 | 유틸-훅 동기화 | subscription.ts ↔ useSubscription.ts | PASS/FAIL | ... |

**총 검사: 11개 | PASS: N개 | FAIL: M개**
```

## Exceptions

다음은 **위반이 아닙니다**:

1. **서버 컴포넌트에서의 직접 Supabase 조회** — `settings/page.tsx` 등 서버 컴포넌트에서는 `useSubscription` 훅 대신 직접 Supabase 클라이언트로 `plan_id`를 조회하는 것이 정상. 서버 컴포넌트에서는 React 훅 사용 불가
2. **KeywordInput 컴포넌트 파일 자체의 존재** — 다른 곳(예: 온보딩)에서 아직 사용될 수 있으므로 `KeywordInput.tsx` 파일이 존재하는 것 자체는 문제가 아님. 검색 페이지에서의 import만 확인
3. **UpgradePrompt의 하드코딩된 텍스트** — 업그레이드 프롬프트 내 플랜 이름이나 가격이 하드코딩된 경우, `PLAN_CONFIG`와 정확히 동기화되지 않아도 위반이 아님 (UI 텍스트는 마케팅 목적으로 다를 수 있음)
4. **Admin 유저의 게이팅 bypass** — 관리자 이메일로 로그인한 유저가 게이팅을 우회하는 로직은 위반이 아닌 의도된 기능
