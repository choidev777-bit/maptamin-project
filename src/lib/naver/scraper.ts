/**
 * Naver Place Scraper v4.0 (Iterative Map Move Strategy)
 * 
 * "지도 이동 -> 반복적 줌 인 -> 현 지도에서 검색" 전략 구현
 * 2026-01-25: 사용자가 제안한 "Zoom-in 재설정" 로직 반영
 * 
 * @description
 * 1. PC 데스크탑 모드로 실행
 * 2. 매 검색마다 "좌표 이동 -> 최대 줌 인 -> 키워드 검색" 과정을 반복
 * 3. 줌 인은 키보드 '+' 키를 사용하여 마우스 오차 방지
 */

import { chromium, Browser, BrowserContext, Page, Frame } from 'playwright';
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
 * PC 검색 결과 파싱 (iframe 내부)
 */
async function parseSearchResultsInFrame(frame: Frame): Promise<NaverPlaceResult[]> {
    const results: NaverPlaceResult[] = [];

    try {
        await delay(1000); // 렌더링 대기

        // PC 버전 셀렉터 (v2에서 확인됨)
        // 가게 이름: span.TYaxT

        const places = await frame.evaluate(() => {
            const items: Array<{ name: string; rank: number }> = [];

            // span.TYaxT를 포함하는 li 요소를 찾음
            const nameElements = document.querySelectorAll('span.TYaxT');

            nameElements.forEach((el, index) => {
                const li = el.closest('li');

                // 광고 제외
                const isAd = li?.querySelector('.ad_mark') || li?.textContent?.includes('광고');
                if (isAd) return;

                const name = el.textContent?.trim();
                if (name) {
                    items.push({
                        name: name,
                        rank: index + 1
                    });
                }
            });
            return items;
        });

        console.log(`[Scraper v4] Parsed ${places.length} items from iframe`);

        places.forEach(p => {
            results.push({
                rank: p.rank,
                businessName: p.name
            });
        });

    } catch (error) {
        console.error('[Scraper v4] Iframe parsing failed:', error);
    }

    return results.slice(0, NAVER_SCRAPER_CONFIG.maxResults);
}

/**
 * 좌표 검색 및 이동 함수
 */
async function moveToLocation(page: Page, lat: number, lng: number) {
    const searchInputSelector = 'input.input_search';

    // 1. 검색창 찾기 및 초기화
    await page.waitForSelector(searchInputSelector, { state: 'visible', timeout: 10000 });
    const searchInput = page.locator(searchInputSelector);
    await searchInput.click();
    await searchInput.clear();

    // 2. 좌표 입력 (lat, lng)
    const query = `${lat},${lng}`;
    await searchInput.fill(query);
    await searchInput.press('Enter');

    console.log(`[Scraper v4] 📍 Moving to coordinates: ${query}`);

    // 3. 지도 이동 안정화 대기
    await delay(2000);
}

/**
 * 지도 줌 인 (Zoom In) - 키보드 사용 방식
 * [중요] 매 좌표 이동 후 줌 레벨이 초기화되므로 반드시 수행해야 함
 */
async function forceZoomIn(page: Page) {
    console.log('[Scraper v4] 🔍 Force Zooming in (Keyboard)...');

    // 지도 캔버스에 포커스를 주기 위해 안전한 곳 클릭
    try {
        await page.mouse.click(500, 500);
    } catch (e) { }

    // '+' 또는 '=' 키를 여러 번 눌러 최대 줌 인
    // 충분한 횟수 반복 (6회)
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press('='); // 대부분의 키보드에서 +와 같은 키
        await page.keyboard.press('+'); // Numpad 등 대비
        await delay(200);
    }

    await delay(500);
}

