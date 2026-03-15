# Maptamin Architecture & Data Flow Reference

> **Purpose**: AI가 코드 수정 시 각 기능의 전체 데이터 흐름을 정확히 파악할 수 있도록,  
> `User UI Action ↔ Client Component ↔ Server API Route ↔ Supabase DB Table` 매핑을 정리한 문서입니다.  
> **Last Updated**: 2026-03-15 (구글 웰컴 리포트 Oracle VM 경유 변경, report_type 'daily' 추가, 온보딩 스케줄 네이버/구글 분석 시간 분리, 구글 웰컴 status='pending' 수정)  
> **Auto-generated from codebase analysis**

---

## Table of Contents

1. [DB Tables Overview](#1-db-tables-overview)
2. [Feature: Authentication (Login / Logout)](#2-authentication)
3. [Feature: Subscription & Payment](#3-subscription--payment)
4. [Feature: Ticket Purchase (One-time)](#4-ticket-purchase-one-time)
4-1. [Feature: Dashboard Layout & Subscription Guard](#4-1-dashboard-layout--subscription-guard)
5. [Feature: Place Registration (Settings API)](#5-place-registration)
6. [Feature: Keyword Management](#6-keyword-management)
7. [Feature: Competitor Management](#7-competitor-management)
8. [Feature: Naver Rank Search](#8-naver-rank-search)
9. [Feature: Google Rank Search](#9-google-rank-search)
10. [Feature: Dashboard (Data Aggregation)](#10-dashboard)
11. [Feature: Scheduled Search CRON (네이버: 매일 / 구글: 주 1회)](#11-weekly-scheduled-search)
12. [Feature: KakaoTalk Notification (AlimTalk)](#12-kakaotalk-notification)
13. [Feature: Subscription Lifecycle (구독 라이프사이클)](#13-subscription-lifecycle)
14. [Feature: Settings (My Shop / Competitors)](#14-settings)
15. [Feature: Onboarding Flow (5-Step + Welcome Report)](#15-feature-onboarding-flow)
16. [Feature: History Page (진단 기록)](#16-feature-history-page)
16-1. [Feature: Report Settings (리포트 설정)](#16-1-feature-report-settings)
17. [RPC Functions Summary](#17-rpc-functions-summary)
18. [File Index](#18-file-index)

---

## 1. DB Tables Overview

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `auth.users` | Supabase Auth 관리 (카카오/구글 OAuth) | `id`, `email`, `raw_user_meta_data` |
| `plans` | 요금제 정의 (starter/pro/premium/free) | `id`, `price`, `gridSize`, `ticketsNaver`, `ticketsGoogle`, `keywordsNaver`, `keywordsGoogle`, `competitorsNaver`, `competitorsGoogle`, `channels('none'\|'naver'\|'naver+google')`, `placeLock(bool)` |
| `user_subscriptions` | 사용자 구독 상태 + 티켓 잔량 | `user_id(PK)`, `plan_id(FK→plans)`, `phone`, `remaining_tickets_naver/google`, `onboarding_completed`, `welcome_report_sent`, `current_period_start/end` |
| `subscription_billing` | 정기 결제 빌링키 + 구독 상태 | `user_id(UNIQUE)`, `billing_key`, `card_last4`, `plan_id`, `pending_plan_id`, `status(active/cancel_scheduled/cancelled/past_due/expired)`, `next_payment_id`, `next_billing_date` |
| `subscription_payment_history` | 구독 결제 이력 | `user_id`, `payment_id(UNIQUE)`, `plan_id`, `amount`, `status(paid/failed/refunded)`, `period_start/end`, `receipt_url` |
| `payment_history` | 일회성 티켓 결제 이력 | `user_id`, `payment_id`, `platform`, `quantity`, `amount`, `status` |
| `managed_places` | 등록된 내 매장 (30일 락) | `user_id`, `platform`, `place_id`, `place_name`, `address`, `lat`, `lng`, `locked_until` |
| `managed_keywords` | 관리 키워드 (30일 락) | `user_id`, `platform`, `keyword`, `locked_until` |
| `managed_competitors` | 등록된 경쟁사 | `user_id`, `platform`, `place_id`, `place_name`, `address`, `lat`, `lng`, `locked_until` |
| `searches` | 검색 요청 레코드 | `user_id`, `place_id`, `keywords[]`, `grid_points[]`, `grid_distance`, `status(pending/processing/completed/failed)`, `platform(naver/google)`, `report_type(realtime/weekly/daily/welcome)` |
| `search_results` | 검색 결과 (그리드 포인트별 순위) | `search_id(FK→searches)`, `keyword`, `grid_index`, `grid_lat`, `grid_lng`, `rank`, `competitors[]`, `competitor_ranks` |
| `search_schedules` | 자동 검색 스케줄 | `user_id`, `platform`, `place_id`, `keywords[]`, `grid_config[]`, `crawling_days(array, 네이버 복수요일)`, `crawling_day(단수, 구글 주1회)`, `crawling_time`, `is_active`, `last_run_at` |
| `notification_schedules` | 알림톡 수신 스케줄 | `user_id`, `search_schedule_id(FK)`, `is_immediate`, `notify_day`, `notify_time` |
| `notification_logs` | 알림 발송 이력 | `user_id`, `search_id(FK)`, `type(welcome/weekly/realtime)`, `status(pending/sent/failed)`, `sent_via`, `error_message`, `sent_at` |
| `ticket_ledger` | 티켓 사용/환불/충전 원장 | `user_id`, `platform`, `amount(±N)`, `type(usage/refund/monthly_reset/welcome_bonus)`, `search_id` |

---

## 2. Authentication

### 2-A. Login (Kakao / Google OAuth)

```
User Action: "로그인" 버튼 클릭
│
├─► Client Component
│   ├── src/app/(auth)/login/page.tsx          ← 로그인 페이지 (SSR)
│   ├── src/components/auth/KakaoLoginButton   ← 카카오 로그인 버튼 (Client)
│   └── src/components/auth/GoogleLoginButton  ← 구글 로그인 버튼 (Client)
│       └── supabase.auth.signInWithOAuth({ provider: 'kakao' | 'google' })
│
├─► Supabase Auth (External)
│   └── OAuth 완료 후 → /auth/callback?code=xxx 리다이렉트
│
├─► Server API Route
│   └── src/app/(auth)/auth/callback/route.ts  (GET)
│       └── supabase.auth.exchangeCodeForSession(code)
│       └── 성공 → /dashboard 리다이렉트
│
├─► DB Trigger (on auth.users INSERT)
│   └── handle_new_user() 트리거 (015_v2_schema_upgrade.sql)
│       ├── INSERT → user_subscriptions  (plan_id='starter', tickets=0)
│       └── RETURN NEW
│
└─► Middleware Guard
    └── src/middleware.ts
        ├── 보호 라우트 접근 시 user 없으면 → /login?redirectTo=원래경로 리다이렉트
        │   └── 보호 대상: /dashboard, /naver-search, /search, /settings, /history, /onboarding, /report-settings
        ├── /login 접근 시 user 있으면 → /dashboard 리다이렉트
        └── 로그인 완료 후 redirectTo 파라미터로 원래 페이지로 자동 이동
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| READ | `auth.users` | `supabase.auth.getUser()` (middleware, 모든 API) |
| INSERT | `user_subscriptions` | `handle_new_user()` 트리거 (최초 가입 시 자동) |

---

### 2-B. Logout

```
User Action: 로그아웃 버튼 클릭
│
├─► Client Component
│   └── src/components/layout/UserNav (or similar)
│       └── POST /auth/signout
│
└─► Server API Route
    └── src/app/(auth)/auth/signout/route.ts  (POST)
        └── supabase.auth.signOut()
        └── → / 리다이렉트
```

**DB Operations:** None (Supabase Auth session 정리만)

---

## 3. Subscription & Payment

### 정기 구독 시작 (빌링키)

```
User Action: 플랜 선택 → 카드 등록 → 구독 시작
│
├─► Client Component
│   ├── src/app/(dashboard)/dashboard/subscription/checkout/page.tsx
│   └── src/lib/portone/subscription-client.ts
│       └── PortOne.requestIssueBillingKey()  ← 빌링키 발급 (프론트)
│       └── POST /api/payment/subscribe       ← billingKey + planId 전송
│
├─► Server API Route
│   └── src/app/api/payment/subscribe/route.ts  (POST)
│       │
│       ├── 1. supabase.auth.getUser()                    ← 인증 확인
│       ├── 2. 입력값 검증 (billingKey, planId)
│       ├── 3. getBillingKeyInfo(billingKey)               ← PortOne API 빌링키 검증
│       │       └── src/lib/portone/billing.ts
│       ├── 4. payWithBillingKey(paymentId, billingKey, amount)  ← 첫 결제 실행
│       │       └── src/lib/portone/billing.ts
│       ├── 5. supabase.rpc('activate_subscription')      ← DB 구독 활성화 RPC
│       ├── 6. INSERT → subscription_payment_history       ← 결제 이력 저장
│       └── 7. schedulePayment(nextPaymentId, billingKey)  ← 다음 달 결제 예약
│               └── UPDATE → subscription_billing.next_payment_id
│
└─► Supabase RPC: activate_subscription (018_subscription_billing.sql)
    ├── SELECT → plans (플랜 정보 조회)
    ├── UPSERT → subscription_billing (빌링키 + 상태 저장)
    ├── UPDATE → user_subscriptions (plan_id, tickets 충전, period 갱신)
    └── INSERT → ticket_ledger (충전 이력: type='monthly_reset')
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `plans` | 플랜 가격/정보 조회 |
| UPSERT | `subscription_billing` | 빌링키, 플랜, 상태, 다음 결제일 저장 |
| UPDATE | `user_subscriptions` | `plan_id`, `remaining_tickets_*`, `current_period_*` 갱신 |
| INSERT | `subscription_payment_history` | 결제 이력 기록 (`payment_id`, `amount`, `period_start/end`) |
| INSERT | `ticket_ledger` | 티켓 충전 이력 (`type='monthly_reset'`) |
| UPDATE | `subscription_billing` | `next_payment_id`, `next_billing_date` 저장 |

---

## 4. Ticket Purchase (One-time)

### 추가 티켓 구매

```
User Action: 티켓 구매 버튼 → 결제창 → 결제 완료
│
├─► Client Component
│   ├── src/app/(dashboard)/dashboard/subscription/page.tsx (or related)
│   └── src/lib/portone/client.ts
│       └── requestTicketPayment({ platform, quantity, totalAmount })
│           └── PortOne.requestPayment()  ← 결제창 띄움
│       └── 결제 성공 시 → POST /api/payment/ticket
│
├─► Server API Route
│   └── src/app/api/payment/ticket/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()                    ← 인증
│       ├── 2. 입력값 검증 (paymentId, platform, quantity)
│       ├── 3. SELECT → payment_history (중복 결제 방지)
│       ├── 4. verifyPayment(paymentId)                   ← PortOne REST API 검증
│       │       └── src/lib/portone/server.ts
│       ├── 5. validatePaymentAmount(paymentData, expectedAmount)
│       ├── 6. supabase.rpc('add_tickets')                ← DB 티켓 증가
│       └── 7. INSERT → payment_history                    ← 결제 내역 저장
│
└─► External: PortOne API
    └── GET /payments/{paymentId}  ← 결제 상태/금액 검증
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `payment_history` | 중복 결제 방지 (`payment_id` 조회) |
| UPDATE | `user_subscriptions` | `remaining_tickets_*` 증가 (RPC `add_tickets`) |
| INSERT | `payment_history` | 결제 내역 저장 |
| INSERT | `ticket_ledger` | 충전 이력 (RPC 내부) |

---

## 4-1. Dashboard Layout & Subscription Guard

### 레이아웃 구독 상태 표시 + 온보딩 가드

```
User Action: /dashboard/* 하위 페이지 접근
│
└── Server Component (SSR, force-dynamic)
    └── src/app/(dashboard)/layout.tsx
        ├── export const dynamic = 'force-dynamic'  ← 매 요청마다 DB 조회
        │
        ├── 1. supabase.auth.getUser()
        ├── 2. SELECT → user_subscriptions (plan_id, onboarding_completed, tickets)
        │
        ├── 3. shouldRedirectToOnboarding 판단:
        │   └── plan_id !== 'free' && !onboarding_completed → true
        │
        ├── 4. <OnboardingGuard shouldRedirect={...}>
        │   └── src/components/layout/OnboardingGuard.tsx (Client)
        │       └── shouldRedirect && pathname !== '/onboarding'
        │           → router.replace('/onboarding')
        │
        └── 5. <DashboardShell user={userInfo} subscription={subscription}>
            └── src/components/layout/DashboardShell.tsx (Client)
                │
                ├── Desktop (lg 이상): <Sidebar> (고정 사이드바)
                │   └── src/components/layout/Sidebar.tsx
                │       ├── 3가지 모드: pinned | collapsed | hover (localStorage 저장)
                │       ├── Navigator 구성:
                │       │   ├── 대시보드 (Home, /dashboard)
                │       │   ├── 진단 기록 (History, /history)
                │       │   ├── 리포트 설정 (CalendarClock, /report-settings, 구독 잠금)
                │       │   ├── 실시간 순위 진단 (Search, 아코디언 그룹)
                │       │   │   ├── 네이버 (NaverPlatformIcon [N], /naver-search)
                │       │   │   └── 구글 (GooglePlatformIcon [G], /search, 플랜 잠금)
                │       │   ├── 설정 (Settings, /settings)
                │       │   └── 구독 관리 (CreditCard, /dashboard/subscription)
                │       ├── 티켓/CTA 섹션 (구독 시 WalletLabel, 미구독 시 구독하기 버튼)
                │       ├── 사용자 프로필 + 로그아웃
                │       └── 사이드바 접기/펼치기 토글
                │
                └── Mobile (lg 미만): <MobileNav> (햄버거 메뉴)
                    └── src/components/layout/MobileNav.tsx
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `user_subscriptions` | `plan_id`, `onboarding_completed`, `remaining_tickets_*` 조회 |

---

## 5. Place Registration

### 내 매장 등록 (Settings API)

```
User Action: 매장 검색 → 선택 → 등록
│
├─► Client Component
│   ├── src/app/(dashboard)/onboarding/page.tsx
│   ├── src/components/onboarding/StepStoreRegister.tsx ← 온보딩 매장 등록 스텝
│   │   └── isPremium → 30일 락 경고 숨김 + 확인 다이얼로그 건너뜀
│   ├── src/components/settings/MyShopManager.tsx ← 설정 매장 관리
│   │   └── isPlaceLockExempt(planId) → isLocked 오버라이드 + handleDelete 락 면제
│   ├── src/components/dashboard/PlaceSelectionModal.tsx ← 매장 검색/선택 모달
│   │   └── isPlaceLockExempt prop → 30일 경고 조건부 표시
│   ├── src/components/search/PlaceSearchInput.tsx ← 구글 지도 검색
│   ├── src/components/search/NaverPlaceSearchInput.tsx ← 네이버 지도 검색
│   └── POST /api/settings/my-shop
│
├─► Server API Route
│   └── src/app/api/settings/my-shop/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. 입력값 검증 (platform, placeId, placeName, address, lat, lng)
│       ├── 2.5. SELECT → user_subscriptions (plan_id 조회)
│       │   └── isPlaceLockExempt(planId) → lockExempt 판단
│       ├── 3. SELECT → managed_places (기존 등록 확인)
│       ├── 4a. 기존 있음
│       │   ├── lockExempt=false: locked_until 확인 (30일 락) → 락 기간 내 403 반환
│       │   ├── lockExempt=true: locked_until 체크 건너뜀 (프리미엄 면제)
│       │   └── UPDATE → managed_places (place 변경 + locked_until: lockExempt ? null : 30일 후)
│       └── 4b. 신규
│           └── INSERT → managed_places (locked_until: lockExempt ? null : 30일 후)
│
│   └── src/app/api/settings/my-shop/route.ts  (DELETE)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. SELECT → user_subscriptions (plan_id 조회) + isPlaceLockExempt
│       ├── 3. lockExempt=false: locked_until 체크 → 락 기간 내 403
│       │   lockExempt=true: 체크 건너뜀
│       └── 4. DELETE → managed_places
│
└─► Service Layer (대안 경로 — 현재 미사용 dead code)
    └── src/lib/services/place-manager.ts :: PlaceManager.registerPlace()
        ├── SELECT → user_subscriptions (plan_id 조회)
        ├── SELECT → plans (플랜 제한 조회)
        ├── SELECT → managed_places (등록 수 확인 — 플랜 제한)
        └── INSERT → managed_places (30일 locked_until)
```

**핵심 유틸리티:**
| Function | File | Purpose |
|----------|------|---------|
| `isPlaceLockExempt(planId)` | `src/lib/utils/subscription.ts` | `isSubscribed(planId) && !PLAN_CONFIG[planId].placeLock` → premium만 true |
| `PLAN_CONFIG[planId].placeLock` | `src/lib/pricing/config.ts` | starter/pro: `true` (30일 락), premium: `false` (면제), free: `false` (해당없음) |

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `user_subscriptions` | 현재 플랜 조회 (API route에서 직접) |
| SELECT | `managed_places` | 기존 등록 여부 + 락 상태 확인 |
| INSERT | `managed_places` | 신규 매장 등록 (Premium: `locked_until=null`, 그 외: 30일 후) |
| UPDATE | `managed_places` | 매장 변경 (Premium: `locked_until=null`, 그 외: 30일 후) |
| DELETE | `managed_places` | 매장 삭제 (Premium: 락 무시, 그 외: 락 기간 내 403) |

---

## 6. Keyword Management

### 키워드 등록/관리

```
User Action: 키워드 입력 → 등록
│
├─► Client Component
│   ├── src/components/dashboard/DashboardPlatformCard  ← 키워드 모달 포함
│   └── src/components/onboarding/StepKeywordRegister.tsx ← 온보딩 키워드 등록 스텝
│       └── (직접 Supabase client 호출 또는 API 경유)
│
└─► DB Direct (Client-side Supabase)
    ├── SELECT → managed_keywords (기존 키워드 조회)
    ├── INSERT → managed_keywords (신규 등록, 30일 locked_until 자동 설정)
    └── DELETE → managed_keywords (락 해제 후 삭제 가능)
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `managed_keywords` | 사용자의 등록 키워드 조회 (platform 필터) |
| SELECT | `user_subscriptions` → `plans` | 최대 키워드 수 제한 확인 |
| INSERT | `managed_keywords` | 키워드 등록 (UNIQUE: user_id + platform + keyword) |
| DELETE | `managed_keywords` | 키워드 삭제 (locked_until 확인 필요) |

---

## 7. Competitor Management

### 경쟁사 등록

```
User Action: 경쟁사 검색 → 선택 → 등록
│
├─► Client Component
│   ├── src/components/dashboard/DashboardPlatformCard  ← 경쟁사 모달
│   ├── src/components/dashboard/CompetitorManageModal.tsx ← 경쟁사 검색/관리 모달
│   ├── src/components/competitor/CompetitorManagementView.tsx ← 경쟁사 관리 뷰
│   ├── src/components/competitor/CompetitorSlotCard.tsx ← 경쟁사 슬롯 카드
│   └── POST /api/settings/competitors
│
├─► Server API Route
│   └── src/app/api/settings/competitors/route.ts
│       ├── GET  → SELECT managed_competitors (목록 조회)
│       ├── POST → 등록
│       │   ├── SELECT → user_subscriptions (plan_id)
│       │   ├── getPlanLimit(planId) → 경쟁사 최대 수 확인
│       │   ├── SELECT → managed_competitors (현재 등록 수 + 중복 체크)
│       │   └── INSERT → managed_competitors
│       └── DELETE → 삭제
│           ├── SELECT → managed_competitors (존재 + 소유자 확인)
│           └── DELETE → managed_competitors
│
└─► Service Layer (대안 경로)
    └── src/lib/services/place-manager.ts :: PlaceManager.registerCompetitor()
        ├── SELECT → user_subscriptions → plans (플랜 제한 조회)
        ├── SELECT → managed_competitors (등록 수 확인)
        └── INSERT → managed_competitors (30일 locked_until)
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `managed_competitors` | 목록 조회 / 등록 수 확인 / 중복 체크 |
| SELECT | `user_subscriptions` | 사용자 플랜 조회 |
| INSERT | `managed_competitors` | 경쟁사 등록 |
| DELETE | `managed_competitors` | 경쟁사 삭제 (락 없이 자유 삭제 — API 기준) |

---

## 8. Naver Rank Search

### 네이버 실시간 진단

```
User Action: 키워드/그리드 설정 → "실시간 진단 시작" 클릭
│
├─► Client Component
│   ├── src/app/(dashboard)/naver-search/new/page.tsx   ← 검색 설정 페이지
│   ├── src/components/search/*                         ← 검색 설정 컴포넌트
│   ├── src/components/naver/NaverMap.tsx                ← 네이버 지도 표시
│   ├── src/components/naver/NaverMapGridConfigurator.tsx ← 지도 + 그리드 시각화
│   └── POST /api/naver/search
│
├─► Server API Route
│   └── src/app/api/naver/search/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. SELECT → user_subscriptions (plan_id, remaining_tickets_naver)
│       ├── 3. PLAN_CONFIG[planId]로 그리드 크기 검증
│       ├── 4. 티켓 잔량 확인 (remaining_tickets_naver > 0)
│       ├── 5. supabase.rpc('deduct_ticket', { p_platform: 'naver' })
│       │       ├── UPDATE → user_subscriptions (tickets -1)
│       │       └── INSERT → ticket_ledger (type='usage', amount=-1)
│       ├── 6. INSERT → searches (status='pending', platform='naver')
│       ├── 7. 실패 시: supabase.rpc('refund_ticket')
│       │       ├── UPDATE → user_subscriptions (tickets +1)
│       │       └── INSERT → ticket_ledger (type='refund', amount=+1)
│       └── 8. fetch('/api/queue/dispatch')  ← 큐 디스패처 트리거 (비동기)
│
├─► Queue Dispatcher
│   └── src/app/api/queue/dispatch/route.ts  (POST)
│       └── (크롤러 워커 실행 트리거)
│
├─► Process Route (워커가 완료 후 호출)
│   └── src/app/api/naver/search/[id]/process/route.ts  (POST)
│       ├── UPDATE → searches (status='completed')
│       └── INSERT → search_results (각 grid_point별 순위 데이터, bulk)
│
└─► Results Display
    └── src/app/(dashboard)/naver-search/[id]/page.tsx   ← 결과 페이지
        ├── SELECT → searches (해당 검색 정보)
        └── SELECT → search_results (그리드 포인트별 순위)
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `user_subscriptions` | 플랜 ID + 잔여 티켓 조회 |
| UPDATE | `user_subscriptions` | `remaining_tickets_naver` -1 (RPC `deduct_ticket`) |
| INSERT | `ticket_ledger` | 티켓 사용 이력 (`type='usage'`, `amount=-1`) |
| INSERT | `searches` | 검색 레코드 생성 (`status='pending'`) |
| UPDATE | `searches` | 상태 변경 (`processing` → `completed` / `failed`) |
| INSERT | `search_results` | 크롤링 결과 벌크 삽입 (keyword × grid_point) |
| UPDATE | `user_subscriptions` | 실패 시 티켓 환불 (`remaining_tickets_naver` +1) |
| INSERT | `ticket_ledger` | 환불 이력 (`type='refund'`, `amount=+1`) |

---

## 9. Google Rank Search

### 구글 실시간 진단

```
User Action: 키워드/그리드 설정 → "실시간 진단 시작" 클릭
│
├─► Client Component
│   ├── src/app/(dashboard)/search/new/page.tsx          ← 구글 검색 설정
│   ├── src/components/search/*
│   ├── src/components/search/MapGridConfigurator.tsx     ← Google Maps 그리드 설정
│   └── POST /api/search
│
├─► Server API Route
│   └── src/app/api/search/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. SELECT → user_subscriptions (remaining_tickets_google)
│       ├── 3. supabase.rpc('deduct_ticket', { p_platform: 'google' })
│       ├── 4. INSERT → searches (status='processing', platform='google')
│       ├── 5. 실패 시: supabase.rpc('refund_ticket', { p_platform: 'google' })
│       └── 6. searchId 반환 (클라이언트가 /process 호출 책임)
│           └── ⚠️ 네이버와 달리 Oracle VM dispatch 사용 안 함
│
├─► Process Route (클라이언트가 직접 호출)
│   └── src/app/api/search/[id]/process/route.ts  (POST)
│       ├── DataForSEO API 호출 (src/lib/dataforseo/client.ts)
│       ├── UPDATE → searches (status='completed')
│       └── INSERT → search_results
│
└─► Results Display
    └── src/app/(dashboard)/search/[id]/page.tsx
        ├── src/app/(dashboard)/search/[id]/ResultsContent.tsx ← 결과 표시 UI
        ├── SELECT → searches
        └── SELECT → search_results
```

**실행 방식 (네이버 vs 구글 차이점):**
| | 네이버 (§8) | 구글 (§9) |
|---|---|---|
| 크롤링 | Oracle VM Worker + Playwright | DataForSEO API |
| 트리거 | `/api/queue/dispatch` → Oracle VM Worker | 클라이언트가 `/api/search/[id]/process` 직접 호출 |
| 초기 상태 | `status='pending'` | 실시간: `status='processing'`, 웰컴: `status='pending'` |
| 웰컴 리포트 | `/api/naver/search` → dispatch → Oracle VM → alimtalk | `/api/search`(status='pending') → 내부 dispatch → Oracle VM → alimtalk |
| 알림톡 | Oracle VM `run-search.ts` `sendKakaoAlimtalk()` | Oracle VM `run-search.ts` `sendKakaoAlimtalk()` ← 웰컴만 |

**DB Operations:** (네이버와 동일 구조, platform='google')
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `user_subscriptions` | `remaining_tickets_google` 조회 |
| UPDATE | `user_subscriptions` | 티켓 차감/환불 (RPC) |
| INSERT | `ticket_ledger` | 사용/환불 이력 |
| INSERT | `searches` | 검색 레코드 |
| INSERT | `search_results` | 결과 데이터 (DataForSEO API 결과) |
| UPDATE | `searches` | 상태 변경 |

---

## 10. Dashboard

### 대시보드 데이터 집계 (SSR)

```
User Action: /dashboard 페이지 접속
│
└─► Server Component (SSR)
    └── src/app/(dashboard)/dashboard/page.tsx
        │
        ├── SELECT → user_subscriptions
        │   └── plan_id, remaining_tickets_naver/google
        │
        ├── SELECT → searches (전체, deleted_at IS NULL)
        │   └── 히스토리 + 인사이트 계산용
        │
        ├── SELECT → search_results
        │   └── weekly 리포트의 결과만 (인사이트 계산)
        │
        ├── SELECT → managed_places
        │   └── 네이버/구글 매장 카드 표시
        │
        ├── SELECT → managed_competitors
        │   └── 경쟁사 수 + 첫 경쟁사 이름 표시
        │
        ├── SELECT → managed_keywords
        │   └── 등록 키워드 목록 표시
        │
        └── SELECT → search_schedules
            └── 자동 리포트 활성 여부 표시

Components Used:
├── src/components/dashboard/SubscriptionBanner    ← 구독 유도 배너(free)
├── src/components/dashboard/DashboardHeader       ← 헤더 (자동리포트 상태)
├── src/components/dashboard/DashboardPlatformCard ← 매장 카드 (네이버/구글)
├── src/components/dashboard/DashboardMetricsToggle← 주간 인사이트 토글
└── src/components/dashboard/SearchHistorySection  ← 검색 히스토리 테이블
```

**DB Operations (모두 SELECT):**
| Table | Purpose |
|-------|---------|
| `user_subscriptions` | 플랜 + 잔여 티켓 |
| `searches` | 검색 기록 전체 |
| `search_results` | weekly 검색 결과 (인사이트 계산) |
| `managed_places` | 등록 매장 |
| `managed_competitors` | 등록 경쟁사 |
| `managed_keywords` | 등록 키워드 |
| `search_schedules` | 자동 리포트 상태 |

---

## 11. Scheduled Search CRON

### 자동 검색 (pg_cron → Vercel API → Oracle VM Worker)

- **네이버**: `crawling_days`(열) 기반 — 선택한 **요일마다** 실행 / `report_type = 'daily'`
- **구글**: `crawling_day`(단수) 기반 — 주 **1회** 실행 / `report_type = 'weekly'`

```
Trigger: Supabase pg_cron (매시 정각, 정확한 타이밍)
│
├─► pg_cron + pg_net (Supabase DB 내부)
│   └── net.http_post → POST /api/cron/scheduled-search
│       └── Authorization: Bearer CRON_SECRET
│
├─► Server API Route
│   └── src/app/api/cron/scheduled-search/route.ts (POST)
│       │
│       ├── 1. CRON_SECRET 인증
│       ├── 2. KST 기준 현재 요일/시간 계산
│       ├── 3. SELECT → search_schedules
│       │       WHERE is_active=true, crawling_time=현재KST시간
│       │
│       ├── 4. 구독 체크 — free 플랜 유저 스케줄 제외
│       │   └── SELECT → user_subscriptions (plan_id 확인)
│       │
│       ├── 5. 필터링:
│       │   ├── 네이버: crawling_days 열에 오늘 요일 포함 + 날짜 중복 체크
│       │   │   └── getKstDateString(last_run_at) === 오늘 → SKIP (하루 1회)
│       │   ├── 구글: crawling_day 단수와 오늘 요일 일치 + 주차 중복 체크
│       │   │   └── getISOWeekKST(last_run_at) === 현재 주차 → SKIP (주 1회)
│       │   └── free 플랜 유저 → SKIP
│       │
│       ├── 6. 스케줄별 처리:
│       │   ├── UPDATE → search_schedules.last_run_at (선행 업데이트, 중복 방지)
│       │   ├── SELECT → managed_places (좌표/주소 조회)
│       │   └── INSERT → searches
│       │       ├── 네이버: status='pending', report_type='daily'
│       │       └── 구글: status='pending', report_type='weekly'
│       │
│       └── 7. POST /api/queue/dispatch
│           └── Oracle VM Worker dispatch → 크롤링 실행
│
├─► Oracle VM Worker (크롤링 워커)
│   └── scripts/run-search.ts MANUAL <search_id>
│       ├── 크롤링 실행 (Bright Data proxy)
│       ├── INSERT → search_results
│       └── 알림톡 발송 (Solapi API)
│
└─► 이전 방식 (제거됨):
    └── .github/workflows/cron.yml의 schedule 트리거 → 주석 처리 (20~50분 지연 문제)
    └── workflow_dispatch만 유지 (수동 테스트용)
```

**엣지 케이스 방어:**
| 시나리오 | 방어 로직 |
|---------|----------|
| 상일 중복 네이버 (요일 변경 14시→15시) | 날짜 비교 (getKstDateString) — 하루 1회 |
| 같은 주 요일 변경 (구글 화→수) | ISO 주차 비교 (KST 기준) |
| free 플랜 유저 스케줄 | user_subscriptions.plan_id 체크 |
| pg_cron 동시 실행 | last_run_at 선행 업데이트 |

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `search_schedules` | 실행 대상 스케줄 조회 |
| SELECT | `user_subscriptions` | 구독 상태 확인 (free 플랜 필터) |
| SELECT | `managed_places` | 좌표/주소 조회 |
| UPDATE | `search_schedules` | `last_run_at` 선행 갱신 |
| INSERT | `searches` | 네이버: report_type='**daily**' / 구글: report_type='**weekly**' (status='pending') |
| INSERT | `search_results` | 크롤링 결과 (Oracle VM Worker에서) |

---

## 12. KakaoTalk Notification

### 알림톡 발송 (Solapi)

```
Trigger: ScheduleManager 즉시 발송 or NotificationService 예약 발송
│
├─► Service Layer
│   ├── src/lib/services/notification-service.ts :: NotificationService.dispatchPendingNotifications()
│   │   ├── SELECT → notification_schedules (is_immediate=false, 현재 요일/시간)
│   │   ├── SELECT → notification_logs (status='pending', type='weekly')
│   │   ├── SELECT → searches (place_name 조회)
│   │   ├── sendWeeklyReport() → Solapi API
│   │   ├── UPDATE → notification_logs (status='sent', sent_at)
│   │   └── 실패 시: UPDATE → notification_logs (status='failed', error_message)
│   │
│   └── src/lib/kakao/messaging.ts :: sendWeeklyReport()
│       ├── SELECT → user_subscriptions (phone 조회)
│       └── Solapi REST API → 카카오 알림톡 발송
│
└─► API Route
    └── src/app/api/kakao/send-report/route.ts  (POST)
        └── (수동 발송 테스트용 — 위와 동일)
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `notification_schedules` | 발송 대상 조회 |
| SELECT | `notification_logs` | pending 알림 조회 |
| SELECT | `searches` | place_name 조회 |
| SELECT | `user_subscriptions` | phone 번호 조회 (Solapi 발송용) |
| UPDATE | `notification_logs` | 발송 상태 변경 (`sent` / `failed`) |

---

## 13. Subscription Lifecycle (구독 라이프사이클)

### 13-A. 구독 해지 (Cancel → cancel_scheduled)

```
User Action: "구독 해지" 버튼 클릭
│
├─► Client Component
│   └── src/components/dashboard/SubscriptionContent.tsx
│       └── POST /api/payment/subscribe/cancel
│
├─► Server API Route
│   └── src/app/api/payment/subscribe/cancel/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. SELECT → subscription_billing (status='active' 확인)
│       ├── 3. cancelSchedule([next_payment_id])  ← PortOne 예약 결제 취소
│       └── 4. UPDATE → subscription_billing (status='cancel_scheduled', cancelled_at=now)
│           ※ 빌링키는 삭제하지 않음 (해지 철회 시 재사용)
│
└─► 정책: "즉시 만료" 아님
    └── 현재 구독 기간(~next_billing_date) 만료 전까지 혜택 유지
    └── 만료 시점에 CRON이 cancelled로 전환
```

### 13-B. 해지 철회 (Reactivate → active)

```
User Action: "해지 철회" 버튼 클릭
│
├─► Client Component
│   └── src/components/dashboard/SubscriptionContent.tsx
│       └── POST /api/payment/subscribe/reactivate
│
├─► Server API Route
│   └── src/app/api/payment/subscribe/reactivate/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. SELECT → subscription_billing (status='cancel_scheduled' 확인)
│       ├── 3. schedulePayment() → 다음 결제 재예약 (PortOne)
│       └── 4. UPDATE → subscription_billing (status='active', cancelled_at=null, next_payment_id 갱신)
```

### 13-C. 플랜 변경 (Change Plan → pending_plan_id)

```
User Action: 다른 플랜 선택 → 변경 요청
│
├─► Client Component
│   └── src/components/dashboard/SubscriptionContent.tsx
│       └── POST /api/payment/subscribe/change-plan
│
├─► Server API Route
│   └── src/app/api/payment/subscribe/change-plan/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. 현재 플랜과 동일 여부 확인
│       └── 3. UPDATE → subscription_billing (pending_plan_id = 새 플랜)
│           ※ 다음 결제 시 Webhook에서 pending_plan_id 적용
```

### 13-D. 환불 (Refund)

```
User Action: "환불 요청" 버튼 클릭
│
├─► Client Component
│   └── src/components/dashboard/SubscriptionContent.tsx
│       └── POST /api/payment/subscribe/refund
│
├─► Server API Route
│   └── src/app/api/payment/subscribe/refund/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. SELECT → subscription_payment_history (첫 구독 1건만 확인)
│       ├── 3. 환불 조건 검증:
│       │   ├── 첫 구독인지 (결제 이력 1건)
│       │   ├── 7일 이내인지
│       │   └── 서비스 미이용인지 (search_results 0건)
│       ├── 4. cancelPayment(paymentId) ← PortOne 결제 취소
│       ├── 5. cancelSchedule() + deleteBillingKey() ← 예약 결제/빌링키 삭제
│       └── 6. UPDATE → subscription_billing (status='expired')
│       └── 7. UPDATE → subscription_payment_history (status='refunded')
│       └── 8. UPDATE → user_subscriptions (plan_id='free', tickets=0)
```

### 13-E. CRON 만료 감지 (Expire Subscriptions)

```
Trigger: pg_cron 또는 외부 호출 (매일 실행)
│   └── ⚠️ vercel.json에는 /api/cron/cleanup만 등록됨
│   └── pg_cron 또는 수동 호출로 실행 필요
│
├─► Server API Route
│   └── src/app/api/cron/expire-subscriptions/route.ts  (GET)
│       ├── 1. CRON_SECRET 인증
│       ├── 2. supabase.rpc('expire_cancelled_subscriptions')
│       │   └── cancel_scheduled 상태 + next_billing_date 지난 구독 감지
│       │   └── subscription_billing.status → 'expired'
│       │   └── user_subscriptions.plan_id → 'free', tickets → 0
│       └── 3. 만료된 각 사용자의 빌링키 삭제 (PortOne API)
```

### 13-F. Webhook 자동 갱신 (PortOne → Transaction.Paid / Transaction.Failed)

```
Trigger: PortOne Webhook (서버-서버 호출)
│
├─► Server API Route
│   └── src/app/api/payment/webhook/route.ts  (POST)
│       ├── 1. Raw body → Webhook.verify(시그니처 검증, @portone/server-sdk)
│       ├── 2. JSON 파싱 → type, data.paymentId 추출
│       ├── 3. 구독 결제만 처리 (paymentId가 'sub_' 접두사인 경우만)
│       │
│       ├── [Transaction.Paid] → handlePaymentPaid()
│       │   ├── verifyPayment(paymentId) → PortOne API 결제 상태 재검증
│       │   ├── 멱등성: subscription_payment_history에 중복 확인
│       │   ├── SELECT → subscription_billing (next_payment_id 매칭)
│       │   ├── pending_plan_id 있으면 새 플랜 적용 (플랜 변경 반영)
│       │   ├── supabase.rpc('activate_subscription') → 티켓 충전 + 구독 갱신
│       │   ├── INSERT → subscription_payment_history (결제 이력)
│       │   ├── schedulePayment() → 다음 달 자동 결제 예약 (PortOne)
│       │   └── UPDATE → subscription_billing (plan_id, next_payment_id, status='active', pending_plan_id=null)
│       │
│       └── [Transaction.Failed] → handlePaymentFailed()
│           ├── verifyPayment(paymentId) → 결제 상태 확인
│           ├── 멱등성: 중복 확인
│           ├── SELECT → subscription_billing (retry_count 조회)
│           ├── retry_count < 3 → 3일 후 재시도 예약
│           │   ├── schedulePayment() → 재시도 결제 예약
│           │   └── UPDATE → subscription_billing (status='past_due', retry_count+1)
│           ├── retry_count >= 3 → 구독 만료
│           │   └── supabase.rpc('expire_failed_subscription')
│           └── INSERT → subscription_payment_history (status='failed')
│
└─► 보안 정책
    ├── PORTONE_WEBHOOK_SECRET 누락 시 경고 로그 (개발 환경 허용)
    ├── Webhook은 항상 200 반환 (5xx면 PortOne이 재전송)
    └── 시그니처 실패만 400 반환 (PortOne 재전송 중단)
```

**재시도 정책:**
| 항목 | 값 |
|------|-----|
| 최대 재시도 횟수 | 3회 (`MAX_RETRY_COUNT`) |
| 재시도 간격 | 3일 (`RETRY_INTERVAL_DAYS`) |
| 재시도 중 상태 | `past_due` |
| 최대 재시도 초과 시 | `expire_failed_subscription` RPC → `expired` + `free` 전환 |

**DB Operations (전체 §13):**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `subscription_billing` | 구독 상태 조회 |
| UPDATE | `subscription_billing` | `status`, `cancelled_at`, `pending_plan_id`, `next_payment_id`, `retry_count` 갱신 |
| UPDATE | `user_subscriptions` | 환불/만료 시 `plan_id='free'`, `tickets=0` / 갱신 시 티켓 충전 |
| INSERT | `subscription_payment_history` | 결제 성공/실패 이력 |
| UPDATE | `subscription_payment_history` | 환불 시 `status='refunded'` |
| SELECT | `search_results` | 환불 조건: 서비스 이용 여부 확인 |
| INSERT | `ticket_ledger` | 갱신 시 티켓 충전 이력 (`type='monthly_reset'`) |

---

## 14. Settings

### 14-A. 내 매장 관리

```
Route: /settings
│
├─► API Routes
│   └── src/app/api/settings/my-shop/route.ts
│       ├── GET → SELECT managed_places (목록 조회, platform 필터)
│       ├── POST → INSERT/UPDATE managed_places (등록/변경, 30일 락)
│       └── DELETE → DELETE managed_places (삭제, 30일 락 확인)
│
└─► Page & Components
    ├── src/app/(dashboard)/settings/page.tsx
    └── src/components/settings/*
```

### 14-B. 경쟁사 관리

```
Route: /settings
│
├─► API Routes
│   └── src/app/api/settings/competitors/route.ts
│       ├── GET → SELECT managed_competitors (목록)
│       ├── POST → 등록 (플랜 제한 확인 → INSERT)
│       └── DELETE → 삭제 (소유자 확인 → DELETE)
```

---

## 15. Feature: Onboarding Flow (5-Step + Welcome Report)

### 15-A. 온보딩 플로우 (5 Step)

```
User Action: 유료 구독 후 /onboarding 진입
│
├─► 접근 제어 가드
│   ├── Server: layout.tsx → OnboardingGuard (plan_id!='free' && !onboarding_completed → /onboarding)
│   ├── Client: page.tsx → plan_id='free' → /dashboard 리다이렉트
│   └── Client: page.tsx → onboarding_completed=true → /dashboard 리다이렉트
│
├─► 이탈 복구: computeStartStep()  (onboarding-utils.ts)
│   ├── SELECT → managed_places (매장 등록 여부)
│   ├── SELECT → managed_keywords (키워드 등록 여부)
│   ├── SELECT → managed_competitors (경쟁사 등록 여부)
│   └── SELECT → search_schedules (스케줄 설정 여부)
│   → 마지막 미완료 Step 인덱스 반환
│
├─► getOnboardingSteps(planId)  (onboarding-utils.ts)
│   ├── 공통: store → keyword → grid → schedule
│   └── Pro/Premium: store → keyword → competitor → grid → schedule
│
├─► Step 1: 매장 등록 (StepStoreRegister.tsx)
│   ├── PlaceSearchInput / NaverPlaceSearchInput → 네이버/구글 장소 검색
│   └── POST /api/settings/my-shop → INSERT managed_places
│
├─► Step 2: 키워드 등록 (StepKeywordRegister.tsx)
│   ├── KeywordInput 컴포넌트 (platform별 안내 문구 분기)
│   └── Supabase Client → INSERT managed_keywords
│
├─► Step 3: 경쟁사 등록 (StepCompetitorRegister.tsx, Pro/Premium만)
│   ├── CompetitorManageModal / CompetitorManagementView → 경쟁사 검색/선택
│   └── POST /api/settings/competitors → INSERT managed_competitors
│
├─► Step 4: 좌표 설정 (StepGridSetting.tsx)
│   ├── NaverMapGridConfigurator (네이버 탭 — 지도 기반)
│   ├── MapGridConfigurator (구글 탭 — Google Maps API, Premium만)
│   ├── DistanceSettings (분석 좌표 간격 슬라이더)
│   └── 로컬 state만, DB 저장 안함 (다음 단계에서 search_schedules에 포함)
│
├─► Step 5: 스케줄 + 전화번호 (StepScheduleSetting.tsx)
│   ├── Supabase Client → INSERT search_schedules (플랫폼별)
│   ├── Supabase Client → INSERT notification_schedules (플랫폼별)
│   └── Supabase Client → UPDATE user_subscriptions.phone
│
└─► 완료: 요약 확인 → "완료" 클릭 (OnboardingComplete.tsx)
```

### 15-B. 웰컴 리포트 실행

```
User Action: 요약 화면에서 "완료하고 첫 리포트 받기" 클릭
│
├─► handleConfirm()
│   ├── 1. UPDATE user_subscriptions SET onboarding_completed = true
│   ├── 2. POST /api/naver/search (reportType='welcome')
│   │       └── 보안 검증: welcome_report_sent=true → 403
│   │       └── 티켓 차감 Skip
│   │       └── INSERT searches (report_type='welcome')
│   ├── 3. (Premium) POST /api/search (reportType='welcome')
│   │       └── 보안 검증: welcome_report_sent=true → 403
│   │       └── 티켓 차감 Skip
│   │       └── INSERT searches (status='pending', report_type='welcome')
│   │       └── 내부에서 POST /api/queue/dispatch 호출 → Oracle VM 처리 + 알림톡 발송
│   └── 4. UPDATE user_subscriptions SET welcome_report_sent = true
│
└─► OnboardingComplete 화면
    ├── 폴링: SELECT searches.status (3초 간격 × 최대 3분)
    ├── 완료 → "결과 보러가기" → /naver-search/[id]
    └── 실패 → "대시보드로 이동"
```

### 15-C. 온보딩 컴포넌트 파일 구조

| File | Description |
|------|-------------|
| `src/app/(dashboard)/onboarding/page.tsx` | 온보딩 메인 페이지 (접근 제어, 단계 관리, 진행률 바) |
| `src/app/(dashboard)/onboarding/onboarding-utils.ts` | `getOnboardingSteps()`, `computeStartStep()` 유틸 |
| `src/app/(dashboard)/onboarding/onboarding-utils.test.ts` | 유틸 단위 테스트 |
| `src/components/onboarding/StepStoreRegister.tsx` | Step 1: 매장 등록 |
| `src/components/onboarding/StepKeywordRegister.tsx` | Step 2: 키워드 등록 (플랫폼별 안내) |
| `src/components/onboarding/StepCompetitorRegister.tsx` | Step 3: 경쟁사 등록 (Pro/Premium) |
| `src/components/onboarding/StepGridSetting.tsx` | Step 4: 좌표 설정 (네이버/구글 탭) |
| `src/components/onboarding/StepScheduleSetting.tsx` | Step 5: 스케줄 + 전화번호 |
| `src/components/onboarding/OnboardingComplete.tsx` | 완료 화면 + 웰컴 리포트 실행 |
| `src/components/layout/OnboardingGuard.tsx` | 온보딩 미완료 시 `/onboarding` 리다이렉트 가드 |

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `user_subscriptions` | 플랜 확인, 접근 제어, welcome_report_sent 보안 검증 |
| UPDATE | `user_subscriptions` | `onboarding_completed=true`, `welcome_report_sent=true`, `phone` |
| INSERT | `managed_places` | 매장 등록 (via API) |
| INSERT | `managed_keywords` | 키워드 등록 (Supabase Client 직접) |
| INSERT | `managed_competitors` | 경쟁사 등록 (via API) |
| INSERT | `search_schedules` | 검색 스케줄 (플랫폼별 1~2건) |
| INSERT | `notification_schedules` | 알림 스케줄 (플랫폼별 1~2건) |
| INSERT | `searches` | 웰컴 리포트 (report_type='welcome', 티켓 미차감) |

---

## 16. Feature: History Page (진단 기록)

### 진단 기록 페이지 (순위 변화 그래프 + 전체 기록)

```
User Action: /history 페이지 접속
│
└── Server Component (SSR, force-dynamic)
    └── src/app/(dashboard)/history/page.tsx
        │
        ├── Promise.all (병렬 조회)
        │   ├── SELECT → user_subscriptions (plan_id)
        │   ├── SELECT → searches (deleted_at IS NULL, 전체)
        │   └── SELECT → managed_places (place_id, platform — 현재 매장 필터링용)
        │
        ├── 플랫폼별 현재 매장 place_id로 검색 필터링
        │
        ├── SELECT → search_results (weekly search IDs만)
        │
        ├── calculateRankTrend(searches, searchResults)
        │   └── src/lib/utils/rank-trend.ts
        │       ├── filter: report_type='weekly' && status='completed'
        │       ├── 날짜순 정렬 (ascending)
        │       └── 키워드별 전체 grid_point 평균 순위 계산
        │       └── output: { date, fullDate, [keyword]: avg_rank }[]
        │
        ├── extractKeywordsFromTrend(trendData)
        │   └── src/lib/utils/rank-trend.ts
        │       └── trendData에서 키워드 목록 추출 (과거 키워드도 포함)
        │
        └── Render (Client Components)
            ├── HistoryPageContent [Client] — 플랫폼 토글, 필터 관리
            ├── RankTrendChart [Client] — recharts LineChart (dynamic import)
            │   ├── 키워드 토글 버튼 (활성/비활성)
            │   ├── Y축 역방향 (1위=위)
            │   └── Custom Tooltip (날짜, 키워드, 순위)
            └── HistoryTable [Client] — 전체 기록 테이블 (필터 + 페이지네이션)
```

**DB Operations (모두 SELECT):**
| Table | Purpose |
|-------|---------|
| `user_subscriptions` | 플랜 확인 (구글 접근 가능 여부) |
| `searches` | 전체 검색 기록 (테이블용) + 주간 리포트 필터 (그래프용) |
| `managed_places` | 현재 매장 place_id로 검색 필터링 |
| `search_results` | 주간 리포트의 grid_point별 순위 (평균 계산) |

---

## 16-1. Feature: Report Settings (리포트 설정)

### 리포트 설정 페이지 (스케줄/키워드/그리드/알림 관리)

```
User Action: /report-settings 페이지 접속
│
└── Server Component (SSR, force-dynamic)
    └── src/app/(dashboard)/report-settings/page.tsx
        │
        ├── 1. supabase.auth.getUser()
        ├── 2. SELECT → user_subscriptions (plan_id, phone)
        ├── 3. 구독 상태 판단 (isSubscribed, canAccessPlatform, getAllowedGridSizes)
        │
        ├── 4. 유료 사용자 → Promise.all 병렬 조회:
        │   ├── SELECT → search_schedules (네이버/구글 스케줄)
        │   ├── SELECT → managed_places (네이버/구글 매장)
        │   └── SELECT → managed_keywords (네이버/구글 키워드)
        │
        └── Render:
            └── <ReportSettingsContent> (Client)
                └── src/app/(dashboard)/report-settings/ReportSettingsContent.tsx
                    ├── 스케줄 요일/시간 설정
                    ├── 키워드 선택
                    ├── 그리드 설정 (플랜별 크기 제한)
                    ├── 알림 설정 (전화번호)
                    └── POST /api/settings/schedule (스케줄 저장/업데이트)

Components Used:
├── src/components/schedule/DaySelector.tsx    ← 요일 선택
├── src/components/schedule/TimeSelector.tsx   ← 시간 선택
└── src/components/schedule/MyShopSelector.tsx  ← 매장 선택
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `user_subscriptions` | 플랜 + 전화번호 조회 |
| SELECT | `search_schedules` | 기존 스케줄 조회 (플랫폼별) |
| SELECT | `managed_places` | 등록 매장 조회 (플랫폼별) |
| SELECT | `managed_keywords` | 등록 키워드 조회 (플랫폼별) |
| UPSERT | `search_schedules` | 스케줄 저장/업데이트 (via API) |
| UPSERT | `notification_schedules` | 알림 스케줄 저장 (via API) |
| UPDATE | `user_subscriptions` | 전화번호 업데이트 |

---

## 17. RPC Functions Summary

| RPC Function | Migration File | Description | Tables Affected |
|-------------|---------------|-------------|-----------------|
| `deduct_ticket(p_platform)` | 015 | 티켓 1장 차감 + 이력 기록 | UPDATE `user_subscriptions`, INSERT `ticket_ledger` |
| `refund_ticket(p_platform, p_search_id)` | 015 | 티켓 1장 환불 + 이력 기록 | UPDATE `user_subscriptions`, INSERT `ticket_ledger` |
| `reset_monthly_tickets()` | 015 | 월초 전체 사용자 티켓 리셋 | UPDATE `user_subscriptions` (FROM `plans` JOIN) |
| `activate_subscription(p_user_id, p_plan_id, p_billing_key, ...)` | 018 | 구독 활성화 + 티켓 충전 | UPSERT `subscription_billing`, UPDATE `user_subscriptions`, INSERT `ticket_ledger` |
| `handle_new_user()` (Trigger) | 015 | 신규 가입 시 구독 레코드 생성 | INSERT `user_subscriptions` |
| `add_tickets(p_user_id, p_platform, p_quantity)` | — | 티켓 추가 충전 | UPDATE `user_subscriptions`, INSERT `ticket_ledger` |
| `expire_cancelled_subscriptions()` | 023 | cancel_scheduled 만료 감지 → expired 전환 + free 플랜 전환 | UPDATE `subscription_billing`, UPDATE `user_subscriptions` |
| `expire_failed_subscription(p_user_id)` | 023 | past_due 결제 실패 만료 → expired 전환 + free 플랜 전환 | UPDATE `subscription_billing`, UPDATE `user_subscriptions` |

---

## 18. File Index

### Pages (src/app)

| File | Route | Type | Description |
|------|-------|------|-------------|
| `(auth)/login/page.tsx` | `/login` | SSR | 로그인 (카카오/구글) |
| `(auth)/auth/callback/route.ts` | `/auth/callback` | API | OAuth 콜백 |
| `(auth)/auth/signout/route.ts` | `/auth/signout` | API | 로그아웃 |
| `(dashboard)/layout.tsx` | — | SSR | 대시보드 레이아웃 (DashboardShell + OnboardingGuard) |
| `(dashboard)/dashboard/page.tsx` | `/dashboard` | SSR | 대시보드 메인 |
| `(dashboard)/dashboard/subscription/page.tsx` | `/dashboard/subscription` | Page | 구독 관리 |
| `(dashboard)/dashboard/subscription/checkout/page.tsx` | `/dashboard/subscription/checkout` | Page | 구독 결제 |
| `(dashboard)/dashboard/shop/page.tsx` | `/dashboard/shop` | Page | 티켓 샵 |
| `(dashboard)/onboarding/page.tsx` | `/onboarding` | Page | 온보딩 플로우 (5단계 + 완료) |
| `(dashboard)/onboarding/onboarding-utils.ts` | — | Util | 온보딩 단계 계산, 이탈 복구 |
| `(dashboard)/naver-search/new/page.tsx` | `/naver-search/new` | Page | 네이버 검색 설정 |
| `(dashboard)/naver-search/[id]/page.tsx` | `/naver-search/[id]` | Page | 네이버 결과 보기 |
| `(dashboard)/naver-search/history/page.tsx` | `/naver-search/history` | Page | 네이버 검색 히스토리 |
| `(dashboard)/search/new/page.tsx` | `/search/new` | Page | 구글 검색 설정 |
| `(dashboard)/search/[id]/page.tsx` | `/search/[id]` | Page | 구글 결과 보기 |
| `(dashboard)/search/history/page.tsx` | `/search/history` | Page | 구글 검색 히스토리 |
| `(dashboard)/history/page.tsx` | `/history` | SSR | 진단 기록 (순위 변화 그래프 + 전체 기록) |
| `(dashboard)/report-settings/page.tsx` | `/report-settings` | SSR | 리포트 설정 (스케줄/키워드/그리드/알림) |
| `(dashboard)/settings/page.tsx` | `/settings` | Page | 설정 |
| `pricing/page.tsx` | `/pricing` | SSR | 가격 안내 |
| `terms/page.tsx` | `/terms` | SSR | 이용약관 |
| `privacy/page.tsx` | `/privacy` | SSR | 개인정보처리방침 |

### API Routes (src/app/api)

| File | Endpoint | Methods | Description |
|------|----------|---------|-------------|
| `auth/delete-account/route.ts` | `/api/auth/delete-account` | — | 계정 삭제 |
| `naver/search/route.ts` | `/api/naver/search` | POST, GET | 네이버 검색 생성/조회 |
| `naver/search/[id]/route.ts` | `/api/naver/search/[id]` | GET | 네이버 개별 검색 조회 |
| `naver/search/[id]/process/route.ts` | `/api/naver/search/[id]/process` | POST | 네이버 결과 저장 |
| `naver/places/search/route.ts` | `/api/naver/places/search` | — | 네이버 장소 검색 |
| `search/route.ts` | `/api/search` | POST, GET | 구글 검색 생성/조회 |
| `search/[id]/route.ts` | `/api/search/[id]` | GET | 구글 개별 검색 조회 |
| `search/[id]/process/route.ts` | `/api/search/[id]/process` | POST | 구글 결과 저장 |
| `search/all/route.ts` | `/api/search/all` | GET | 전체 검색 조회 |
| `payment/subscribe/route.ts` | `/api/payment/subscribe` | POST | 구독 시작 |
| `payment/subscribe/cancel/route.ts` | `/api/payment/subscribe/cancel` | POST | 구독 해지 (cancel_scheduled) |
| `payment/subscribe/reactivate/route.ts` | `/api/payment/subscribe/reactivate` | POST | 해지 철회 (active 복구) |
| `payment/subscribe/change-plan/route.ts` | `/api/payment/subscribe/change-plan` | POST | 플랜 변경 (pending_plan_id 저장) |
| `payment/subscribe/refund/route.ts` | `/api/payment/subscribe/refund` | POST | 구독 환불 (7일 이내 + 미이용) |
| `payment/ticket/route.ts` | `/api/payment/ticket` | POST | 티켓 구매 검증 |
| `payment/refund/route.ts` | `/api/payment/refund` | POST | 결제 환불 |
| `payment/webhook/route.ts` | `/api/payment/webhook` | POST | PortOne 웹훅 (시그니처 검증) |
| `settings/my-shop/route.ts` | `/api/settings/my-shop` | GET, POST, DELETE | 매장 관리 |
| `settings/competitors/route.ts` | `/api/settings/competitors` | GET, POST, DELETE | 경쟁사 관리 |
| `settings/schedule/route.ts` | `/api/settings/schedule` | POST | 리포트 스케줄 저장/업데이트 |
| `subscription/cancel/route.ts` | `/api/subscription/cancel` | — | 구독 취소 (대안) |
| `queue/dispatch/route.ts` | `/api/queue/dispatch` | POST | 큐 디스패처 |
| `cron/cleanup/route.ts` | `/api/cron/cleanup` | — | CRON 정리 작업 |
| `cron/scheduled-search/route.ts` | `/api/cron/scheduled-search` | POST | pg_cron 정시 트리거 → 스케줄 조회 + dispatch |
| `cron/expire-subscriptions/route.ts` | `/api/cron/expire-subscriptions` | GET | cancel_scheduled 만료 감지 + 빌링키 삭제 |
| `kakao/send-report/route.ts` | `/api/kakao/send-report` | POST | 알림톡 수동 발송 |

### Service Layer (src/lib/services)

| File | Class / Function | Description |
|------|------------------|-------------|
| `search-service.ts` | `SearchService.executeSearch()` | 실시간 진단 실행 (티켓 차감 → 검증 → 크롤링 → 실패 시 환불) |
| `place-manager.ts` | `PlaceManager.registerPlace()` | 매장 등록 (플랜 제한 + 30일 락) |
| `place-manager.ts` | `PlaceManager.registerCompetitor()` | 경쟁사 등록 (플랜 제한 + 30일 락) |
| `place-manager.ts` | `PlaceManager.changePlan()` | 플랜 변경 (다운그레이드 가드) |
| `schedule-manager.ts` | `ScheduleManager.runScheduledSearches()` | CRON 주간 자동 검색 실행 |
| `notification-service.ts` | `NotificationService.dispatchPendingNotifications()` | 예약 알림 발송 |
| `charge-service.ts` | — | 충전 관련 로직 |

### PortOne Integration (src/lib/portone)

| File | Side | Functions | Description |
|------|------|-----------|-------------|
| `client.ts` | Client (Browser) | `requestTicketPayment()` | PortOne 결제창 띄움 (`NEXT_PUBLIC_PORTONE_TICKET_CHANNEL_KEY`) |
| `server.ts` | Server (API Route) | `verifyPayment()`, `cancelPayment()`, `validatePaymentAmount()` | 결제 검증/취소 |
| `billing.ts` | Server (API Route) | `payWithBillingKey()`, `schedulePayment()`, `cancelSchedule()`, `getBillingKeyInfo()`, `deleteBillingKey()` | 빌링키 결제/예약/취소 |
| `subscription-client.ts` | Client (Browser) | `requestBillingKey()` | 구독 빌링키 발급 (`NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY`) |

### Layout Components (src/components/layout)

| File | Description |
|------|-------------|
| `DashboardShell.tsx` | 대시보드 쉘 — Sidebar + MobileNav 조합, 사이드바 모드 관리 (pinned/collapsed/hover) |
| `Sidebar.tsx` | 데스크탑 사이드바 내비게이션 (3모드, 커스텀 플랫폼 아이콘, 구독 상태 표시) |
| `MobileNav.tsx` | 모바일 햄버거 메뉴 |
| `DesktopNav.tsx` | (레거시) 데스크탑 상단 네비게이션 |
| `NavDropdown.tsx` | 네비게이션 드롭다운 메뉴 |
| `OnboardingGuard.tsx` | 온보딩 미완료 시 리다이렉트 가드 |
| `WalletLabel.tsx` | 티켓 잔량 뱃지 / 구독 상태 라벨 |

### Schedule Components (src/components/schedule)

| File | Description |
|------|-------------|
| `DaySelector.tsx` | 요일 선택기 (리포트 스케줄용) |
| `TimeSelector.tsx` | 시간 선택기 (리포트 스케줄용) |
| `MyShopSelector.tsx` | 매장 선택기 (리포트 스케줄용) |

### Hooks (src/lib/hooks)

| File | Description |
|------|-------------|
| `useSubscription.ts` | 클라이언트 사이드 구독 상태 hook (plan_id, canAccessPlatform, getAllowedGridSizes) |
| `use-debounce.ts` | 디바운스 hook |

### Dashboard Components (src/components/dashboard)

| File | Description |
|------|-------------|
| `SubscriptionBanner.tsx` | 구독 유도 배너 (free 사용자) |
| `OnboardingBanner.tsx` | 온보딩 유도 배너 (유료 + 온보딩 미완료) |
| `DashboardHeader.tsx` | 대시보드 헤더 (자동리포트 상태 표시) |
| `DashboardPlatformCard.tsx` | 매장 카드 (네이버/구글, 키워드/경쟁사 모달 포함) |
| `DashboardMetricsToggle.tsx` | 주간 인사이트 플랫폼 토글 |
| `SearchHistorySection.tsx` | 검색 히스토리 테이블 |
| `SearchHistoryCard.tsx` | 검색 히스토리 카드 |
| `SubscriptionContent.tsx` | 구독 관리 UI (해지/철회/환불/플랜 변경) |
| `CheckoutContent.tsx` | 구독 결제 UI (빌링키 발급) |
| `TicketShopContent.tsx` | 티켓 샵 UI (일회성 구매) |
| `PlanCard.tsx` | 플랜 카드 (가격/기능 표시) |
| `CompetitorManageModal.tsx` | 경쟁사 검색/관리 모달 |
| `KeywordManageModal.tsx` | 키워드 관리 모달 |
| `InlineRankGraph.tsx` | 인라인 순위 그래프 (히스토리 카드) |
| `QuickInsightsRow.tsx` | 대시보드 인사이트 요약 행 |
| `QuickStatsRow.tsx` | 대시보드 통계 요약 행 |
| `UsageStatsCard.tsx` | 사용 통계 카드 |
| `PlaceSelectionModal.tsx` | 매장 선택 모달 |
| `DeleteAllButton.tsx` | 전체 삭제 버튼 |
| `UpgradePrompt.tsx` | 업그레이드 유도 프롬프트 |
| `PaymentSuccessToast.tsx` | 결제 성공 토스트 알림 |

### Naver Components (src/components/naver)

| File | Description |
|------|-------------|
| `NaverMap.tsx` | 네이버 지도 표시 |
| `NaverMapGridConfigurator.tsx` | 네이버 지도 그리드 설정기 |
| `NaverRankHeatmap.tsx` | 네이버 순위 히트맵 |
| `NaverCompetitorComparisonMap.tsx` | 경쟁사 비교 지도 |

### Results Components (src/components/results)

| File | Description |
|------|-------------|
| 10개 파일 | 검색 결과 표시 전용 컴포넌트 (순위 그리드, 히트맵, 차트 등) |

### DataForSEO Integration (src/lib/dataforseo)

| File | Description |
|------|-------------|
| `client.ts` | DataForSEO API 클라이언트 (구글 검색 결과 조회) |

### Utility Files (src/lib/utils)

| File | Description |
|------|-------------|
| `rank-trend.ts` | 순위 트렌드 계산 + 키워드 추출 (`calculateRankTrend`, `extractKeywordsFromTrend`) |
| `subscription.ts` | 구독 상태 유틸 (`isSubscribed`, `canAccessPlatform`, `getAllowedGridSizes`) |
| `insights.ts` | 주간 인사이트 계산 (`calculateWeeklyInsights`) |
| `billing.ts` | 결제 주기 유틸 (`calculateNextBillingDate`) |
| `grid-calculator.ts` | 그리드 포인트 계산 |
| `rank-colors.ts` | 순위별 색상 매핑 |

### Pricing Config (src/lib/pricing)

| File | Description |
|------|-------------|
| `config.ts` | 플랜별 설정 (`PLAN_CONFIG`, `getPlanPrice`, `getPlanName`, `getPlanLimit`) |
| `ticket-price.ts` | 티켓 가격 계산 |
| `cost-calculator.ts` | 비용 계산기 |

### Middleware

| File | Description |
|------|-------------|
| `src/middleware.ts` | 인증 가드: 보호 라우트(`/dashboard`, `/naver-search`, `/search`, `/settings`, `/history`, `/onboarding`, `/report-settings`) → 미인증 시 `/login?redirectTo=원래경로` 리다이렉트, `/login` → 인증 시 `/dashboard` 리다이렉트 |

### Supabase Migrations (Key)

| File | Description |
|------|-------------|
| `015_v2_schema_upgrade.sql` | 티켓 시스템 전환: `user_subscriptions`, `managed_keywords`, `notification_schedules/logs`, `ticket_ledger`, RPC 함수들 |
| `018_subscription_billing.sql` | 정기 결제: `subscription_billing`, `subscription_payment_history`, `activate_subscription` RPC |
| `019_billing_cycle.sql` | 연간/월간 결제 주기 추가 |
| `023_subscription_lifecycle.sql` | 구독 라이프사이클: `cancel_scheduled` 상태, `pending_plan_id`, `expire_cancelled_subscriptions` / `expire_failed_subscriptions` RPC |

