/**
 * Naver Place Scraper
 * 
 * Playwright를 사용한 네이버 지도 검색 결과 스크래핑
 * 
 * @description
 * 네이버 모바일 검색을 통해 특정 좌표에서의 장소 검색 순위를 추출합니다.
 * m.search.naver.com에 좌표 파라미터를 전달하여 위치 기반 검색 결과를 얻습니다.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { NAVER_SCRAPER_CONFIG } from './config';
import {
    NaverPlaceResult,
    ScrapeOptions,
    ScrapeResult,
    NaverScrapeTask,
    NaverScrapeBatchResult,
    ProgressCallback,
} from './types';
import { isBusinessMatch } from './utils';

/**
 * 지연 함수 (Rate Limiting 용)
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 네이버 지도 URL 생성 (좌표 중심)
 * 
 * @param keyword - 검색 키워드
 * @param lat - 위도
 * @param lng - 경도
 * @returns 네이버 지도 검색 URL (해당 좌표 중심)
 */
function buildMapSearchUrl(keyword: string, lat: number, lng: number): string {
    // 네이버 지도에서 좌표로 직접 이동 + 검색
    // 형식: https://map.naver.com/p/search/키워드?c=경도,위도,줌레벨,0,0,0,dh
    const encodedKeyword = encodeURIComponent(keyword);
    const zoom = 15;  // 적절한 줌 레벨
    return `https://map.naver.com/p/search/${encodedKeyword}?c=${lng},${lat},${zoom},0,0,0,dh`;
}

/**
 * 네이버 지도 검색 결과에서 장소 목록 파싱
 */
async function parseSearchResults(page: Page): Promise<NaverPlaceResult[]> {
    const results: NaverPlaceResult[] = [];

    // UI 요소 필터링용 블랙리스트
    const blacklistKeywords = [
        'MY', 'my', '변경', '내위치', '내 위치', '내업체', '내 업체',
        '등록하기', '로그인', '더보기', '지도', '설정', '검색',
        '전체', '필터', '정렬', '가까운순', '인기순', '별점순',
        '길찾기', '주변', '즐겨찾기', '공유',
    ];

    const isBlacklisted = (name: string): boolean => {
        const trimmed = name.trim();
        return blacklistKeywords.some(keyword =>
            trimmed === keyword ||
            trimmed.startsWith(keyword + ' ') ||
            trimmed.endsWith(' ' + keyword) ||
            trimmed.length < 2
        );
    };

    try {
        // 검색 결과 로드 대기 (네이버 지도는 더 오래 걸림)
        await page.waitForLoadState('networkidle', {
            timeout: NAVER_SCRAPER_CONFIG.searchTimeout
        });

        // 추가 대기 (SPA 동적 콘텐츠 로딩)
        await delay(3000);

        // 검색 결과 리스트가 나타날 때까지 대기
        try {
            await page.waitForSelector('[class*="search"] [class*="list"], [class*="search_list"], .search_listview', {
                timeout: 5000
            });
        } catch {
            console.log('[Scraper] Search list selector not found, trying alternative parsing...');
        }

        // 장소 검색 결과 추출 (네이버 지도 전용)
        const places = await page.evaluate(() => {
            const items: Array<{
                name: string;
                category?: string;
                address?: string;
                placeId?: string;
            }> = [];

            // 네이버 지도 검색 결과 셀렉터들
            const selectors = [
                // 검색 결과 리스트 아이템
                '.search_listview .search_item .place_bluelink',
                '.search_listview .item_title',
                '[class*="SearchItem"] [class*="title"]',
                '[class*="item"] [class*="name"]',
                // 장소 카드 제목
                '.place_bluelink',
                'a[href*="/place/"] span',
                // 리스트 내 링크
                '[class*="list"] a[href*="/place/"]',
                'a[href*="map.naver.com/p/entry/place"]',
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach((el) => {
                        const link = el.closest('a') || el as HTMLAnchorElement;
                        let name = el.textContent?.trim() || '';

                        // 카테고리 등 부가정보 제거
                        const cleanName = name
                            .split('예약')[0]
                            .split('쿠폰')[0]
                            .split('네이버페이')[0]
                            .split('톡톡')[0]
                            .split('광고')[0]
                            .trim();

                        if (cleanName && cleanName.length >= 2 && cleanName.length < 50) {
                            // 중복 체크
                            const exists = items.some(item => item.name === cleanName);
                            if (!exists) {
                                // Place ID 추출 시도
                                const href = link?.getAttribute('href') || '';
                                const placeIdMatch = href.match(/\/place\/(\d+)/) || href.match(/\/(\d{8,})/);

                                items.push({
                                    name: cleanName,
                                    placeId: placeIdMatch?.[1],
                                });
                            }
                        }
                    });

                    if (items.length > 0) break;
                }
            }

            return items;
        });

        console.log(`[Scraper] Raw places found: ${places.length}`);

        // 결과 변환 (블랙리스트 필터링 적용)
        let rank = 0;
        places.forEach((place) => {
            if (!isBlacklisted(place.name)) {
                rank++;
                results.push({
                    rank,
                    businessName: place.name,
                    category: place.category,
                    address: place.address,
                    naverPlaceId: place.placeId,
                });
            }
        });

    } catch (error) {
        console.error('[Scraper] Failed to parse search results:', error);
    }

    return results.slice(0, NAVER_SCRAPER_CONFIG.maxResults);
}


