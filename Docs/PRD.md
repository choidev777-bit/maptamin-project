# Maptamin Local SEO SaaS - 제품 요구사항 정의서 (PRD)

> **Version**: 2.0
> **Last Updated**: 2026-03-16
> **Status**: Development
> **Author**: AI Assistant (Acting as Senior Dev)

---

## 1. 프로젝트 개요 (Overview)

**Maptamin(맵타민)**은 한국 오프라인 가게 사장님들(음식점, 카페, 헬스장, 필라테스 등)을 위한 **리포트형 SaaS**입니다. 이 SaaS는 네이버 지도와 구글 지도를 지원하는 **local search grid heatmap**입니다.
한국에서는 아직 네이버 기반의 local search grid heatmap이 없기 때문에, Maptamin은 이 기능을 제공하는 SaaS입니다.
사용자는 네이버 지도와 구글 지도에서의 내 가게 순위를 실시간으로 확인하고, 경쟁사와 비교 분석하며, 네이버는 일간 리포트 / 구글은 주간 리포트를 통해 성과를 지속적으로 모니터링할 수 있습니다.

참고로, 마케팅 대행사들을 타겟 고객으로 삼지 않은 이유는, 아이보스 커뮤니티나 크몽에 들어가서 보면 마케팅 대행사 99%가 허위 영수증 리뷰, 트래픽 작업 등의 어뷰징을 해준다는 것이 대부분이고, 이러한 작업에는 local search grid heatmap이 필요하지 않기 때문입니다.

자영업자들에게 **로컬 검색 그리드 히트맵(Local Search Grid Heatmap)**은 단순한 순위 확인을 넘어, 내 가게가 지역 내에서 실제로 어떻게 노출되고 있는지를 시각적으로 파악하게 해주는 필수적인 데이터입니다.

기존의 단순 순위 추적 방식과 달리, 히트맵이 자영업자에게 중요한 구체적인 이유는 다음과 같습니다.

1. 위치 기반의 정확한 순위 파악 (Hyper-local Visibility)
구글 지도나 네이버 플레이스 같은 로컬 검색 알고리즘은 검색자의 **'현재 위치'**에 따라 결과가 극명하게 달라집니다.

현실적인 데이터: 가게 바로 앞에서는 1위일지라도, 불과 두 블록 떨어진 곳에서는 10위 밖으로 밀려날 수 있습니다.

평균의 함정 탈피: 단순한 '평균 순위'는 이러한 위치별 격차를 보여주지 못합니다. 히트맵은 특정 지점(Grid point)마다의 순위를 개별적으로 보여주어 실제 노출 범위를 정확히 알려줍니다.

2. 경쟁 업체의 영향력 분석
내 가게의 순위가 낮은 지역에서 누가 상위권을 차지하고 있는지 확인할 수 있습니다.

경쟁 우위 파악: 특정 구역을 어떤 경쟁 업체가 장악하고 있는지 시각적으로 확인이 가능합니다.

3. 마케팅 예산 및 전략의 효율화
무작위적인 광고 집행 대신, 데이터를 기반으로 전략을 수정할 수 있습니다.

취약 지역 공략: 매장 근처임에도 순위가 낮은 '구멍' 지역을 찾아내어, 해당 지역을 타겟으로 한 리뷰 마케팅이나 로컬 광고를 집중할 수 있습니다.

확장 가능성 타진: 이미 순위가 높은 지역보다는, 3~5위권에 머무르는 '기회 지역'에 자원을 집중하여 상위 노출을 노리는 것이 효율적입니다.

4. ROI(투자 대비 효과)의 시각적 측정
SEO(검색 최적화) 작업이나 광고 집행 후의 성과를 직관적으로 비교할 수 있습니다.

성과 입증: 마케팅 대행사를 쓰고 있거나 직접 관리를 할 때, 지난달 대비 히트맵의 색상이 붉은색(하위권)에서 초록색(상위권)으로 얼마나 변했는지를 통해 작업의 실효성을 즉각적으로 판단할 수 있습니다.


