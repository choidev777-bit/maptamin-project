/**
 * Extraction Logic Tests for extractPlacesFromApolloState (scraper_ex2.ts)
 *
 * Tests the ROOT_QUERY-based extraction approach.
 * Verifies: correct ranking, newOpening inclusion, filterOpening exclusion,
 *           ad filtering, category variations, and fallback behavior.
 */

// ── Mock dependencies ──
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

// We need to test the internal function extractPlacesFromApolloState.
// Since it's not exported, we import the module and test via the exported function indirectly,
// OR we re-export it for testing. For now, we'll test via a helper that mimics the extraction.
// 
// Strategy: We'll test by importing extractPlacesFromApolloState after making it exported,
// or we test through scrapeNaverBatch with mocked page.evaluate returning our test apollo states.
// 
// For minimal change, we'll mock playwright and test through the batch function,
// similar to how scraper_ex2.retry.test.ts works.

const mockPageClose = jest.fn();
const mockPageSetDefaultTimeout = jest.fn();
const mockPageRoute = jest.fn().mockResolvedValue(undefined);
const mockPageGoto = jest.fn().mockResolvedValue(undefined);
const mockPageEvaluate = jest.fn();
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

import { scrapeNaverBatch } from '../scraper_ex2';
import { NaverScrapeTask } from '../types';

// ── Helpers ──

function createTask(overrides?: Partial<NaverScrapeTask>): NaverScrapeTask {
    return {
        keyword: '빵',
        lat: 37.6787,
        lng: 126.7657,
        gridIndex: 0,
        targetBusinessName: '달콤붕어살롱',
        ...overrides,
    };
}

/**
 * ROOT_QUERY 구조를 가진 Apollo State 생성 헬퍼
 * 실제 네이버 데이터 구조를 모방합니다.
 */
function createApolloStateWithRootQuery(options: {
    mainListItems: Array<{ id: string; name: string; newOpening?: boolean; adDescription?: string | null; category?: string; roadAddress?: string }>;
    newOpeningItems?: Array<{ id: string; name: string; newOpening?: boolean; adDescription?: string | null; category?: string; roadAddress?: string }>;
    listKeyPrefix?: string; // e.g., 'restaurantList', 'hairshopList'
    summaryKeyPrefix?: string; // e.g., 'RestaurantListSummary', 'HairshopListSummary'
}): Record<string, any> {
    const {
        mainListItems,
        newOpeningItems = [],
        listKeyPrefix = 'restaurantList',
        summaryKeyPrefix = 'RestaurantListSummary',
    } = options;

    const state: Record<string, any> = {};

    // Build entity objects
    for (const item of [...mainListItems, ...newOpeningItems]) {
        const key = `${summaryKeyPrefix}:${item.id}:${item.id}`;
        // Only set if not already set (avoid duplicates like 달콤붕어살롱 in both lists)
        if (!state[key]) {
            state[key] = {
                id: item.id,
                name: item.name,
                newOpening: item.newOpening ?? null,
                adDescription: item.adDescription ?? null,
                category: item.category ?? '베이커리',
                roadAddress: item.roadAddress ?? '경기도 고양시',
                address: item.roadAddress ?? '경기도 고양시',
            };
        }
    }

    // Build ROOT_QUERY
    const mainListKey = `${listKeyPrefix}({"input":{"display":70,"filterOpening":null,"query":"빵"}})`;
    const newOpeningListKey = `${listKeyPrefix}({"input":{"display":9,"filterOpening":true,"query":"빵"}})`;

    state['ROOT_QUERY'] = {
        __typename: 'Query',
        [mainListKey]: {
            items: mainListItems.map(item => ({
                __ref: `${summaryKeyPrefix}:${item.id}:${item.id}`,
            })),
        },
    };

    // Only add newOpening list if there are items
    if (newOpeningItems.length > 0) {
        state['ROOT_QUERY'][newOpeningListKey] = {
            items: newOpeningItems.map(item => ({
                __ref: `${summaryKeyPrefix}:${item.id}:${item.id}`,
            })),
        };
    }

    return state;
}

// ── Tests ──

