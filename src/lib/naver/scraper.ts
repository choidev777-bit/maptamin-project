/**
 * Naver Place Scraper v5.0 (Hybrid + Proxy Enhanced)
 * 
 * 1. Network Intercept: '/graphql' 또는 'place' 관련 API 응답을 감청하여 JSON 데이터 확보
 * 2. Fast Kill: 데이터 확보 즉시 중단
 * 3. Proxy Rotation: Bright Data Residential IP + Session Randomization 적용
 * 4. Strict Location Verification: 중심점 거리 30m 이내 정밀 타격
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
// Constants & Configuration
// ==========================================

const MAX_LOCATION_RETRIES = 5;         // 끈질긴 재시도 (5회)
const DISTANCE_THRESHOLD_METERS = 150;  // 허용 오차 150m (대형 상권 중심점 오차 반영)

// ==========================================
// Shared Helpers
// ==========================================

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 📏 거리 계산 함수 (m 단위)
 * Haversine 공식의 간소화 버전 (유클리드 거리 + 위도 보정)
 * 작은 거리(수 km 이내)에서는 충분히 정확함
 */
function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // 지구 반지름 (미터)
    const toRad = Math.PI / 180;

    // 위도 보정 계수 (한국 약 0.8)
    const correctionFactor = Math.cos(lat1 * toRad);

    const dLat = (lat2 - lat1) * toRad;
    const dLng = (lng2 - lng1) * toRad * correctionFactor;

    // 단순 피타고라스 (작은 거리 근사)
    // 정확한 Haversine보다 계산 빠르고, 30m 판별엔 차이 없음
    const a = (dLat * dLat) + (dLng * dLng);
    const c = Math.sqrt(a);
    const distance = c * R;

    return distance;
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
 * 좌표 이동 (Reliable Move Strategy)
 * 단순 이동 수행 (검증은 결과 처리 단계에서 수행)
 */
