import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getPlanLimit } from '@/lib/pricing/config';

// GET: 경쟁사 목록 조회
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

        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: 경쟁사 등록
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { platform, placeId, placeName } = body;

        if (!['naver', 'google'].includes(platform) || !placeId || !placeName) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // 1. 플랜 조회
        const { data: sub } = await supabase
            .from('user_subscriptions')
            .select('plan_id')
            .eq('user_id', user.id)
            .single();

        const planId = sub?.plan_id || 'starter';
        const limits = getPlanLimit(planId);

        const maxForPlatform = platform === 'naver' ? limits.competitorsNaver : limits.competitorsGoogle;

        if (maxForPlatform === 0) {
            return NextResponse.json({ error: '현재 플랜에서는 경쟁사를 등록할 수 없습니다.' }, { status: 403 });
        }

        // 2. 해당 플랫폼의 현재 등록 수 확인
        const { data: existing, error: fetchErr } = await supabase
            .from('managed_competitors')
            .select('*')
            .eq('user_id', user.id)
            .eq('platform', platform);

        if (fetchErr) throw fetchErr;

        if ((existing?.length || 0) >= maxForPlatform) {
            return NextResponse.json({
                error: `${platform === 'naver' ? '네이버' : '구글'} 경쟁사는 최대 ${maxForPlatform}곳까지 등록 가능합니다.`
            }, { status: 400 });
        }

        // 3. 중복 체크
        if (existing?.some(c => c.place_id === placeId)) {
            return NextResponse.json({ error: '이미 등록된 경쟁사입니다.' }, { status: 400 });
        }

        // 4. 등록 (30일 락 없음)
        const { error: insertErr } = await supabase
            .from('managed_competitors')
            .insert({
                user_id: user.id,
                platform,
                place_id: placeId,
                place_name: placeName,
            });

        if (insertErr) throw insertErr;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Competitor Setting Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: 경쟁사 삭제 (30일 락 없이 자유 삭제)
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

        // 존재 확인 + 소유자 확인
        const { data: existing } = await supabase
            .from('managed_competitors')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (!existing) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // 삭제
        const { error } = await supabase
            .from('managed_competitors')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
