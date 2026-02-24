/**
 * GET /api/cron/expire-subscriptions
 *
 * 구독 만료 감지 CRON 작업
 * - cancel_scheduled 상태이며 next_billing_date가 지난 구독을 expired로 전환
 * - 만료된 사용자의 plan_id를 free로 다운그레이드
 * - 만료된 사용자의 빌링키를 PortOne API로 삭제
 *
 * pg_cron 또는 Vercel Cron에서 매일 1회 호출
 *
 * @see supabase/migrations/021_subscription_lifecycle.sql
 * @see Docs/plans/PLAN_payment-system-fix.md Phase 2
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { deleteBillingKey } from '@/lib/portone/billing'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
    // 1. CRON_SECRET 인증
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!serviceKey) {
        console.error('[ExpireSubscriptions] Missing service role key')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    try {
        // 2. expire_cancelled_subscriptions RPC 호출
        //    반환값: { expired_user_id, expired_billing_key }[]
        const { data: expiredUsers, error: rpcError } = await supabase
            .rpc('expire_cancelled_subscriptions')

        if (rpcError) {
            console.error('[ExpireSubscriptions] RPC error:', rpcError)
            return NextResponse.json({ error: rpcError.message }, { status: 500 })
        }

        const expiredCount = expiredUsers?.length || 0
        console.log(`[ExpireSubscriptions] ${expiredCount}명 구독 만료 처리 완료`)

        // 3. 만료된 사용자의 빌링키 삭제 (PortOne API)
        const billingKeyResults: { userId: string; success: boolean; error?: string }[] = []

        if (expiredUsers && expiredUsers.length > 0) {
            for (const { expired_user_id, expired_billing_key } of expiredUsers) {
                if (!expired_billing_key) {
                    console.warn(`[ExpireSubscriptions] userId=${expired_user_id}: 빌링키 없음, 건너뜀`)
                    continue
                }

                try {
                    await deleteBillingKey(expired_billing_key)
                    billingKeyResults.push({ userId: expired_user_id, success: true })
                    console.log(`[ExpireSubscriptions] 빌링키 삭제 성공: userId=${expired_user_id}`)
                } catch (error) {
                    // 빌링키 삭제 실패는 로깅만 (DB 상태는 이미 expired로 전환됨)
                    const errorMsg = error instanceof Error ? error.message : String(error)
                    billingKeyResults.push({ userId: expired_user_id, success: false, error: errorMsg })
                    console.error(`[ExpireSubscriptions] 빌링키 삭제 실패: userId=${expired_user_id}`, errorMsg)
                }
            }
        }

        return NextResponse.json({
            expired: expiredCount,
            billingKeysDeleted: billingKeyResults.filter(r => r.success).length,
            billingKeysFailed: billingKeyResults.filter(r => !r.success).length,
            message: `${expiredCount}명 구독 만료 처리 완료`,
        })

    } catch (error) {
        console.error('[ExpireSubscriptions] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
