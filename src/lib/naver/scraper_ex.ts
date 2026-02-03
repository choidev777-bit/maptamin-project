/**
 * Naver Place Scraper v5.0 (Hybrid: Network Intercept + DOM Fallback)
 * 
 * "JSON 데이터 탈취"를 우선 시도하고, 실패하면 "화면 파싱"으로 넘어가는 하이브리드 전략
 * 
 * @description
 * 1. Network Intercept: '/graphql' 또는 'place' 관련 API 응답을 감청하여 JSON 데이터 직접 확보
 * 2. Fast Kill: 데이터 확보 즉시 브라우저 로딩 중단 (속도 3배 향상)
 * 3. Fallback Safety: 네트워크 구조 변경 등으로 탈취 실패 시, 기존 DOM 파싱 로직(v4) 자동 실행
 * 4. Robust Ad Filter: .place_blind 및 SVG 클래스 기반의 강력한 광고 필터링
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

// ==========================================
// Shared Helpers
// ==========================================

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 리소스 차단 적용 (속도 향상)
 */
async function applyResourceBlocking(page: Page): Promise<void> {
    await page.route('**/*', async (route) => {
        const request = route.request();
        const resourceType = request.resourceType();
        const url = request.url();

        // 1. 리소스 타입 체크 (이미지, 폰트 등 차단)
        const BLOCKED_TYPES = ['image', 'media', 'font', 'stylesheet', 'imageset', 'texttrack', 'beacon', 'csp_report'];
        if (BLOCKED_TYPES.includes(resourceType)) return route.abort();

        // 2. URL 패턴 체크 (지도 타일은 위치 정확도를 위해 허용할 수도 있으나, 
        //    v5에서는 JSON이 목적이므로 타일조차 차단해도 될 수 있음. 
        //    하지만 Fallback을 위해 타일은 허용하는 것이 안전)
        const BLOCKED_PATTERNS = [
            'log.naver', 'google-analytics', 'panorama', 'street-view',
            '.png', '.jpg', '.gif', '.woff' // 확장자 기반 차단
        ];

        if (BLOCKED_PATTERNS.some(p => url.includes(p))) return route.abort();

        return route.continue();
    });
}

/**
 * 지도 강제 줌인 (Fallback용)
 */
async function forceZoomIn(page: Page) {
    try { await page.mouse.click(500, 500); } catch (e) { }
    for (let i = 0; i < 6; i++) {
        await page.keyboard.press('=');
        await page.keyboard.press('+');
        await delay(100); // v5: 딜레이 단축
    }
    await delay(200);
}

/**
 * 좌표 이동 (Fallback용)
 */
async function moveToLocation(page: Page, lat: number, lng: number) {
    const searchInputSelector = 'input.input_search';
    await page.waitForSelector(searchInputSelector, { state: 'visible', timeout: 5000 });
    const searchInput = page.locator(searchInputSelector);
    await searchInput.click();
    await searchInput.clear();
    await searchInput.fill(`${lat},${lng}`);
    await searchInput.press('Enter');
    console.log(`[Scraper v5] 📍 Moving to (${lat}, ${lng})`);
    await delay(1500); // 안정화 대기
}

/**
 * DOM 파싱 (Fallback용) - 강화된 광고 필터 포함
 */
