/**
 * Naver Place Scraper Ex2 (V7 - List API Only)
 * 
 * Process:
 * 1. 브라우저+프록시 컨텍스트 생성
 * 2. 각 좌표마다 List API URL 조립 → HTML 파싱 → __APOLLO_STATE__ 추출
 * 3. 광고 필터링 후 최대 70개 결과 반환
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

// ==========================================
// Shared Helpers
// ==========================================

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// 🆕 List API Direct Fetch (70개 결과)
// ==========================================

/**
 * List API를 직접 호출하여 최대 70개 검색 결과를 가져옵니다.
 * 
 * 원리:
 * 1. /place/list URL을 좌표+키워드로 조립
 * 2. Playwright 브라우저 컨텍스트에서 새 탭으로 접속 (프록시+쿠키 유지)
 * 3. HTML 내 __APOLLO_STATE__ JSON에서 가게 데이터 추출
 * 4. adDescription이 있는 광고 항목 제외
 * 
 * 네이버가 /place/list → /restaurant/list 등으로 자동 리다이렉트
 */
async function fetchListApiResults(
    context: BrowserContext,
    lat: number,
    lng: number,
    keyword: string
): Promise<{ results: NaverPlaceResult[]; dataUsageBytes: number }> {
    const listUrl = `https://pcmap.place.naver.com/place/list?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&display=70&locale=ko`;
    console.log(`[Scraper Ex2] 📡 List API 요청: ${listUrl.substring(0, 100)}...`);

    let newPage: Page | null = null;
    try {
        // 같은 브라우저 컨텍스트에서 새 탭 열기 (프록시+쿠키 공유)
        newPage = await context.newPage();
        newPage.setDefaultTimeout(30000);

        // 리소스 차단 (CSS/JS/이미지/폰트 등 불필요한 리소스 블록)
        await newPage.route('**/*', (route) => {
            const resourceType = route.request().resourceType();
            if (['stylesheet', 'image', 'media', 'font'].includes(resourceType)) {
                return route.abort();
            }
            return route.continue();
        });

        // List API 페이지 로드
        await newPage.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // __APOLLO_STATE__ 추출 (브라우저 내에서 직접 접근)
        const apolloState = await newPage.evaluate(() => {
            try {
                return (window as any).__APOLLO_STATE__ || null;
            } catch {
                return null;
            }
        });

        // 데이터 사용량 측정 (HTML 크기)
        const html = await newPage.content();
        const dataUsageBytes = Buffer.byteLength(html, 'utf8');

        if (!apolloState) {
            // fallback: HTML에서 정규식으로 추출 시도
            const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({[\s\S]+?});\s*<\/script>/);
            if (!match) {
                console.log('[Scraper Ex2] ❌ __APOLLO_STATE__ 없음');
                return { results: [], dataUsageBytes };
            }
            try {
                const parsed = JSON.parse(match[1]);
                return { results: extractPlacesFromApolloState(parsed), dataUsageBytes };
            } catch (e) {
                console.log('[Scraper Ex2] ❌ __APOLLO_STATE__ JSON 파싱 실패');
                return { results: [], dataUsageBytes };
            }
        }

        return { results: extractPlacesFromApolloState(apolloState), dataUsageBytes };

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown';
        console.log(`[Scraper Ex2] ⚠️ List API 요청 실패: ${errMsg}`);
        return { results: [], dataUsageBytes: 0 };
    } finally {
        if (newPage) {
            try { await newPage.close(); } catch { /* ignore */ }
        }
    }
}

/**
 * __APOLLO_STATE__ 객체에서 가게 데이터를 추출합니다.
 * - "ListSummary:" 키 패턴으로 가게 항목 필터링
 * - adDescription이 있으면 광고로 제외
 */
