# 맵타민 유료 구독자 온보딩 플로우 기획서 (v1.0)

> **Status**: DRAFT — 검토 후 확정  
> **Created**: 2026-02-22  
> **Scope**: 유료 구독자(Starter/Pro/Premium) 전용 온보딩 Wizard

---

## 1. 전체 플로우 개요

```
랜딩/가격 페이지 CTA → 회원가입(OAuth) → 플랜 결제(PortOne)
    → 대시보드 진입 → 환영 인사 & '시작하기' 온보딩 진입
    → Step 1~5(플랜별 동적) → 요약 확인 화면 → 완료
    → 웰컴 리포트 즉시 실행(무료) + 주간 스케줄 자동화 세팅 완료
```

### 1-A. 무료(Free) 회원 시나리오

- 대시보드 접근 시 **모든 기능 자물쇠 잠금**, 결제 팝업 유도
- 결제 완료 시 → 플랜 활성화 → 온보딩 진입

### 1-B. 유료 회원 최초 진입 시나리오

- 결제 완료 콜백에서 **직접 `/onboarding`으로 리다이렉트** (레이스 컨디션 방지)
- 환영 인사 + "시작하기" 안내 표시

### 1-C. 온보딩 이탈 → 재진입 시나리오

- 모달/페이지를 닫고 나갈 경우: 대시보드 상단 배너 + 빈 카드에 **'시작하기'** 안내 노출
- 클릭 시 온보딩 재진입 → **마지막 완료 Step 기준으로 이어가기** (DB 기반 복원)

> [!IMPORTANT]
> **이탈 복구 로직**: 진입 시 `managed_places`, `managed_keywords`, `managed_competitors`, `search_schedules` 존재 여부를 조회하여 "가장 처음 미완료 Step"을 자동 산출하고 해당 Step부터 시작합니다.

---

## 2. 온보딩 핵심 목표

| 목표 | 설명 |
|------|------|
| 자동화 즉시 세팅 | 온보딩 완료 시, 설정된 데이터로 **매주 주간 리포트 카카오톡 발송** 자동화 |
| 웰컴 리포트 즉시 발송 | 설정 완료 즉시 **첫 번째 웰컴 리포트** 바로 실행 (**티켓 미소모, 무료**) |
| 대시보드 즉시 연동 | 온보딩에서 설정한 매장/키워드/경쟁사가 대시보드에 바로 반영 |

---

## 3. 온보딩 Step 상세 (플랜별 동적)

### 플랜별 Step 구성

| Step | Starter | Pro | Premium |
|------|---------|-----|---------|
| 1. 매장 등록 | 네이버만 | 네이버만 | 네이버 + 구글 (한 화면) |
| 2. 키워드 등록 | 네이버만 | 네이버만 | 네이버 + 구글 |
| 3. 경쟁사 등록 | **Skip** | ✅ (최대 1개) | ✅ (최대 10개) |
| 4. 분석 범위(그리드) 설정 | 3×3 | 5×5 | 7×7 (네이버+구글 동시) |
| 5. 리포트 스케줄 + 전화번호 | ✅ | ✅ | ✅ |
| 요약 확인 화면 | ✅ | ✅ | ✅ |

---

### Step 1: 내 매장 등록

**목적**: 순위를 분석할 기준 매장 등록

**화면 구성**:
- 상단: 네이버 매장 검색 및 선택 (`NaverPlaceSearchInput`)
- 하단 (Premium 전용): 구글 매장 검색 및 선택 (`PlaceSearchInput`)
- Starter/Pro는 네이버 영역만 표시

**DB 연산**: `POST /api/settings/my-shop` → `INSERT managed_places` (30일 `locked_until`)

**UX 정책**:
- 선택 완료 시 선택된 장소를 카드로 미리 보여줌 (이름, 주소, 지도 핀)
- "등록" 버튼 클릭 시 **AlertDialog로 30일 수정 불가 확인** 안내

> [!WARNING]  
> "이 매장은 등록 후 **30일간 변경할 수 없습니다**. 올바른 매장이 맞는지 다시 확인해 주세요."
> → [취소] [등록하기]

---

### Step 2: 키워드 등록

**목적**: 분석할 검색 키워드 등록

**화면 구성**:
- 네이버 키워드 입력 영역 (`KeywordInput` 재사용)
- Premium 전용: 구글 키워드 입력 영역 추가
- 플랜별 최대 키워드 수 표시 (예: "3개 중 1개 등록됨")

