import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Start body parsing immediately (parallel with usage check)
    // "Start early, await late" pattern for better performance
    const bodyPromise = request.json()

    // Admin emails that bypass daily limits
    const ADMIN_EMAILS = [
        'canadacyj0226@gmail.com',
        'admin@maptamin.com',
    ]
    const isAdmin = user.email && ADMIN_EMAILS.includes(user.email)

    // Check daily usage (skip for admins)
    // Check daily usage (skip for admins)
    // Legacy hard limit removed in favor of Point-based system
    /* 
    if (!isAdmin) {
        ...
    } 
    */
    // Keeping the query for now if needed for stats, but removing the BLOCKING logic.
    // Actually, simply removing the block is cleaner.


    // Await body only after usage check passes
    const body = await bodyPromise
    const { place, keywords, gridPoints, distance, distanceUnit } = body

    // Create search record
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
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment usage
    const todayDate = new Date().toISOString().split('T')[0]
    await supabase.rpc('increment_daily_usage', {
        p_user_id: user.id,
        p_date: todayDate,
    })

    // Trigger GitHub Action (Async Processing)
    // We offload the heavy scraping to GitHub Actions to avoid Vercel 10s timeout
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
                // In production, we should probably update the search status to 'failed-trigger'
                await supabase.from('searches').update({ status: 'failed', error_message: 'Worker Trigger Failed' }).eq('id', search.id);
                return NextResponse.json({ error: 'Failed to trigger search worker' }, { status: 500 });
            }
        } catch (dispatchError) {
            console.error('[API] Dispatch Error:', dispatchError);
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
