import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isPlaceLockExempt } from '@/lib/utils/subscription';

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

        // 0. 사용자 플랜 조회
        const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('plan_id')
            .eq('user_id', user.id)
            .single();

        const planId = subscription?.plan_id || 'free';
        const lockExempt = isPlaceLockExempt(planId);

        // 1. Check existing
        const { data: existing } = await supabase
            .from('managed_places')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', platform)
            .single();

        const now = new Date();

        if (existing) {
            // 2. Check Lock (프리미엄 면제 시 건너뜀)
            if (!lockExempt && existing.locked_until && new Date(existing.locked_until) > now) {
                return NextResponse.json({
                    error: '30일 동안 변경할 수 없습니다.',
                    lockedUntil: existing.locked_until
                }, { status: 403 });
            }

            const isPlaceChanged = existing.place_id !== placeId;

            // 3. Update (프리미엄: locked_until=에폭크(1970), 그 외: 30일 후)
            const lockedUntil = lockExempt ? new Date(0).toISOString() : (() => {
                const d = new Date();
                d.setDate(d.getDate() + 30);
                return d.toISOString();
            })();

            const { error } = await supabase
                .from('managed_places')
                .update({
                    place_id: placeId,
                    place_name: placeName,
                    address: address || null,
                    lat: lat || null,
                    lng: lng || null,
                    locked_until: lockedUntil
                })
                .eq('id', existing.id);

            if (error) throw error;

            // 4. 매장이 실제로 변경된 경우 → 키워드/경쟁사/스케줄 초기화
            if (isPlaceChanged) {
                await Promise.all([
                    supabase
                        .from('managed_keywords')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('platform', platform),
                    supabase
                        .from('managed_competitors')
                        .delete()
                        .eq('user_id', user.id)
                        .eq('platform', platform),
                    supabase
                        .from('search_schedules')
                        .update({ is_active: false })
                        .eq('user_id', user.id)
                        .eq('platform', platform),
                ]);
            }

            return NextResponse.json({ success: true, resetPerformed: isPlaceChanged });
        } else {
            // 5. Create (신규 등록 — 프리미엄: locked_until=에폭크(1970), 그 외: 30일 후)
            const lockedUntil = lockExempt ? new Date(0).toISOString() : (() => {
                const d = new Date();
                d.setDate(d.getDate() + 30);
                return d.toISOString();
            })();

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
                    locked_until: lockedUntil
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

        // 2. 사용자 플랜 조회
        const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('plan_id')
            .eq('user_id', user.id)
            .single();

        const planId = subscription?.plan_id || 'free';
        const lockExempt = isPlaceLockExempt(planId);

        // 3. Check Lock (프리미엄 면제 시 건너뜀)
        if (!lockExempt && existing.locked_until && new Date(existing.locked_until) > now) {
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