function extractPlacesFromApolloState(apolloState: Record<string, any>): NaverPlaceResult[] {
    const results: NaverPlaceResult[] = [];

    for (const [key, value] of Object.entries(apolloState)) {
        // "RestaurantListSummary:", "HairshopListSummary:", "PlaceListSummary:" 등 매칭
        if (!key.includes('ListSummary:')) continue;
        if (!value || typeof value !== 'object') continue;
        if (!value.name || !value.id) continue;

        // 🚫 광고 필터링
        if (value.adDescription) continue;

        // 🚫 신규 오픈 광고 필터링
        if (value.newOpening === true) continue;

        results.push({
            rank: results.length + 1,
            businessName: value.name,
            naverPlaceId: String(value.id),
            category: value.category || '',
            address: value.roadAddress || value.address || '',
        });
    }

    console.log(`[Scraper Ex2] ✅ List API: ${results.length}개 결과 추출 (광고 제외)`);
    return results.slice(0, NAVER_SCRAPER_CONFIG.maxResults);
}


// ==========================================
// Batch Export (V7 - List API Only)
// ==========================================

export async function scrapeNaverBatch(
    tasks: NaverScrapeTask[],
    onProgress?: ProgressCallback,
    searchId?: string,
    checkJobExists?: (searchId: string) => Promise<boolean>
): Promise<NaverScrapeBatchResult[]> {
    const results: NaverScrapeBatchResult[] = [];
    console.log(`[Scraper Ex2] Starting V7 List API Batch: ${tasks.length} tasks`);

    const batchStartTime = Date.now();
    const browser = await chromium.launch({ headless: true });

    // 프록시 세션 ID 1회 생성 (고정)
    const sessionID = Math.random().toString(36).substring(7);
    const username = process.env.BRIGHT_DATA_USERNAME || '';
    const password = process.env.BRIGHT_DATA_PASSWORD || '';
    const host = process.env.BRIGHT_DATA_HOST || '';
    const port = process.env.BRIGHT_DATA_PORT || '';
    const proxyUsername = username ? `${username}-session-${sessionID}` : '';

    // Context 생성 (프록시 설정)
    const contextOptions: any = {
        viewport: { width: 1280, height: 720 },
        locale: 'ko-KR',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        timezoneId: 'Asia/Seoul',
        ignoreHTTPSErrors: true,
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

    let totalDataUsage = 0;

    try {
        // ========== Task 루프 (List API 전용) ==========
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

            const taskStartTime = Date.now();

            try {
                // List API 호출 (URL 조립 → HTML → __APOLLO_STATE__ 파싱)
                const { results: taskResults, dataUsageBytes: taskDataUsage } = await fetchListApiResults(context, lat, lng, keyword);
                totalDataUsage += taskDataUsage;

                if (taskResults.length > 0) {
                    console.log(`[Scraper Ex2] 🚀 List API 성공! ${taskResults.length}개 결과`);
                } else {
                    console.log(`[Scraper Ex2] ⚠️ List API 결과 0개`);
                }

                // 타겟 순위 찾기
                let targetRank: number | null = null;
                if (targetBusinessName) {
                    const matchedResult = taskResults.find(r =>
                        isBusinessMatch(r.businessName, targetBusinessName)
                    );
                    targetRank = matchedResult?.rank ?? null;
                    console.log(`[Scraper Ex2] Target "${targetBusinessName}" rank: ${targetRank ?? 'Not found'}`);
                }

                const taskDuration = (Date.now() - taskStartTime) / 1000;
                console.log(`[Scraper Ex2] ✅ Task ${i + 1}/${tasks.length}: ⏱️ ${taskDuration.toFixed(2)}s | 📊 ${(taskDataUsage / 1024).toFixed(0)} KB`);

                results.push({
                    success: true,
                    results: taskResults,
                    targetRank,
                    scrapedAt: new Date().toISOString(),
                    keyword: task.keyword,
                    gridIndex: task.gridIndex,
                    lat: task.lat,
                    lng: task.lng,
                    dataUsageBytes: taskDataUsage,
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
        }
    } finally {
        await context.close();
        await browser.close();
        const totalDuration = (Date.now() - batchStartTime) / 1000;
        console.log(`[Scraper Ex2] 🏁 Batch Complete! Total Time: ${totalDuration.toFixed(1)}s | 📊 Total Data: ${(totalDataUsage / 1024).toFixed(0)} KB (${(totalDataUsage / 1024 / 1024).toFixed(2)} MB)`);
    }

    return results;
}
