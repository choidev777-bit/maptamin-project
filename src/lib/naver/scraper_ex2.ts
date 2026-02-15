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
 * @param tileCounter - 지도 타일 요청 카운트 (지도 초기화 확인용)
 */
async function applyResourceBlocking(page: Page, tileCounter?: { count: number }): Promise<void> {
    await page.route('**/*', async (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();

        // 1. 리소스 타입 체크 (이미지, 폰트 등 차단)
        const BLOCKED_TYPES = ['image', 'media', 'font', 'stylesheet', 'imageset', 'texttrack', 'beacon', 'csp_report'];
        if (BLOCKED_TYPES.includes(resourceType)) {
            // 🆕 지도 타일 이미지 요청 카운트 (pstatic.net = 네이버 지도 CDN)
            if (tileCounter && url.includes('pstatic.net')) {
                tileCounter.count++;
            }
            return route.abort();
        }

        // 2. Tile Mocking (Mocking V2 from scraper.ts for speed)
        const isMapData = url.includes('map.pstatic.net');
        const MOCK_PATTERNS = ['.pbf', '.bin', 'vector', 'tile', 'imgIcon', 'background'];

        if (MOCK_PATTERNS.some(p => url.includes(p)) || isMapData) {
            // 🆕 벡터 타일/지도 데이터 요청 카운트
            if (tileCounter) {
                tileCounter.count++;
            }
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
 * 🆕 지도 타일 렌더링 대기
 * 지도가 타일 요청을 시작할 때까지 대기합니다.
 * 타일 요청 = 지도 JS가 초기화되어 위치 컨텍스트를 알고 있다는 의미
 */
async function waitForMapTiles(tileCounter: { count: number }, maxWaitMs: number = 120000): Promise<boolean> {
    const CHECK_INTERVAL = 5000; // 5초마다 확인
    let elapsed = 0;
    const startCount = tileCounter.count;

    while (elapsed < maxWaitMs) {
        if (tileCounter.count > startCount) {
            console.log(`[Scraper Ex2] ✅ Map tiles detected! (${tileCounter.count - startCount} tile requests since check started)`);
            return true;
        }
        console.log(`[Scraper Ex2] ⏳ Waiting for map tiles... (${elapsed / 1000}s / ${maxWaitMs / 1000}s, count: ${tileCounter.count})`);
        await delay(CHECK_INTERVAL);
        elapsed += CHECK_INTERVAL;
    }

    console.log(`[Scraper Ex2] ⚠️ Map tiles not detected after ${maxWaitMs / 1000}s`);
    return false;
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

    // [Map Render Verification] 지도 렌더링 완료 확인 (좌표 입력 전 필수)
    // 우측 하단 거리 척도(예: 100m, 1km)가 뜰 때까지 대기하여 JS 로딩 보장
    try {
        console.log('[Scraper Ex2] ⏳ Waiting for map scale indicator (Render Check)...');
        await page.locator('span').filter({ hasText: /^\d+(m|km)$/ }).first().waitFor({ state: 'visible', timeout: 30000 });
        console.log('[Scraper Ex2] 🗺️ Map fully rendered (Scale indicator found)');
    } catch (e) {
        console.log('[Scraper Ex2] ⚠️ Scale indicator not found. Reloading page...');
        await page.reload({ waitUntil: 'load', timeout: 60000 });
        await delay(5000); // 새로고침 후 안정화 대기
        console.log('[Scraper Ex2] 🔄 Page reloaded. Continuing...');
    }

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
                await delay(5000); // 더 긴 대기 후 재시도 (프록시 환경)
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
        // 에러를 re-throw하여 호출자가 이 task를 skip할 수 있게 함
        // scrapeNaverBatch의 try-catch에서 잡혀서 success=false로 기록됨
        throw e;
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

        // ========== Step 3.5: 지도 드래그 (위치 컨텍스트 고정) ==========
        // 프록시 환경에서 네이버가 IP 위치로 검색 결과를 보내는 것을 방지
        // 지도를 살짝 흔들어서 "여기서 검색 중이다"라고 어필
        try {
            console.log('[Scraper Ex2] 🖐️ Dragging map to lock location context...');
            const viewport = page.viewportSize();
            if (viewport) {
                const centerX = viewport.width / 2;
                const centerY = viewport.height / 2;

                // 지도 중앙에서 오른쪽으로 100px 드래그 후 돌아오기
                await page.mouse.move(centerX, centerY);
                await page.mouse.down();
                await delay(100);
                await page.mouse.move(centerX + 100, centerY, { steps: 10 });
                await delay(100);
                await page.mouse.move(centerX, centerY, { steps: 10 });
                await page.mouse.up();
                await delay(500); // 지도가 안정화될 시간
                console.log('[Scraper Ex2] ✅ Map drag complete (Location locked)');
            }
        } catch (e) {
            console.log('[Scraper Ex2] ⚠️ Map drag failed, proceeding anyway...');
        }


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
// Batch Export (Single Session Architecture)
// ==========================================

/**
 * 검색 상태 초기화 (다음 좌표 검색을 위해)
 */
async function resetSearchState(page: Page): Promise<void> {
    try {
        // 검색창 X 버튼으로 초기화
        const clearBtn = page.locator('.btn_clear');
        if (await clearBtn.isVisible()) {
            await clearBtn.click();
            await delay(300);
        }

        // 뒤로가기 버튼이 있으면 클릭
        const backBtn = page.locator('button.btn_back');
        if (await backBtn.isVisible()) {
            await backBtn.click();
            await delay(500);
        }
    } catch (e) {
        // 무시
    }
}

export async function scrapeNaverBatch(
    tasks: NaverScrapeTask[],
    onProgress?: ProgressCallback,
    searchId?: string,
    checkJobExists?: (searchId: string) => Promise<boolean>
): Promise<NaverScrapeBatchResult[]> {
    const results: NaverScrapeBatchResult[] = [];
    console.log(`[Scraper Ex2] Starting V6 Batch (Single Session): ${tasks.length} tasks`);

    const batchStartTime = Date.now();
    const browser = await chromium.launch({ headless: true });

    // 🆕 프록시 세션 ID 1회 생성 (고정)
    const sessionID = Math.random().toString(36).substring(7);
    const username = process.env.BRIGHT_DATA_USERNAME || '';
    const password = process.env.BRIGHT_DATA_PASSWORD || '';
    const host = process.env.BRIGHT_DATA_HOST || '';
    const port = process.env.BRIGHT_DATA_PORT || '';
    const proxyUsername = username ? `${username}-session-${sessionID}` : '';

    // 🆕 Context/Page 1회 생성 (루프 바깥)
    const contextOptions: any = {
        viewport: { width: 1280, height: 720 },
        locale: 'ko-KR',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        timezoneId: 'Asia/Seoul',
        permissions: ['geolocation'],
        geolocation: { latitude: tasks[0]?.lat || 37.5, longitude: tasks[0]?.lng || 127.0 },
        ignoreHTTPSErrors: true,
        recordVideo: {
            dir: 'videos/',
            size: { width: 1280, height: 720 }
        }
    };

    if (host && port && username && password) {
        contextOptions.proxy = {
            server: `http://${host}:${port}`,
            username: proxyUsername,
            password: password
        };
        console.log(`[Scraper Ex2] 🛡️ Proxy Active (Fixed Session: ${sessionID})`);
    } else {
        console.warn(`[Scraper Ex2] ⚠️ Proxy config missing. Direct connection.`);
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    // 🆕 타일 요청 카운터 (지도 초기화 확인용)
    const tileCounter = { count: 0 };
    await applyResourceBlocking(page, tileCounter);

    // 🆕 JSON 인터셉터 변수 (루프 바깥에서 선언, 루프 안에서 초기화)
    let interceptedPlaces: NaverPlaceResult[] = [];
    let isJsonHit = false;
    let currentKeyword = ''; // 현재 검색 중인 키워드
    let currentTaskDataUsage = 0; // 🆕 Bandwidth tracking
    let currentTargetLat = 0; // 🆕 searchCoord 검증용
    let currentTargetLng = 0;
    let isLocationMismatch = false; // 🆕 위치 오류 감지 플래그

    // 🆕 데이터 사용량 리스너 (Bandwidth Usage)
    page.on('response', async (response) => {
        try {
            const headers = response.headers();
            const len = headers['content-length'];
            if (len) {
                const bytes = parseInt(len, 10);
                if (!isNaN(bytes)) currentTaskDataUsage += bytes;
            }
        } catch (e) {
            // Ignore
        }
    });

    // 🆕 Response 리스너 1회 등록
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('api/search/allSearch')) {
            try {
                if (currentKeyword && decodeURIComponent(url).includes(currentKeyword)) {
                    // 🆕 searchCoord 검증: API URL에서 좌표 추출 후 타겟과 비교
                    try {
                        const coordMatch = url.match(/searchCoord=([\d.]+);([\d.]+)/);
                        if (coordMatch && currentTargetLat && currentTargetLng) {
                            const searchLng = parseFloat(coordMatch[1]);
                            const searchLat = parseFloat(coordMatch[2]);
                            const dLat = (searchLat - currentTargetLat) * 111320;
                            const dLng = (searchLng - currentTargetLng) * 111320 * Math.cos(currentTargetLat * Math.PI / 180);
                            const distanceM = Math.sqrt(dLat * dLat + dLng * dLng);
                            if (distanceM > 500) {
                                console.log(`[Scraper Ex2] ⚠️ LOCATION MISMATCH! searchCoord (${searchLat.toFixed(4)}, ${searchLng.toFixed(4)}) is ${Math.round(distanceM)}m from target (${currentTargetLat.toFixed(4)}, ${currentTargetLng.toFixed(4)})`);
                                isLocationMismatch = true;
                                return; // 이 응답은 무시 (isJsonHit = false 유지)
                            }
                        }
                    } catch (e) {
                        // searchCoord 파싱 실패 시 검증 스킵
                    }

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
        // 🆕 페이지 로드 및 초기화 1회
        await page.goto('https://map.naver.com/p', { waitUntil: 'load', timeout: 60000 });
        console.log('[Scraper Ex2] ⏳ Page loaded. Waiting for JS initialization...');
        await delay(5000);

        // 🆕 렌더링 체크 (1회, 실패 시 새로고침)
        try {
            console.log('[Scraper Ex2] ⏳ Waiting for map scale indicator (Render Check)...');
            await page.locator('span').filter({ hasText: /^\d+(m|km)$/ }).first().waitFor({ state: 'visible', timeout: 30000 });
            console.log('[Scraper Ex2] 🗺️ Map fully rendered (Scale indicator found)');
        } catch (e) {
            console.log('[Scraper Ex2] ⚠️ Scale indicator not found. Reloading page...');
            await page.reload({ waitUntil: 'load', timeout: 60000 });
            await delay(5000);
            console.log('[Scraper Ex2] 🔄 Page reloaded. Continuing...');
        }

        // ========== 🆕 Phase 1: 초기 타일 렌더링 체크 (최대 2분) ==========
        console.log('[Scraper Ex2] 🗺️ Phase 1: Waiting for initial map tile rendering...');
        let mapReady = await waitForMapTiles(tileCounter, 120000);

        if (!mapReady) {
            // ========== 🆕 Phase 2: 좌표 입력 후 재확인 (최대 2분) ==========
            console.log('[Scraper Ex2] ⚠️ Phase 1 failed. Trying with coordinate entry...');
            try {
                await moveToLocation(page, tasks[0].lat, tasks[0].lng);
                await forceZoomIn(page);

                console.log('[Scraper Ex2] 🗺️ Phase 2: Waiting for map tiles after coordinate entry...');
                mapReady = await waitForMapTiles(tileCounter, 120000);

                if (!mapReady) {
                    throw new Error('MAP_INIT_FAILED: Map tiles never loaded after coordinate entry');
                }
            } catch (e) {
                const errMsg = e instanceof Error ? e.message : 'Unknown';
                console.log(`[Scraper Ex2] ❌ Map initialization failed! Error: ${errMsg}`);
                throw new Error(`MAP_INIT_FAILED: ${errMsg}`);
            }
        }
        console.log('[Scraper Ex2] ✅ Map ready! Proceeding with scraping...');

        await forceZoomIn(page); // 초기 줌인

        // ========== Task 루프 ==========
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
            const { lat, lng, keyword, targetBusinessName } = task;
            onProgress?.(i, tasks.length);

            let taskStartTime = Date.now();

            // 🆕 JSON 인터셉터 초기화 (매 Task)
            interceptedPlaces = [];
            isJsonHit = false;
            isLocationMismatch = false;
            currentKeyword = keyword;
            currentTargetLat = lat;
            currentTargetLng = lng;

            // 🆕 첫 번째 Task 워밍업 (결과 버림)
            if (i === 0) {
                console.log('[Scraper Ex2] 🔥 Warmup run for Task 1 (result will be discarded)...');
                try {
                    // 워밍업: 이동, 줌인, 검색 (결과는 버림)
                    await moveToLocation(page, lat, lng);
                    await forceZoomIn(page);

                    // 검색
                    const warmupClearBtn = page.locator('.btn_clear');
                    if (await warmupClearBtn.isVisible()) await warmupClearBtn.click();
                    const warmupSearchInput = page.locator('input.input_search');
                    await warmupSearchInput.click();
                    await warmupSearchInput.fill(keyword);
                    await warmupSearchInput.press('Enter');

                    // JSON 대기 (워밍업용, 짧게)
                    await delay(3000);
                    console.log('[Scraper Ex2] ✅ Warmup complete.');
                } catch (e) {
                    console.log('[Scraper Ex2] ❌ Warmup failed! Aborting session (Fail Fast)...');
                    throw new Error('WARMUP_FAILED: Proxy connection unstable');
                }

                // 워밍업 후 상태 초기화
                await resetSearchState(page);

                // JSON 인터셉터 재초기화 (중요!)
                interceptedPlaces = [];
                isJsonHit = false;

                // 시간 재측정 (워밍업 시간 제외)
                taskStartTime = Date.now();
                console.log('[Scraper Ex2] 🚀 Starting real Task 1...');
            }

            try {
                // Step 1: 좌표 이동
                await moveToLocation(page, lat, lng);

                // Step 2: 줌인
                await forceZoomIn(page);

                // Step 3: Persistent Retry Loop (최대 5회 엔터 재시도)
                const MAX_SEARCH_RETRY = 5;
                let taskResults: NaverPlaceResult[] = [];

                for (let attempt = 1; attempt <= MAX_SEARCH_RETRY; attempt++) {
                    try {
                        // 검색창 초기화 및 입력
                        const searchInputSelector = 'input.input_search';
                        const clearBtn = page.locator('.btn_clear');
                        if (await clearBtn.isVisible()) await clearBtn.click();

                        const searchInput = page.locator(searchInputSelector);
                        await searchInput.click();
                        await searchInput.fill(keyword);

                        // JSON 인터셉터 리셋 (Enter 직전! stale response 간섭 방지)
                        interceptedPlaces = [];
                        isJsonHit = false;
                        isLocationMismatch = false;

                        console.log(`[Scraper Ex2] 🔎 Searching: "${keyword}" (Attempt ${attempt}/${MAX_SEARCH_RETRY})...`);
                        await searchInput.press('Enter');

                        // JSON 대기 (5초)
                        const maxWaitTime = 5000;
                        const checkInterval = 100;
                        let elapsed = 0;
                        while (!isJsonHit && elapsed < maxWaitTime) {
                            await delay(checkInterval);
                            elapsed += checkInterval;
                        }

                        // 🎯 Case 1: JSON 성공
                        if (isJsonHit && interceptedPlaces.length > 0) {
                            console.log(`[Scraper Ex2] 🚀 Fast Kill! Using JSON Data.`);
                            taskResults = interceptedPlaces.slice(0, NAVER_SCRAPER_CONFIG.maxResults);
                            break; // 성공!
                        }

                        // ⚠️ Case 2: JSON 실패 -> 재시도
                        if (attempt < MAX_SEARCH_RETRY) {
                            // 🆕 위치 오류 감지 시 좌표 재이동
                            if (isLocationMismatch) {
                                console.log(`[Scraper Ex2] 🔄 Location mismatch detected. Re-moving to (${lat}, ${lng})...`);
                                await resetSearchState(page);
                                await moveToLocation(page, lat, lng);
                                isLocationMismatch = false;
                            } else {
                                console.log(`[Scraper Ex2] ⚠️ JSON Missed. Retrying (${attempt}/${MAX_SEARCH_RETRY})...`);
                                // 입력창 값 확인 후 재입력
                                const inputValue = await page.locator('input.input_search').inputValue();
                                if (!inputValue || inputValue !== keyword) {
                                    console.log(`[Scraper Ex2] 🔄 Re-typing keyword...`);
                                    const clearBtn = page.locator('.btn_clear');
                                    if (await clearBtn.isVisible()) await clearBtn.click();
                                    await page.locator('input.input_search').fill(keyword);
                                }
                            }
                            await delay(1000);
                        } else {
                            console.log(`[Scraper Ex2] ❌ All ${MAX_SEARCH_RETRY} retries failed. Returning empty result.`);
                        }

                    } catch (e) {
                        console.log(`[Scraper Ex2] ⚠️ Search execution failed: ${e}`);
                        if (attempt < MAX_SEARCH_RETRY) {
                            await resetSearchState(page);
                            await delay(1000);
                        }
                    }
                }

                if (isJsonHit) {
                    console.log(`[Scraper Ex2] 🚀 Fast Kill! Using JSON Data.`);
                }

                // 데이터 사용량 로그
                console.log(`[Scraper Ex2] 📊 Data Usage for Task: ${(currentTaskDataUsage / 1024).toFixed(2)} KB`);


                // Step 6: 타겟 순위 찾기
                let targetRank: number | null = null;
                if (targetBusinessName) {
                    const matchedResult = taskResults.find(r =>
                        isBusinessMatch(r.businessName, targetBusinessName)
                    );
                    targetRank = matchedResult?.rank ?? null;
                    console.log(`[Scraper Ex2] Target "${targetBusinessName}" rank: ${targetRank ?? 'Not found'}`);
                }

                const taskDuration = (Date.now() - taskStartTime) / 1000;
                console.log(`[Scraper Ex2] ✅ Task ${i + 1}/${tasks.length}: ⏱️ ${taskDuration.toFixed(2)}s`);

                results.push({
                    success: true,
                    results: taskResults,
                    targetRank,
                    scrapedAt: new Date().toISOString(),
                    keyword: task.keyword,
                    gridIndex: task.gridIndex,
                    lat: task.lat,
                    lng: task.lng,
                    dataUsageBytes: 0,
                    durationSeconds: taskDuration
                });

            } catch (error) {
                const err = error instanceof Error ? error.message : 'Unknown';
                console.error(`[Scraper Ex2] ❌ Task ${i + 1} Error: ${err}`);
                results.push({
                    success: false,
                    results: [],
                    targetRank: null,
                    scrapedAt: new Date().toISOString(),
                    error: err,
                    keyword: task.keyword,
                    gridIndex: task.gridIndex,
                    lat: task.lat,
                    lng: task.lng,
                    dataUsageBytes: 0,
                    durationSeconds: (Date.now() - taskStartTime) / 1000
                });
            }

            // 🆕 다음 검색을 위한 상태 초기화
            if (i < tasks.length - 1) {
                await resetSearchState(page);
                await delay(500);
            }
        }
    } finally {
        await context.close();
        await browser.close();
        const totalDuration = (Date.now() - batchStartTime) / 1000;
        console.log(`[Scraper Ex2] 🏁 Batch Complete! Total Time: ${totalDuration.toFixed(1)}s`);
    }

    return results;
}
