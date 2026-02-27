/**
 * Retry Logic Tests for scrapeNaverBatch (scraper_ex2.ts)
 *
 * Tests the multi-round retry with session rotation behavior.
 * Playwright is fully mocked — these are pure unit tests for retry logic.
 */

// ── Mock references (accessed inside jest.mock factories via closures) ──
const mockPageClose = jest.fn();
const mockPageSetDefaultTimeout = jest.fn();
const mockPageRoute = jest.fn().mockResolvedValue(undefined);
const mockPageGoto = jest.fn().mockResolvedValue(undefined);
const mockPageEvaluate = jest.fn().mockResolvedValue(null);
const mockPageContent = jest.fn().mockResolvedValue('<html></html>');

const mockContextClose = jest.fn();
const mockContextNewPage = jest.fn().mockImplementation(() =>
    Promise.resolve({
        setDefaultTimeout: mockPageSetDefaultTimeout,
        route: mockPageRoute,
        goto: mockPageGoto,
        evaluate: mockPageEvaluate,
        content: mockPageContent,
        close: mockPageClose,
    })
);

const mockBrowserClose = jest.fn();
const mockBrowserNewContext = jest.fn().mockImplementation(() =>
    Promise.resolve({
        newPage: mockContextNewPage,
        close: mockContextClose,
    })
);

// ── jest.mock calls (hoisted to top by Jest) ──

jest.mock('playwright', () => ({
    chromium: {
        launch: jest.fn().mockImplementation(() =>
            Promise.resolve({
                newContext: mockBrowserNewContext,
                close: mockBrowserClose,
            })
        ),
    },
}));

jest.mock('../config', () => ({
    NAVER_SCRAPER_CONFIG: {
        delayBetweenRequests: 0,
        maxRetries: 3,
        retryDelay: 0,
        maxResults: 70,
    },
}));

jest.mock('../utils', () => ({
    isBusinessMatch: jest.fn((a: string, b: string) => a === b),
}));

import { scrapeNaverBatch } from '../scraper_ex2';
import { NaverScrapeTask } from '../types';

// ── Helpers ──

function createTask(overrides?: Partial<NaverScrapeTask>): NaverScrapeTask {
    return {
        keyword: '콜키지프리 고기집',
        lat: 37.55037,
        lng: 126.91052,
        gridIndex: 0,
        targetBusinessName: '국제양식',
        ...overrides,
    };
}

const APOLLO_STATE_SUCCESS = {
    'PlaceSummary:123': {
        id: '123',
        name: '국제양식',
        category: '육류,고기요리',
        roadAddress: '서울시 마포구',
        address: '서울시 마포구',
        newOpening: null,
    },
};

/**
 * Configure mockPageEvaluate to return success/fail for sequential calls.
 */
function setupApolloResponses(callResults: ('success' | 'fail')[]) {
    let callCount = 0;
    mockPageEvaluate.mockImplementation(() => {
        const result = callResults[callCount] || 'fail';
        callCount++;
        return result === 'success' ? { ...APOLLO_STATE_SUCCESS } : null;
    });
    mockPageContent.mockResolvedValue('<html></html>');
}

// ── Tests ──

