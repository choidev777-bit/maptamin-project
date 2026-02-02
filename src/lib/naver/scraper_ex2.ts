/**
 * Naver Place Scraper Ex2 (Proxy Enhanced Simple Scraper)
 * 
 * Base Logic: scraper_ex.ts (No strict verification, Process-oriented)
 * Network: scraper.ts (Bright Data Proxy + SSL Ignore)
 * 
 * Process:
 * 1. Goto Map -> Zoom In
 * 2. Move to Location (Coords Input) -> Zoom In
 * 3. Search Keyword -> Extract Result
 */

import { chromium, Browser, BrowserContext, Page, Frame } from 'playwright';
import { NAVER_SCRAPER_CONFIG } from './config';
import {
    NaverPlaceResult,
    ScrapeResult,
    NaverScrapeTask,
    NaverScrapeBatchResult,
    ProgressCallback,
} from './types';
import { isBusinessMatch } from './utils';
import * as fs from 'fs';
import * as path from 'path';

// ==========================================
// Check Dummy Tile (Optional optimization)
// ==========================================
const DUMMY_TILE_PATH = path.join(process.cwd(), 'src', 'lib', 'naver', 'dummy.pbf');
let DUMMY_TILE_DATA: Buffer;
try {
    if (fs.existsSync(DUMMY_TILE_PATH)) {
        DUMMY_TILE_DATA = fs.readFileSync(DUMMY_TILE_PATH);
    } else {
        DUMMY_TILE_DATA = Buffer.from('');
    }
} catch (e) {
    DUMMY_TILE_DATA = Buffer.from('');
}

// ==========================================
// Shared Helpers
// ==========================================

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 리소스 차단 적용 (scraper_ex.ts 버전 + Tile Mocking)
 */
async function applyResourceBlocking(page: Page): Promise<void> {
    await page.route('**/*', async (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();

        // 1. 리소스 타입 체크 (이미지, 폰트 등 차단)
        const BLOCKED_TYPES = ['image', 'media', 'font', 'stylesheet', 'imageset', 'texttrack', 'beacon', 'csp_report'];
        if (BLOCKED_TYPES.includes(resourceType)) return route.abort();

        // 2. Tile Mocking (Mocking V2 from scraper.ts for speed)
        const isMapData = url.includes('map.pstatic.net');
        const MOCK_PATTERNS = ['.pbf', '.bin', 'vector', 'tile', 'imgIcon', 'background'];

        if (MOCK_PATTERNS.some(p => url.includes(p)) || isMapData) {
            return route.fulfill({
                status: 200,
                contentType: 'application/octet-stream',
                body: DUMMY_TILE_DATA
            });
        }

        // 3. URL 패턴 체크 (기타 불필요한 것들)
        const BLOCKED_PATTERNS = [
            'log.naver', 'google-analytics', 'panorama', 'street-view',
            '.png', '.jpg', '.gif', '.woff'
        ];

        if (BLOCKED_PATTERNS.some(p => url.includes(p))) return route.abort();

        return route.continue();
    });
}

/**
 * 지도 강제 줌인 (Fallback용) - 키보드 '+' 사용
 */
async function forceZoomIn(page: Page) {
    try { await page.mouse.click(500, 500); } catch (e) { }
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press('=');
        await page.keyboard.press('+');
        await delay(100);
    }
    await delay(200);
}

/**
 * 좌표 이동 (Reliable Move Strategy)
 */
async function moveToLocation(page: Page, lat: number, lng: number) {
    const searchInputSelector = 'input.input_search';
    await page.waitForSelector(searchInputSelector, { state: 'visible', timeout: 5000 });
    const searchInput = page.locator(searchInputSelector);

    try {
        console.log(`[Scraper Ex2] 📍 Moving to (${lat}, ${lng})...`);

        // 1. 입력
        await searchInput.click();
        await searchInput.clear();
        await delay(300);
        await searchInput.fill(`${lat},${lng}`);
        await delay(500);
        await searchInput.press('Enter');

        // Note: scraper_ex.ts는 여기서 URL 검증을 하지 않습니다.
        // IP 이슈로 URL이 안 바뀌더라도 일단 믿고 진행합니다.

        await delay(1500); // 이동 대기

    } catch (e) {
        console.log(`[Scraper Ex2] ⚠️ Move operation failed:`, e);
    }
}

/**
 * DOM 파싱 (Fallback용)
 */