**DB 연산**: Supabase Client 직접 `INSERT managed_keywords`

**UX 정책**:
- 최소 1개 이상 등록해야 "다음" 활성화
- 안내 문구: "키워드는 추후 자유롭게 변경 가능합니다."

---

### Step 3: 경쟁사 등록 (Pro/Premium 전용)

**목적**: 비교 분석할 경쟁 매장 등록

**화면 구성**:
- `CompetitorSlotCard` 재사용
- Pro: 1개 슬롯 / Premium: 최대 10개 슬롯

**DB 연산**: `POST /api/settings/competitors` → `INSERT managed_competitors`

**UX 정책**:
- **Skip 가능**: "나중에 등록할게요" 버튼 제공 (빈 슬롯으로 진행)
- Starter 플랜은 이 Step 자체를 표시하지 않음
- 안내 문구: "경쟁사는 추후 설정에서 자유롭게 변경 가능합니다."

---

### Step 4: 분석 범위(그리드) 설정

**목적**: 순위를 분석할 지리적 범위 설정

**화면 구성**:
- 기존 `NaverMapGridConfigurator` (네이버) / `MapGridConfigurator` (구글) 재사용
- 플랜별 최대 그리드 사이즈 자동 적용 (Starter: 3×3, Pro: 5×5, Premium: 7×7)
- Premium: 네이버 지도 + 구글 지도 탭 또는 순차 설정

**저장 위치**: 로컬 state 보관 → Step 5 완료 시 `search_schedules.grid_config`에 저장

**UX 정책**:
- 매장 위치를 중심으로 기본 그리드 자동 배치 (사용자는 미세 조정만)
- 간격(km) 조절 슬라이더 제공

---

### Step 5: 리포트 스케줄 + 전화번호 설정

**목적**: 주간 자동 리포트 실행 시간 및 알림톡 수신 설정

**화면 구성**:
- 분석 실행 요일/시간 선택 (예: "매주 월요일 오전 9시")
- 결과 수신 시간 선택 (즉시 / 별도 시간)
- **전화번호 입력 필드** (카카오 알림톡 수신 번호)

**DB 연산**:
- `INSERT search_schedules` (요일, 시간, 그리드 설정 포함)
- `INSERT notification_schedules` (즉시/예약)
- `UPDATE user_subscriptions SET phone = ?`

**UX 정책**:
- 전화번호는 **필수 입력** (미입력 시 "다음" 비활성)
- 포맷 안내: `010-XXXX-XXXX`

---

### 요약 확인 화면 (Step 6)

**목적**: 입력한 모든 설정을 한눈에 확인 후 최종 제출

**화면 구성**:
```
┌──────────────────────────────────────┐
│  아래 설정으로 매주 리포트를          │
│  보내드릴게요! 📊                    │
│                                      │
│  📍 내 매장     강남맛집 (네이버)    │  [수정]
│                 Gangnam Store (구글)  │  [수정]
│  🔑 키워드      강남 맛집 외 2개     │  [수정]
│  🏪 경쟁사      OO식당 외 1개       │  [수정]
│  🗺️ 분석 범위   5×5 (0.5km 간격)    │  [수정]
│  📅 리포트 일정  매주 월요일 09:00   │  [수정]
│  📱 알림 수신    010-1234-5678      │  [수정]
│                                      │
│         [ ✨ 완료하고 첫 리포트 받기 ]│
└──────────────────────────────────────┘
```

**UX 정책**:
- 각 항목 옆 **[수정]** 클릭 시 해당 Step으로 즉시 이동 (데이터 보존)
- "완료" 버튼 클릭 → 최종 처리 실행

---

## 4. 완료 후 처리 (웰컴 리포트 실행)

```
"완료" 버튼 클릭
│
├── 1. UPDATE user_subscriptions SET onboarding_completed = true
│
├── 2. POST /api/naver/search (report_type='welcome', 티켓 미차감)
│   ├── INSERT searches (status='pending', report_type='welcome')
│   └── /api/queue/dispatch (크롤러 트리거)
│
├── 3. (Premium) POST /api/search (구글 웰컴 리포트, 티켓 미차감)
│
├── 4. UPDATE user_subscriptions SET welcome_report_sent = true
│
└── 5. 완료 화면 표시 (폴링 UI)
```

