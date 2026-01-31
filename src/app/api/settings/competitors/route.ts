import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { PLAN_CONFIG } from '@/lib/pricing/config';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const platform = searchParams.get('platform');

        let query = supabase.from('managed_competitors').select('*').eq('user_id', user.id);

        if (platform) {
            query = query.eq('platform', platform);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { platform, placeId, placeName, address, lat, lng } = body;

        if (!['naver', 'google'].includes(platform) || !placeId || !placeName) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // 1. Check Plan Limits
        // For Phase 1/2, manual PLAN_CONFIG or mock. Assuming 'free' or 'basic' based on user.
        // Needs to fetch user's subscription first.
        // For now, let's use a default limit or fetch from user_credits if plan_id exists.

        // Fetch current count
        const { count } = await supabase
            .from('managed_competitors')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('platform', platform);

        // Fetch user plan (Mocking as Basic for now or fetch from user_credits)
        // TODO: Proper plan fetching
        const maxCompetitors = PLAN_CONFIG.basic.limits.competitor; // 5

        if ((count || 0) >= maxCompetitors) {
            return NextResponse.json({ error: `경쟁사는 최대 ${maxCompetitors}개까지 등록할 수 있습니다.` }, { status: 403 });
        }

        // 2. Add Competitor
        const lockedUntil = new Date();
        lockedUntil.setDate(lockedUntil.getDate() + 30);

        const { error } = await supabase
            .from('managed_competitors')
            .insert({
                user_id: user.id,
                platform,
                place_id: placeId,
                place_name: placeName,
                address: address || null,
                lat: lat || null,
                lng: lng || null,
                locked_until: lockedUntil.toISOString()
            });

        if (error) {
            if (error.code === '23505') { // Unique violation
                return NextResponse.json({ error: '이미 등록된 경쟁사입니다.' }, { status: 409 });
            }
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Add Competitor Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // 1. Check Lock
        const { data: existing } = await supabase
            .from('managed_competitors')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
        }

        const now = new Date();
        if (existing.locked_until && new Date(existing.locked_until) > now) {
            return NextResponse.json({
                error: '30일 락 기간 중에는 삭제할 수 없습니다.',
                lockedUntil: existing.locked_until
            }, { status: 403 });
        }

        // 2. Delete
        const { error } = await supabase
            .from('managed_competitors')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
