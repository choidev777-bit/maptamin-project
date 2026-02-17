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

    // Body 파싱 완료
    const body = await bodyPromise
    const { place, keywords, gridPoints, distance, distanceUnit } = body

    // 1. Ticket Check
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('remaining_tickets_google')
        .eq('user_id', user.id)
        .single()

    const remainingTickets = subscription?.remaining_tickets_google || 0

    // Admins bypass ticket check? For now, let's enforce it or give them many tickets.
    // Assuming admins also need tickets, or we can bypass. 
    // Let's enforce it for consistency, unless requested otherwise.
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
            status: 'processing',
            platform: 'google',
            report_type: 'realtime'
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to create search:', error)
        // Auto Refund on Failure
        await supabase.rpc('refund_ticket', { p_platform: 'google' })
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 4. Trigger GitHub Action (Async Processing)
    const ghRepo = process.env.NEXT_PUBLIC_GITHUB_REPO;
    const ghPat = process.env.GH_PAT;

    if (ghRepo && ghPat) {
        try {
            const [owner, repo] = ghRepo.split('/');
            const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/dispatches`;

            console.log(`[API] Dispatching manual_search to ${owner}/${repo} for SearchID: ${search.id}`);

            const response = await fetch(dispatchUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ghPat}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event_type: 'manual_search',
                    client_payload: {
                        search_id: search.id
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[API] GitHub Dispatch Failed: ${response.status} ${errorText}`);

                // Note: We don't fail the request here, but we log the error.
                // In production, we should probably update the search status to 'failed-trigger' and refund
                await supabase.from('searches').update({ status: 'failed', error_message: 'Worker Trigger Failed' }).eq('id', search.id);
                // Refund ticket since service failed
                await supabase.rpc('refund_ticket', { p_platform: 'google' });

                return NextResponse.json({ error: 'Failed to trigger search worker' }, { status: 500 });
            }
        } catch (dispatchError) {
            console.error('[API] Dispatch Error:', dispatchError);
            // Refund ticket
            await supabase.rpc('refund_ticket', { p_platform: 'google' });
            return NextResponse.json({ error: 'Internal Dispatch Error' }, { status: 500 });
        }
    } else {
        console.warn('[API] Missing GitHub Config (GH_PAT or NEXT_PUBLIC_GITHUB_REPO). Search created but not triggered.');
        // For local dev without secrets, we might want to warn
    }

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
