# 네이버 지도 Grid Map - 기술 명세서 (Technical Specification)

> **버전**: 1.0  
> **작성일**: 2026-01-20  
> **관련 문서**: [naver_development_rules.md](./naver_development_rules.md)

---

## 1. 개요 (Overview)

### 1.1 프로젝트 목표

네이버 지도 기반 위치별 순위 추적 기능 추가. 사용자가 비즈니스 위치와 키워드를 입력하면, 지정된 그리드 포인트에서의 네이버 플레이스 검색 순위를 시각화합니다.

### 1.2 범위

- 네이버 지도 검색 플로우 UI
- Playwright 기반 모바일 스크래핑 엔진
- 결과 시각화 (기존 RankHeatmap 재사용)
- 데이터베이스 확장

### 1.3 제약사항

| 항목 | 제약 |
|------|------|
| 키워드 유형 | 지역명 미포함 키워드만 유효 ("근처 맛집" ✅, "강남 맛집" ❌) |
| 사용 제한 | 일 1회 검색 (무료 티어) |
| TOS | 네이버 이용약관 위반 가능성 있음 (베타 기능) |
| 안정성 | UI 변경 시 스크래핑 코드 수정 필요 |

---

## 2. 구글 버전과의 일관성 (Consistency with Google Version)

> **핵심 원칙**: 구글 버전의 검증된 패턴을 최대한 재사용하여 일관된 UX와 유지보수성 확보

### 2.1 동일하게 적용할 패턴

| 영역 | 구글 버전 패턴 | 네이버 버전 적용 |
|------|--------------|----------------|
| **UI 마법사** | 4단계 (장소→키워드→그리드→확인) | ✅ 동일 |
| **Step Indicator** | STEPS 배열 + canProceed() | ✅ 동일 |
| **상태 관리** | useState 로컬 상태 | ✅ 동일 |
| **API 흐름** | POST 생성 → POST process → 결과 페이지 | ✅ 동일 |
| **인증 패턴** | supabase.auth.getUser() | ✅ 동일 |
| **Admin bypass** | ADMIN_EMAILS 배열 체크 | ✅ 동일 |
| **일일 제한** | daily_usage 테이블 + increment RPC | ✅ 동일 (platform 구분 추가) |
| **에러 처리** | status: 429 → 한도 메시지 | ✅ 동일 |
| **결과 시각화** | RankHeatmap + KeywordTabs + AverageRankCard | ✅ 완전 재사용 |

### 2.2 다르게 적용할 패턴

| 영역 | 구글 버전 | 네이버 버전 | 이유 |
|------|----------|------------|------|
| **장소 검색** | Google Places API | 네이버 검색 API 또는 수동 입력 | API 차이 |
| **데이터 소스** | DataForSEO API | Playwright 스크래핑 | 네이버 API 미지원 |
| **동시 요청** | concurrency=10 | concurrency=1 | 차단 방지 |
| **처리 속도** | ~1초/포인트 | ~3-5초/포인트 | 브라우저 렌더링 |
| **위치 설정** | location_coordinate 파라미터 | "접속 위치 설정" UI 자동화 | 플랫폼 차이 |

### 2.3 재사용 컴포넌트 상세

**✅ 완전 재사용 (수정 없이)**

| 컴포넌트 | 경로 | 용도 |
|---------|------|------|
| `GridConfigurator` | `components/search/` | CSS 기반 그리드 선택 |
| `DistanceSettings` | `components/search/` | 거리 설정 슬라이더 |
| `KeywordInput` | `components/search/` | 키워드 입력 (최대 3개) |
| `RankHeatmap` | `components/results/` | 지도 위 순위 시각화 |
| `RankDetailModal` | `components/results/` | 마커 클릭 시 상세 정보 |
| `KeywordTabs` | `components/results/` | 키워드별 결과 탭 |
| `AverageRankCard` | `components/results/` | 평균 순위 요약 |
| `grid-calculator.ts` | `lib/utils/` | 좌표 계산 함수 |
| `rank-colors.ts` | `lib/utils/` | 순위별 색상 |

**❌ 재사용 불가 (새로 구현)**

| 컴포넌트 | 이유 | 대체 구현 |
|---------|------|----------|
| `PlaceSearchInput` | Google Places API 사용 | `NaverPlaceSearchInput` |
| `MapGridConfigurator` | Google Maps 사용 | GridConfigurator 재사용 또는 네이버 지도 버전 |
| `dataforseo/client.ts` | DataForSEO 전용 | `naver/scraper.ts` |

