import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Start body parsing immediately (parallel with usage check)
    const bodyPromise = request.json()

    // Admin emails that bypass daily limits (Legacy - now checks tickets)
    const ADMIN_EMAILS = [
        'canadacyj0226@gmail.com',
        'admin@maptamin.com',
    ]
    const isAdmin = user.email && ADMIN_EMAILS.includes(user.email)

    const body = await bodyPromise
    const { place, keywords, gridPoints, distance, distanceUnit, reportType } = body

    // --- Welcome Report 분기 (최소 변경) ---
    const isWelcome = reportType === 'welcome'

    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('remaining_tickets_google, welcome_report_sent')
        .eq('user_id', user.id)
        .single()

    // 🔴 CRITICAL: 웰컴 리포트 보안 검증
    if (isWelcome) {
        if (subscription?.welcome_report_sent) {
            return NextResponse.json(
                { error: 'WELCOME_REPORT_ALREADY_SENT', message: '웰컴 리포트는 한 번만 받을 수 있습니다.' },
                { status: 403 }
            )
        }
    }

    // 1. Ticket Check (웰컴 리포트는 무료 — Skip)
    if (!isWelcome) {
        const remainingTickets = subscription?.remaining_tickets_google || 0
        if (remainingTickets <= 0) {
            return NextResponse.json({
                error: 'NO_TICKETS',
                message: '구글 검색 티켓이 부족합니다.',
            }, { status: 402 })
        }

        // 2. Deduct Ticket (Atomic RPC)
        const { error: deductError } = await supabase
            .rpc('deduct_ticket', { p_platform: 'google' })

        if (deductError) {
            console.error('Ticket deduction failed:', deductError)
            return NextResponse.json({
                error: 'TICKET_DEDUCTION_FAILED',
                message: '티켓 차감 중 오류가 발생했습니다.',
            }, { status: 500 })
        }
    }

    // 3. Create Search Record
    const { data: search, error } = await supabase
        .from('searches')
        .insert({
            user_id: user.id,
            place_id: place.placeId,
            place_name: place.name,
            place_address: place.address,
            place_lat: place.lat,
            place_lng: place.lng,
            keywords,
            grid_points: gridPoints,
            grid_distance: distance,
            distance_unit: distanceUnit,
            status: isWelcome ? 'pending' : 'processing',
            platform: 'google',
            report_type: isWelcome ? 'welcome' : 'realtime'
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to create search:', error)
        // Auto Refund on Failure
        if (!isWelcome) {
            await supabase.rpc('refund_ticket', { p_platform: 'google' })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 4. 웰컴: Oracle VM dispatch 트리거 / 실시간: 클라이언트가 /process 직접 호출
    if (isWelcome) {
        const baseUrl = request.nextUrl.origin
        fetch(`${baseUrl}/api/queue/dispatch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        }).catch(e => console.error('[Search/Google] Dispatch trigger failed:', e))
    }
    console.log(`[API/Google] Search created: ${search.id} (type: ${isWelcome ? 'welcome' : 'realtime'})`)

    return NextResponse.json({ searchId: search.id })
}

export async function GET() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: searches } = await supabase
        .from('searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    return NextResponse.json({ searches })
}
