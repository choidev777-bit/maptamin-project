# Product Requirement Document (PRD): Maptamin Local SEO SaaS

## 1. 개요 (Overview)

Maptamin은 로컬 비즈니스의 검색 엔진 순위를 지리적 그리드(Grid) 형태로 시각화하여 제공하는 로컬 SEO 분석 SaaS입니다.
사용자는 특정 위치를 중심으로 반경 내 여러 지점에서의 검색 순위를 히트맵(Heatmap)으로 확인하고, 경쟁사 대비 성과를 분석할 수 있습니다.


### 1.1 타겟 고객
- 한국 오프라인 가게 (식당, 카페, 헬스장, 필라테스, 미용실, 병원 등) 사장님들


### 1.2 해결하려는 문제
- 로컬 비즈니스 순위는 검색 위치에 따라 크게 달라지지만, 기존 툴은 단순 평균 순위만 제공.
- "내 가게가 1km 떨어진 곳에서도 잘 보일까?"에 대한 명확한 시각적 데이터 부재.
- 국내(네이버)와 해외(구글) 플랫폼을 모두 지원하는 통합 솔루션 부재.
- 네이버에 "건대 삼겹살"이라고 검색하면, 검색 위치에 따라 순위가 거의 바뀌지 않습니다. 하지만 "근처 삼겹살", "삼겹살 맛집" 이라고 검색하면 검색 위치에 따라 순위가 바뀝니다. 오프라인 매장이 후자(위치 기반 변동 순위)에 집중해야 하는 이유는 명확합니다. 이는 단순한 노출의 문제가 아니라 매출과 직결되는 실리적 이유 때문입니다. 예를 들어서, "건대 삼겹살"을 검색하는 사람은 건대에 갈 예정이거나, 건대라는 넓은 상권을 탐색 중인 사람입니다. 반면, "근처 삼겹살"이나 단순히 "삼겹살 맛집"을 검색하는 사람은 지금 당장, 내가 있는 곳에서 소비를 하려는 사람입니다. 따라서 그리드 히트맵은 오프라인 매장 사장님들에게 필요한 기능입니다.
- 처음에 대행사 타겟하는 saas를 개발하려고 했어. 근데 아이보스, 크몽에 들어가서 네이버 플레이스 관련 카테고리에 들어가면, 죄다 '리워드, 저장 클릭, 트래픽'으로 상위노출 시켜준다는 대행사들밖에 없다. 이런 대행사들은 일할 때 내 saas의 기능이 필요가 없는 것이다. 하지만 아프니까 사장이다 등 여러 자영업, 소상공인 카페에 들어가보면, 월 수십~수백만원 내고 마케팅 대행사에 맡겼다가 어뷰징 트래픽으로 순위가 더 떨어지거나, 성과가 없어서 실제로 마케팅 대행사들이 일을 제대로 하고 있는지가 궁금하고 답답해하는 것이 pain point였다.
- 또한 스스로 마케팅을 해보려고 하는 사장님들이 점점 많아지고 있다. 요즘 소상공인 마케팅 관련 유튜브 영상과 쇼츠 조회수가 많이 높다.

### 1.3 목표 (Goals)
- **정밀한 순위 추적**: GPS 좌표 기반의 정밀한 위치별 순위 데이터 제공.
- **직관적 시각화**: 색상 코딩된 히트맵으로 직관적인 성과 파악 지원.
- **하이브리드 지원**: Google Maps UI와 DataForSEO API(Google), Playwright Scraper(Naver)를 통한 듀얼 플랫폼 지원.

---

## 2. 주요 기능 (Key Features)

### 2.1 멀티 플랫폼 검색 (Multi-Platform Search)

#### A. Google Maps Grid Search
- **Technology**: Google Maps JS API + DataForSEO API.
- **Features**:
    - 전 세계 위치 지원.
    - 검색어(Keyword) 기반 순위 추적.
    - SERP(검색 결과 페이지) 데이터 기반 정확한 순위 산출.

#### B. Naver Maps Grid Search (Beta)
- **Technology**: Playwright Hybrid Scraper (Network Interception + DOM Fallback).
- **Features**:
    - 국내 특화 네이버 플레이스 순위 추적.
    - PC 지도(map.naver.com/p) 기반 하이브리드 스크래핑.
    - "접속 위치 설정" 자동화를 통한 정밀한 지역 타겟팅.
    - **Hybrid Fast-Kill 전략**: 네트워크 패킷 감청 및 리소스(지도 타일) 차단으로 속도 최적화 (건당 ~1초).

### 2.2 검색 마법사 (Search Wizard)
4단계의 직관적인 설정을 통해 누구나 쉽게 검색을 실행할 수 있습니다.
4.  **Place Selection**: "내 가게(Managed Place)" 또는 "등록된 경쟁사(Managed Competitor)" 선택 (드롭다운).
    - *Note*: 검색을 위해서는 먼저 가게나 경쟁사를 등록해야 하며, 등록 후 30일간 변경이 제한됩니다.
2.  **Keyword Input**: 추적할 키워드 입력 (최대 3개).
3.  **Grid Configuration**:
    - 중심점 설정 (지도 드래그).
    - 그리드 크기 (3x3 ~ 15x15).
    - 거리 간격 (km/m).