자, 설명할게. 한국 자영업 소상공인 사장님들이 가장 신경쓰는 네이버 플레이스 로직은 다음과 같아: 
1) 지역명을 섞어서 검색할 때는 검색자의 위치가 어디든 검색 결과가 똑같이 나온다. 예를 들어서, 홍대 카페 라고 내가 제주도에서 검색하던, 서울에서 검색하든 검색해서 나오는 플레이스 순위는 똑같다. 
2) 지역명을 빼고 검색할 때는 검색자의 위치에 따라 검색결과가 다르게 나온다. 예를 들어서, 근처 카페 라고 내가 홍대입구 1번 출구에서 검색하는 것과 6번출구에서 검색하는 결과가 다르다. 만약 "근처 카페"라고 검색했을 때 나오는 홍대에 있는 맵타민 카페의 순위는 홍대 1번출구와 홍대 6번출구 서로 다르다. 단순히 거리가 멀거나 가깝다고 순위가 바뀌는 것은 아니다. 

네이버는 공식적으로 이에 대해서 "인기도"가 중요하다고 밝혔다. 즉, 사장님들이 목표로 하는 지역명+업종키워드 상위 노출을 하려면, 자신의 상권 안에서 어디서든 지역명을 뺀 업종 키워드를 검색했을 때 순위가 높아야한다. 

반드시 참고: https://new.smartplace.naver.com/help/policy?menu=abuse&tab=smartplace 

Q. 그래서 맵타민으로 무엇을 할 수 있는데? 
A. 사장님들은 결과페이지에서 나온 플레이스 순위 지도를 보고 상권 내에서 자신이 영향력이 있는 상권이 어디까지인지, 부족한 좌표는 어디인지 알 수 있다. 노란색 좌표가 있다면 그 지역 대상으로 좀 더 마케팅을 하면 그 좌표와 그 근처의 트래픽이 올라서 좌표들의 순위가 오른다. 초록색 좌표가 많아질 수록 지역명+업종키워드 검색했을 때 순위가 높아진다. 


### 1.1 핵심 가치
- **직관성**: 복잡한 SEO 데이터를 히트맵과 그래프로 시각화하여 쉽게 이해 가능
- **편의성**: 카카오 알림톡을 통한 자동 리포트 발송으로 별도 접속 없이 현황 파악
- **정확성**: 네이버/구글의 실시간 데이터를 기반으로 한 정밀한 순위 추적

---

## 2. 기술 스택 (Tech Stack)

| 구분 | 기술 / 라이브러리 | 비고 |
|------|------------------|------|
| **Framework** | Next.js 16.1.3 (App Router) | React 19 기반 |
| **Language** | TypeScript | 엄격한 타입 안정성 보장 |
| **Styling** | Tailwind CSS v4 | Shadcn UI (Radix UI) 기반 컴포넌트 |
| **Backend / DB** | Supabase | Auth, PostgreSQL, Storage, RLS |
| **Maps** | React Naver Maps, React Google Maps | 지도 연동 및 시각화 |
| **Charts** | Recharts | 순위 변동 그래프 등 데이터 시각화 |
| **Testing** | Playwright, Jest | E2E 및 유닛 테스트 |
| **Payment** | PortOne (포트원) | 구독 결제 및 일회성 티켓 결제 (`@portone/browser-sdk`, `@portone/server-sdk`) |
| **Infra** | Vercel | 배포 및 호스팅 |

---

## 3. 핵심 기능 명세 (Core Features)

### 3.1 회원가입 및 온보딩 (Onboarding)
- **카카오 로그인**: 빠르고 간편한 가입/로그인 (Supabase Auth 연동)
- **가게 등록**:
  - 네이버/구글 지도 API를 통해 실제 운영 중인 가게 검색 및 등록
  - **Premium** 플랜은 구글 가게 추가 등록 가능
- **키워드 설정**: 집중 관리할 키워드 등록 (플랜별로 개수 제한: Naver 2~5개, Google 0~5개)
- **경쟁사 등록**: 비교 분석할 경쟁 업체 등록 (Pro 이상)
- **30일 락(Lock) 정책**: 등록된 가게/키워드/경쟁사는 데이터 일관성을 위해 30일간 변경 불가 (Premium 플랜은 락 면제)

### 3.2 대시보드 (Dashboard)
- **URL**: `/dashboard`
- **주요 기능**:
  - 등록된 가게(네이버/구글)의 요약 정보 카드
  - 티켓(포인트) 잔여량 확인 및 충전 유도
  - 주요 키워드의 순위 변동 추세 그래프 (Recharts)
  - 최근 검색 기록 및 바로가기

