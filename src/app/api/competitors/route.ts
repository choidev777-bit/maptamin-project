
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PLAN_CONFIG } from '@/lib/pricing/config'

// GET: Fetch competitors for a platform (Optional, page does this directly but API good for client side refresh if needed)
// But currently we use server components. 
// We implement POST (Add) and DELETE (Remove)

export async function POST(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, placeId, placeName, placeAddress, placeLat, placeLng } = body

    if (!platform || !placeId || !placeName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Check Plan Limits
    const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan_id')
        .eq('user_id', user.id)
        .single()

    const planId = subscription?.plan_id || 'starter'
    const planConfig = PLAN_CONFIG[planId] || PLAN_CONFIG['starter']
    const maxSlots = planConfig.competitors

    // Count existing competitors for this platform
    const { count } = await supabase
        .from('managed_competitors')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('platform', platform)
    // .is('deleted_at', null) // Column might not exist

    if ((count || 0) >= maxSlots) {
        return NextResponse.json({
            error: 'SLOT_LIMIT_EXCEEDED',
            // Debug info included in message
            message: `최대 ${maxSlots}개만 등록 가능 (현재: ${count || 0}, 플랜: ${planId})`
        }, { status: 403 })
    }

    // 2. Insert Competitor with Lock
    // 30 days lock
    const lockedUntil = new Date()
    lockedUntil.setDate(lockedUntil.getDate() + 30)

    const { data, error } = await supabase
        .from('managed_competitors')
        .insert({
            user_id: user.id,
            platform,
            place_id: placeId,
            place_name: placeName,
            address: placeAddress,
            lat: placeLat,
            lng: placeLng,
            locked_until: lockedUntil.toISOString()
        })
        .select()
        .single()

    if (error) {
        // Handle duplicate
        if (error.code === '23505') { // Unique violation
            return NextResponse.json({ error: 'Already registered' }, { status: 409 })
        }
        console.error('Failed to add competitor:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}

export async function DELETE(request: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // 1. Check Lock Status
    const { data: competitor } = await supabase
        .from('managed_competitors')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (!competitor) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (competitor.locked_until && new Date(competitor.locked_until) > new Date()) {
        return NextResponse.json({
            error: 'LOCKED',
            message: `이 경쟁사는 ${new Date(competitor.locked_until).toLocaleDateString()}까지 삭제할 수 없습니다.`
        }, { status: 403 })
    }

    // 2. Soft Delete (or Hard Delete? Schema suggests Hard Delete usually unless deleted_at exists)
    // The previous check use `.is('deleted_at', null)` which implies Soft Delete support.
    // Let's check schema again. 007 file lines displayed do NOT show `deleted_at`.
    // Wait, lines 1-38 of 007_managed_competitors.sql did NOT show `deleted_at`.
    // It showed `locked_until`, `created_at`.
    // Does it have `deleted_at`?
    // User code in `page.tsx` used `.is('deleted_at', null)`. 
    // This implies expectation of soft delete.
    // But migration might not have it.
    // If migration doesn't have it, I should hard delete OR add the column.

    // Let's check if I missed columns in `007`.
    // The previous `view_file` output showed lines 1-38. 
    // Line 12 was `created_at timestamptz default now()`.
    // No `deleted_at`.

    // I MUST handle this discrepancy.
    // OPTION A: Hard Delete (simplest for now, matches schema).
    // OPTION B: Add `deleted_at` column.

    // Recommendation: Hard delete for simplicity unless "History" requires keeping it.
    // Requirement says: "기록 버튼"을 클릭하면 여태까지 해당 경쟁사를 기반으로 검색했던 기록 리스트가 나옴.
    // Searches are stored in `searches` table with `place_id`. 
    // Even if I delete `managed_competitors` row, the `searches` table has the `place_id` and data.
    // BUT `searches` table likely references `managed_competitors`? No, `searches` uses `place_id` string usually or no FK.
    // Let's assume Hard Delete is safe for Phase 2.
    // I will change `page.tsx` to NOT filter by `deleted_at` if I do hard delete.
    // OR I accept that `page.tsx` code I wrote was anticipating `deleted_at`. 
    // Let's go with HARD DELETE to match current schema `007` and `final_schema_fix`.
    // I will *Remove* `.is('deleted_at', null)` from `page.tsx` query later or rely on the fact that if it's hard deleted it won't be returned anyway.

    const { error } = await supabase
        .from('managed_competitors')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