async function parseSearchResultsInFrame(frame: Frame): Promise<NaverPlaceResult[]> {
    const results: NaverPlaceResult[] = [];
    try {
        await delay(1000);
        const places = await frame.evaluate(() => {
            const items: Array<{ name: string; rank: number }> = [];
            const selector = 'span.TYaxT, span.YwYLL, span.P7gyV, span.PlaceListTitle';
            const nameElements = document.querySelectorAll(selector);

            nameElements.forEach((el, index) => {
                const li = el.closest('li');
                if (!li) return;

                const isLegacyAd = li.querySelector('.ad_mark');
                const isBlindAd = li.querySelector('.place_blind')?.textContent?.includes('광고');
                const isSvgAd = li.querySelector('.place_ad_label_text') || li.querySelector('.place_ad_label_border');
                const isTextAd = li.textContent?.includes('광고');

                if (isLegacyAd || isBlindAd || isSvgAd || isTextAd) return;

                const name = el.textContent?.trim();
                const isDuplicate = items.some(i => i.name === name);
                if (name && !isDuplicate) items.push({ name, rank: items.length + 1 });
            });
            return items;
        });

        places.forEach(p => results.push({ rank: p.rank, businessName: p.name }));
    } catch (error) {
        console.error('[Scraper Ex2] DOM Parsing failed:', error);
    }
    return results.slice(0, NAVER_SCRAPER_CONFIG.maxResults);
}


// ==========================================
// Core Logic (Hybrid Scraper)
// ==========================================

async function scrapeOnPage(
    page: Page,
    task: NaverScrapeTask
): Promise<ScrapeResult> {
    const { lat, lng, keyword, targetBusinessName } = task;

    // 🎯 JSON Intercept Data
    let interceptedPlaces: NaverPlaceResult[] = [];
    let isJsonHit = false;

    // 1️⃣ 네트워크 감청
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('api/search/allSearch')) {
            try {
                if (decodeURIComponent(url).includes(keyword)) {
                    const json = await response.json();
                    let items: any[] = [];

                    if (json?.result?.place?.list) items = json.result.place.list;
                    else if (json?.result?.site?.list) items = json.result.site.list;
                    else if (json?.result?.list) items = json.result.list;

                    if (items && Array.isArray(items) && items.length > 0) {
                        console.log(`[Scraper Ex2] 🎯 JSON HIT! Intercepted ${items.length} items.`);

                        interceptedPlaces = items.map((item: any, index: number) => ({
                            rank: index + 1,
                            businessName: item.name || item.title || 'Unknown',
                            naverPlaceId: item.id,
                            address: item.roadAddress || item.addr || '',
                            isAd: item.isAd || item.adId ? true : false
                        })).filter(p => !p.isAd);

                        interceptedPlaces = interceptedPlaces.map((p, i) => ({ ...p, rank: i + 1 }));
                        isJsonHit = true;
                    }
                }
            } catch (e) {
                // Ignore
            }
        }
    });

    try {
        // ========== Step 1 ~ 3: 이동 및 줌인 ==========
        await page.goto('https://map.naver.com/p', { waitUntil: 'domcontentloaded' });
        await delay(1500);
        await forceZoomIn(page); // 1차 줌인

        // 좌표 이동 (필수: 서버가 IP 기반이 아닌 해당 위치 데이터를 보내게 하려면 이동해야 함)
        await moveToLocation(page, lat, lng);
        await forceZoomIn(page); // 2차 줌인 (이동 후 다시 줌)

        // ========== Step 4: 키워드 검색 ==========
        const searchInputSelector = 'input.input_search';
        const clearBtn = page.locator('.btn_clear');
        if (await clearBtn.isVisible()) await clearBtn.click();

        const searchInput = page.locator(searchInputSelector);
        await searchInput.click();
        await searchInput.fill(keyword);

        console.log(`[Scraper Ex2] 🔎 Searching: "${keyword}"...`);

        // 2️⃣ 검색 실행
        await searchInput.press('Enter');

        // 3️⃣ [Fast Kill] JSON 기다리기
        const maxWaitTime = 3000;
        const checkInterval = 100;
        let elapsed = 0;
        while (!isJsonHit && elapsed < maxWaitTime) {
            await delay(checkInterval);
            elapsed += checkInterval;
        }

        let results: NaverPlaceResult[] = [];

        if (isJsonHit) {
            // ✅ Case A: JSON Success
            console.log(`[Scraper Ex2] 🚀 Fast Kill! Using JSON Data.`);
            results = interceptedPlaces.slice(0, NAVER_SCRAPER_CONFIG.maxResults);
        } else {
            // ⚠️ Case B: JSON Fail -> DOM Fallback
            console.log(`[Scraper Ex2] ⚠️ JSON Missed. Fallback to DOM parsing...`);

            const frames = page.frames();
            const searchFrame = frames.find(f => f.name() === 'searchIframe');
            if (!searchFrame) await delay(2000);

            const freshFrames = page.frames();
            const freshSearchFrame = freshFrames.find(f => f.name() === 'searchIframe');

            if (freshSearchFrame) {
                try {
                    await freshSearchFrame.waitForSelector('span.TYaxT', { timeout: 8000 });
                    results = await parseSearchResultsInFrame(freshSearchFrame);
                } catch (e) {
                    console.log('[Scraper Ex2] Fallback failed: Element not found');
                }
            }
        }

        // ========== Step 6: 타겟 순위 찾기 ==========
        let targetRank: number | null = null;
        if (targetBusinessName) {
            const matchedResult = results.find(r =>
                isBusinessMatch(r.businessName, targetBusinessName)
            );
            targetRank = matchedResult?.rank ?? null;
            console.log(`[Scraper Ex2] Target "${targetBusinessName}" rank: ${targetRank ?? 'Not found'}`);
        }

        return {
            success: true,
            results,
            targetRank,
            scrapedAt: new Date().toISOString(),
        };

    } catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown';
        console.error(`[Scraper Ex2] Critical Error: ${err}`);
        return { success: false, results: [], targetRank: null, scrapedAt: new Date().toISOString(), error: err };
    }
}