export async function scrapeAtLocation(options: ScrapeOptions): Promise<ScrapeResult> {
    const { lat, lng, keyword, targetBusinessName } = options;

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
        // ========== Step 1: PC 브라우저 실행 ==========
        browser = await chromium.launch({
            headless: true,
        });

        context = await browser.newContext({
            viewport: { width: 1280, height: 720 }, // PC Viewport
            locale: 'ko-KR',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });

        const page = await context.newPage();
        page.setDefaultTimeout(NAVER_SCRAPER_CONFIG.navigationTimeout);

        // ========== Step 2: 네이버 지도 접속 ==========
        await page.goto('https://map.naver.com/p', { waitUntil: 'domcontentloaded' });
        await delay(2000);

        // 초기 로딩 후 한 번 줌인 해두기 (User Process Step 2)
        await forceZoomIn(page);

        // ========== Step 3: 좌표로 지도 이동 ==========
        await moveToLocation(page, lat, lng);

        // ========== Step 4: 강제 줌 인 (Re-apply Zoom) ==========
        // [핵심] 좌표 검색 후 줌이 풀리므로 다시 최대 확대
        await forceZoomIn(page);

        // ========== Step 5: "현 지도에서 검색" 트리거 (키워드 검색) ==========
        const searchInputSelector = 'input.input_search';

        // 검색창 비우기 (좌표 제거)
        const clearBtn = page.locator('.btn_clear');
        if (await clearBtn.isVisible()) {
            await clearBtn.click();
        } else {
            const input = page.locator(searchInputSelector);
            await input.click();
            await input.clear();
        }
        await delay(500);

        // 키워드 입력
        const searchInput = page.locator(searchInputSelector);
        await searchInput.click();
        await searchInput.fill(keyword);
        await searchInput.press('Enter');

        console.log(`[Scraper v4] 🔎 Searching keyword in current view: "${keyword}"`);

        // 검색 실행 대기
        await delay(3000);

        // ========== Step 6: 결과 파싱 (iframe searchIframe) ==========
        let results: NaverPlaceResult[] = [];

        const frames = page.frames();
        const searchFrame = frames.find(f => f.name() === 'searchIframe');

        if (searchFrame) {
            console.log(`[Scraper v4] ✅ Found searchIframe`);

            try {
                // span.TYaxT는 가게 이름을 담고 있는 핵심 클래스
                await searchFrame.waitForSelector('span.TYaxT', { timeout: 10000 });
                results = await parseSearchResultsInFrame(searchFrame);
            } catch (e) {
                console.log(`[Scraper v4] Result elements not found or timeout`);
            }

        } else {
            console.log(`[Scraper v4] ❌ searchIframe not found`);
            // 디버그
            frames.forEach(f => console.log(`   Frame: ${f.name()} / ${f.url()}`));
        }

        console.log(`[Scraper v4] Found ${results.length} results`);

        // ========== Step 7: 타겟 순위 찾기 ==========
        let targetRank: number | null = null;
        if (targetBusinessName) {
            const matchedResult = results.find(r =>
                isBusinessMatch(r.businessName, targetBusinessName)
            );
            targetRank = matchedResult?.rank ?? null;
            console.log(`[Scraper v4] Target "${targetBusinessName}" rank: ${targetRank ?? 'Not found'}`);
        }

        return {
            success: true,
            results,
            targetRank,
            scrapedAt: new Date().toISOString(),
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Scraper v4] Error:`, errorMessage);

        return {
            success: false,
            results: [],
            targetRank: null,
            error: errorMessage,
            scrapedAt: new Date().toISOString(),
        };

    } finally {
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
        if (result.success) return result;
        lastError = result.error || 'Unknown error';
        if (attempt < retries) await delay(NAVER_SCRAPER_CONFIG.retryDelay);
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
 * 배치 스크래핑
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
        onProgress?.(i, total);
        const result = await scrapeWithRetry({
            lat: task.lat,
            lng: task.lng,
            keyword: task.keyword,
            targetBusinessName: task.targetBusinessName,
        });
        results.push({
            ...result,
            keyword: task.keyword,
            gridIndex: task.gridIndex,
            lat: task.lat,
            lng: task.lng,
        });
        if (i < tasks.length - 1) await delay(NAVER_SCRAPER_CONFIG.delayBetweenRequests);
    }
    onProgress?.(total, total);
    console.log(`[Scraper] Batch complete`);
    return results;
}

export async function testScraper(): Promise<void> {
    // 테스트용
}
