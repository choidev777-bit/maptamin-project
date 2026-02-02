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
    // [Robust Loading] 프록시 환경에서 검색창이 늦게 뜰 수 있으므로 30초까지 대기
    await page.waitForSelector(searchInputSelector, { state: 'visible', timeout: 30000 });
    const searchInput = page.locator(searchInputSelector);

    // 검색창이 보여도 JS가 준비 안 됐을 수 있으므로 추가 대기
    await delay(2000);

    try {
        console.log(`[Scraper Ex2] 📍 Moving to (${lat}, ${lng})...`);

        // [Secure Move Logic]
        // 0. 상태 초기화 (Reset State)
        // 만약 이전에 검색된 상태(뒤로가기 버튼 존재)라면, 홈으로 돌아가야 합니다.
        // 그래야 이번 엔터 입력 후 '뒤로가기 버튼'이 생기는 것을 성공의 징표로 쓸 수 있습니다.
        const backBtnSelector = 'button.btn_back'; // 정확한 태그 명시
        const isBackBtnVisible = await page.isVisible(backBtnSelector).catch(() => false);

        if (isBackBtnVisible) {
            console.log('[Scraper Ex2] 🔄 Resetting state (Clicking Back Button)...');
            await page.click(backBtnSelector);
            try {
                // 버튼이 사라질 때까지 대기
                await page.waitForSelector(backBtnSelector, { state: 'hidden', timeout: 3000 });
            } catch (e) {
                console.log('[Scraper Ex2] ⚠️ Back button did not disappear, proceeding anyway...');
            }
            await delay(1000);
        }

        // 1. 명시적 포커스 & 확실한 초기화
        // Ctrl+A는 포커스가 없으면 페이지 전체를 선택해버리므로 .fill('')이 더 안전
        await searchInput.click();
        await delay(500); // 클릭 후 안정화
        await searchInput.fill(''); // 기존 내용 안전하게 지우기
        await delay(500);

        // 2. 한 글자씩 타이핑 (Human-like)
        const locationStr = `${lat},${lng}`;
        await page.keyboard.type(locationStr, { delay: 100 });
        await delay(500);

        // 3. 검증 루프 (Verification Loop)
        // 엔터를 치고 나서 '뒤로가기 버튼'이 생기는지 확인합니다.
        // 안 생기면 프록시 렉으로 씹힌 것이므로 재시도합니다.
        let moveSuccess = false;
        const maxRetries = 5;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`[Scraper Ex2] 🖱️ Move Attempt ${attempt}/${maxRetries}: Pressing Enter...`);

            // 포커스 잃었을 수 있으므로 다시 클릭
            await searchInput.click();
            await delay(200);

            await searchInput.press('Enter');

            try {
                // [URL 기반 확인] URL에 '/entry/'가 포함되면 이동 성공
                // btn_back은 경량화로 렌더링 안 될 수 있으므로 URL이 더 확실함
                await page.waitForURL(
                    (url) => url.href.includes('/entry/'),
                    { timeout: 5000 }
                );
                console.log('[Scraper Ex2] 🚀 Move Verified! (URL changed to /entry/)');
                moveSuccess = true;
                break; // 성공 시 루프 탈출
            } catch (e) {
                console.log(`[Scraper Ex2] ⚠️ Move Verification Failed (URL not changed). Retrying...`);
                await delay(1000); // 잠시 대기 후 재시도
            }
        }

        if (!moveSuccess) {
            throw new Error(`Failed to move to location ${locationStr} after ${maxRetries} attempts.`);
        }

        // 성공 후 안정화 대기 (위치 컨텍스트가 네이버에 안착할 시간 확보)
        // 프록시 환경에서 너무 빨리 검색하면 위치 정보가 사라질 수 있음
        console.log('[Scraper Ex2] ⏳ Waiting for location context to settle...');
        await delay(5000);

    } catch (e) {
        console.log(`[Scraper Ex2] ⚠️ Move operation failed:`, e);
        // 여기서 에러를 던지면 전체 프로세스가 멈추니, 일단 로그만 남기고 
        // 잘못된 위치에서라도 검색을 시도할지, 아니면 skip할지 결정해야 함.
        // 현재 로직상으로는 catch 후 함수 종료 -> 바로 줌인 -> 검색 단계로 넘어감.
        // 즉, 이동 실패해도 "인천"에서 검색하게 됨. 
        // 하지만 throw를 하면 batch 전체가 죽을 수 있으니 조심해야 함.
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
        // [Robust Loading] 프록시 환경에서는 'load' 이벤트까지 대기 + 긴 타임아웃 필수
        await page.goto('https://map.naver.com/p', { waitUntil: 'load', timeout: 60000 });
        console.log('[Scraper Ex2] ⏳ Page loaded. Waiting for JS initialization...');
        await delay(5000); // 프록시 환경에서 JS가 초기화될 시간 확보
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
                recordVideo: {
                    dir: 'videos/', // 영상 저장 경로
                    size: { width: 1280, height: 720 } // 해상도
                }
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
