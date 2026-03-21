/**
 * 데모용 더미 데이터 삽입 스크립트 — 오후 이자카야
 *
 * 실행 방법:
 *   cd c:\Users\thisi\Documents\maptamin-local-seo-saas
 *   npx tsx scripts/seed-history-demo.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { randomUUID } from 'crypto'

config({ path: resolve(process.cwd(), '.env.local') })

// ===================================================================
// ⚠️  여기를 먼저 수정하세요
// ===================================================================
const USER_ID         = 'c9441bda-c9b0-44fa-ac95-d7449d928c87'
const NAVER_PLACE_ID  = '7Zek7J207Y+s7JejLeyEnOyauO2KueuzhOyLnCAxMOqwgOq4uCAxMC0y'
const GOOGLE_PLACE_ID = 'ChIJlXAY_IejfDURxEXnnXsatGk'
// ===================================================================

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── 매장 정보 ──────────────────────────────────────────
const PLACE_NAME    = '오후'
const PLACE_ADDRESS = '서울시 강남구 선릉로 123 1층'
const PLACE_LAT     = 37.5045
const PLACE_LNG     = 127.0491

// ── 키워드 ──────────────────────────────────────────────
const KEYWORDS: string[]       = ['이자카야', '술집', '룸술집', '회식', '하이볼']
const LOCAL_KEYWORDS: string[] = ['선릉역 이자카야', '선릉역 술집', '선릉역 룸술집', '선릉역 회식', '선릉역 하이볼']

// ── 순위 목표값 — 네이버 업종 키워드 (시작점 분산) ─────────
const RANK_CFG: Record<string, { start: number; end: number }> = {
    '이자카야': { start: 9, end: 5 },       // ~8위 시작 (메인 업종)
    '술집':     { start: 17, end: 7 },      // ~13위 시작 (경쟁 치열)
    '룸술집':   { start: 20, end: 5 },      // ~16위 시작 (후발주자)
    '회식':     { start: 11, end: 13 },     // ~9위 시작 (중간)
    '하이볼':   { start: 6, end: 4 },       // ~4위 시작 (틈새)
}

// ── 구글 키워드 ──────────────────────────────────────────
const GOOGLE_KEYWORDS: string[] = [
    '선릉역 이자카야', '선릉역 술집', '선릉역 룸술집', '선릉역 회식', '선릉역 하이볼',
]

const GOOGLE_RANK_CFG: Record<string, { start: number; end: number }> = {
    '선릉역 이자카야': { start: 18.0, end: 3.5 },
    '선릉역 술집':     { start: 22.5, end: 5.8 },
    '선릉역 룸술집':   { start: 25.0, end: 7.2 },
    '선릉역 회식':     { start: 16.5, end: 4.0 },
    '선릉역 하이볼':   { start: 20.0, end: 6.5 },
}

// ── 네이버 지역명 키워드 순위 목표값 ──────────────────────
const LOCAL_RANK_CFG: Record<string, { start: number; end: number }> = {
    '선릉역 이자카야': { start: 7, end: 3 },       // 상승→꺾임→횡보
    '선릉역 술집':     { start: 10, end: 5 },      // 하락→횡보→반등
    '선릉역 룸술집':   { start: 12, end: 4 },      // 후발주자 → 4위
    '선릉역 회식':     { start: 7, end: 11 },      // 서서히 밀림
    '선릉역 하이볼':   { start: 4, end: 3 },       // 안정
}

// ── 그리드 & 노출 설정 ─────────────────────────────────
const GRID_SIZE      = 7
const GRID_TOTAL     = GRID_SIZE * GRID_SIZE  // 49

const EXPOSURE_CFG: Record<string, { expStart: number; expEnd: number; topStart: number; topEnd: number }> = {
    '이자카야': { expStart: 24, expEnd: 40, topStart: 4, topEnd: 22 },
    '술집':     { expStart: 22, expEnd: 38, topStart: 4, topEnd: 20 },
    '룸술집':   { expStart: 8,  expEnd: 42, topStart: 1, topEnd: 26 },
    '회식':     { expStart: 26, expEnd: 24, topStart: 8, topEnd: 7 },
    '하이볼':   { expStart: 38, expEnd: 40, topStart: 20, topEnd: 22 },
}

const GOOGLE_EXPOSURE_CFG: Record<string, { expStart: number; expEnd: number; topStart: number; topEnd: number }> = {
    '선릉역 이자카야': { expStart: 15, expEnd: 38, topStart: 3, topEnd: 20 },
    '선릉역 술집':     { expStart: 10, expEnd: 32, topStart: 2, topEnd: 14 },
    '선릉역 룸술집':   { expStart: 8,  expEnd: 28, topStart: 1, topEnd: 12 },
    '선릉역 회식':     { expStart: 20, expEnd: 44, topStart: 5, topEnd: 26 },
    '선릉역 하이볼':   { expStart: 12, expEnd: 36, topStart: 3, topEnd: 18 },
}

// ── 날짜 설정 ───────────────────────────────────────────
const START_DATE = '2025-12-21'
const END_DATE   = '2026-03-21'

// ===================================================================
// 헬퍼 함수
// ===================================================================
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function dNoise(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
    return x - Math.floor(x)
}

function generateDates(start: string, end: string): string[] {
    const dates: string[] = []
    const cur = new Date(start)
    const endD = new Date(end)
    while (cur <= endD) {
        dates.push(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
    }
    return dates
}

function generateGridPoints() {
    const pts = []
    const s0 = PLACE_LAT - 3 * 0.0045
    const s1 = PLACE_LNG - 3 * 0.0055
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            pts.push({
                row, col,
                lat: parseFloat((s0 + row * 0.0045).toFixed(6)),
                lng: parseFloat((s1 + col * 0.0055).toFixed(6)),
                enabled: true,
            })
        }
    }
    return pts
}

const GRID_PTS = generateGridPoints()

// ===================================================================
// 웨이포인트 기반 순위 곡선 시스템
// ===================================================================
type WP = [number, number] // [시간(0~1), 진행도]

function interpolateWP(wps: WP[], t: number): number {
    if (t <= wps[0][0]) return wps[0][1]
    for (let i = 0; i < wps.length - 1; i++) {
        if (t >= wps[i][0] && t < wps[i + 1][0]) {
            const segT = (t - wps[i][0]) / (wps[i + 1][0] - wps[i][0])
            return lerp(wps[i][1], wps[i + 1][1], segT)
        }
    }
    return wps[wps.length - 1][1]
}

/** 일간 변동: 지그재그 + 간헐적 점프 (평균 순위에 현실감 부여) */
function dayVar(seed: number, dIdx: number): number {
    const s = dIdx * 31 + seed * 127
    const zigzag = (dNoise(s) - 0.5) * 0.10
    const jumpSeed = dNoise(s + 7777)
    const jump = jumpSeed > 0.88 ? 0.10 : jumpSeed < 0.12 ? -0.08 : 0
    return zigzag + jump
}

