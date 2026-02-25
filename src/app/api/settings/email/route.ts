import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/settings/email
 *
 * 알림 이메일 변경 API
 * user_subscriptions.notification_email 업데이트
 */
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: '인증이 필요합니다.', code: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { email } = body

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: '이메일을 입력해주세요.', code: 'MISSING_EMAIL' },
                { status: 400 }
            )
        }

        // 간단한 이메일 형식 검증
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: '유효한 이메일 형식이 아닙니다.', code: 'INVALID_EMAIL' },
                { status: 400 }
            )
        }

        const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
                notification_email: email,
            })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('[Settings/Email] 이메일 업데이트 실패:', updateError)
            return NextResponse.json(
                { error: '이메일 변경에 실패했습니다.', code: 'DB_ERROR' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            email,
            message: '알림 이메일이 변경되었습니다.',
        })
    } catch (error) {
        console.error('[Settings/Email] 오류:', error)
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}