describe('scrapeNaverBatch - Multi-Round Retry with Session Rotation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('모든 Task가 첫 시도에서 성공하면 재시도 라운드가 실행되지 않는다', async () => {
        const tasks = [
            createTask({ gridIndex: 0 }),
            createTask({ gridIndex: 1, lat: 37.551 }),
        ];

        setupApolloResponses(['success', 'success']);

        const results = await scrapeNaverBatch(tasks);

        expect(results).toHaveLength(2);
        expect(results[0].results.length).toBeGreaterThan(0);
        expect(results[1].results.length).toBeGreaterThan(0);

        // browser.newContext called only ONCE (main loop context only)
        expect(mockBrowserNewContext).toHaveBeenCalledTimes(1);
    });

    test('일부 Task 실패 → 재시도 라운드에서 새 BrowserContext가 생성된다', async () => {
        const tasks = [
            createTask({ gridIndex: 0 }),
            createTask({ gridIndex: 1, lat: 37.551 }),
        ];

        // Task 1 succeeds, Task 2 fails in main loop, succeeds in retry round 1
        setupApolloResponses(['success', 'fail', 'success']);

        const results = await scrapeNaverBatch(tasks);

        // Main context + 1 retry context = 2
        expect(mockBrowserNewContext).toHaveBeenCalledTimes(2);
    });

    test('재시도 라운드에서 모든 실패 Task가 복구되면 남은 라운드를 건너뛴다 (조기 종료)', async () => {
        const tasks = [
            createTask({ gridIndex: 0 }),
            createTask({ gridIndex: 1, lat: 37.551 }),
            createTask({ gridIndex: 2, lat: 37.552 }),
        ];

        // All fail in main, all succeed in round 1 → rounds 2,3 skipped
        setupApolloResponses([
            'fail', 'fail', 'fail',        // main: 3 fail
            'success', 'success', 'success', // round 1: 3 success
        ]);

        const results = await scrapeNaverBatch(tasks);

        expect(results).toHaveLength(3);
        // Main + round 1 = 2 (rounds 2,3 never created)
        expect(mockBrowserNewContext).toHaveBeenCalledTimes(2);
    });

    test('maxRetries(3) 라운드 모두 실패하면 빈 결과를 반환한다 (무한루프 방지)', async () => {
        const tasks = [createTask({ gridIndex: 0 })];

        // All fail: main + 3 rounds = 4 evaluate calls
        setupApolloResponses(['fail', 'fail', 'fail', 'fail']);

        const results = await scrapeNaverBatch(tasks);

        expect(results).toHaveLength(1);
        expect(results[0].results).toHaveLength(0);

        // Main + 3 retry rounds = 4 contexts
        expect(mockBrowserNewContext).toHaveBeenCalledTimes(4);
    });

    test('좀비 킬러가 false 반환 시 재시도가 즉시 중단된다', async () => {
        const tasks = [
            createTask({ gridIndex: 0 }),
            createTask({ gridIndex: 1, lat: 37.551 }),
        ];

        setupApolloResponses(['fail', 'fail']);

        const mockJobCheck = jest.fn()
            .mockResolvedValueOnce(true)   // main: task 1
            .mockResolvedValueOnce(true)   // main: task 2
            .mockResolvedValueOnce(false); // retry round 1 start → cancelled

        const results = await scrapeNaverBatch(tasks, undefined, 'search-123', mockJobCheck);

        // No retry context created because zombie check fails first
        expect(mockBrowserNewContext).toHaveBeenCalledTimes(1);
    });

    test('성공한 Task는 재시도에서 제외된다', async () => {
        const tasks = [
            createTask({ gridIndex: 0 }),
            createTask({ gridIndex: 1, lat: 37.551 }),
            createTask({ gridIndex: 2, lat: 37.552 }),
        ];

        // Main: task1=success, task2=fail, task3=fail
        // Round 1: task2=success, task3=fail (only 2 tasks retried)
        // Round 2: task3=success (only 1 task retried)
        let evalCount = 0;
        mockPageEvaluate.mockImplementation(() => {
            evalCount++;
            const successCalls = [1, 4, 6]; // 1=main task1, 4=round1 task2, 6=round2 task3
            return successCalls.includes(evalCount) ? { ...APOLLO_STATE_SUCCESS } : null;
        });
        mockPageContent.mockResolvedValue('<html></html>');

        const results = await scrapeNaverBatch(tasks);

        expect(results).toHaveLength(3);
        expect(results[0].results.length).toBeGreaterThan(0);
        expect(results[1].results.length).toBeGreaterThan(0);
        expect(results[2].results.length).toBeGreaterThan(0);

        // Main + round 1 + round 2 = 3
        expect(mockBrowserNewContext).toHaveBeenCalledTimes(3);
    });

    test('browser는 항상 정상적으로 close된다 (리소스 누수 방지)', async () => {
        const tasks = [createTask({ gridIndex: 0 })];

        setupApolloResponses(['fail', 'fail', 'fail', 'fail']);

        await scrapeNaverBatch(tasks);

        expect(mockBrowserClose).toHaveBeenCalledTimes(1);
        // All contexts closed: main + 3 retry rounds = 4
        expect(mockContextClose).toHaveBeenCalledTimes(4);
    });
});
