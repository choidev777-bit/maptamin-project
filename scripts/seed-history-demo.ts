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
const NAVER_PLACE_ID  = '7Zek7J207Y+s7JejLeyEnOyauO2KueuzhOyLnCDsooXroZzqtawg64+I7ZmU66y466GcOeqwgOq4uCAxMC0yIOydtOuwnOyGjCDsmIYg7Lm07Y6YIO2XpOydtO2PrOyXow=='
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

// ── 순위 목표값 (시작 → 끝) ────────────────────────────
const RANK_CFG: Record<string, { start: number; end: number }> = {
    '이자카야': { start: 21.5, end: 4.2 },
    '술집':     { start: 19.8, end: 5.1 },
    '룸술집':   { start: 23.2, end: 6.3 },
    '회식':     { start: 20.3, end: 7.0 },
    '하이볼':   { start: 21.0, end: 3.4 },
}

// ── 그리드 & 노출 설정 (키워드별 차별화) ─────────────────
const GRID_SIZE      = 7
const GRID_TOTAL     = GRID_SIZE * GRID_SIZE  // 49

// 키워드별 노출좌표수/상위노출수 (시작 → 끝)
const EXPOSURE_CFG: Record<string, { expStart: number; expEnd: number; topStart: number; topEnd: number }> = {
    '이자카야': { expStart: 20, expEnd: 42, topStart: 5, topEnd: 24 },
    '술집':     { expStart: 16, expEnd: 38, topStart: 3, topEnd: 20 },
    '룸술집':   { expStart: 12, expEnd: 34, topStart: 2, topEnd: 16 },
    '회식':     { expStart: 22, expEnd: 40, topStart: 6, topEnd: 22 },
    '하이볼':   { expStart: 14, expEnd: 36, topStart: 4, topEnd: 18 },
}

// ── 날짜 설정 ───────────────────────────────────────────
const START_DATE = '2026-01-18'
const END_DATE   = '2026-03-18'

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

function calcRank(
    kw: string, gIdx: number, dIdx: number,
    totalDays: number, expCount: number, topCount: number
): number | null {
    if (gIdx >= expCount) return null
    const t    = dIdx / (totalDays - 1)
    const kwI  = KEYWORDS.indexOf(kw)
    const n    = (dNoise(gIdx * 100 + dIdx * 10 + kwI * 1000) - 0.5) * 3
    if (gIdx < topCount) {
        return Math.max(1, Math.min(5, Math.round(lerp(4.5, 2.0, t) + n * 0.4)))
    } else {
        const { start, end } = RANK_CFG[kw]
        const base = lerp(start, Math.max(8, end * 1.6), t)
        return Math.max(6, Math.min(35, Math.round(base + n)))
    }
}

function calcLocalRank(kwIdx: number, dIdx: number, totalDays: number): number {
    const t = dIdx / (totalDays - 1)
    const n = (dNoise(dIdx * 7 + kwIdx * 300) - 0.5) * 2
    return Math.max(1, Math.round(lerp(14 - kwIdx * 0.5, 4 - kwIdx * 0.3, t) + n))
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
    if (USER_ID === 'YOUR_USER_ID_HERE') {
        console.error('❌ USER_ID 를 실제 값으로 교체하세요.')
        process.exit(1)
    }

    console.log('🌱 데모 데이터 삽입 시작\n')

    const allDates    = generateDates(START_DATE, END_DATE)
    const totalDays   = allDates.length
    const googleDates = allDates.filter((_, i) => i % 7 === 0)

    // ── 1. searches ────────────────────────────────────────────────
    console.log('📅 1/3  searches 삽입 중...')

    // UUID 맵 생성 (search_results에서 search_id로 참조)
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
        keywords:       KEYWORDS,
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

        KEYWORDS.forEach(kw => {
            const cfg = EXPOSURE_CFG[kw]
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
                    rank:       calcRank(kw, gIdx, dIdx, totalDays, expCount, topCount),
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
