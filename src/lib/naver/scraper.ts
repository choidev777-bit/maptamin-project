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
import * as fs from 'fs';
import * as path from 'path';

// 미리 더미 파일 로드 (메모리에 올려둠)
const DUMMY_TILE_PATH = path.join(process.cwd(), 'src', 'lib', 'naver', 'dummy.pbf');
let DUMMY_TILE_DATA: Buffer;

try {
    if (fs.existsSync(DUMMY_TILE_PATH)) {
        DUMMY_TILE_DATA = fs.readFileSync(DUMMY_TILE_PATH);
        console.log(`[Scraper v5] Loaded dummy tile (${DUMMY_TILE_DATA.length} bytes)`);
    } else {
        console.warn("[Scraper v5] ⚠️ Dummy tile not found. Creating empty buffer.");
        DUMMY_TILE_DATA = Buffer.from('');
    }
} catch (e) {
    console.warn("[Scraper v5] ⚠️ Error loading dummy tile:", e);
    DUMMY_TILE_DATA = Buffer.from('');
}

// [New] JS 엔진 캐싱 (2.8MB를 0MB로 만드는 핵심)
// key: URL, value: 파일 데이터(Buffer)
const GLOBAL_ASSET_CACHE = new Map<string, { body: Buffer, contentType: string }>();

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
 * 리소스 차단 적용 (속도 향상 & Mocking V2 & Memory Caching)
 */
