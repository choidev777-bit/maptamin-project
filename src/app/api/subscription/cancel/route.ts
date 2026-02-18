import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/subscription/cancel
 * 구독 해지: plan_id → 'free', 스케줄 비활성화
 * 현재: 즉시 free 전환
 * TODO(PG연동): 다음 결제일까지 유지 후 전환으로 변경
 */
export async function POST() {
    try {
        const supabase = await createClient()

        // 1. 인증 확인
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: '인증이 필요합니다.' },
                { status: 401 }
            )
        }

        // 2. 현재 구독 상태 확인
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select('plan_id')
            .eq('user_id', user.id)
            .single()

        if (subError || !subscription) {
            return NextResponse.json(
                { error: '구독 정보를 찾을 수 없습니다.' },
                { status: 404 }
            )
        }

        if (subscription.plan_id === 'free') {
            return NextResponse.json(
                { error: '이미 무료 플랜입니다.' },
                { status: 400 }
            )
        }

        // 3. plan_id를 'free'로 변경
        const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({ plan_id: 'free' })
            .eq('user_id', user.id)

        if (updateError) {
            console.error('구독 해지 실패:', updateError)
            return NextResponse.json(
                { error: '구독 해지에 실패했습니다. 잠시 후 다시 시도해주세요.' },
                { status: 500 }
            )
        }

        // 4. 자동 보고서 스케줄 비활성화
        const { error: scheduleError } = await supabase
            .from('search_schedules')
            .update({ is_active: false })
            .eq('user_id', user.id)

        if (scheduleError) {
            // 스케줄 비활성화 실패해도 해지 자체는 성공으로 처리
            console.error('스케줄 비활성화 실패:', scheduleError)
        }

        return NextResponse.json({
            success: true,
            message: '구독이 해지되었습니다. 무료 플랜으로 전환되었습니다.',
        })

    } catch (error) {
        console.error('구독 해지 처리 중 오류:', error)
        return NextResponse.json(
            { error: '서버 오류가 발생했습니다.' },
            { status: 500 }
        )
    }
}