/**
 * 네이버 지도 위치 설정 후 검색 스크래핑
 * 
 * 1. 위치 설정 페이지 접속
 * 2. "직접 설정" 선택 후 좌표 이동
 * 3. 저장 후 검색 페이지에서 결과 파싱
 * 
 * @param options - 스크래핑 옵션
 * @returns 스크래핑 결과
 */
export async function scrapeAtLocation(options: ScrapeOptions): Promise<ScrapeResult> {
    const { lat, lng, keyword, targetBusinessName } = options;

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
        // 브라우저 실행
        browser = await chromium.launch({
            headless: true,
        });

        // 데스크톱 컨텍스트 생성
        context = await browser.newContext({
            viewport: NAVER_SCRAPER_CONFIG.viewport,
            deviceScaleFactor: NAVER_SCRAPER_CONFIG.deviceScaleFactor,
            isMobile: NAVER_SCRAPER_CONFIG.isMobile,
            hasTouch: NAVER_SCRAPER_CONFIG.hasTouch,
            userAgent: NAVER_SCRAPER_CONFIG.userAgent,
            locale: 'ko-KR',
        });

        const page = await context.newPage();
        page.setDefaultTimeout(NAVER_SCRAPER_CONFIG.navigationTimeout);

        console.log(`[Scraper] Setting location to: lat=${lat}, lng=${lng}`);

        // ========== Step 1: 위치 설정 페이지 접속 ==========
        await page.goto('https://map.naver.com/p/settings/location', {
            waitUntil: 'domcontentloaded',
            timeout: NAVER_SCRAPER_CONFIG.navigationTimeout,
        });

        // 페이지 로딩 대기
        await delay(2000);

        // ========== Step 2: "직접 설정" 라디오 버튼 클릭 ==========
        try {
            // 직접 설정 라디오 버튼 찾기 및 클릭
            const directSettingSelectors = [
                'input[value="direct"]',
                'label:has-text("직접 설정")',
                '[class*="direct"]',
                'input[type="radio"]:nth-of-type(2)',
            ];

            let clicked = false;
            for (const selector of directSettingSelectors) {
                try {
                    await page.click(selector, { timeout: 3000 });
                    clicked = true;
                    console.log(`[Scraper] Clicked direct setting with selector: ${selector}`);
                    break;
                } catch {
                    continue;
                }
            }

            if (!clicked) {
                // 텍스트로 찾기
                await page.getByText('직접 설정').click({ timeout: 3000 });
                console.log('[Scraper] Clicked direct setting by text');
            }
        } catch (e) {
            console.log('[Scraper] Could not click direct setting radio, trying to proceed...');
        }

        await delay(1500);

        // ========== Step 3: JavaScript로 지도 좌표 이동 ==========
        try {
            const locationSet = await page.evaluate(({ lat, lng }) => {
                // 전역 naver.maps 객체 확인
                if (typeof naver !== 'undefined' && naver.maps) {
                    // 페이지 내 지도 인스턴스 찾기
                    const mapElements = document.querySelectorAll('[class*="map"]');

                    // naver.maps.Map 인스턴스에 접근 시도
                    // 방법 1: __naver_map__ 속성
                    for (const el of mapElements) {
                        const mapInstance = (el as any).__naver_map__;
                        if (mapInstance && typeof mapInstance.setCenter === 'function') {
                            mapInstance.setCenter(new naver.maps.LatLng(lat, lng));
                            return true;
                        }
                    }

                    // 방법 2: 전역 map 변수
                    if ((window as any).map && typeof (window as any).map.setCenter === 'function') {
                        (window as any).map.setCenter(new naver.maps.LatLng(lat, lng));
                        return true;
                    }

                    // 방법 3: naver.maps.getMapById (if exists)
                    const naverMaps = naver.maps as any;
                    if (naverMaps.getMapById) {
                        const map = naverMaps.getMapById('map');
                        if (map) {
                            map.setCenter(new naver.maps.LatLng(lat, lng));
                            return true;
                        }
                    }
                }
                return false;
            }, { lat, lng });

            if (locationSet) {
                console.log(`[Scraper] Map center set to: lat=${lat}, lng=${lng}`);
            } else {
                console.log('[Scraper] Could not set map center via JavaScript');
            }
        } catch (e) {
            console.log('[Scraper] Error setting map center:', e);
        }

        await delay(1000);

        // ========== Step 4: 저장 버튼 클릭 ==========
        try {
            const saveSelectors = [
                'button:has-text("저장")',
                '[class*="save"]',
                'button[type="submit"]',
            ];

            for (const selector of saveSelectors) {
                try {
                    await page.click(selector, { timeout: 3000 });
                    console.log(`[Scraper] Clicked save button with selector: ${selector}`);
                    break;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            console.log('[Scraper] Could not click save button, trying to proceed...');
        }

        await delay(2000);

        // ========== Step 5: 검색 페이지로 이동 ==========
        const searchUrl = `https://map.naver.com/p/search/${encodeURIComponent(keyword)}`;
        console.log(`[Scraper] Navigating to search: ${searchUrl}`);

        await page.goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: NAVER_SCRAPER_CONFIG.navigationTimeout,
        });

        // ========== Step 6: 검색 결과 파싱 ==========
        const results = await parseSearchResults(page);
        console.log(`[Scraper] Found ${results.length} results for "${keyword}"`);

        // 타겟 비즈니스 순위 찾기
        let targetRank: number | null = null;
        if (targetBusinessName) {
            const matchedResult = results.find(r =>
                isBusinessMatch(r.businessName, targetBusinessName)
            );
            targetRank = matchedResult?.rank ?? null;
            console.log(`[Scraper] Target "${targetBusinessName}" rank: ${targetRank ?? 'Not found'}`);
        }

        return {
            success: true,
            results,
            targetRank,
            scrapedAt: new Date().toISOString(),
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Scraper] Error:`, errorMessage);

        return {
            success: false,
            results: [],
            targetRank: null,
            error: errorMessage,
            scrapedAt: new Date().toISOString(),
        };

    } finally {
        // 정리
        if (context) await context.close();
        if (browser) await browser.close();
    }
}

/**
 * 재시도가 포함된 스크래핑
 */
async function scrapeWithRetry(
    options: ScrapeOptions,
    retries: number = NAVER_SCRAPER_CONFIG.maxRetries
): Promise<ScrapeResult> {
    let lastError: string = '';

    for (let attempt = 1; attempt <= retries; attempt++) {
        console.log(`[Scraper] Attempt ${attempt}/${retries} for lat:${options.lat}, lng:${options.lng}`);

        const result = await scrapeAtLocation(options);

        if (result.success) {
            return result;
        }

        lastError = result.error || 'Unknown error';

        if (attempt < retries) {
            console.log(`[Scraper] Retrying in ${NAVER_SCRAPER_CONFIG.retryDelay}ms...`);
            await delay(NAVER_SCRAPER_CONFIG.retryDelay);
        }
    }

    return {
        success: false,
        results: [],
        targetRank: null,
        error: `Failed after ${retries} attempts: ${lastError}`,
        scrapedAt: new Date().toISOString(),
    };
}

/**
 * 배치 스크래핑 (여러 위치에서 순차 실행)
 * 
 * @param tasks - 스크래핑 태스크 배열
 * @param onProgress - 진행률 콜백
 * @returns 배치 결과 배열
 */
export async function scrapeNaverBatch(
    tasks: NaverScrapeTask[],
    onProgress?: ProgressCallback
): Promise<NaverScrapeBatchResult[]> {
    const results: NaverScrapeBatchResult[] = [];
    const total = tasks.length;

    console.log(`[Scraper] Starting batch processing: ${total} tasks`);

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // 진행률 업데이트
        onProgress?.(i, total);

        // 스크래핑 실행
        const result = await scrapeWithRetry({
            lat: task.lat,
            lng: task.lng,
            keyword: task.keyword,
            targetBusinessName: task.targetBusinessName,
        });

        // 결과 저장
        results.push({
            ...result,
            keyword: task.keyword,
            gridIndex: task.gridIndex,
            lat: task.lat,
            lng: task.lng,
        });

        // Rate Limiting (마지막 작업 제외)
        if (i < tasks.length - 1) {
            await delay(NAVER_SCRAPER_CONFIG.delayBetweenRequests);
        }
    }

    // 완료 알림
    onProgress?.(total, total);
    console.log(`[Scraper] Batch complete: ${results.length}/${total} tasks processed`);

    return results;
}

/**
 * 단일 테스트용 함수
 */
export async function testScraper(): Promise<void> {
    console.log('=== Naver Scraper Test ===');

    const result = await scrapeAtLocation({
        lat: 37.5665,      // 서울시청 위도
        lng: 126.978,      // 서울시청 경도
        keyword: '근처 맛집',
        targetBusinessName: undefined,
    });

    console.log('Success:', result.success);
    console.log('Results count:', result.results.length);
    console.log('Top 5 results:');
    result.results.slice(0, 5).forEach(r => {
        console.log(`  ${r.rank}. ${r.businessName}`);
    });

    if (result.error) {
        console.log('Error:', result.error);
    }
}
