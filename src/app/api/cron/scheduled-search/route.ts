/**
 * Scheduled Search Cron API Route
 * 
 * POST: pg_cron에서 매시 정각 호출
 * 1. CRON_SECRET 인증
 * 2. KST 기준 현재 요일/시간으로 활성 스케줄 조회
 * 3. 매칭되는 스케줄마다 search 레코드 생성
 * 4. /api/queue/dispatch 호출하여 Oracle VM Worker 트리거
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { generateGridPointsFromTemplate } from '@/lib/utils/grid-calculator'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// KST 시간 유틸
function getKstNow(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
}

// KST 기준 ISO 주차 계산 (월~일 = 1주)
function getISOWeekKST(utcDateStr?: string): string {
    // KST로 변환
    const d = utcDateStr
        ? new Date(new Date(utcDateStr).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
        : getKstNow()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${d.getFullYear()}-W${weekNo}`
}

// KST 기준 날짜 문자열 (YYYY-M-D) — 네이버 매일 중복 방지용
function getKstDateString(utcDateStr?: string): string {
    const d = utcDateStr
        ? new Date(new Date(utcDateStr).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
        : getKstNow()
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export async function POST(request: Request) {
    // 1. CRON_SECRET 인증
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        console.error('[Cron] CRON_SECRET not configured')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token !== cronSecret) {
        console.error('[Cron] Invalid CRON_SECRET')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    try {
        // 2. KST 기준 현재 요일/시간 계산
        const kstNow = getKstNow()
        const currentDay = kstNow.getDay() // 0=Sun, 6=Sat
        const currentHour = kstNow.getHours()
        const timePrefix = `${String(currentHour).padStart(2, '0')}:00:00`

        console.log(`[Cron] KST: Day=${currentDay}, Time=${timePrefix}`)

        // 3. 활성 스케줄 조회 (현재 시간 매칭)
        const { data: allSchedules, error: scheduleError } = await supabase
            .from('search_schedules')
            .select('*')
            .eq('is_active', true)
            .eq('crawling_time', timePrefix)

        if (scheduleError) {
            console.error('[Cron] Schedule query error:', scheduleError)
            return NextResponse.json({ error: scheduleError.message }, { status: 500 })
        }

        // 4. 구독 체크 — free 플랜 유저의 스케줄 제외
        const userIds = [...new Set((allSchedules || []).map(s => s.user_id))]
        const freeUserIds = new Set<string>()

        if (userIds.length > 0) {
            const { data: subs } = await supabase
                .from('user_subscriptions')
                .select('user_id, plan_id')
                .in('user_id', userIds)

            for (const sub of subs || []) {
                if (sub.plan_id === 'free') freeUserIds.add(sub.user_id)
            }
        }

        // 5. 플랫폼별 분기: 네이버=매일(crawling_days 배열), 구글=주 1회(crawling_day 단수)
        const currentDateStr = getKstDateString()
        const currentWeek = getISOWeekKST()
        const jobs = (allSchedules || []).filter(s => {
            // 구독 체크: free 플랜이면 skip
            if (freeUserIds.has(s.user_id)) return false

            if ((s.platform || 'naver') === 'naver') {
                // ── 네이버: crawling_days 배열 기반 매일 실행 ──
                const days: number[] = s.crawling_days || []
                if (days.length === 0) return false  // 활성화 안 됨
                if (!days.includes(currentDay)) return false  // 오늘 요일 미포함
                // 오늘 KST 날짜에 이미 실행했으면 skip
                if (s.last_run_at && getKstDateString(s.last_run_at) === currentDateStr) return false
            } else {
                // ── 구글: crawling_day 단수 기반 주 1회 ──
                if (s.crawling_day === null || s.crawling_day === undefined) return false  // 활성화 안 됨
                if (s.crawling_day !== currentDay) return false  // 요일 불일치
                // 같은 ISO 주차면 skip
                if (s.last_run_at && getISOWeekKST(s.last_run_at) === currentWeek) return false
            }

            return true
        })

        console.log(`[Cron] Found ${jobs.length} schedules to run (of ${allSchedules?.length || 0} active at ${timePrefix}).`)

        if (jobs.length === 0) {
            return NextResponse.json({ processed: 0, message: 'No schedules to run' })
        }

        // 5. 스케줄별로 search 레코드 생성
        let created = 0
        for (const job of jobs) {
            try {
                // a. last_run_at 선행 업데이트 (중복 방지)
                await supabase
                    .from('search_schedules')
                    .update({ last_run_at: new Date().toISOString() })
                    .eq('id', job.id)

                // b. managed_places에서 좌표/주소 조회
                const { data: place } = await supabase
                    .from('managed_places')
                    .select('lat, lng, address')
                    .eq('user_id', job.user_id)
                    .eq('platform', job.platform || 'naver')
                    .maybeSingle()

                // c. 검색 레코드 생성
                const gridConfig = Array.isArray(job.grid_config) ? job.grid_config : []
                const gridDistance = job.grid_distance || (gridConfig[0] as any)?.distance || 1
                const centerLat = place?.lat || 0
                const centerLng = place?.lng || 0

                // col/row → lat/lng 좌표 변환 (이 변환 없이는 스크래퍼가 실패함)
                const gridPointsWithCoords = generateGridPointsFromTemplate(
                    centerLat,
                    centerLng,
                    gridConfig,
                    gridDistance
                )

                const { data: search, error: insertError } = await supabase
                    .from('searches')
                    .insert({
                        user_id: job.user_id,
                        place_id: job.place_id,
                        place_name: job.place_name || '',
                        place_address: place?.address || '',
                        place_lat: centerLat,
                        place_lng: centerLng,
                        keywords: job.keywords || [],
                        local_keywords: job.local_keywords || [],
                        platform: job.platform || 'naver',
                        grid_points: gridPointsWithCoords,
                        grid_distance: gridDistance,
                        status: 'pending',
                        report_type: (job.platform || 'naver') === 'google' ? 'weekly' : 'daily',
                    })
                    .select()
                    .single()

                if (insertError) {
                    console.error(`[Cron] Failed to create search for schedule ${job.id}:`, insertError)
                    continue
                }

                console.log(`[Cron] Created search ${search.id} for schedule ${job.id} (${job.place_name})`)
                created++
            } catch (jobError) {
                console.error(`[Cron] Error processing schedule ${job.id}:`, jobError)
            }
        }

        // 6. dispatch 호출 (pending 검색을 Oracle VM Worker로 전달)
        if (created > 0) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.maptamin.com'
            try {
                await fetch(`${baseUrl}/api/queue/dispatch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                })
                console.log(`[Cron] Dispatch triggered for ${created} searches`)
            } catch (dispatchErr) {
                console.error('[Cron] Dispatch call failed:', dispatchErr)
            }
        }

        return NextResponse.json({
            processed: created,
            total_matched: jobs.length,
            time: timePrefix,
            day: currentDay,
        })

    } catch (error) {
        console.error('[Cron] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