4.  **Confirmation**: 예상 비용(크레딧) 확인 및 실행.

### 2.3 대시보드 및 시각화 (Dashboard & Visualization)
- **Rank Heatmap**: 그리드 포인트별 순위를 색상(초록=상위, 빨강=하위)으로 표시.
- **Average Rank**: 전체 그리드의 평균 순위 및 점유율(Share of Voice) 계산.
- **Competitor Analysis**: 동일 키워드 경쟁사 순위 비교 (구글).
- **History Management**: 과거 검색 기록 조회 및 비교.

### 2.4 요금제 및 크레딧 시스템 (Pricing & Credits)
### 2.4 요금제 및 크레딧 시스템 (Pricing & Credits)
- **Dual Wallet System**:
    - **Subscription Points**: 매월 지급되며 월말에 소멸 (요금제 포함).
    - **Cash Points**: 별도 충전, 유효기간 없음 (영구).
- **Resource Management**:
    - **Managed Places**: "내 가게" 등록 (요금제별 등록 개수 제한, 30일 락킹).
    - **Managed Competitors**: "경쟁사" 등록 (요금제별 등록 개수 제한, 30일 락킹).
- **Tiered Plans**:
    - **Light / Basic / Pro**: 월간 포인트 및 관리 가능한 장소/경쟁사 개수 차등.
- **Credit Logic**: 검색 실행 시 Subscription Points를 우선 차감 후 Cash Points 차감.

---

## 3. 유저 플로우 (User Flows)

### 3.1 회원가입 및 온보딩
1.  Landing Page → Login/Sign up (Supabase Auth/Google OAuth).
2.  Dashboard 진입 → 튜토리얼 또는 "새 검색 만들기" 유도.

### 3.2 검색 실행 (Google/Naver)
1.  **Dashboard**에서 "New Search" 클릭.
### 3.2 검색 실행 (Google/Naver)
1.  **Dashboard**에서 "New Search" 클릭.
2.  **Step 1 (Place)**: 드롭다운에서 등록된 "내 가게" 또는 "경쟁사" 선택.
    - (없을 경우 "장소 관리" 메뉴로 이동하여 등록 유도)
3.  **Step 2 (Keywords)**: 추적할 키워드 입력 (예: "강남 맛집", "PT샵").
4.  **Step 3 (Grid)**: 지도에서 중심 위치 조정, 그리드 사이즈 및 범위 설정.
5.  **Step 4 (Review)**: 설정 요약 확인 및 "Start Search" 클릭.
6.  **Processing**: 백그라운드 작업 시작 (폴링 방식으로 상태 확인).
7.  **Result**: 완료 알림 및 히트맵 페이지로 이동.

---

## 4. 기술 아키텍처 (Technical Architecture)

### 4.1 Frontend
- **Framework**: Next.js 16 (App Router).
- **Styling**: Tailwind CSS v4.
- **Maps**: `@vis.gl/react-google-maps` (Google), `react-naver-maps` (Naver/예정).
- **State Management**: React Query (Server State), Zustand/Context (Client State).

### 4.2 Backend
- **Database**: Supabase (PostgreSQL).
- **Auth**: Supabase Auth.
- **API**: Next.js API Routes (Serverless Functions).
- **Job Processing**:
    - **Google**: DataForSEO Live/Postback API.
    - **Naver**: Custom Playwright Scraper running on Node.js environment.

### 4.3 Infrastructure & Security
- **Database**: Row Level Security (RLS) 적용.
- **Environment**: `.env.local`을 통한 민감 정보 관리.
- **Testing**:
    - Unit/Integration: Jest.
    - E2E: Playwright (Critical Flows: Auth, Payment, Search).

---

## 5. 데이터베이스 스키마 (Core Schema)

### `plans`
- 요금제 정의 (Light, Basic, Pro).
- `limits`: 장소, 경쟁사, 그리드 크기 제한 설정.

### `user_credits`
- 사용자 포인트 지갑.
- `subscription_balance` (월 단위 리셋), `cash_balance` (충전).

### `credit_ledger`
- 포인트 사용/충전/환불 내역 기록 (Audit Log).

### `managed_places` & `managed_competitors`
- 관리 중인 장소 및 경쟁사.
- `locked_until`: 등록 후 30일간 삭제/변경 방지.

### `searches`
- 검색 작업 메타데이터.
- `platform`: 'google' | 'naver'.
- `status`: 'pending' | 'processing' | 'completed' | 'failed'.
- `grid_config`: 중심점, 사이즈, 간격 등의 JSON 설정.

### `search_results`
- 개별 검색 결과 (Search Job 1:N Results).
- `rank`, `url`, `competitors` 데이터 저장.

### `daily_usage`
- 일일 사용량 제한 및 통계 추적.

---

## 6. 향후 로드맵 (Roadmap)

- [ ] **Reporting**: PDF/Email 리포트 자동 생성.
- [ ] **Scheduling**: 주간/월간 자동 순위 추적 예약.
- [ ] **Agency Tools**: 화이트라벨링, 서브 계정 관리.
- [ ] **Mobile App**: 현장 확인용 모바일 컴패니언 앱.
