# Naver Grid Heatmap System Architecture (v5.0)

이 문서는 **Playwright 기반 하이브리드 스크래핑(v5.0)**이 적용된 네이버 지도 그리드 순위 추적 시스템의 아키텍처를 설명합니다.

---

## 1. System Architecture (Hybrid)

기존 v4(화면 파싱)의 한계를 극복하기 위해 **네트워크 패킷 감청(Network Interception)** 기술을 도입했습니다.

### Core Strategy: "Hybrid Fast-Kill"
1.  **Network Intercept (Primary)**: 브라우저와 네이버 서버 간의 통신(JSON/GraphQL)을 가로채서 데이터만 추출합니다. (렌더링 불필요)
2.  **DOM Fallback (Secondary)**: 네트워크 구조 변경 등으로 감청 실패 시, 즉시 기존 화면 파싱 로직으로 전환합니다.
3.  **Resource Mocking**: 지도 타일, 이미지 등을 0-byte 또는 더미 데이터로 교체하여 대역폭을 95% 절감합니다.

```mermaid
graph TD
    subgraph "Frontend"
        UI[Grid Dashboard]
    end

    subgraph "Backend (Node.js)"
        Orchestrator[Scraper Orchestrator]
        Cache[In-Memory Asset Cache]
        
        subgraph "Playwright Engine (v5)"
            Interceptor[Network Interceptor]
            Mocking[Resource Mocker]
            Parser[DOM Parser (Fallback)]
        end
    end

    subgraph "Naver Servers"
        API[Naver Mobile API / GraphQL]
        CDN[Static Assets (JS/CSS)]
        Tiles[Map Tiles (PBF/Images)]
    end

    UI -->|Request| Orchestrator
    Orchestrator -->|Launch| Interceptor
    
    Interceptor -- "1. Intercept JSON" --> API
    Interceptor -- "2. Block/Mock" --> Tiles
    Interceptor -. "3. Serve from RAM" .- Cache
    
    CDN -->|First Load| Cache
    Cache -->|Subsequent Loads| Interceptor
    
    Interceptor -->|Fast Kill| Orchestrator
    Parser -->|Fallback Data| Orchestrator
```

---

## 2. Key Optimization Technologies

### A. Memory Caching (Zero-Data JS)
시크릿 모드(Incognito)는 브라우저 캐시를 저장하지 않지만, **Node.js 프로세스 메모리**를 캐시 저장소로 활용합니다.
- **작동 원리**:
    1. 첫 번째 브라우저가 JS 파일 다운로드 → Node.js 변수(`GLOBAL_ASSET_CACHE`)에 저장.
    2. 두 번째 브라우저 요청 시 → 네트워크 차단 후 **메모리에 있는 데이터 서빙**.
- **효과**: JS 다운로드 데이터 **0MB**.

### B. Mocking V2 (Dummy Tiles)
네이버 지도가 로딩을 멈추지 않도록(Wait 대기 문제 해결), **가짜 타일 데이터(Dummy PBF)**를 주입합니다.
- **작동 원리**: `map.pstatic.net` 요청을 가로채서, 미리 준비된 유효한 포맷의 0.5KB짜리 더미 데이터를 반환.
- **효과**: 지도 타일 데이터 99% 절감, 로딩 에러 방지.

### C. Fast Kill
원하는 데이터(API 응답)를 확보하는 순간, 페이지 로딩이 끝나지 않아도 **브라우저를 강제 종료**합니다.
- **효과**: 스크래핑 속도 3~5초 → **0.8~1.2초**로 단축.

---

## 3. Directory & File Structure

```bash
src/lib/naver/
├── scraper.ts              # [Core] v5.0 Hybrid Scraper Engine
├── dummy.pbf               # [Asset] Mocking용 더미 지도 타일
├── types.ts                # [Type] 데이터 명세
└── config.ts               # [Config] 타임아웃, User-Agent 설정
```

---

## 4. Scraper Logic (Pseudo-code v5.0)

```typescript
FUNCTION SCRAPE_V5(lat, lng, keyword):
    # 1. 브라우저 컨텍스트 생성 (Incognito)
    CONTEXT = BROWSER.NEW_CONTEXT()
    PAGE = CONTEXT.NEW_PAGE()

    # 2. [Optimization] 리소스 차단 및 캐싱 적용
    PAGE.ROUTE('**/*', (route) => {
        IF route.url IN CACHE:
            RETURN CACHE.GET(route.url)  # 메모리 캐시 서빙
        
        IF route.url IS "Map Tile":
            RETURN DUMMY_PBF_DATA       # 더미 데이터 주입
            
        IF route.url IS "API/GraphQL":
            DATA = EXTRACT_JSON(route)  # 데이터 탈취
            SAVE_TO_RESULT(DATA)
            route.ABORT("FastKill")     # 연결 즉시 종료
    })

    # 3. 페이지 이동
    TRY:
        PAGE.GOTO('m.place.naver.com') # 모바일 페이지
        
        # 4. 데이터 확보 대기
        WAIT_FOR(RESULT_FOUND OR TIMEOUT)
        
    CATCH (Interception Failed):
        # 5. [Fallback] 실패 시 기존 DOM 파싱 실행
        LOG "Switching to DOM Parser"
        PERFORM_DOM_SCRAPING()

    RETURN RESULT
```
