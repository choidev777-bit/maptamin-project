/**
 * Naver Search API Route
 * 
 * POST: 새 네이버 검색 생성
 * GET: 네이버 검색 히스토리 조회
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLAN_CONFIG } from '@/lib/pricing/config'

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
    // 일일 사용량 체크 (Admin 제외) - Legacy hard limit removed
    /*
    if (!isAdmin) {
        ...
    }
    */

    const body = await bodyPromise
    const { placeName, placeAddress, placeLat, placeLng, keywords, gridPoints, distance, distanceUnit, placeId, reportType } = body

    // --- Welcome Report 분기 (최소 변경) ---
    const isWelcome = reportType === 'welcome'

    // 1. Plan & Subscription Check
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id, remaining_tickets_naver, welcome_report_sent')
        .eq('user_id', user.id)
        .single()

    // 🔴 CRITICAL: 웰컴 리포트 보안 검증 — 이미 전송한 유저 차단
    if (isWelcome) {
        if (subscription?.welcome_report_sent) {
            return NextResponse.json(
                { error: 'WELCOME_REPORT_ALREADY_SENT', message: '웰컴 리포트는 한 번만 받을 수 있습니다.' },
                { status: 403 }
            )
        }
    }

    const planId = subscription?.plan_id || 'starter'
    const planConfig = PLAN_CONFIG[planId] || PLAN_CONFIG['starter']

    // 2. Validate Grid Size (Plan Limit)
    // gridPoints is an array. We need to check if the template size matches the limit.
    // However, gridPoints passed here are "selected points".
    // A better check is usually "max enabled points" or "distance". 
    // But pseudocode mentioned "Grid Size" (3x3, 5x5).
    // Let's assume the frontend sends what it generated. 
    // We can count the number of enabled points, OR check the implicit grid dimension if passed.
    // Since we receive explicit `gridPoints`, let's limit by *Total Points* or *Max Distance*?
    // Section 5.B.2 says "if (request.gridWidth > config.limits.gridSize)".
    // But `gridPoints` doesn't explicitly say "Width".
    // We can infer max row/col index.
    const maxRow = Math.max(...(gridPoints as any[]).map(p => Math.abs(p.row)))
    const maxCol = Math.max(...(gridPoints as any[]).map(p => Math.abs(p.col)))
    const gridSize = Math.max(maxRow, maxCol) * 2 + 1 // e.g., maxRow=1 -> 3x3

    if (gridSize > planConfig.gridSize) {
        return NextResponse.json({
            error: 'PLAN_LIMIT_EXCEEDED',
            message: `현재 플랜(${planConfig.price.toLocaleString()}원)에서는 ${planConfig.gridSize}x${planConfig.gridSize} 그리드까지만 사용할 수 있습니다.`,
        }, { status: 403 })
    }

    // 3. Ticket Check (웰컴 리포트는 무료 — Skip)
    if (!isWelcome) {
        const remainingTickets = subscription?.remaining_tickets_naver || 0
        if (remainingTickets <= 0) {
            return NextResponse.json({
                error: 'NO_TICKETS',
                message: '이번 달 실시간 진단 티켓이 모두 소진되었습니다.',
            }, { status: 402 })
        }

        // 4. Deduct Ticket (Atomic RPC)
        const { error: deductError } = await supabase
            .rpc('deduct_ticket', { p_platform: 'naver' })

        if (deductError) {
            console.error('Ticket deduction failed:', deductError)
            return NextResponse.json({
                error: 'TICKET_DEDUCTION_FAILED',
                message: '티켓 차감에 실패했습니다.',
            }, { status: 500 })
        }
    }

    // 5. Create Search Record
    const { data: search, error: createError } = await supabase
        .from('searches')
        .insert({
            user_id: user.id,
            place_id: placeId || `naver_${placeLat}_${placeLng}`, // Prefer passed ID (e.g. managed place id)
            place_name: placeName,
            place_address: placeAddress,
            place_lat: placeLat,
            place_lng: placeLng,
            keywords,
            grid_points: gridPoints,
            grid_distance: distance,
            distance_unit: distanceUnit,
            status: 'pending',
            platform: 'naver',
            report_type: isWelcome ? 'welcome' : 'realtime'
        })
        .select()
        .single()

    if (createError) {
        console.error('Failed to create naver search:', createError)
        // Auto Refund on Failure (웰컴 리포트는 티켓 없으므로 refund 불필요)
        if (!isWelcome) {
            await supabase.rpc('refund_ticket', { p_platform: 'naver' })
        }
        return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // 예상 소요 시간 계산
    const enabledCount = gridPoints.filter((p: { enabled: boolean }) => p.enabled).length
    const estimatedTime = enabledCount * keywords.length * 3

    // 🆕 Trigger queue dispatcher (non-blocking)
    // This will start the job if slots are available
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    fetch(`${baseUrl}/api/queue/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('[Search] Dispatcher trigger failed:', err))

    return NextResponse.json({
        searchId: search.id,
        status: 'pending',
        estimatedTime,
        message: 'Search created and paid successfully',
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