### 2.4 API 구조 비교

**구글 버전 API:**
```
POST /api/search              → 검색 생성
POST /api/search/[id]/process → DataForSEO 처리
GET  /api/search/[id]         → 결과 조회
```

**네이버 버전 API (동일 구조):**
```
POST /api/naver/search              → 검색 생성
POST /api/naver/search/[id]/process → Playwright 스크래핑
GET  /api/naver/search/[id]         → 결과 조회
```

### 2.5 코드 참고 위치

| 구현 항목 | 참고 파일 |
|----------|----------|
| 마법사 UI | `src/app/(dashboard)/search/new/page.tsx` |
| API 라우트 | `src/app/api/search/route.ts` |
| 처리 로직 | `src/app/api/search/[id]/process/route.ts` |
| 데이터 클라이언트 | `src/lib/dataforseo/client.ts` |
| 결과 시각화 | `src/components/results/RankHeatmap.tsx` |

---

## 3. 기술 스택 (Technology Stack)

### 3.1 기존 스택 (유지)

| 영역 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js (App Router) | 16.1.3 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Database | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth (Google OAuth) | - |
| Testing | Jest, Playwright | 30.x, 1.57.x |

### 3.2 네이버 버전 추가 기술

| 영역 | 기술 | 용도 |
|------|------|------|
| 스크래핑 | Playwright | 모바일 에뮬레이션 + 웹 자동화 |
| 타겟 URL | m.place.naver.com | 모바일 버전 (PC보다 가볍고 안정적) |

---

## 4. 아키텍처 (Architecture)

### 4.1 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                            │
│  /naver-search/new → /naver-search/[id] (결과 시각화)        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                       │
│  POST /api/naver/search     GET /api/naver/search/[id]       │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│     Supabase     │            │    Playwright    │
│   (PostgreSQL)   │            │  Scraping Engine │
└──────────────────┘            └──────────────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │ m.place.naver.com│
                                │  (모바일 버전)    │
                                └──────────────────┘
```

### 4.2 데이터 흐름

```
1. 사용자 → POST /api/naver/search (검색 요청)
2. 서버 → DB에 status='pending' 저장
3. 서버 → 백그라운드 스크래핑 시작
4. 스크래퍼 → 각 Grid 포인트 순회하며 m.place.naver.com 검색
5. 스크래퍼 → 결과를 DB에 저장, status='completed'
6. 클라이언트 → GET /api/naver/search/[id] 폴링 (3초 간격)
7. 완료 시 → 결과 시각화
```

### 4.3 디렉토리 구조

```
src/
├── app/(dashboard)/
│   ├── search/           # 기존 구글 (건드리지 않음!)
│   └── naver-search/     # 새 네이버
│       ├── new/
│       │   └── page.tsx
│       └── [id]/
│           └── page.tsx
├── lib/
│   ├── dataforseo/       # 기존 구글용
│   └── naver/            # 새 네이버용
│       ├── scraper.ts
│       ├── parser.ts
│       ├── config.ts
│       └── types.ts
├── components/
│   ├── search/           # 공통 (재사용)
│   └── naver/            # 네이버 전용
│       ├── NaverPlaceSearchInput.tsx
│       └── NaverKeywordInput.tsx
└── app/api/
    └── naver/
        └── search/
            ├── route.ts
            └── [id]/
                └── route.ts
```

---

## 5. 데이터베이스 설계 (Database Design)

### 5.1 테이블 변경사항

**searches 테이블 확장:**

```sql
ALTER TABLE searches 
ADD COLUMN platform TEXT DEFAULT 'google';

-- 인덱스 추가
CREATE INDEX idx_searches_platform ON searches(platform);
CREATE INDEX idx_searches_user_platform ON searches(user_id, platform);
```

### 5.2 필드 호환성

| 필드 | 구글 | 네이버 | 호환성 |
|------|------|--------|--------|
| place_id | "ChIJ..." | 좌표 문자열 또는 네이버 ID | ✅ TEXT 재사용 |
| place_name | 업체명 | 업체명 | ✅ 동일 |
| keywords | 키워드 배열 | 키워드 배열 | ✅ 동일 |
| grid_points | GridPoint[] | GridPoint[] | ✅ 동일 |
| competitors | JSONB | JSONB (확장) | ✅ 유연 |

### 5.3 마이그레이션 파일

```sql
-- supabase/migrations/002_add_platform.sql