async function moveToLocation(page: Page, lat: number, lng: number) {
    const searchInputSelector = 'input.input_search';
    await page.waitForSelector(searchInputSelector, { state: 'visible', timeout: 5000 });
    const searchInput = page.locator(searchInputSelector);

    try {
        console.log(`[Scraper v5] 📍 Moving to (${lat}, ${lng})...`);

        // 1. 입력
        await searchInput.click();
        await searchInput.clear();
        await delay(300); // UI 반응 대기
        await searchInput.fill(`${lat},${lng}`);
        await delay(500); // 입력 값 반영 대기
        await searchInput.press('Enter');

        // 2. URL 검증 - 좌표 페이지로 이동했는지 확인
        try {
            await page.waitForURL(/\/entry\/coordinates\//, { timeout: 5000 });
        } catch (timeout) {
            console.log("[Scraper v5] ⚠️ Move warning: URL did not change to coordinates page.");
        }

        // 최종 안정화 대기
        await delay(1000);

    } catch (e) {
        console.log(`[Scraper v5] ⚠️ Move operation failed:`, e);
    }
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

    let interceptedPlaces: NaverPlaceResult[] = [];
    let isJsonHit = false;
    let isBoundaryValid = false;
    let isLocationError = false;

    page.on('response', async (response) => {
        const url = response.url();

        if (url.includes('api/search/allSearch')) {
            try {
                const json = await response.json();
                let items: any[] = [];

                if (json?.result?.place?.list) items = json.result.place.list;
                else if (json?.result?.site?.list) items = json.result.site.list;
                else if (json?.result?.list) items = json.result.list;

                if (items && Array.isArray(items) && items.length > 0) {
                    console.log(`[Scraper v5] 🎯 JSON HIT! Intercepted ${items.length} items.`);

                    // 🗺️ Strict Location Verification
                    const boundary = json?.result?.place?.boundary;

                    if (boundary && Array.isArray(boundary) && boundary.length === 4) {
                        const b = boundary.map(Number);
                        const minLng = Math.min(b[0], b[2]);
                        const maxLng = Math.max(b[0], b[2]);
                        const minLat = Math.min(b[1], b[3]);
                        const maxLat = Math.max(b[1], b[3]);

                        // 중심점 계산
                        const centerLat = (minLat + maxLat) / 2;
                        const centerLng = (minLng + maxLng) / 2;

                        // 거리 계산
                        const distanceMeters = calculateDistanceMeters(lat, lng, centerLat, centerLng);

                        if (distanceMeters <= DISTANCE_THRESHOLD_METERS) {
                            console.log(`[Scraper v5] ✅ Location Verified (Dist: ${distanceMeters.toFixed(1)}m)`);
                            isBoundaryValid = true;
                        } else {
                            console.log(`[Scraper v5] ⚠️ Location Mismatch! (Dist: ${distanceMeters.toFixed(1)}m > ${DISTANCE_THRESHOLD_METERS}m)`);
                            console.log(`   Target: (${lat}, ${lng}) vs Map: (${centerLat.toFixed(6)}, ${centerLng.toFixed(6)})`);
                            isBoundaryValid = false;
                        }
                    } else {
                        console.log(`[Scraper v5] ❌ Boundary Missing! Cannot verify location.`);
                        isBoundaryValid = false; // Boundary 없으면 실패 처리
                    }

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
            } catch (e) {
                // Ignore parsing errors
                // console.log(`[Scraper v5] JSON Parsing Error for ${url}:`, e);
            }
        }
    });

    try {
        let results: NaverPlaceResult[] = [];
        let retryCount = 0;

        // 🔄 Main Retry Loop
        while (retryCount <= MAX_LOCATION_RETRIES) {

            // 재시도 시 로그 출력
            if (retryCount > 0) {
                console.log(`[Scraper v5] 🔄 Retry Attempt ${retryCount}/${MAX_LOCATION_RETRIES}...`);
            }

            // 1. 이동 및 검색 수행
            try {
                // 페이지 새로고침 (Clear Cache)
                if (retryCount > 0) {
                    await page.reload({ waitUntil: 'domcontentloaded' });
                    await delay(1000);
                } else {
                    await page.goto('https://map.naver.com/p', { waitUntil: 'domcontentloaded' });
                    await delay(1500);
                }

                await forceZoomIn(page);
                await moveToLocation(page, lat, lng);
                await forceZoomIn(page);

                const searchInputSelector = 'input.input_search';
                const clearBtn = page.locator('.btn_clear');
                if (await clearBtn.isVisible()) await clearBtn.click();

                const searchInput = page.locator(searchInputSelector);
                await searchInput.click();
                await searchInput.fill(keyword);
                await delay(300);

                // 데이터 초기화
                isJsonHit = false;
                isBoundaryValid = false;
                interceptedPlaces = [];

                console.log(`[Scraper v5] 🔎 Searching: "${keyword}"...`);
                await searchInput.press('Enter');

                // JSON 대기
                const maxWaitTime = 3000;
                const checkInterval = 100;
                let elapsed = 0;
                while (!isJsonHit && elapsed < maxWaitTime) {
                    await delay(checkInterval);
                    elapsed += checkInterval;
                }

            } catch (navError) {
                console.log(`[Scraper v5] Navigation error:`, navError);
                // 네비게이션 에러 시 재시도 카운트 증가 후 continue
                retryCount++;
                continue;
            }

            // 2. 결과 검증
            if (isJsonHit) {
                if (isBoundaryValid) {
                    // ✅ 성공
                    console.log(`[Scraper v5] 🚀 Success! Location Verified.`);
                    results = interceptedPlaces.slice(0, NAVER_SCRAPER_CONFIG.maxResults);
                    break;
                } else {
                    // ❌ 위치 불일치
                    retryCount++;
                    if (retryCount > MAX_LOCATION_RETRIES) {
                        isLocationError = true;
                        throw new Error(`Location verification failed after ${MAX_LOCATION_RETRIES} retries.`);
                    }
                    continue; // 재시도
                }
            } else {
                // ⚠️ JSON 실패 -> DOM Fallback
                console.log(`[Scraper v5] ⚠️ JSON Missed. Fallback to DOM parsing...`);

                // DOM Fallback은 위치 검증이 불가능하므로 경고 로그 남김
                console.log(`[Scraper v5] ⚠️ WARNING: DOM results are unverified for location accuracy.`);

                const frames = page.frames();
                const searchFrame = frames.find(f => f.name() === 'searchIframe');
                if (!searchFrame) await delay(2000);

                const freshFrames = page.frames();
                const freshSearchFrame = freshFrames.find(f => f.name() === 'searchIframe');

                if (freshSearchFrame) {
                    try {
                        await freshSearchFrame.waitForSelector('span.TYaxT', { timeout: 8000 });
                        results = await parseSearchResultsInFrame(freshSearchFrame);
                    } catch (e) { }
                }
                break; // DOM은 재시도 안 함
            }
        }

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
    const uniqueKeywords = [...new Set(tasks.map(t => t.keyword))];
    console.log(`Keywords: [ ${uniqueKeywords.map(k => `'${k}'`).join(', ')} ]`);
    console.log(`[Scraper v5] Starting Proxy-Enhanced Batch: ${tasks.length} tasks`);

    const batchStartTime = Date.now();

    // Browser Launch (Global)
    const browser = await chromium.launch({ headless: true });

    try {
        for (let i = 0; i < tasks.length; i++) {
            if (searchId && checkJobExists) {
                const jobExists = await checkJobExists(searchId);
                if (!jobExists) {
                    console.log(`[Zombie Killer] 🛑 Job ${searchId} was cancelled.`);
                    break;
                }
            }

            const task = tasks[i];
            onProgress?.(i, tasks.length);

            // 🛡️ Proxy Configuration (Dynamic Session ID)
            // 매 Task마다 새로운 세션 ID를 생성하여 IP 회전을 강제함
            const sessionID = Math.random().toString(36).substring(7);
            const username = process.env.BRIGHT_DATA_USERNAME || '';
            const password = process.env.BRIGHT_DATA_PASSWORD || '';
            const host = process.env.BRIGHT_DATA_HOST || '';
            const port = process.env.BRIGHT_DATA_PORT || '';

            // 유저네임에 세션 ID 추가 (Bright Data 표준)
            const proxyUsername = username ? `${username}-session-${sessionID}` : '';

            const contextOptions: any = {
                viewport: { width: 1280, height: 720 },
                locale: 'ko-KR',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                timezoneId: 'Asia/Seoul', // 타임존도 한국으로 명시
                permissions: ['geolocation'], // 위치 권한 허용
                geolocation: { latitude: task.lat, longitude: task.lng }, // 브라우저 레벨 위치 설정
            };

            // 프록시 정보가 있으면 적용
            if (host && port && username && password) {
                contextOptions.proxy = {
                    server: `http://${host}:${port}`,
                    username: proxyUsername,
                    password: password
                };
                console.log(`[Scraper v5] 🛡️ Proxy Active (Session: ${sessionID})`);
            } else {
                console.warn(`[Scraper v5] ⚠️ Proxy config missing. Running with direct connection.`);
            }

            const context = await browser.newContext(contextOptions);
            const page = await context.newPage();

            // Residential Proxy는 느릴 수 있으므로 타임아웃 60초로 증가
            page.setDefaultTimeout(60000);

            // CDP & Stats logic ...
            let totalEncodedBytes = 0;
            const cdpSession = await context.newCDPSession(page);
            await cdpSession.send('Network.enable');
            cdpSession.on('Network.loadingFinished', (params: { encodedDataLength?: number }) => {
                if (params.encodedDataLength) totalEncodedBytes += params.encodedDataLength;
            });

            const stats = { cachedBytes: 0 };
            const taskStartTime = Date.now();
            await applyResourceBlocking(page, stats);

            // 🚀 EXECUTE SCRAPE
            const result = await scrapeOnPage(page, task);

            await delay(200);
            const taskDuration = (Date.now() - taskStartTime) / 1000;
            const totalMB = (totalEncodedBytes / 1024 / 1024);
            const cachedMB = (stats.cachedBytes / 1024 / 1024);
            let realNetworkMB = totalMB - cachedMB;
            if (realNetworkMB < 0) realNetworkMB = 0;

            console.log(`[Scraper v5] ✅ Task ${i + 1}/${tasks.length}: ⏱️ ${taskDuration.toFixed(2)}s`);
            console.log(`   └─ 📊 Data: ${totalMB.toFixed(2)} MB (🔥Real: ${realNetworkMB.toFixed(2)} MB)`);

            results.push({
                ...result,
                keyword: task.keyword,
                gridIndex: task.gridIndex,
                lat: task.lat,
                lng: task.lng,
                dataUsageBytes: totalEncodedBytes - stats.cachedBytes,
                durationSeconds: taskDuration
            });

            await context.close(); // Session Exit (IP Release)
            if (i < tasks.length - 1) await delay(1000);
        }
    } finally {
        await browser.close();

        const totalBatchDuration = (Date.now() - batchStartTime) / 1000;
        console.log(`[Scraper v5] 🏁 Batch Complete! Total Time: ${totalBatchDuration.toFixed(1)}s`);
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
