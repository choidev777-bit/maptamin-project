
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: schedules, error } = await supabase
        .from('search_schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schedules })
}

export async function POST(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, place_id, place_name, keywords, grid_config, crawling_days, crawling_time, is_active } = body

    const { data: schedule, error } = await supabase
        .from('search_schedules')
        .insert({
            user_id: user.id,
            platform: platform || 'naver', // Default to naver if missing
            place_id,
            place_name,
            keywords,
            grid_config,
            is_active: is_active ?? true,
            crawling_time: crawling_time || '09:00:00',
            crawling_days: crawling_days || [1, 2, 3, 4, 5] // Default Mon-Fri
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schedule })
}