-- 플랫폼 컬럼 추가 (기본값으로 기존 데이터 보호)
ALTER TABLE searches 
ADD COLUMN platform TEXT DEFAULT 'google';

-- 성능을 위한 인덱스
CREATE INDEX idx_searches_platform ON searches(platform);

-- daily_usage도 플랫폼별로 구분 (선택사항)
ALTER TABLE daily_usage
ADD COLUMN platform TEXT DEFAULT 'google';

ALTER TABLE daily_usage
DROP CONSTRAINT daily_usage_user_id_usage_date_key;

ALTER TABLE daily_usage
ADD CONSTRAINT daily_usage_user_platform_date_key 
UNIQUE(user_id, usage_date, platform);
```

---

## 6. API 설계 (API Design)

### 6.1 엔드포인트 목록

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/api/naver/search` | 새 검색 생성 | 필수 |
| GET | `/api/naver/search/[id]` | 검색 상태/결과 조회 | 필수 |
| GET | `/api/naver/search/history` | 검색 히스토리 | 필수 |

### 6.2 POST /api/naver/search

**Request:**
```typescript
{
  placeName: string;
  placeAddress: string;
  placeLat: number;
  placeLng: number;
  keywords: string[];      // 최대 3개
  gridPoints: GridPoint[]; // 최대 49개
  gridDistance: number;
  distanceUnit: 'km' | 'mile';
}
```

**Response (Success):**
```typescript
{
  searchId: string;
  status: 'pending';
  estimatedTime: number;  // 예상 소요 시간 (초)
  message: 'Search started';
}
```

**Response (Error - Usage Limit):**
```typescript
{
  error: 'DAILY_LIMIT_EXCEEDED';
  message: '일일 검색 한도를 초과했습니다.';
  nextAvailable: string;  // ISO 날짜
}
```

### 6.3 GET /api/naver/search/[id]

**Response:**
```typescript
{
  search: {
    id: string;
    placeName: string;
    keywords: string[];
    gridPoints: GridPoint[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
    platform: 'naver';
    createdAt: string;
  };
  results: SearchResult[] | null;
  progress: {
    total: number;      // 총 작업 수 (gridPoints × keywords)
    completed: number;  // 완료된 작업 수
    percentage: number; // 진행률 (0-100)
  };
}
```

---

## 7. Playwright 스크래핑 엔진

### 7.1 모바일 에뮬레이션 설정

```typescript
// src/lib/naver/config.ts

export const NAVER_SCRAPER_CONFIG = {
  // 모바일 에뮬레이션 (iPhone SE 기준)
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  
  // 타임아웃 설정
  navigationTimeout: 30000,  // 30초
  searchTimeout: 10000,      // 10초
  elementTimeout: 5000,      // 5초
  
  // Rate Limiting (차단 방지)
  delayBetweenRequests: 2000,  // 요청 간 2초 대기
  maxConcurrent: 1,            // 동시 실행 1개
  
  // 재시도 설정
  maxRetries: 3,
  retryDelay: 5000,  // 5초 후 재시도
  
  // 타겟 URL
  baseUrl: 'https://m.place.naver.com',
};
```

### 7.2 스크래퍼 인터페이스

```typescript
// src/lib/naver/types.ts

export interface NaverSearchResult {
  rank: number;
  businessName: string;
  category: string;
  address: string;
  naverPlaceId?: string;
}

export interface ScrapeOptions {
  lat: number;
  lng: number;
  keyword: string;
  targetBusinessName?: string;  // 순위를 찾을 비즈니스명
}

export interface ScrapeResult {
  success: boolean;
  results: NaverSearchResult[];
  targetRank: number | null;  // 타겟 비즈니스 순위 (없으면 null)
  error?: string;
}
```

### 7.3 스크래핑 플로우

```typescript
// src/lib/naver/scraper.ts

async function scrapeAtLocation(options: ScrapeOptions): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless: true });
  
  try {
    // 1. 모바일 컨텍스트 생성
    const context = await browser.newContext({
      ...NAVER_SCRAPER_CONFIG,
    });
    
    const page = await context.newPage();
    
    // 2. 네이버 플레이스 접속
    await page.goto(`${NAVER_SCRAPER_CONFIG.baseUrl}/map`);
    
    // 3. "접속 위치 설정" → "직접 설정" 선택
    await setLocation(page, options.lat, options.lng);
    
    // 4. 키워드 검색
    await searchKeyword(page, options.keyword);
    
    // 5. 결과 파싱
    const results = await parseResults(page);
    
    // 6. 타겟 비즈니스 순위 찾기
    const targetRank = findTargetRank(results, options.targetBusinessName);
    
    return { success: true, results, targetRank };
    
  } catch (error) {
    return { success: false, results: [], targetRank: null, error: error.message };
  } finally {
    await browser.close();
  }
}
```

