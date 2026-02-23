# Maptamin Architecture & Data Flow Reference

> **Purpose**: AI가 코드 수정 시 각 기능의 전체 데이터 흐름을 정확히 파악할 수 있도록,  
> `User UI Action ↔ Client Component ↔ Server API Route ↔ Supabase DB Table` 매핑을 정리한 문서입니다.  
> **Last Updated**: 2026-02-24 (Sidebar 아키텍처, Report Settings, Navigator 라벨 변경 반영)  
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
11. [Feature: Weekly Scheduled Search (CRON)](#11-weekly-scheduled-search)
12. [Feature: KakaoTalk Notification (AlimTalk)](#12-kakaotalk-notification)
13. [Feature: Subscription Cancellation](#13-subscription-cancellation)
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
| `plans` | 요금제 정의 (starter/pro/premium/free) | `id`, `price`, `max_grid_size`, `monthly_tickets_naver/google`, `max_keywords_naver/google`, `max_competitors`, `channels` |
| `user_subscriptions` | 사용자 구독 상태 + 티켓 잔량 | `user_id(PK)`, `plan_id(FK→plans)`, `phone`, `remaining_tickets_naver/google`, `onboarding_completed`, `welcome_report_sent`, `current_period_start/end` |
| `subscription_billing` | 정기 결제 빌링키 + 구독 상태 | `user_id(UNIQUE)`, `billing_key`, `card_last4`, `plan_id`, `status(active/cancelled/past_due/expired)`, `next_payment_id`, `next_billing_date` |
| `subscription_payment_history` | 구독 결제 이력 | `user_id`, `payment_id(UNIQUE)`, `plan_id`, `amount`, `status(paid/failed/refunded)`, `period_start/end`, `receipt_url` |
| `payment_history` | 일회성 티켓 결제 이력 | `user_id`, `payment_id`, `platform`, `quantity`, `amount`, `status` |
| `managed_places` | 등록된 내 매장 (30일 락) | `user_id`, `platform`, `place_id`, `place_name`, `address`, `lat`, `lng`, `locked_until` |
| `managed_keywords` | 관리 키워드 (30일 락) | `user_id`, `platform`, `keyword`, `locked_until` |
| `managed_competitors` | 등록된 경쟁사 | `user_id`, `platform`, `place_id`, `place_name`, `address`, `lat`, `lng`, `locked_until` |
| `searches` | 검색 요청 레코드 | `user_id`, `place_id`, `keywords[]`, `grid_points[]`, `grid_distance`, `status(pending/processing/completed/failed)`, `platform(naver/google)`, `report_type(realtime/weekly/welcome)` |
| `search_results` | 검색 결과 (그리드 포인트별 순위) | `search_id(FK→searches)`, `keyword`, `grid_index`, `grid_lat`, `grid_lng`, `rank`, `competitors[]`, `competitor_ranks` |
| `search_schedules` | 자동 검색 스케줄 | `user_id`, `platform`, `place_id`, `keywords[]`, `grid_config[]`, `crawling_day`, `crawling_time`, `is_active`, `last_run_at` |
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
        ├── /dashboard/* 접근 시 user 없으면 → /login 리다이렉트
        └── /login 접근 시 user 있으면 → /dashboard 리다이렉트
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
│   ├── src/components/onboarding/OnboardingSteps
│   ├── src/components/search/PlaceSearchBar ← 네이버/구글 지도 검색
│   └── POST /api/settings/my-shop
│
├─► Server API Route
│   └── src/app/api/settings/my-shop/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. 입력값 검증 (platform, placeId, placeName, address, lat, lng)
│       ├── 3. SELECT → managed_places (기존 등록 확인)
│       ├── 4a. 기존 있음
│       │   ├── locked_until 확인 (30일 락)
│       │   └── UPDATE → managed_places (place 변경 + 락 갱신)
│       └── 4b. 신규
│           └── INSERT → managed_places (30일 locked_until 설정)
│
└─► Service Layer (대안 경로)
    └── src/lib/services/place-manager.ts :: PlaceManager.registerPlace()
        ├── SELECT → user_subscriptions (plan_id 조회)
        ├── SELECT → plans (플랜 제한 조회)
        ├── SELECT → managed_places (등록 수 확인 — 플랜 제한)
        └── INSERT → managed_places (30일 locked_until)
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `managed_places` | 기존 등록 여부 + 락 상태 확인 |
| SELECT | `user_subscriptions` | 현재 플랜 조회 (서비스 레이어) |
| SELECT | `plans` | 플랜 제한사항 조회 (서비스 레이어) |
| INSERT | `managed_places` | 신규 매장 등록 (30일 락 설정) |
| UPDATE | `managed_places` | 매장 정보 변경 (락 조건 충족 시) |

---

## 6. Keyword Management

### 키워드 등록/관리

```
User Action: 키워드 입력 → 등록
│
├─► Client Component
│   ├── src/components/dashboard/DashboardPlatformCard  ← 키워드 모달 포함
│   └── src/components/onboarding/OnboardingSteps
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
│   ├── src/components/competitor/CompetitorSearchModal
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
│   ├── src/components/maps/NaverMapViewer              ← 지도 + 그리드 시각화
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
│   └── POST /api/search
│
├─► Server API Route
│   └── src/app/api/search/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. SELECT → user_subscriptions (remaining_tickets_google)
│       ├── 3. supabase.rpc('deduct_ticket', { p_platform: 'google' })
│       ├── 4. INSERT → searches (status='processing', platform='google')
│       ├── 5. 실패 시: supabase.rpc('refund_ticket', { p_platform: 'google' })
│       └── 6. GitHub Actions dispatch (event_type: 'manual_search')
│               └── DataForSEO API 크롤러 트리거
│
├─► Process Route
│   └── src/app/api/search/[id]/process/route.ts  (POST)
│       ├── UPDATE → searches (status='completed')
│       └── INSERT → search_results
│
└─► Results Display
    └── src/app/(dashboard)/search/[id]/page.tsx
        ├── SELECT → searches
        └── SELECT → search_results
```

**DB Operations:** (네이버와 동일 구조, platform='google')
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `user_subscriptions` | `remaining_tickets_google` 조회 |
| UPDATE | `user_subscriptions` | 티켓 차감/환불 (RPC) |
| INSERT | `ticket_ledger` | 사용/환불 이력 |
| INSERT | `searches` | 검색 레코드 |
| INSERT | `search_results` | 결과 데이터 |
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

## 11. Weekly Scheduled Search

### 주간 자동 검색 (CRON)

```
Trigger: CRON Job (매시간 실행)
│
├─► Server API Route
│   └── src/app/api/cron/cleanup/route.ts  (or Vercel Cron)
│
├─► Service Layer
│   └── src/lib/services/schedule-manager.ts :: ScheduleManager.runScheduledSearches()
│       │
│       ├── 1. SELECT → search_schedules
│       │       WHERE is_active=true, crawling_time=현재KST, crawling_days 포함
│       │
│       ├── 2. 각 스케줄에 대해:
│       │   ├── SearchService.executeSearch()
│       │   │   ├── SELECT → user_subscriptions (플랜, 티켓)
│       │   │   ├── SELECT → plans (제한사항)
│       │   │   ├── RPC deduct_ticket → UPDATE user_subscriptions, INSERT ticket_ledger
│       │   │   └── (크롤링 실행)
│       │   │       └── 실패 시: RPC refund_ticket
│       │   │
│       │   ├── UPDATE → search_schedules (last_run_at 갱신)
│       │   │
│       │   └── 알림 처리:
│       │       ├── SELECT → notification_schedules (is_immediate 확인)
│       │       ├── SELECT → searches (가장 최근 완료 검색)
│       │       ├── is_immediate=true → sendWeeklyReport() 즉시 발송
│       │       │   └── INSERT → notification_logs (status='sent')
│       │       └── is_immediate=false → 예약 등록
│       │           └── INSERT → notification_logs (status='pending')
│       │
│       └── 3. 실패 시 로그만 기록 (전체 배치 중단 않음)
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `search_schedules` | 실행 대상 스케줄 조회 |
| SELECT | `user_subscriptions` | 플랜/티켓 (SearchService 내부) |
| SELECT | `plans` | 플랜 제한 (SearchService 내부) |
| UPDATE | `user_subscriptions` | 티켓 차감 (deduct_ticket RPC) |
| INSERT | `ticket_ledger` | 사용 이력 |
| UPDATE | `search_schedules` | `last_run_at` 갱신 |
| SELECT | `notification_schedules` | 즉시/예약 발송 여부 |
| SELECT | `searches` | 최근 완료 검색 (place_name 조회) |
| INSERT | `notification_logs` | 알림 발송/대기 이력 |

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

## 13. Subscription Cancellation

### 구독 해지

```
User Action: "구독 해지" 버튼 클릭
│
├─► Client Component
│   └── src/app/(dashboard)/dashboard/subscription/page.tsx
│       └── POST /api/payment/subscribe/cancel
│
├─► Server API Route
│   └── src/app/api/payment/subscribe/cancel/route.ts  (POST)
│       ├── 1. supabase.auth.getUser()
│       ├── 2. SELECT → subscription_billing (활성 구독 조회)
│       ├── 3. cancelSchedule([next_payment_id])  ← PortOne 예약 결제 취소
│       │       └── src/lib/portone/billing.ts
│       ├── 4. deleteBillingKey(billing_key)       ← PortOne 빌링키 삭제
│       │       └── src/lib/portone/billing.ts
│       └── 5. UPDATE → subscription_billing (status='canceled', next_payment_id=null)
│
└─► 정책: "즉시 환불" 아님
    └── 현재 구독 기간(~next_billing_date) 만료 전까지 혜택 유지
    └── 다음 결제일에 갱신 안 됨 → 자연 만료
```

**DB Operations:**
| Operation | Table | Action |
|-----------|-------|--------|
| SELECT | `subscription_billing` | 현재 구독 상태/빌링키/다음결제ID 조회 |
| UPDATE | `subscription_billing` | `status='canceled'`, `next_payment_id=null` |

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
        │   └── SELECT → managed_keywords (키워드 목록)
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
| `search_results` | 주간 리포트의 grid_point별 순위 (평균 계산) |
| `managed_keywords` | 키워드 목록 (그래프 키워드 토글 버튼) |

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
│   ├── PlaceSearchBar → 네이버/구글 장소 검색
│   └── POST /api/settings/my-shop → INSERT managed_places
│
├─► Step 2: 키워드 등록 (StepKeywordRegister.tsx)
│   ├── KeywordInput 컴포넌트 (platform별 안내 문구 분기)
│   └── Supabase Client → INSERT managed_keywords
│
├─► Step 3: 경쟁사 등록 (StepCompetitorRegister.tsx, Pro/Premium만)
│   ├── CompetitorSearchModal → 경쟁사 검색/선택
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
│   │       └── 동일 보안 검증 + 티켓 미차감
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
| `payment/subscribe/cancel/route.ts` | `/api/payment/subscribe/cancel` | POST | 구독 해지 |
| `payment/ticket/route.ts` | `/api/payment/ticket` | POST | 티켓 구매 검증 |
| `payment/refund/route.ts` | `/api/payment/refund` | POST | 결제 환불 |
| `payment/webhook/route.ts` | `/api/payment/webhook` | POST | PortOne 웹훅 |
| `settings/my-shop/route.ts` | `/api/settings/my-shop` | GET, POST, DELETE | 매장 관리 |
| `settings/competitors/route.ts` | `/api/settings/competitors` | GET, POST, DELETE | 경쟁사 관리 |
| `settings/schedule/route.ts` | `/api/settings/schedule` | POST | 리포트 스케줄 저장/업데이트 |
| `subscription/cancel/route.ts` | `/api/subscription/cancel` | — | 구독 취소 (대안) |
| `queue/dispatch/route.ts` | `/api/queue/dispatch` | POST | 큐 디스패처 |
| `cron/cleanup/route.ts` | `/api/cron/cleanup` | — | CRON 정리 작업 |
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
| `client.ts` | Client (Browser) | `requestTicketPayment()` | PortOne 결제창 띄움 |
| `server.ts` | Server (API Route) | `verifyPayment()`, `cancelPayment()`, `validatePaymentAmount()` | 결제 검증/취소 |
| `billing.ts` | Server (API Route) | `payWithBillingKey()`, `schedulePayment()`, `cancelSchedule()`, `getBillingKeyInfo()`, `deleteBillingKey()` | 빌링키 결제/예약/취소 |
| `subscription-client.ts` | Client (Browser) | — | 구독 결제 프론트엔드 헬퍼 |

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

### Hooks (src/hooks)

| File | Description |
|------|-------------|
| `useSubscription.ts` | 클라이언트 사이드 구독 상태 hook (plan_id, canAccessPlatform, getAllowedGridSizes) |

### Middleware

| File | Description |
|------|-------------|
| `src/middleware.ts` | 인증 가드: `/dashboard/*` → 미인증 시 `/login` 리다이렉트, `/login` → 인증 시 `/dashboard` 리다이렉트 |

### Supabase Migrations (Key)

| File | Description |
|------|-------------|
| `015_v2_schema_upgrade.sql` | 티켓 시스템 전환: `user_subscriptions`, `managed_keywords`, `notification_schedules/logs`, `ticket_ledger`, RPC 함수들 |
| `018_subscription_billing.sql` | 정기 결제: `subscription_billing`, `subscription_payment_history`, `activate_subscription` RPC |
| `019_billing_cycle.sql` | 연간/월간 결제 주기 추가 |
