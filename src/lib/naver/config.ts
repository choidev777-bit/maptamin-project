/**
 * Naver Place Scraper Configuration
 * 
 * 모바일 에뮬레이션 설정 및 스크래핑 관련 상수
 */

export const NAVER_SCRAPER_CONFIG = {
    // 데스크톱 에뮬레이션 (지도 이동 시 자동 결과 갱신 기대)
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    // 타임아웃 설정 (ms)
    navigationTimeout: 60000,  // 60초 (Proxy 연결 안정성 확보)
    searchTimeout: 30000,      // 30초
    elementTimeout: 20000,     // 20초

    // Rate Limiting (차단 방지)
    delayBetweenRequests: 1000,  // 요청 간 1초 대기
    maxConcurrent: 1,            // 동시 실행 1개

    // 재시도 설정
    maxRetries: 3,
    retryDelay: 5000,  // 5초 후 재시도

    // 타겟 URL
    baseUrl: 'https://m.place.naver.com',
    searchUrl: 'https://m.search.naver.com/search.naver',

    // 검색 결과 제한
    maxResults: 70,  // 상위 70개까지 파싱 (List API 활용)
} as const;

// CSS 셀렉터 (네이버 UI 변경 시 이 부분만 수정)
export const NAVER_SELECTORS = {
    // 검색 관련
    searchInput: 'input[type="search"], input.search_input, #query',
    searchButton: 'button[type="submit"], .btn_search',

    // 장소 검색 결과
    placeList: '.place_bluelink, .place_section, ._item',
    placeItem: 'a.place_bluelink, .place_section li, ._item',
    placeName: '.place_bluelink, .name, .title',

    // 위치 설정 관련
    locationSettingBtn: '.location_btn, [class*="location"]',
    manualLocationBtn: '.manual_location, [class*="manual"]',
    mapContainer: '.map_container, #map',
    saveLocationBtn: '.save_btn, [class*="confirm"]',
} as const;

export type NaverScraperConfig = typeof NAVER_SCRAPER_CONFIG;
export type NaverSelectors = typeof NAVER_SELECTORS;