### 3.3 순위 추적 및 검색 (Rank Tracking)
- **URL**: `/naver-search/[id]`, `/search/[id]` (구글)
- **검색 방식**:
  - **그리드 검색**: 사용자가 설정한 반경 내 n x n 지점에서 순위 측정
  - **순위 히트맵**: 지도 위에 색상(초록/노랑/빨강)으로 순위 분포 시각화
- **티켓 시스템**:
  - 실시간 검색 1회 시 티켓 1장 차감
  - 검색 실패 시 티켓 자동 환불 로직 구현

### 3.4 리포트 및 알림 (Reports & Notifications)
- **일간 리포트 - 네이버 (Automated)**:
  - 사용자가 설정한 요일(복수 선택 가능)/시간에 자동 크롤링 실행 (Cron Job, 매일 정시)
  - 결과 요약 정보를 카카오 알림톡으로 발송 (Solapi 연동)
  - `report_type = 'daily'`
- **주간 리포트 - 구글 (Automated, Premium 전용)**:
  - 사용자가 설정한 요일(1개)/시간에 매주 1회 자동 크롤링 실행
  - 결과 요약 정보를 카카오 알림톡으로 발송
  - `report_type = 'weekly'`
- **웰컴 리포트**:
  - 온보딩 완료 시 최초 1회 무료 실행 및 알림 발송
  - `report_type = 'welcome'`

### 3.5 경쟁사 분석 (Competitor Analysis)
- **대상**: Pro, Premium 플랜 사용자 전용 기능
- **비교 히트맵 (Comparison Heatmap)**:
  - 내 가게와 선택한 경쟁사의 순위를 1:1로 비교
  - **승리(Green)**: 내 순위 > 경쟁사 순위
  - **패배(Red)**: 내 순위 < 경쟁사 순위
  - **무승부/데이터없음(Gray)**: 순위 동일 또는 데이터 부족
- **플랜별 동작**:
  - **Pro**: 등록된 최대 5곳의 경쟁사와 비교 (Naver 전용)
  - **Premium**: 등록된 최대 50곳 경쟁사 중 드롭다운으로 선택하여 비교 (Naver/Google 각 50곳)
- **상세 데이터**: 히트맵의 그리드 포인트 클릭 시 "내 순위 vs 경쟁사 순위" 툴팁 표시

### 3.6 설정 및 관리 (Settings)
- **`/settings`**: 가게/키워드/경쟁사 등록 및 변경 (락 해제 일자 확인)
- **`/report-settings`**: 자동 크롤링 스케줄 및 알림 수신 시간 설정
- **`/subscription`**: 구독 플랜 관리, 결제 내역 확인, 티켓 충전

---

## 4. 데이터 모델 (Data Model)

`supabase/migrations`의 최신 스키마(v2.2)를 기반으로 합니다.

### 4.1 주요 테이블 구조 (ERD 요약)

#### Users & Subscriptions
- **`users`** (Supabase Auth): 사용자 기본 정보
- **`plans`**: 요금제 정의 (Starter, Pro, Premium)
  - `max_grid_size`: 3x3, 5x5, 7x7 등
  - `monthly_tickets_naver/google`: 월 제공 티켓 수
- **`user_subscriptions`**: 사용자-플랜 연결 및 월간 티켓 잔량 관리
  - `remaining_tickets_naver`, `remaining_tickets_google`

#### Managed Assets (자산 관리)
- **`managed_places`**: 사용자가 등록한 내 가게 (30일 락 적용)
- **`managed_keywords`**: 관리 중인 키워드
- **`managed_competitors`**: 경쟁사 목록

#### Operation & Logs
- **`searches`**: 검색 요청 및 결과 헤더
  - `report_type`: 'realtime' | 'daily' | 'weekly' | 'welcome'
    - `realtime`: 사용자가 직접 실행한 실시간 진단
    - `daily`: 네이버 자동 일간 리포트
    - `weekly`: 구글 자동 주간 리포트
    - `welcome`: 온보딩 완료 후 최초 1회 무료 실행
  - `status`: 'pending' | 'processing' | 'completed' | 'failed'
- **`search_schedules`**: 자동 검색 스케줄 설정
  - `crawling_days` (number[]): 네이버 전용 — 복수 요일 선택
  - `crawling_day` (number): 구글 전용 — 단수 요일 선택
