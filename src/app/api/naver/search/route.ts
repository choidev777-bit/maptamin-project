/**
 * Naver Search API Route
 * 
 * POST: 새 네이버 검색 생성
 * GET: 네이버 검색 히스토리 조회
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Body 파싱 시작 (병렬 처리를 위해 일찍 시작)
    const bodyPromise = request.json()

    // Admin 이메일 (일일 제한 bypass)
    const ADMIN_EMAILS = [
        'canadacyj0226@gmail.com',
        'admin@maptamin.com',
    ]
    const isAdmin = user.email && ADMIN_EMAILS.includes(user.email)

    // 일일 사용량 체크 (Admin 제외)
    if (!isAdmin) {
        const today = new Date().toISOString().split('T')[0]
        const { data: usage } = await supabase
            .from('daily_usage')
            .select('search_count')
            .eq('user_id', user.id)
            .eq('usage_date', today)
            .eq('platform', 'naver')  // 네이버 플랫폼 구분
            .single()

        if (usage && usage.search_count >= 1) {
            return NextResponse.json({
                error: 'DAILY_LIMIT_EXCEEDED',
                message: '네이버 일일 검색 한도를 초과했습니다. 내일 다시 시도해주세요.',
            }, { status: 429 })
        }
    }

    // Body 파싱 완료
    const body = await bodyPromise
    const { placeName, placeAddress, placeLat, placeLng, keywords, gridPoints, distance, distanceUnit } = body

    // 검색 레코드 생성
    const { data: search, error } = await supabase
        .from('searches')
        .insert({
            user_id: user.id,
            place_id: `naver_${placeLat}_${placeLng}`,  // 네이버용 place_id 형식
            place_name: placeName,
            place_address: placeAddress,
            place_lat: placeLat,
            place_lng: placeLng,
            keywords,
            grid_points: gridPoints,
            grid_distance: distance,
            distance_unit: distanceUnit,
            status: 'pending',
            platform: 'naver',  // 플랫폼 구분
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to create naver search:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 일일 사용량 증가 (네이버 플랫폼)
    const todayDate = new Date().toISOString().split('T')[0]
    await supabase.rpc('increment_daily_usage', {
        p_user_id: user.id,
        p_date: todayDate,
        p_platform: 'naver',  // 플랫폼 파라미터 추가
    })

    // 예상 소요 시간 계산 (그리드 포인트 수 × 키워드 수 × 3초)
    const enabledPoints = gridPoints.filter((p: { enabled: boolean }) => p.enabled).length
    const estimatedTime = enabledPoints * keywords.length * 3

    return NextResponse.json({
        searchId: search.id,
        status: 'pending',
        estimatedTime,
        message: 'Search created successfully',
    })
}

export async function GET(request: Request) {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 네이버 검색 히스토리 조회
    const { data: searches } = await supabase
        .from('searches')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'naver')  // 네이버 플랫폼만
        .order('created_at', { ascending: false })

    return NextResponse.json({ searches })
}