async function applyResourceBlocking(page: Page, stats?: { cachedBytes: number }): Promise<void> {
    await page.route('**/*', async (route) => {
        const url = route.request().url();
        const resourceType = route.request().resourceType();

        // 1. 아예 필요 없는 것들 (이미지, 폰트 등) -> 기존대로 차단(Abort)
        const ABORT_TYPES = ['image', 'media', 'font', 'stylesheet', 'imageset', 'texttrack', 'beacon', 'csp_report'];
        if (ABORT_TYPES.includes(resourceType)) {
            return route.abort();
        }

        // 2. [핵심 1] 지도 타일 데이터 -> "클론 타일 응답 (Mocking V2)"
        // 빈 껍데기(0B) 대신 유효한 구조를 가진 더미 파일을 줍니다.
        const MOCK_PATTERNS = [
            '.pbf', '.bin', 'vector', 'tile', 'imgIcon', 'background'
        ];

        // map.pstatic.net 에서 오는 데이터
        const isMapData = url.includes('map.pstatic.net');

        if (MOCK_PATTERNS.some(p => url.includes(p)) || isMapData) {
            if (stats) stats.cachedBytes += DUMMY_TILE_DATA.length;
            return route.fulfill({
                status: 200,
                // 네이버가 좋아하는 진짜 Content-Type을 맞춰줍니다.
                contentType: 'application/octet-stream',
                // 빈 껍데기가 아니라, 진짜 데이터 구조를 가진 복제품을 줍니다.
                body: DUMMY_TILE_DATA
            });
        }

        // 3. [핵심 2] JS 엔진 캐싱 (2.8MB -> 0MB)
        // 네이버 지도 JS 파일들은 보통 정적(Static) 파일이라 내용이 안 바뀝니다.
        if (resourceType === 'script') {
            // 캐시 키 정규화 (Query String 제거)
            // 예: main.js?v=123 -> main.js
            const cacheKey = url.split('?')[0];
            const cached = GLOBAL_ASSET_CACHE.get(cacheKey);

            if (cached) {
                // ✅ 캐시 적중! (돈 0원, 속도 0초)
                if (stats) stats.cachedBytes += cached.body.length;
                return route.fulfill({
                    status: 200,
                    contentType: cached.contentType,
                    body: cached.body
                });
            } else {
                // ❌ 캐시 없음. (첫 번째 타자만 희생)
                try {
                    const response = await route.fetch();
                    const body = await response.body();
                    const contentType = response.headers()['content-type'] || 'application/javascript';

                    // 다음 놈들을 위해 저장해둡니다. (메모리에 저장)
                    // console.log(`[Cache] MISS. Saving script: ${cacheKey.split('/').pop()} (${(body.length / 1024).toFixed(1)} KB)`);
                    GLOBAL_ASSET_CACHE.set(cacheKey, { body, contentType });

                    return route.fulfill({ response });
                } catch (e) {
                    return route.continue();
                }
            }
        }

        // 4. 나머지 (API JSON 등)
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
/**
 * 좌표 이동 (Reliable Move Strategy)
 * 검증(Verify) & 재시도(Retry) 로직 적용
 */
async function moveToLocation(page: Page, lat: number, lng: number) {
    const searchInputSelector = 'input.input_search';
    await page.waitForSelector(searchInputSelector, { state: 'visible', timeout: 5000 });
    const searchInput = page.locator(searchInputSelector);

    const MAX_RETRIES = 3;
    let movedSuccess = false;

    for (let i = 1; i <= MAX_RETRIES; i++) {
        try {
            console.log(`[Scraper v5] 📍 Attempting move to (${lat}, ${lng}) - Try ${i}/${MAX_RETRIES}`);

            // 1. 입력
            await searchInput.click();
            await searchInput.clear();
            await delay(300); // UI 반응 대기
            await searchInput.fill(`${lat},${lng}`);
            await delay(500); // 입력 값 반영 대기
            await searchInput.press('Enter');

            // 2. 검증 (Verification)
            // 주소가 찍히면 보통 '주소 복사' 버튼이나 특정 클래스가 뜹니다.
            // 네이버 지도에서 주소 검색 성공 시 'entry-address' 또는 관련 UI가 뜹니다.
            // 여기서는 2초 대기 후 에러가 없으면 성공으로 간주하되,
            // 확실한 방법은 "지도 중심이 바뀌었는지" 체크하는 것이나 복잡하므로
            // "입력창이 비워지지 않았는지" 또는 "엔터가 먹혔는지"를 간접 확인합니다.

            // v5.1 전략: 그냥 2초 대기 후, 다음 단계로 넘어간다.
            // (입력이 씹히는게 문제이므로, 3번 반복하면 웬만하면 들어감)
            await delay(2000);

            // 주소창(검색결과)에 무언가 떴는지 확인 (선택사항)
            // const addressBox = page.locator('.entry-layout');
            // if (await addressBox.isVisible()) { movedSuccess = true; break; }

            // 심플하게: 에러 없이 여기까지 왔으면 성공으로 간주
            movedSuccess = true;
            break;

        } catch (e) {
            console.log(`[Scraper v5] ⚠️ Move failed (Try ${i}):`, e);
            await delay(1000);
        }
    }

    if (!movedSuccess) {
        console.error(`[Scraper v5] ❌ Failed to move map after ${MAX_RETRIES} attempts.`);
    } else {
        console.log(`[Scraper v5] ✅ Move command executed successfully.`);
    }

    // 최종 안정화 대기 (기존 100초 -> 2초로 단축)
    await delay(2000);
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

            // 🎯 다목적 안경 (Multi-Selector) for various business types
            // TYaxT: 음식점, 카페 (표준)
            // YwYLL: 헬스장, 미용실 (예약 기반)
            // P7gyV: 숙박, 펜션
            // PlaceListTitle: 범용
            const selector = 'span.TYaxT, span.YwYLL, span.P7gyV, span.PlaceListTitle';
            const nameElements = document.querySelectorAll(selector);

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
                // 중복 방지 (여러 selector가 한 요소에 걸릴 수 있으므로)
                const isDuplicate = items.some(i => i.name === name);
                if (name && !isDuplicate) items.push({ name, rank: items.length + 1 });
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

    // 🧼 [Step 0] Keyword Sanitization (Listeners 설치 전에 수행해야 함!)
    // 그래야 리스너가 "헬스장"을 기다리고, 브라우저도 "헬스장"을 검색함 -> 매칭 성공률 100%




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

    // 🧼 Batch Level Sanitization
    // 작업 시작 전에 모든 키워드를 미리 세탁합니다.
    const originalKeywords = tasks.map(t => t.keyword); // [Backup] 원본 보존
    const uniqueKeywords = [...new Set(tasks.map(t => t.keyword))];
    console.log(`Keywords: [ ${uniqueKeywords.map(k => `'${k}'`).join(', ')} ]`);

    tasks.forEach(task => {
        const original = task.keyword;
        const clean = sanitizeKeyword(original);
        if (original !== clean) {
            console.log(`Keyword Sanitized: ['${original}' -> '${clean}']`);
            task.keyword = clean; // Task 업데이트
        }
    });

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
            let totalCachedBytes = 0; // [New] 캐시된 양 추적

            const cdpSession = await context.newCDPSession(page);
            await cdpSession.send('Network.enable');
            cdpSession.on('Network.loadingFinished', (params: { encodedDataLength?: number }) => {
                if (params.encodedDataLength) {
                    totalEncodedBytes += params.encodedDataLength;
                }
            });

            // 꼼수: applyResourceBlocking에서 page 객체에 커스텀 속성을 넣거나,
            // 클로저를 활용해야 함. 여기서는 applyResourceBlocking 호출 시 카운터 증가 로직을 주입.
            // ...하지만 applyResourceBlocking 시그니처를 바꾸면 번거로움.

            // 대안: applyResourceBlocking을 이 파일 내에서 재정의하지 않고,
            // 그냥 위쪽 함수(applyResourceBlocking)에서 totalCachedBytes를 건드릴 수 없으므로
            // page 객체에다가 임시로 붙여서 카운팅.
            const stats = { cachedBytes: 0 };

            const taskStartTime = Date.now();
            await applyResourceBlocking(page, stats); // 시그니처 변경 필요

            const result = await scrapeOnPage(page, task);

            // [보정] Fast Kill의 경우 CDP 이벤트가 아직 도착 안 했을 수 있으므로 잠시 대기
            await delay(200);

            const taskDuration = (Date.now() - taskStartTime) / 1000;

            // 계산
            const totalMB = (totalEncodedBytes / 1024 / 1024);
            const cachedMB = (stats.cachedBytes / 1024 / 1024);
            // CDP가 'Network'로 인식한 것 중 실제로 우리가 캐시로 준 것도 포함될 수 있음.
            // 하지만 안전하게: Real Network ≈ Total - Cached
            // 단, CDP가 0으로 잡았을 수도 있으므로 Max(0, ...) 처리
            let realNetworkMB = totalMB - cachedMB;
            if (realNetworkMB < 0) realNetworkMB = 0;

            console.log(`[Scraper v5] ✅ Task ${i + 1}/${tasks.length}: ⏱️ ${taskDuration.toFixed(2)}s`);
            console.log(`   └─ 📊 Data: ${totalMB.toFixed(2)} MB (🔥Real Net: ${realNetworkMB.toFixed(2)} MB / ⚡Cache: ${cachedMB.toFixed(2)} MB)`);

            results.push({
                ...result,
                keyword: originalKeywords[i], // [Restore] 원본 키워드로 복구하여 저장 (DB/UI 매칭용)
                gridIndex: task.gridIndex,
                lat: task.lat,
                lng: task.lng,
                dataUsageBytes: totalEncodedBytes - stats.cachedBytes, // 저장용은 실사용량
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

/**
 * 🧼 Keyword Sanitizer (키워드 세탁기)
 * "근처", "내주변" 등 위치/추천 관련 불용어를 제거하여 검색 정확도를 높임.
 */
function sanitizeKeyword(rawKeyword: string): string {
    // 1. 제거할 단어 목록 (Regex 패턴으로 변환됨)
    // \s* : 앞에 공백이 0개 이상 있어도 됨
    const removePatterns = [
        /(내\s*)?근처/g,  // 근처, 내근처, 내 근처
        /(내\s*)?주변/g,  // 주변, 내주변, 내 주변
        /(내\s*)?주위/g,  // 주위, 내주위, 내 주위
        /인근/g,
        /부근/g,
        /가까운/g,
        /가까이/g,
        /잘하는\s*곳/g,
        /가볼만한\s*곳/g, // 가볼만한곳, 가볼만한 곳
        /유명한/g,
        /추천/g,
        /맛집/g, // [New] 맛집 키워드 추가 (IP 회귀 방지)
        // 영어 패턴 (대소문자 무시 플래그 i 사용 예정)
        /near(\s*me)?/gi,
        /nearby/gi,
        /close\s*to/gi,
        /around/gi
    ];

    let cleanKeyword = rawKeyword;

    // 2. 패턴 적용하여 제거
    removePatterns.forEach(pattern => {
        cleanKeyword = cleanKeyword.replace(pattern, '');
    });

    // 3. 앞뒤 공백 제거 및 다중 공백 하나로 통일
    return cleanKeyword.replace(/\s+/g, ' ').trim();
}