describe('extractPlacesFromApolloState - ROOT_QUERY 기반 추출', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('1. 메인 리스트의 items 순서대로 순위가 매겨진다', async () => {
        const apolloState = createApolloStateWithRootQuery({
            mainListItems: [
                { id: '100', name: '펌스브레드샵' },
                { id: '200', name: '베이커리 아씨시' },
                { id: '300', name: '파리바게뜨 일산역점' },
            ],
        });

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask({ targetBusinessName: '베이커리 아씨시' })]);

        expect(results[0].results).toHaveLength(3);
        expect(results[0].results[0].businessName).toBe('펌스브레드샵');
        expect(results[0].results[0].rank).toBe(1);
        expect(results[0].results[1].businessName).toBe('베이커리 아씨시');
        expect(results[0].results[1].rank).toBe(2);
        expect(results[0].results[2].businessName).toBe('파리바게뜨 일산역점');
        expect(results[0].results[2].rank).toBe(3);
        expect(results[0].targetRank).toBe(2);
    });

    test('2. newOpening: true이면서 메인 리스트에 있는 매장은 정상 포함된다', async () => {
        const apolloState = createApolloStateWithRootQuery({
            mainListItems: [
                { id: '100', name: '펌스브레드샵' },
                { id: '2008482723', name: '달콤붕어살롱', newOpening: true }, // 핵심 케이스
                { id: '300', name: '베이커리 아씨시' },
            ],
        });

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask({ targetBusinessName: '달콤붕어살롱' })]);

        expect(results[0].results).toHaveLength(3);
        expect(results[0].results[1].businessName).toBe('달콤붕어살롱');
        expect(results[0].results[1].rank).toBe(2);
        expect(results[0].targetRank).toBe(2);
    });

    test('3. "새로 오픈했어요" 섹션 전용 매장은 메인 리스트에 없으므로 결과에 포함되지 않는다', async () => {
        const apolloState = createApolloStateWithRootQuery({
            mainListItems: [
                { id: '100', name: '펌스브레드샵' },
                { id: '2008482723', name: '달콤붕어살롱', newOpening: true }, // 양쪽 존재
                { id: '300', name: '베이커리 아씨시' },
            ],
            newOpeningItems: [
                { id: '2008482723', name: '달콤붕어살롱', newOpening: true }, // 중복 (메인에도 있음)
                { id: '400', name: '카페 밤빙고 정발산점', newOpening: true }, // 새로오픈 전용
                { id: '500', name: '몽킽키친 밤리단길점', newOpening: true }, // 새로오픈 전용
            ],
        });

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask()]);

        // 메인 리스트 3개만 포함, 새로오픈 전용 2개(카페 밤빙고, 몽킽키친)는 제외
        expect(results[0].results).toHaveLength(3);
        const names = results[0].results.map(r => r.businessName);
        expect(names).toContain('달콤붕어살롱'); // 메인에 있으므로 포함
        expect(names).not.toContain('카페 밤빙고 정발산점'); // 새로오픈 전용 → 제외
        expect(names).not.toContain('몽킽키친 밤리단길점'); // 새로오픈 전용 → 제외
    });

    test('4. adDescription이 있는 항목은 여전히 제외된다', async () => {
        const apolloState = createApolloStateWithRootQuery({
            mainListItems: [
                { id: '100', name: '펌스브레드샵' },
                { id: '200', name: '광고 매장', adDescription: '맛있는 빵집 광고' },
                { id: '300', name: '베이커리 아씨시' },
            ],
        });

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask({ targetBusinessName: undefined })]);

        // 광고 매장은 제외되므로 2개만 나와야 함
        expect(results[0].results).toHaveLength(2);
        const names = results[0].results.map(r => r.businessName);
        expect(names).not.toContain('광고 매장');
        // 광고 제외 후 순위 재할당
        expect(results[0].results[0].rank).toBe(1);
        expect(results[0].results[1].rank).toBe(2);
    });

    test('5. hairshopList 등 다른 카테고리 키에서도 정상 동작한다', async () => {
        const apolloState = createApolloStateWithRootQuery({
            mainListItems: [
                { id: '100', name: '헤어살롱 A' },
                { id: '200', name: '미용실 B' },
            ],
            listKeyPrefix: 'hairshopList',
            summaryKeyPrefix: 'HairshopListSummary',
        });

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask({ targetBusinessName: '미용실 B' })]);

        expect(results[0].results).toHaveLength(2);
        expect(results[0].results[0].businessName).toBe('헤어살롱 A');
        expect(results[0].results[1].businessName).toBe('미용실 B');
        expect(results[0].targetRank).toBe(2);
    });

    test('5-1. places() 키 (헬스장, 필라테스 등)에서도 정상 동작한다', async () => {
        const apolloState = createApolloStateWithRootQuery({
            mainListItems: [
                { id: '100', name: '피트니스 A' },
                { id: '200', name: '헬스장 B' },
                { id: '300', name: '필라테스 C' },
            ],
            listKeyPrefix: 'places',
            summaryKeyPrefix: 'PlaceSummary',
        });

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask({ targetBusinessName: '헬스장 B' })]);

        expect(results[0].results).toHaveLength(3);
        expect(results[0].results[1].businessName).toBe('헬스장 B');
        expect(results[0].targetRank).toBe(2);
    });

    test('5-2. hospitals() 키 (병원)에서도 정상 동작한다', async () => {
        const apolloState = createApolloStateWithRootQuery({
            mainListItems: [
                { id: '100', name: '연세내과' },
                { id: '200', name: '서울치과' },
            ],
            listKeyPrefix: 'hospitals',
            summaryKeyPrefix: 'HospitalSummary',
        });

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask({ targetBusinessName: '서울치과' })]);

        expect(results[0].results).toHaveLength(2);
        expect(results[0].results[1].businessName).toBe('서울치과');
        expect(results[0].targetRank).toBe(2);
    });

    test('6. ROOT_QUERY가 없으면 기존 flat scan 방식으로 fallback한다', async () => {
        // ROOT_QUERY 없는 Apollo State (기존 형태)
        const apolloState: Record<string, any> = {
            'PlaceSummary:123': {
                id: '123',
                name: '국제양식',
                category: '육류,고기요리',
                roadAddress: '서울시 마포구',
                address: '서울시 마포구',
                newOpening: null,
            },
            'PlaceSummary:456': {
                id: '456',
                name: '스타벅스',
                category: '카페',
                roadAddress: '서울시 강남구',
                address: '서울시 강남구',
                newOpening: null,
            },
        };

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask({ targetBusinessName: '국제양식' })]);

        // Fallback으로 flat scan → 결과가 있어야 함
        expect(results[0].results.length).toBeGreaterThan(0);
    });

    test('7. ROOT_QUERY의 items 배열이 비어있으면 빈 결과를 반환한다', async () => {
        const apolloState: Record<string, any> = {
            'ROOT_QUERY': {
                __typename: 'Query',
                'restaurantList({"input":{"display":70,"filterOpening":null}})': {
                    items: [],
                },
            },
        };

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask()]);

        expect(results[0].results).toHaveLength(0);
        expect(results[0].targetRank).toBeNull();
    });

    test('8. __ref가 가리키는 키가 apolloState에 없으면 해당 항목을 건너뛴다', async () => {
        const apolloState: Record<string, any> = {
            'RestaurantListSummary:100:100': {
                id: '100',
                name: '펌스브레드샵',
                category: '베이커리',
                roadAddress: '경기도',
                address: '경기도',
                newOpening: null,
            },
            // 'RestaurantListSummary:999:999' 는 의도적으로 없음
            'ROOT_QUERY': {
                __typename: 'Query',
                'restaurantList({"input":{"display":70,"filterOpening":null}})': {
                    items: [
                        { __ref: 'RestaurantListSummary:100:100' },
                        { __ref: 'RestaurantListSummary:999:999' }, // 존재하지 않는 ref
                    ],
                },
            },
        };

        mockPageEvaluate.mockResolvedValueOnce(apolloState);

        const results = await scrapeNaverBatch([createTask({ targetBusinessName: undefined })]);

        // 존재하지 않는 ref는 건너뛰고 1개만 나와야 함
        expect(results[0].results).toHaveLength(1);
        expect(results[0].results[0].businessName).toBe('펌스브레드샵');
        expect(results[0].results[0].rank).toBe(1);
    });
});