> [!IMPORTANT]
> **웰컴 리포트는 무료 (티켓 미소모)**입니다.  
> API 레벨에서 `report_type === 'welcome'`일 때 `deduct_ticket` RPC를 **건너뛰는** 분기 처리가 필요합니다.

### 완료 화면 UX

- **"리포트 생성 중…"** 폴링 UI (`SearchStatusPoller` 재사용)
- 검색 완료 시: "🎉 첫 리포트가 완성되었어요! 결과 보러가기" 버튼 → `/naver-search/[id]`
- 검색 실패 시: "⚠️ 리포트 생성에 실패했어요. 다시 시도하기" 버튼 (재실행)
- Confetti/축하 마이크로 애니메이션 (1회 재생)

---

## 5. 프로그레스 바

```
━━━━━━━ ● ━━━━━━ ○ ━━━━━━ ○ ━━━━━━ ○ ━━━━━━ ○ ━━━━━━ ○
 매장 등록   키워드    경쟁사    분석범위  스케줄     확인
            (2/5)
```

- 현재 Step 강조 + 완료된 Step 체크마크
- Starter: 3 Step + 확인 = 4단계 (경쟁사 Skip)
- Pro/Premium: 5 Step + 확인 = 6단계
- 텍스트: "N단계 중 M단계"

---

## 6. 엣지 케이스 처리 정책

| 엣지 케이스 | 처리 방법 |
|------------|----------|
| **온보딩 도중 이탈 (브라우저 닫기)** | 각 Step 완료 시 즉시 DB 커밋. 재진입 시 DB 조회로 마지막 미완료 Step부터 이어가기 |
| **결제 직후 → 온보딩 진입 레이스 컨디션** | 결제 완료 콜백에서 `/onboarding`으로 직접 리다이렉트. `activate_subscription` RPC 완료 확인 후 진행 |
| **웰컴 리포트 크롤링 실패** | 폴링 UI에서 실패 감지 → "다시 시도" 버튼 제공. 티켓 미차감이므로 재실행 부담 없음 |
| **플랜 업그레이드 후 재온보딩** | `onboarding_completed`가 이미 `true`이면 재온보딩 불필요. 설정 변경은 `/settings`에서 가능 |
| **전화번호 미입력으로 Step 5 스킵 시도** | 전화번호 미입력 시 "완료" 버튼 비활성. 알림톡 수신 불가 안내 |
| **30일 락 매장 등록 실수** | "등록" 전 AlertDialog 확인. 등록 후에는 30일 후 변경 가능함을 명시 |

---

## 7. 컴포넌트 설계 방향

### 채택: **`useState` Wizard + Step 단위 DB 커밋 + 재진입 시 DB 기반 복원**

| 결정 사항 | 내용 |
|----------|------|
| **패턴** | 현재 온보딩과 동일한 `useState(currentStep)` 기반 Wizard |
| **전역 상태** | 미사용 (Context/Redux/Zustand 없음, `coding-rules.md` §4.1 준수) |
| **Step 간 데이터** | 각 Step 완료 시 즉시 DB 커밋 + 로컬 state 업데이트 병행 |
| **이탈 복구** | 진입 시 DB 조회(`managed_places`, `managed_keywords` 등)로 시작점 결정 |
| **URL 파라미터** | 사용하지 않음 (기존 코드 패턴과 일관성 유지) |
| **재사용 컴포넌트** | `NaverPlaceSearchInput`, `PlaceSearchInput`, `KeywordInput`, `CompetitorSlotCard`, `NaverMapGridConfigurator`, `MapGridConfigurator` |

---

## 8. DB 연산 요약

| Step | DB 테이블 | 연산 | 비고 |
|------|----------|------|------|
| 1 | `managed_places` | INSERT (platform별) | 30일 `locked_until` |
| 2 | `managed_keywords` | INSERT (다건) | `UNIQUE(user_id, platform, keyword)` |
| 3 | `managed_competitors` | INSERT | 플랜 `max_competitors` 제한 |
| 4 | (즉시 저장 아님) | — | Step 5 완료 시 `search_schedules.grid_config`에 포함 |
| 5 | `search_schedules` | INSERT | `grid_config`, 요일, 시간 |
| 5 | `notification_schedules` | INSERT | 즉시/예약 |
| 5 | `user_subscriptions` | UPDATE | `phone` 필드 |
| 완료 | `user_subscriptions` | UPDATE | `onboarding_completed = true` |
| 완료 | `searches` | INSERT | `report_type='welcome'`, **티켓 미차감** |
