/**
 * Scheduled Search Cron API Route
 * 
 * POST: pg_cron에서 매시 정각 호출
 * 1. CRON_SECRET 인증
 * 2. KST 기준 현재 요일/시간으로 활성 스케줄 조회
 * 3. 매칭되는 스케줄마다 search 레코드 생성
 * 4. /api/queue/dispatch 호출하여 GitHub Actions 트리거
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// KST 시간 유틸
function getKstNow(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
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

        // 4. 요일 매칭 + 중복 실행 방지 (last_run_at)
        const todayStr = new Date().toISOString().slice(0, 10) // UTC date
        const jobs = (allSchedules || []).filter(s => {
            // 요일 매칭: crawling_day(단수) 우선, 없으면 crawling_days(배열)
            const dayMatch = s.crawling_day !== null && s.crawling_day !== undefined
                ? s.crawling_day === currentDay
                : Array.isArray(s.crawling_days) && s.crawling_days.includes(currentDay)

            if (!dayMatch) return false

            // 오늘 이미 실행했으면 skip
            if (s.last_run_at) {
                const lastRunDate = s.last_run_at.slice(0, 10)
                if (lastRunDate === todayStr) return false
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
                const { data: search, error: insertError } = await supabase
                    .from('searches')
                    .insert({
                        user_id: job.user_id,
                        place_id: job.place_id,
                        place_name: job.place_name || '',
                        place_address: place?.address || '',
                        place_lat: place?.lat || 0,
                        place_lng: place?.lng || 0,
                        keywords: job.keywords || [],
                        platform: job.platform || 'naver',
                        grid_points: gridConfig,
                        grid_distance: job.grid_distance || (gridConfig[0] as any)?.distance || 1,
                        status: 'pending',
                        report_type: 'weekly',
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

        // 6. dispatch 호출 (pending 검색을 GitHub Actions로 전달)
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