// ── 업종 키워드 웨이포인트 ──────────────────────────────
const KW_WP: Record<string, WP[]> = {
    // 이자카야: 지그재그 상승 → 피크 횡보(~18일) → 빠른 하락 → 횡보
    '이자카야': [
        [0, 0], [.05, .10], [.08, .05], [.12, .22], [.16, .18],
        [.20, .38], [.23, .35], [.27, .55], [.32, .72], [.37, .88],
        [.40, .93], [.44, .90], [.48, .95], [.52, .92], [.56, .94],
        [.60, .90], [.64, .88],
        [.68, .72], [.72, .48], [.76, .28],
        [.80, .15], [.86, .10], [.93, .08], [1, .08],
    ],
    // 술집: 하락 → 횡보 → 반등 (시작보다 높게, 룸술집보다 낮게)
    '술집': [
        [0, 0], [.08, -.08], [.15, -.18], [.22, -.28], [.28, -.30],
        [.35, -.28], [.40, -.32], [.45, -.28], [.50, -.20],
        [.55, -.08], [.60, .10], [.68, .30], [.75, .42],
        [.82, .50], [.90, .55], [1, .58],
    ],
    // 룸술집: 후발주자 — 초반 정체 후 급상승
    '룸술집': [
        [0, 0], [.10, .01], [.20, .03], [.28, .05], [.35, .10],
        [.42, .20], [.50, .35], [.58, .52], [.65, .68],
        [.72, .80], [.80, .88], [.88, .94], [.95, .98], [1, 1.0],
    ],
    // 회식: 정체 — 올라가는 듯 내려가는 반복
    '회식': [
        [0, 0], [.08, .18], [.15, .05], [.22, .22], [.30, .08],
        [.38, .25], [.45, .12], [.52, .28], [.60, .18],
        [.68, .35], [.75, .42], [.82, .48], [.90, .45], [1, .50],
    ],
    // 하이볼: 안정 — 등락 반복, 트렌드 없음
    '하이볼': [
        [0, .50], [.07, .68], [.14, .35], [.21, .72], [.28, .40],
        [.35, .62], [.42, .32], [.49, .58], [.56, .42],
        [.63, .68], [.70, .38], [.77, .62], [.84, .45],
        [.91, .60], [1, .52],
    ],
}