### 7.4 에러 처리

| 에러 유형 | 처리 방법 |
|----------|----------|
| 네트워크 에러 | 3회 재시도 후 실패 기록 |
| 요소 찾기 실패 | 로그 기록, 해당 포인트 skip |
| 차단 감지 | 5분 대기 후 재시도 |
| 타임아웃 | 2회 재시도 후 실패 기록 |

---

## 8. 보안 및 제한사항

### 8.1 사용량 제한

| 티어 | 네이버 검색 | 구글 검색 |
|------|------------|----------|
| 무료 | 일 1회 | 일 1회 |
| 유료 (예정) | 일 3회 | 무제한 |

### 8.2 Rate Limiting 구현

```typescript
// 사용자별 일일 제한 확인
async function checkNaverUsage(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data } = await supabase
    .from('daily_usage')
    .select('search_count')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .eq('platform', 'naver')
    .single();
  
  return !data || data.search_count < 1;
}
```

### 8.3 TOS 고려사항

> ⚠️ **주의**: 네이버 이용약관 위반 가능성이 있습니다.

**완화 조치:**
1. 공격적이지 않은 요청 속도 (2초 간격)
2. 동시 실행 제한 (1개)
3. 사용자에게 "베타" 기능임을 고지
4. 문제 발생 시 즉시 기능 중단 가능하도록 설계

---

## 9. 테스트 전략

### 9.1 단위 테스트

| 파일 | 테스트 내용 |
|------|------------|
| `parser.ts` | HTML 파싱, 순위 추출 |
| `config.ts` | 설정값 유효성 |
| 공통 유틸리티 | 기존 테스트 통과 확인 |

```typescript
// src/lib/naver/parser.test.ts
describe('NaverParser', () => {
  it('should extract business names from search results', () => {
    const mockHtml = '...';
    const results = parseResults(mockHtml);
    expect(results[0].businessName).toBe('테스트 맛집');
  });
});
```

### 9.2 통합 테스트

```typescript
// API 테스트
describe('POST /api/naver/search', () => {
  it('should require authentication', async () => {
    const res = await fetch('/api/naver/search', { method: 'POST' });
    expect(res.status).toBe(401);
  });
  
  it('should create a new search', async () => {
    // 인증된 요청으로 검색 생성 테스트
  });
});
```

### 9.3 E2E 테스트

```typescript
// e2e/naver-search.spec.ts
test('Naver search flow', async ({ page }) => {
  // 로그인
  await loginAsTestUser(page);
  
  // 네이버 검색 페이지 이동
  await page.goto('/naver-search/new');
  
  // 장소, 키워드, 그리드 설정
  // ...
  
  // 검색 시작
  await page.click('button:has-text("검색 시작")');
  
  // 결과 확인
  await expect(page.locator('.rank-heatmap')).toBeVisible();
});
```

### 9.4 테스트 명령어

```bash
# 단위 테스트
npm run test

# 특정 파일만
npm run test -- --testPathPattern=naver

# E2E 테스트
npm run test:e2e

# 스크래핑 PoC (수동)
npx ts-node src/lib/naver/scraper.poc.ts
```

---

## 10. 구현 일정 (Timeline)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 1 | Playwright 스크래핑 PoC | 4시간 |
| 2 | DB 마이그레이션 | 1시간 |
| 3 | API 엔드포인트 구현 | 3시간 |
| 4 | 네이버 검색 UI 구현 | 4시간 |
| 5 | 결과 시각화 연동 | 2시간 |
| 6 | 테스트 작성 | 2시간 |
| 7 | 버그 수정 및 안정화 | 2시간 |
| **총계** | | **18시간** |

---

## 11. 체크리스트

개발 완료 전 확인사항:

- [ ] naver_development_rules.md 5가지 규칙 준수
- [ ] 기존 구글 검색 기능 정상 동작
- [ ] 모든 기존 테스트 통과
- [ ] 네이버 스크래핑 PoC 성공
- [ ] DB 마이그레이션 완료
- [ ] API 엔드포인트 구현 완료
- [ ] UI 구현 완료
- [ ] 사용량 제한 동작 확인
- [ ] 에러 처리 테스트 완료