async function parseSearchResultsInFrame(frame: Frame): Promise<NaverPlaceResult[]> {
    const results: NaverPlaceResult[] = [];
    try {
        await delay(1000);
        const places = await frame.evaluate(() => {
            const items: Array<{ name: string; rank: number }> = [];
            const nameElements = document.querySelectorAll('span.TYaxT');

            nameElements.forEach((el, index) => {
                const li = el.closest('li');
                if (!li) return;

                // [강화된 광고 필터]
                const isLegacyAd = li.querySelector('.ad_mark');
                const isBlindAd = li.querySelector('.place_blind')?.textContent?.includes('광고');
                const isSvgAd = li.querySelector('.place_ad_label_text') || li.querySelector('.place_ad_label_border');
                const isTextAd = li.textContent?.includes('광고');

                if (isLegacyAd || isBlindAd || isSvgAd || isTextAd) return;

                const name = el.textContent?.trim();
                if (name) items.push({ name, rank: items.length + 1 });
            });
            return items;
        });

        places.forEach(p => results.push({ rank: p.rank, businessName: p.name }));
    } catch (error) {
        console.error('[Scraper v5] DOM Parsing failed:', error);
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

    // 1️⃣ 네트워크 감청 장치 설치
    page.on('response', async (response) => {
        const url = response.url();

        // Target API: 'api/search/allSearch' (Log confirmed)
        if (url.includes('api/search/allSearch')) {
            try {
                // Query Check (URL에 포함된 경우)
                // 예: .../allSearch?query=쌀국수...
                if (decodeURIComponent(url).includes(keyword)) {
                    const json = await response.json();

                    // JSON Parsing Strategy (allSearch Response)
                    // 보통 result.place.list 또는 result.site.list 구조
                    let items: any[] = [];

                    if (json?.result?.place?.list) {
                        items = json.result.place.list;
                    } else if (json?.result?.site?.list) {
                        items = json.result.site.list;
                    } else if (json?.result?.list) {
                        items = json.result.list;
                    }

                    if (items && Array.isArray(items) && items.length > 0) {
                        console.log(`[Scraper v5] 🎯 JSON HIT! Intercepted ${items.length} items from 'allSearch'.`);

                        // Parse JSON Items
                        interceptedPlaces = items.map((item: any, index: number) => ({
                            rank: index + 1,
                            businessName: item.name || item.title || 'Unknown',
                            naverPlaceId: item.id,
                            address: item.roadAddress || item.addr || '',
                            isAd: item.isAd || item.adId ? true : false
                        })).filter(p => !p.isAd); // 필터링

                        // 랭킹 재조정
                        interceptedPlaces = interceptedPlaces.map((p, i) => ({ ...p, rank: i + 1 }));

                        isJsonHit = true;
                    }
                }
            } catch (e) {
                // Ignore parsing errors
                console.log(`[Scraper v5] JSON Parsing Error for ${url}:`, e);
            }
        }
    });

    try {
        // ========== Step 1 ~ 3: 이동 및 줌인 (기존 로직 유지) ==========
        await page.goto('https://map.naver.com/p', { waitUntil: 'domcontentloaded' });
        await delay(1500);
        await forceZoomIn(page);

        // 좌표 이동 (필수: 서버가 IP 기반이 아닌 해당 위치 데이터를 보내게 하려면 이동해야 함)
        await moveToLocation(page, lat, lng);
        await forceZoomIn(page);

        // ========== Step 4: 키워드 검색 ==========
        const searchInputSelector = 'input.input_search';
        const clearBtn = page.locator('.btn_clear');
        if (await clearBtn.isVisible()) await clearBtn.click();
        else {
            const input = page.locator(searchInputSelector);
            await input.click();
            await input.clear();
        }
        await delay(300);

        const searchInput = page.locator(searchInputSelector);
        await searchInput.click();
        await searchInput.fill(keyword);

        console.log(`[Scraper v5] 🔎 Searching: "${keyword}"...`);

        // 2️⃣ 검색 실행 (이때 네트워크 요청 발생 -> 리스너 낚아채임)
        await searchInput.press('Enter');

        // 3️⃣ [Fast Kill] JSON 기다리기 (최대 3초)
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
            console.log(`[Scraper v5] 🚀 Fast Kill! Using JSON Data.`);
            results = interceptedPlaces.slice(0, NAVER_SCRAPER_CONFIG.maxResults);
        } else {
            // ⚠️ Case B: JSON Fail -> DOM Fallback
            console.log(`[Scraper v5] ⚠️ JSON Missed. Fallback to DOM parsing...`);

            const frames = page.frames();
            const searchFrame = frames.find(f => f.name() === 'searchIframe');

            // iframe 기다리기 (최대 5초)
            if (!searchFrame) await delay(2000); // 렌더링 대기

            const freshFrames = page.frames();
            const freshSearchFrame = freshFrames.find(f => f.name() === 'searchIframe');

            if (freshSearchFrame) {
                try {
                    await freshSearchFrame.waitForSelector('span.TYaxT', { timeout: 8000 });
                    results = await parseSearchResultsInFrame(freshSearchFrame);
                } catch (e) {
                    console.log('[Scraper v5] Fallback failed: Element not found');
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
            console.log(`[Scraper v5] Target "${targetBusinessName}" rank: ${targetRank ?? 'Not found'}`);
        }

        return {
            success: true,
            results,
            targetRank,
            scrapedAt: new Date().toISOString(),
        };

    } catch (error) {
        const err = error instanceof Error ? error.message : 'Unknown';
        console.error(`[Scraper v5] Critical Error: ${err}`);
        return { success: false, results: [], targetRank: null, scrapedAt: new Date().toISOString(), error: err };
    }
}


// ==========================================
// Batch Export (Wrapper)
// ==========================================

export async function scrapeNaverBatch(
    tasks: NaverScrapeTask[],
    onProgress?: ProgressCallback,
    searchId?: string,
    checkJobExists?: (searchId: string) => Promise<boolean>
): Promise<NaverScrapeBatchResult[]> {
    const results: NaverScrapeBatchResult[] = [];
    console.log(`[Scraper v5] Starting V5 Batch: ${tasks.length} tasks`);

    // 배치 전체 시간 측정용
    const batchStartTime = Date.now();

    const browser = await chromium.launch({ headless: true });

    try {
        for (let i = 0; i < tasks.length; i++) {
            // 좀비 체크
            if (searchId && checkJobExists) {
                const jobExists = await checkJobExists(searchId);
                if (!jobExists) {
                    console.log(`[Zombie Killer] 🛑 Job ${searchId} was cancelled. Stopping.`);
                    break;
                }
            }

            const task = tasks[i];
            onProgress?.(i, tasks.length);

            const context = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                locale: 'ko-KR',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            });
            const page = await context.newPage();
            page.setDefaultTimeout(20000);

            // [측정] CDP 세션 시작 (데이터 사용량 정밀 측정)
            let totalEncodedBytes = 0;
            const cdpSession = await context.newCDPSession(page);
            await cdpSession.send('Network.enable');
            cdpSession.on('Network.loadingFinished', (params: { encodedDataLength?: number }) => {
                if (params.encodedDataLength) {
                    totalEncodedBytes += params.encodedDataLength;
                }
            });

            const taskStartTime = Date.now();
            await applyResourceBlocking(page);

            const result = await scrapeOnPage(page, task);

            // [보정] Fast Kill의 경우 CDP 이벤트가 아직 도착 안 했을 수 있으므로 잠시 대기
            await delay(200);

            const taskDuration = (Date.now() - taskStartTime) / 1000;
            const dataUsageMB = (totalEncodedBytes / 1024 / 1024).toFixed(2);

            console.log(`[Scraper v5] ✅ Task ${i + 1}/${tasks.length} complete: ⏱️ ${taskDuration.toFixed(2)}s, 📊 ${dataUsageMB} MB`);

            results.push({
                ...result,
                keyword: task.keyword,
                gridIndex: task.gridIndex,
                lat: task.lat,
                lng: task.lng,
                dataUsageBytes: totalEncodedBytes,
                durationSeconds: taskDuration
            });

            await context.close();

            if (i < tasks.length - 1) await delay(1000);
        }
    } finally {
        await browser.close();

        // ========== [New] 누적 통계 출력 ==========
        const batchEndTime = Date.now();
        const totalBatchDuration = (batchEndTime - batchStartTime) / 1000;
        const totalBatchBytes = results.reduce((acc, r) => acc + (r.dataUsageBytes || 0), 0);
        const totalBatchMB = (totalBatchBytes / 1024 / 1024).toFixed(2);

        console.log(`[Scraper v5] 🏁 Batch Complete!`);
        console.log(`[Scraper v5] 📉 Total Data Replaced: ${totalBatchMB} MB`);
        console.log(`[Scraper v5] ⏱️  Total Duration: ${totalBatchDuration.toFixed(1)}s`);
        console.log(`[Scraper v5] 🔌 Global browser closed.`);
    }

    return results;
}