// ── 지역명 키워드 웨이포인트 (업종과 시차 + 독립 변동) ────
const LOCAL_KW_WP: Record<string, WP[]> = {
    // 이자카야: 업종과 유사하지만 ~5일 지연, 피크 횡보 후 하락
    '선릉역 이자카야': [
        [0, 0], [.08, .06], [.14, .15], [.20, .12], [.26, .35],
        [.32, .52], [.38, .78], [.43, .90],
        [.48, .88], [.52, .93], [.56, .90], [.60, .92], [.65, .88],
        [.70, .68], [.75, .42], [.80, .25],
        [.86, .16], [.93, .12], [1, .12],
    ],
    // 술집: 업종보다 ~7일 늦게 반응, 반등도 늦게 시작
    '선릉역 술집': [
        [0, 0], [.12, -.05], [.20, -.15], [.28, -.28],
        [.38, -.30], [.45, -.28], [.52, -.22], [.58, -.10],
        [.65, .10], [.72, .32], [.80, .52], [.90, .65], [1, .72],
    ],
    // 룸술집: 업종과 동일하게 급상승 (큰 변화 = 즉시 반영)
    '선릉역 룸술집': [
        [0, 0], [.15, .01], [.25, .03], [.35, .08],
        [.45, .20], [.55, .38], [.62, .55], [.70, .72],
        [.78, .85], [.85, .92], [.92, .97], [1, 1.0],
    ],
    // 회식: 업종과 독립적으로 서서히 하락
    '선릉역 회식': [
        [0, 0], [.10, .08], [.20, .15], [.30, .22], [.42, .32],
        [.55, .48], [.65, .60], [.75, .72], [.85, .82], [.95, .92], [1, .95],
    ],
    // 하이볼: 업종과 다른 위상으로 독립 진동
    '선릉역 하이볼': [
        [0, .50], [.10, .62], [.18, .38], [.26, .65], [.34, .42],
        [.42, .55], [.50, .35], [.58, .60], [.66, .45],
        [.74, .58], [.82, .40], [.90, .55], [1, .48],
    ],
}

/** 업종 키워드 곡선 (웨이포인트 보간 + 일간 변동) */
function kwCurve(kw: string, t: number, dIdx: number): number {
    const wp = KW_WP[kw]
    if (!wp) return t
    const kwI = KEYWORDS.indexOf(kw)
    return interpolateWP(wp, t) + dayVar(kwI, dIdx)
}

/** 지역명 키워드 곡선 (업종과 독립적 웨이포인트 + 별도 변동) */
function localKwCurve(kw: string, t: number, dIdx: number): number {
    const wp = LOCAL_KW_WP[kw]
    if (!wp) return t
    const kwI = LOCAL_KEYWORDS.indexOf(kw)
    return interpolateWP(wp, t) + dayVar(kwI + 10, dIdx)
}

// ===================================================================
// 순위 계산 함수
// ===================================================================
function calcRank(
    kw: string, gIdx: number, dIdx: number,
    totalDays: number, expCount: number, topCount: number
): number | null {
    if (gIdx >= expCount) return null
    const t    = dIdx / (totalDays - 1)
    const kwI  = KEYWORDS.indexOf(kw)
    const n    = (dNoise(gIdx * 100 + dIdx * 10 + kwI * 1000) - 0.5) * 5

    const progress = kwCurve(kw, t, dIdx)
    const clampedP = Math.max(0, Math.min(1, progress))

    if (gIdx < topCount) {
        return Math.max(1, Math.min(5, Math.round(lerp(4.5, 2.0, clampedP) + n * 0.4)))
    } else {
        const { start, end } = RANK_CFG[kw]
        const base = lerp(start, end, progress)
        return Math.max(1, Math.min(35, Math.round(base + n)))
    }
}

