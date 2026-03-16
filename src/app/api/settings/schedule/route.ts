import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/settings/schedule?platform=naver
 * 스케줄 + 전화번호 + 현재 매장/키워드 조회
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // 1. 인증 확인
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
        }

        const platform = request.nextUrl.searchParams.get('platform') || 'naver'

        // 2. 병렬 조회: 스케줄, 구독(phone), 매장, 키워드
        const [scheduleRes, subscriptionRes, placeRes, keywordsRes] = await Promise.all([
            supabase
                .from('search_schedules')
                .select('*')
                .eq('user_id', user.id)
                .eq('platform', platform)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabase
                .from('user_subscriptions')
                .select('phone, plan_id')
                .eq('user_id', user.id)
                .single(),
            supabase
                .from('managed_places')
                .select('place_id, place_name, lat, lng')
                .eq('user_id', user.id)
                .eq('platform', platform)
                .maybeSingle(),
            supabase
                .from('managed_keywords')
                .select('keyword')
                .eq('user_id', user.id)
                .eq('platform', platform),
        ])

        return NextResponse.json({
            schedule: scheduleRes.data || null,
            phone: subscriptionRes.data?.phone || '',
            planId: subscriptionRes.data?.plan_id || 'free',
            currentPlace: placeRes.data || null,
            currentKeywords: (keywordsRes.data || []).map(k => k.keyword),
        })

    } catch (error) {
        console.error('[Schedule GET] Error:', error)
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
    }
}

/**
 * PUT /api/settings/schedule
 * 스케줄 업데이트 + place/keyword 동기화
 */
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()

        // 1. 인증 확인
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
        }

        const body = await request.json()
        const {
            platform = 'naver',
            crawling_days,
            crawling_time,
            grid_config,
            grid_distance,
            is_active,
            phone,
        } = body

        // 2. 기존 스케줄 조회
        const { data: existingSchedule } = await supabase
            .from('search_schedules')
            .select('id')
            .eq('user_id', user.id)
            .eq('platform', platform)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!existingSchedule) {
            return NextResponse.json(
                { error: '설정된 스케줄이 없습니다. 온보딩을 먼저 완료해주세요.' },
                { status: 404 }
            )
        }

        // 3. 활성화 시 매장/키워드 존재 확인 + 동기화
        let syncPlaceId = undefined
        let syncPlaceName = undefined
        let syncKeywords = undefined
        let syncLocalKeywords: string[] | undefined = undefined

        if (is_active) {
            const [placeRes, keywordsRes] = await Promise.all([
                supabase
                    .from('managed_places')
                    .select('place_id, place_name')
                    .eq('user_id', user.id)
                    .eq('platform', platform)
                    .maybeSingle(),
                supabase
                    .from('managed_keywords')
                    .select('keyword, keyword_type')
                    .eq('user_id', user.id)
                    .eq('platform', platform),
            ])

            if (!placeRes.data) {
                return NextResponse.json(
                    { error: '매장을 먼저 등록해주세요.', code: 'NO_PLACE' },
                    { status: 400 }
                )
            }

            // 업종/지역명 키워드 분리
            const allKeywords = keywordsRes.data || []
            const industryKeywords = allKeywords.filter(k => (k.keyword_type || 'industry') === 'industry').map(k => k.keyword)
            const localKeywords = allKeywords.filter(k => k.keyword_type === 'local').map(k => k.keyword)

            if (industryKeywords.length === 0) {
                return NextResponse.json(
                    { error: '키워드를 먼저 등록해주세요.', code: 'NO_KEYWORDS' },
                    { status: 400 }
                )
            }

            syncPlaceId = placeRes.data.place_id
            syncPlaceName = placeRes.data.place_name
            syncKeywords = industryKeywords
            syncLocalKeywords = localKeywords
        }

        // 4. 스케줄 업데이트
        // crawling_day + crawling_days 둘 다 저장 (Issue A 대응)
        const updateData: Record<string, unknown> = {
            crawling_time,
            grid_config,
            grid_distance,
            is_active,
            crawling_day: Array.isArray(crawling_days) && crawling_days.length > 0
                ? crawling_days[0]
                : null,
            crawling_days: crawling_days || [],
        }

        // 활성화 시 매장/키워드 동기화 (Issue C 대응)
        if (syncPlaceId !== undefined) {
            updateData.place_id = syncPlaceId
            updateData.place_name = syncPlaceName
            updateData.keywords = syncKeywords
            updateData.local_keywords = syncLocalKeywords ?? []
        }

        const { error: updateError } = await supabase
            .from('search_schedules')
            .update(updateData)
            .eq('id', existingSchedule.id)

        if (updateError) {
            console.error('[Schedule PUT] Update error:', updateError)
            return NextResponse.json(
                { error: '스케줄 업데이트에 실패했습니다.' },
                { status: 500 }
            )
        }

        // 5. 전화번호 업데이트
        if (phone !== undefined) {
            const cleanPhone = phone.replace(/[^0-9]/g, '')
            await supabase
                .from('user_subscriptions')
                .update({ phone: cleanPhone })
                .eq('user_id', user.id)
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('[Schedule PUT] Error:', error)
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
    }
}