// ==========================================
// Batch Export (Wrapper with Proxy)
// ==========================================

export async function scrapeNaverBatch(
    tasks: NaverScrapeTask[],
    onProgress?: ProgressCallback,
    searchId?: string,
    checkJobExists?: (searchId: string) => Promise<boolean>
): Promise<NaverScrapeBatchResult[]> {
    const results: NaverScrapeBatchResult[] = [];
    console.log(`[Scraper Ex2] Starting V5 Batch (Proxy Enhanced): ${tasks.length} tasks`);

    const batchStartTime = Date.now();
    const browser = await chromium.launch({ headless: true });

    try {
        for (let i = 0; i < tasks.length; i++) {
            // 좀비 체크
            if (searchId && checkJobExists) {
                const jobExists = await checkJobExists(searchId);
                if (!jobExists) {
                    console.log(`[Zombie Killer] 🛑 Job ${searchId} was cancelled.`);
                    break;
                }
            }

            const task = tasks[i];
            onProgress?.(i, tasks.length);

            // 🛡️ Proxy Configuration (from scraper.ts)
            // 매 Task마다 새로운 세션 생성
            const sessionID = Math.random().toString(36).substring(7);
            const username = process.env.BRIGHT_DATA_USERNAME || '';
            const password = process.env.BRIGHT_DATA_PASSWORD || '';
            const host = process.env.BRIGHT_DATA_HOST || '';
            const port = process.env.BRIGHT_DATA_PORT || '';

            const proxyUsername = username ? `${username}-session-${sessionID}` : '';

            const contextOptions: any = {
                viewport: { width: 1280, height: 720 },
                locale: 'ko-KR',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                timezoneId: 'Asia/Seoul',
                permissions: ['geolocation'],
                geolocation: { latitude: task.lat, longitude: task.lng },
                ignoreHTTPSErrors: true, // ⚠️ 필수: 프록시 SSL 문제 해결
            };

            if (host && port && username && password) {
                contextOptions.proxy = {
                    server: `http://${host}:${port}`,
                    username: proxyUsername,
                    password: password
                };
                console.log(`[Scraper Ex2] 🛡️ Proxy Active (Session: ${sessionID})`);
            } else {
                console.warn(`[Scraper Ex2] ⚠️ Proxy config missing. Direct connection.`);
            }

            const context = await browser.newContext(contextOptions);
            const page = await context.newPage();

            // 프록시 환경 고려하여 타임아웃 60초
            page.setDefaultTimeout(60000);

            const taskStartTime = Date.now();
            await applyResourceBlocking(page);

            const result = await scrapeOnPage(page, task);

            const taskDuration = (Date.now() - taskStartTime) / 1000;
            console.log(`[Scraper Ex2] ✅ Task ${i + 1}/${tasks.length}: ⏱️ ${taskDuration.toFixed(2)}s`);

            results.push({
                ...result,
                keyword: task.keyword,
                gridIndex: task.gridIndex,
                lat: task.lat,
                lng: task.lng,
                dataUsageBytes: 0, // Simplified
                durationSeconds: taskDuration
            });

            await context.close();
            if (i < tasks.length - 1) await delay(1000);
        }
    } finally {
        await browser.close();
        const totalDuration = (Date.now() - batchStartTime) / 1000;
        console.log(`[Scraper Ex2] 🏁 Batch Complete! Total Time: ${totalDuration.toFixed(1)}s`);
    }

    return results;
}
