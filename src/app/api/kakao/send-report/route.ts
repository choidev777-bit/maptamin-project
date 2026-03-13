import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeReport, sendWeeklyReport, sendDailyReport } from '@/lib/kakao/messaging';

/**
 * POST /api/kakao/send-report
 * 카카오 알림톡 리포트 발송 API
 *
 * Body: { type: 'welcome' | 'weekly', searchId: string, placeName: string }
 */
export async function POST(request: NextRequest) {
    try {
        // ── 1. 인증 확인 ──
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: '인증이 필요합니다.' },
                { status: 401 }
            );
        }

        // ── 2. 요청 파싱 ──
        const body = await request.json();
        const { type, searchId, placeName } = body as {
            type: 'welcome' | 'daily' | 'weekly';
            searchId: string;
            placeName: string;
        };

        if (!type || !searchId || !placeName) {
            return NextResponse.json(
                { error: 'type, searchId, placeName은 필수입니다.' },
                { status: 400 }
            );
        }

        // ── 3. 검색 정보에서 platform 조회 ──
        const { data: searchData } = await supabase
            .from('searches')
            .select('platform')
            .eq('id', searchId)
            .single();

        const platform = searchData?.platform || 'naver';

        // ── 4. 알림톡 발송 ──
        try {
            if (type === 'welcome') {
                await sendWelcomeReport(user.id, placeName, searchId, platform);
            } else if (type === 'daily') {
                await sendDailyReport(user.id, placeName, searchId, platform);
            } else {
                await sendWeeklyReport(user.id, placeName, searchId, platform);
            }

            // ── 5. 발송 성공 → notification_logs 기록 ──
            await supabase.from('notification_logs').insert({
                user_id: user.id,
                search_id: searchId,
                type,
                status: 'sent',
                sent_via: 'solapi',
                sent_at: new Date().toISOString(),
            });

            return NextResponse.json({ success: true });
        } catch (sendError: any) {
            // ── 6. 발송 실패 → notification_logs에 실패 기록 ──
            console.error('[API /kakao/send-report] 발송 실패:', sendError.message);

            await supabase.from('notification_logs').insert({
                user_id: user.id,
                search_id: searchId,
                type,
                status: 'failed',
                sent_via: 'solapi',
                error_message: sendError.message,
            });

            return NextResponse.json(
                { error: '알림톡 발송에 실패했습니다.', detail: sendError.message },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('[API /kakao/send-report] 서버 오류:', error.message);
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
