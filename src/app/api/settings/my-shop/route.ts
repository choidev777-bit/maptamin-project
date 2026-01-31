import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

        // 1. Check existing
        const { data: existing } = await supabase
            .from('managed_places')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', platform)
            .single();

        const now = new Date();

        if (existing) {
            // 2. Check Lock
            if (existing.locked_until && new Date(existing.locked_until) > now) {
                return NextResponse.json({
                    error: '30일 동안 변경할 수 없습니다.',
                    lockedUntil: existing.locked_until
                }, { status: 403 });
            }

            // 3. Update
            const lockedUntil = new Date();
            lockedUntil.setDate(lockedUntil.getDate() + 30);

            const { error } = await supabase
                .from('managed_places')
                .update({
                    place_id: placeId,
                    place_name: placeName,
                    address: address || null,
                    lat: lat || null,
                    lng: lng || null,
                    locked_until: lockedUntil.toISOString()
                })
                .eq('id', existing.id);

            if (error) throw error;
        } else {
            // 4. Create
            const lockedUntil = new Date();
            lockedUntil.setDate(lockedUntil.getDate() + 30);

            const { error } = await supabase
                .from('managed_places')
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

            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('My Shop Setting Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const platform = searchParams.get('platform');

        let query = supabase.from('managed_places').select('*').eq('user_id', user.id);

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

        // 1. Check existing
        const { data: existing } = await supabase
            .from('managed_places')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const now = new Date();

        // 2. Check Lock
        if (existing.locked_until && new Date(existing.locked_until) > now) {
            return NextResponse.json({
                error: '30일 동안 삭제할 수 없습니다.',
                lockedUntil: existing.locked_until
            }, { status: 403 });
        }

        // 3. Delete
        const { error } = await supabase
            .from('managed_places')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
