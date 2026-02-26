/**
 * 히어로 섹션 3단계 순위 애니메이션 데이터 + 유틸리티
 *
 * 스토리: 맵타민을 사용하면 "근처 카페" 그리드 순위가 개선되고,
 *         그 결과 "홍대 카페" 검색 상위 노출을 달성하는 과정을 보여줌
 *
 * 재생 순서: Stage 3(목표) → Stage 1(현실) → Stage 2(개선) → Stage 3(달성) 루프
 */

// ─── Types ──────────────────────────────────────────────

/** 각 스테이지의 메타 정보 */
export interface StageMeta {
    /** "홍대 카페" 검색 시 맵타민네 카페 순위 */
    searchRank: number
    /** 표시 라벨 */
    label: string
}

// ─── 7×7 Grid Data (순위 숫자) ──────────────────────────
// 🟢 초록 (1-5), 🟡 노랑 (6-10), 🔴 빨강 (11-20)
// 중심 좌표 (3,3)이 "맵타민네 카페" 위치

/** Stage 1: 현실 — 부족한 상태 */
const STAGE_1: number[][] = [
    [12, 14, 13, 15, 11, 12, 14],
    [13, 7, 11, 8, 12, 14, 13],
    [12, 8, 6, 3, 7, 9, 11],
    [14, 9, 4, 2, 8, 12, 15],
    [13, 11, 7, 4, 9, 14, 13],
    [12, 14, 8, 13, 11, 15, 14],
    [11, 13, 9, 12, 14, 13, 12],
]

/** Stage 2: 개선 중 */
const STAGE_2: number[][] = [
    [12, 14, 11, 13, 8, 12, 14],
    [7, 3, 8, 4, 7, 11, 13],
    [9, 4, 2, 3, 3, 5, 12],
    [8, 3, 2, 1, 4, 14, 13],
    [7, 9, 6, 3, 4, 5, 12],
    [8, 7, 9, 12, 11, 14, 13],
    [9, 7, 8, 13, 14, 12, 11],
]

/** Stage 3: 상위 노출 달성 */
const STAGE_3: number[][] = [
    [8, 7, 6, 9, 5, 7, 8],
    [3, 2, 3, 4, 3, 7, 9],
    [4, 2, 1, 2, 3, 4, 8],
    [3, 2, 1, 1, 4, 7, 9],
    [3, 3, 2, 3, 4, 5, 7],
    [4, 3, 2, 4, 3, 8, 6],
    [5, 4, 3, 5, 7, 6, 9],
]

/** 3단계 그리드 데이터 배열 [Stage1, Stage2, Stage3] */
export const STAGE_GRIDS: number[][][] = [STAGE_1, STAGE_2, STAGE_3]

// ─── Stage Meta ─────────────────────────────────────────

/** 각 스테이지별 "홍대 카페" 검색 순위 + 라벨 */
export const STAGE_META: StageMeta[] = [
    { searchRank: 28, label: '28위' },
    { searchRank: 9, label: '9위' },
    { searchRank: 3, label: '3위 🏆' },
]

// ─── Playback Config ────────────────────────────────────

/**
 * 재생 순서: Stage 3(index=2) → 1(0) → 2(1) → 3(2)
 * 성공 상태를 먼저 보여주고, 현실→개선→달성 스토리
 */
export const PLAYBACK_SEQUENCE: number[] = [2, 0, 1, 2]

/**
 * 각 재생 슬롯의 유지 시간 (ms)
 * [Stage3 첫=3s, Stage1=4s, Stage2=4s, Stage3 루프=5s]
 */
export const STAGE_DURATIONS: number[] = [3000, 4000, 4000, 5000]

// ─── Color Utilities ────────────────────────────────────

/**
 * 순위 → 마커 배경색
 * - 1~5위: 초록 (#22C55E)
 * - 6~10위: 노랑 (#EAB308)
 * - 11위~: 빨강 (#EF4444)
 */
export function getMarkerColor(rank: number): string {
    if (rank <= 5) return '#22C55E'
    if (rank <= 10) return '#EAB308'
    return '#EF4444'
}

/**
 * 순위 → 마커 글로우 boxShadow
 */
export function getMarkerGlow(rank: number): string {
    if (rank <= 5) return '0 0 10px rgba(34,197,94,0.5)'
    if (rank <= 10) return '0 0 8px rgba(234,179,8,0.4)'
    return '0 0 8px rgba(239,68,68,0.4)'
}