- **`notification_schedules`**: 알림 발송 스케줄 (검색과 별도 설정 가능)
- **`ticket_ledger`**: 티켓 사용/충전/환불 이력 원장

---

## 5. 비즈니스 로직 및 정책 (Business Rules)

### 5.1 요금제 정책 (Plans)
| 구분 | Starter | Pro | Premium |
|------|---------|-----|---------|
| **가격** | 9,900원 | 29,000원 | 79,000원 |
| **채널** | 네이버 | 네이버 | 네이버 + 구글 |
| **그리드** | 3 x 3 | 5 x 5 | 7 x 7 |
| **키워드 (Naver)** | 2개 | 5개 | 5개 |
| **키워드 (Google)** | 0개 | 0개 | 5개 |
| **티켓 (Naver)** | 월 2매 | 월 5매 | 월 10매 |
| **티켓 (Google)** | 0매 | 0매 | 월 10매 |
| **경쟁사 (Naver)** | 불가 | 5곳 | 50곳 |
| **경쟁사 (Google)** | 불가 | 불가 | 50곳 |
| **30일 락** | 적용 | 적용 | **면제** |

### 5.2 검색 원가 구조 (Search Cost Structure)
API 호출 및 크롤링에 소요되는 서버 리소스 비용은 다음과 같습니다.
- **네이버 (Naver)**: 1개 키워드 / 1개 좌표 당 **1.5원**
- **구글 (Google)**: 1개 키워드 / 1개 좌표 당 **3.0원**

> **예시**: 네이버 5x5 그리드(25지점) 검색 시
> 25지점 * 1.5원 = **37.5원** 소요

### 5.3 티켓 차감 로직
1. 사용자가 "실시간 진단" 요청 시 `deduct_ticket(platform)` RPC 함수 호출
2. 잔여 티켓 확인 (`user_subscriptions`) -> 0장일 경우 에러
3. 티켓 1 차감 및 `ticket_ledger`에 'usage' 로그 기록
4. 검색 실패 시 `refund_ticket` 함수를 통해 티켓 반환

### 5.4 락(Lock) 정책
- 블랙키위/키워드마스터 등의 어뷰징 방지 및 데이터 일관성을 위함
- 가게, 키워드, 경쟁사 등록 시 `created_at + 30 days` 시간까지 수정 불가
- 설정 페이지에서 "D-N일 후 변경 가능" 표시 필수
- **Premium 플랜은 30일 락 면제** (`placeLock: false`) — 무제한 가게 변경 가능

---

## 6. 디렉토리 구조 (Project Structure)

```
src/
├── app/
│   ├── (auth)/              # 로그인, 콜백 등 인증 관련
│   ├── (dashboard)/         # 대시보드 메인 (Layout 공유)
│   │   ├── dashboard/       # 메인 홈
│   │   ├── naver-search/    # 네이버 실시간 진단
│   │   ├── search/          # 구글 실시간 진단
│   │   ├── history/         # 검색 이력 페이지
│   │   ├── settings/        # 가게/키워드/경쟁사 설정
│   │   ├── report-settings/ # 자동 리포트 스케줄 설정
│   │   └── subscription/    # 구독/결제 관리
│   └── api/                 # Next.js API Routes
│       ├── cron/            # 자동 검색 크론 (scheduled-search)
│       ├── queue/           # Oracle VM 디스패처
│       ├── naver/           # 네이버 검색 API
│       ├── search/          # 구글 검색 API
│       └── webhook/         # Oracle VM 콜백
├── components/
│   ├── layout/              # Desktop/Mobile Nav, Sidebar
│   ├── maps/                # Naver/Google Maps 컴포넌트
│   ├── naver/               # 네이버 전용 검색/결과 UI
│   ├── search/              # 구글 검색/결과 UI
│   ├── onboarding/          # 온보딩 멀티스텝 위저드
│   ├── schedule/            # 요일/시간 선택 UI
│   └── results/             # 히트맵, 순위 카드 등 결과 UI
├── lib/
│   ├── supabase/            # Supabase Client/Server 유틸
│   ├── pricing/             # 플랜 설정 (PLAN_CONFIG)
│   ├── dataforseo/          # 외부 API 통합 (DataForSEO, 구글)
│   ├── kakao/               # 카카오 알림톡 (Solapi)
│   └── types/               # TypeScript 정의 (SQL 스키마와 동기화)
└── middleware.ts            # 라우트 보호 및 리다이렉션
```
