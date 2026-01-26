/**
 * Naver Place Scraper Types
 * 
 * 네이버 지도 스크래핑 관련 타입 정의
 */

/**
 * 네이버 검색 결과 단일 항목
 */
export interface NaverPlaceResult {
    rank: number;
    businessName: string;
    category?: string;
    address?: string;
    naverPlaceId?: string;
    distance?: string;
}

/**
 * 스크래핑 옵션
 */
export interface ScrapeOptions {
    lat: number;
    lng: number;
    keyword: string;
    targetBusinessName?: string;  // 순위를 찾을 비즈니스명
}

/**
 * 스크래핑 결과
 */
export interface ScrapeResult {
    success: boolean;
    results: NaverPlaceResult[];
    targetRank: number | null;  // 타겟 비즈니스 순위 (없으면 null)
    error?: string;
    scrapedAt: string;  // ISO 날짜
    dataUsageBytes?: number; // 데이터 사용량 (bytes)
    durationSeconds?: number; // 소요 시간 (초)
}

/**
 * 배치 스크래핑 태스크
 */
export interface NaverScrapeTask {
    keyword: string;
    lat: number;
    lng: number;
    gridIndex: number;
    targetBusinessName?: string;
}

/**
 * 배치 스크래핑 결과
 */
export interface NaverScrapeBatchResult extends ScrapeResult {
    keyword: string;
    gridIndex: number;
    lat: number;
    lng: number;
}

/**
 * 스크래퍼 상태
 */
export type ScraperStatus = 'idle' | 'running' | 'completed' | 'failed';

/**
 * 진행률 콜백 타입
 */
export type ProgressCallback = (completed: number, total: number) => void;
