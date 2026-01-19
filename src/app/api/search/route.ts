import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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
    if (!isAdmin) {
        const today = new Date().toISOString().split('T')[0]
        const { data: usage } = await supabase
            .from('daily_usage')
            .select('search_count')
            .eq('user_id', user.id)
            .eq('usage_date', today)
            .single()

        if (usage && usage.search_count >= 1) {
            return NextResponse.json({ error: 'Daily limit reached' }, { status: 429 })
        }
    }

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

    // TODO: Trigger background processing here
    // For now, we'll process inline in a separate step

    return NextResponse.json({ searchId: search.id })
}

export async function GET(request: Request) {
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