function calcLocalRank(kwIdx: number, dIdx: number, totalDays: number): number {
    const lkw = LOCAL_KEYWORDS[kwIdx]
    const t = dIdx / (totalDays - 1)
    const n = (dNoise(dIdx * 7 + kwIdx * 300) - 0.5) * 3
    const progress = localKwCurve(lkw, t, dIdx)
    const { start, end } = LOCAL_RANK_CFG[lkw]
    return Math.max(1, Math.round(lerp(start, end, progress) + n))
}

/** 구글 키워드별 고유 커브 — 5개 모두 다른 패턴 */
function googleKwCurve(kw: string, t: number, dIdx: number): number {
    switch (kw) {
        case '선릉역 이자카야':
            return 1 - Math.pow(1 - t, 2.2)
        case '선릉역 술집':
            if (t < 0.3)  return t * 0.8
            if (t < 0.35) return 0.24 + (t - 0.3) * 6
            if (t < 0.6)  return 0.54 + (t - 0.35) * 0.4
            if (t < 0.65) return 0.64 + (t - 0.6) * 6
            return Math.min(1, 0.94 + (t - 0.65) * 1.2)
        case '선릉역 룸술집':
            if (t < 0.25) return t * 0.3 - Math.sin(t * Math.PI * 2) * 0.1
            return 0.075 + Math.pow((t - 0.25) / 0.75, 0.7) * 0.925
        case '선릉역 회식':
            return Math.pow(t, 3)
        case '선릉역 하이볼':
            return Math.min(1, t * 0.75 + Math.sin(t * Math.PI * 5) * 0.12 + t * 0.25)
        default:
            return t
    }
}

function calcGoogleRank(
    kw: string, gIdx: number, dIdx: number,
    totalDays: number, expCount: number, topCount: number
): number | null {
    if (gIdx >= expCount) return null
    const t        = dIdx / (totalDays - 1)
    const kwI      = GOOGLE_KEYWORDS.indexOf(kw)
    const n        = (dNoise(gIdx * 137 + dIdx * 17 + kwI * 900) - 0.5) * 3
    const progress = Math.max(0, Math.min(1, googleKwCurve(kw, t, dIdx)))
    if (gIdx < topCount) {
        return Math.max(1, Math.min(5, Math.round(lerp(4.5, 2.0, progress) + n * 0.4)))
    } else {
        const { start, end } = GOOGLE_RANK_CFG[kw]
        const base = lerp(start, Math.max(8, end * 1.6), progress)
        return Math.max(6, Math.min(35, Math.round(base + n)))
    }
}

async function batchInsert(table: string, rows: object[], chunk = 200) {
    for (let i = 0; i < rows.length; i += chunk) {
        const { error } = await supabase.from(table).insert(rows.slice(i, i + chunk))
        if (error) {
            console.error(`\n❌ ${table} 실패:`, error.message)
            process.exit(1)
        }
        process.stdout.write(`\r  ${table}: ${Math.min(i + chunk, rows.length)} / ${rows.length}`)
    }
    console.log()
}

