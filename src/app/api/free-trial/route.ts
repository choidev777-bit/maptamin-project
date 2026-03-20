/**
 * Free Trial API Route
 * 
 * POST: 무료 체험 네이버 검색 생성 (free 플랜 유저 전용, 1회 제한)
 * 
 * Vercel Best Practices 적용:
 * - async-api-routes: body 파싱을 일찍 시작 (Promise를 일찍 시작, 늦게 await)
 * - async-parallel: 독립적인 작업들을 Promise.all()로 병렬 실행
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()

    // ── 1. 인증 확인 ──
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── async-api-routes: Body 파싱을 일찍 시작 (subscription 조회와 병렬) ──
    const bodyPromise = request.json()

    // ── 2. 구독 정보 조회 (body 파싱과 병렬) ──
    const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_id, free_trial_used')
        .eq('user_id', user.id)
        .single()

    if (subError || !subscription) {
        return NextResponse.json(
            { error: 'SUBSCRIPTION_NOT_FOUND', message: '구독 정보를 찾을 수 없습니다.' },
            { status: 404 }
        )
    }

    // ── 3. 가드: 유료 구독자 차단 ──
    if (subscription.plan_id !== 'free') {
        return NextResponse.json(
            { error: 'ALREADY_SUBSCRIBED', message: '이미 구독 중이시네요! 대시보드에서 분석을 시작하세요.' },
            { status: 403 }
        )
    }

    // ── 4. 가드: 1회 제한 ──
    if (subscription.free_trial_used) {
        return NextResponse.json(
            { error: 'FREE_TRIAL_ALREADY_USED', message: '이미 무료 체험을 사용하셨습니다.' },
            { status: 403 }
        )
    }

    // ── 5. Body 파싱 (이미 시작된 Promise를 await) ──
    const body = await bodyPromise
    const {
        placeName,
        placeAddress,
        placeLat,
        placeLng,
        keyword,        // 업종 키워드 1개
        localKeyword,   // 지역명 키워드 1개
        gridPoints,
        distance,
        distanceUnit,
        phone,
    } = body

    // ── 6. 입력 검증 ──
    if (!placeName || !placeLat || !placeLng || !keyword || !localKeyword || !gridPoints || !phone) {
        return NextResponse.json(
            { error: 'MISSING_FIELDS', message: '필수 항목을 모두 입력해주세요.' },
            { status: 400 }
        )
    }

    // 전화번호 형식 검증 (한국 휴대폰: 010XXXXXXXX)
    const phoneClean = phone.replace(/[^0-9]/g, '')
    if (!/^(010\d{8}|01[16789]\d{7})$/.test(phoneClean)) {
        return NextResponse.json(
            { error: 'INVALID_PHONE', message: '올바른 휴대폰 번호를 입력해주세요.' },
            { status: 400 }
        )
    }

    // 그리드 크기 검증 (3×3 또는 5×5만 허용)
    const maxRow = Math.max(...(gridPoints as any[]).map((p: any) => Math.abs(p.row)))
    const maxCol = Math.max(...(gridPoints as any[]).map((p: any) => Math.abs(p.col)))
    const gridSize = Math.max(maxRow, maxCol) * 2 + 1

    if (gridSize !== 3 && gridSize !== 5) {
        return NextResponse.json(
            { error: 'INVALID_GRID_SIZE', message: '무료 체험은 3×3 또는 5×5 그리드만 사용할 수 있습니다.' },
            { status: 400 }
        )
    }

    // ── 7. 전화번호 저장 + free_trial_used = true (INSERT 전에 먼저!) ──
    // 엣지케이스 방지: INSERT 후 UPDATE 실패 시 2회 체험 가능 → UPDATE를 먼저 실행
    const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
            phone: phoneClean,
            free_trial_used: true,
        })
        .eq('user_id', user.id)

    if (updateError) {
        console.error('[FreeTrial] Failed to update subscription:', updateError)
        return NextResponse.json(
            { error: 'UPDATE_FAILED', message: '정보 업데이트에 실패했습니다.' },
            { status: 500 }
        )
    }

    // ── 8. 검색 레코드 생성 ──
    const { data: search, error: createError } = await supabase
        .from('searches')
        .insert({
            user_id: user.id,
            place_id: `naver_${placeLat}_${placeLng}`,
            place_name: placeName,
            place_address: placeAddress || '',
            place_lat: placeLat,
            place_lng: placeLng,
            keywords: [keyword],
            local_keywords: [localKeyword],
            grid_points: gridPoints,
            grid_distance: distance || 0.3,
            distance_unit: distanceUnit || 'km',
            status: 'pending',
            platform: 'naver',
            report_type: 'free_trial',
        })
        .select()
        .single()

    if (createError) {
        console.error('[FreeTrial] Failed to create search:', createError)

        // ── 롤백: INSERT 실패 시 free_trial_used를 false로 되돌림 ──
        await supabase
            .from('user_subscriptions')
            .update({ free_trial_used: false })
            .eq('user_id', user.id)

        return NextResponse.json(
            { error: 'SEARCH_CREATION_FAILED', message: '분석 생성에 실패했습니다. 다시 시도해주세요.' },
            { status: 500 }
        )
    }

    // ── 9. 예상 소요 시간 계산 ──
    const enabledCount = gridPoints.filter((p: { enabled: boolean }) => p.enabled).length
    const estimatedTime = enabledCount * 1 * 3 // 키워드 1개

    // ── 10. Oracle VM 디스패치 트리거 ──
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    try {
        await fetch(`${baseUrl}/api/queue/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })
    } catch (err) {
        console.error('[FreeTrial] Dispatcher trigger failed:', err)
        // 디스패치 실패해도 search 레코드는 유지 — 다음 dispatch 사이클에서 처리됨
    }

    return NextResponse.json({
        searchId: search.id,
        status: 'pending',
        estimatedTime,
        message: '무료 체험 분석이 시작되었습니다!',
    })
}