// ===================================================================
// 메인
// ===================================================================
async function main() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ .env.local 에서 SUPABASE_SERVICE_ROLE_KEY 를 찾을 수 없습니다.')
        process.exit(1)
    }

    console.log('🌱 데모 데이터 삽입 시작\n')

    const allDates    = generateDates(START_DATE, END_DATE)
    const totalDays   = allDates.length
    const googleDates = allDates.filter((_, i) => i % 7 === 0)

    // ── 1. searches ────────────────────────────────────────────────
    console.log('📅 1/3  searches 삽입 중...')

    const naverIdMap: Record<string, string>  = {}
    const googleIdMap: Record<string, string> = {}
    allDates.forEach(d => { naverIdMap[d]  = randomUUID() })
    googleDates.forEach(d => { googleIdMap[d] = randomUUID() })

    const naverSearches = allDates.map(date => ({
        id:             naverIdMap[date],
        user_id:        USER_ID,
        place_id:       NAVER_PLACE_ID,
        place_name:     PLACE_NAME,
        place_address:  PLACE_ADDRESS,
        place_lat:      PLACE_LAT,
        place_lng:      PLACE_LNG,
        keywords:       KEYWORDS,
        local_keywords: LOCAL_KEYWORDS,
        grid_points:    GRID_PTS,
        grid_distance:  0.5,
        distance_unit:  'km',
        status:         'completed',
        platform:       'naver',
        report_type:    'daily',
        created_at:     `${date}T09:00:00+09:00`,
    }))

    const googleSearches = googleDates.map(date => ({
        id:             googleIdMap[date],
        user_id:        USER_ID,
        place_id:       GOOGLE_PLACE_ID,
        place_name:     PLACE_NAME,
        place_address:  PLACE_ADDRESS,
        place_lat:      PLACE_LAT,
        place_lng:      PLACE_LNG,
        keywords:       GOOGLE_KEYWORDS,
        local_keywords: [],
        grid_points:    GRID_PTS,
        grid_distance:  0.5,
        distance_unit:  'km',
        status:         'completed',
        platform:       'google',
        report_type:    'weekly',
        created_at:     `${date}T09:00:00+09:00`,
    }))

    await batchInsert('searches', [...naverSearches, ...googleSearches])

    // ── 2. search_results ──────────────────────────────────────────
    console.log('\n📊 2/3  search_results 삽입 중...')

    const results: object[] = []

    // Naver results
    allDates.forEach((date, dIdx) => {
        const searchId = naverIdMap[date]
        const t        = dIdx / (totalDays - 1)

        KEYWORDS.forEach(kw => {
            const cfg = EXPOSURE_CFG[kw]
            const expProgress = Math.max(0, Math.min(1, kwCurve(kw, t, dIdx)))
            const expCount = Math.round(lerp(cfg.expStart, cfg.expEnd, expProgress))
            const topCount = Math.round(lerp(cfg.topStart, cfg.topEnd, expProgress))
            for (let gIdx = 0; gIdx < GRID_TOTAL; gIdx++) {
                results.push({
                    id:         randomUUID(),
                    search_id:  searchId,
                    keyword:    kw,
                    grid_index: gIdx,
                    grid_lat:   GRID_PTS[gIdx].lat,
                    grid_lng:   GRID_PTS[gIdx].lng,
                    rank:       calcRank(kw, gIdx, dIdx, totalDays, expCount, topCount),
                    created_at: `${date}T09:30:00+09:00`,
                })
            }
        })

        LOCAL_KEYWORDS.forEach((lkw, kwI) => {
            results.push({
                id:         randomUUID(),
                search_id:  searchId,
                keyword:    lkw,
                grid_index: -1,
                grid_lat:   PLACE_LAT,
                grid_lng:   PLACE_LNG,
                rank:       calcLocalRank(kwI, dIdx, totalDays),
                created_at: `${date}T09:30:00+09:00`,
            })
        })
    })

    // Google results
    googleDates.forEach((date, gi) => {
        const searchId = googleIdMap[date]
        const dIdx     = gi * 7
        const t        = Math.min(1, dIdx / (totalDays - 1))

        GOOGLE_KEYWORDS.forEach(kw => {
            const cfg = GOOGLE_EXPOSURE_CFG[kw]
            const expCount = Math.round(lerp(cfg.expStart, cfg.expEnd, t))
            const topCount = Math.round(lerp(cfg.topStart, cfg.topEnd, t))
            for (let gIdx = 0; gIdx < GRID_TOTAL; gIdx++) {
                results.push({
                    id:         randomUUID(),
                    search_id:  searchId,
                    keyword:    kw,
                    grid_index: gIdx,
                    grid_lat:   GRID_PTS[gIdx].lat,
                    grid_lng:   GRID_PTS[gIdx].lng,
                    rank:       calcGoogleRank(kw, gIdx, dIdx, totalDays, expCount, topCount),
                    created_at: `${date}T09:30:00+09:00`,
                })
            }
        })
    })

    await batchInsert('search_results', results)

    // ── 3. managed_places ─────────────────────────────────────────
    console.log('\n📌 3/3  managed_places 확인 중... (기존 헤이포엣은 그대로 유지)')
    console.log('  ℹ️  managed_places 는 수정하지 않습니다. searches.place_id 가 이미 일치합니다.')

    const naverCount  = allDates.length * (KEYWORDS.length * GRID_TOTAL + LOCAL_KEYWORDS.length)
    const googleCount = googleDates.length * KEYWORDS.length * GRID_TOTAL
    console.log(`
✨ 완료!
  - searches:       ${naverSearches.length + googleSearches.length}건
  - search_results: ${naverCount + googleCount}건
  - 기간:           ${START_DATE} ~ ${END_DATE}
  - 그리드:         ${GRID_SIZE}×${GRID_SIZE} = ${GRID_TOTAL}포인트
`)
}

main().catch(e => { console.error(e); process.exit(1) })
