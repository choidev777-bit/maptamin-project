/**
 * GET /api/cron/payment-reminder
 *
 * 결제 7일 전 안내 이메일 발송 CRON
 * - next_billing_date가 오늘로부터 7일 뒤인 active 구독 조회
 * - notification_email이 있는 유저에게만 안내 이메일 발송
 *
 * Vercel Cron에서 매일 1회 호출 (00:00 UTC = 09:00 KST)
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/client'
import { PaymentReminderEmail } from '@/lib/email/templates/PaymentReminderEmail'
import { PLAN_CONFIG } from '@/lib/pricing/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const MANAGEMENT_URL = 'https://maptamin.com/dashboard/subscription'

function getPlanName(planId: string): string {
    const names: Record<string, string> = {
        starter: '스타터',
        pro: '프로',
        premium: '프리미엄',
    }
    return names[planId] || planId
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

export async function GET(request: Request) {
    // 1. CRON_SECRET 인증
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!serviceKey) {
        console.error('[PaymentReminder] Missing service role key')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    try {
        // 2. 7일 뒤 날짜 범위 계산 (해당 날짜의 00:00 ~ 23:59)
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + 7)
        const startOfDay = new Date(targetDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(targetDate)
        endOfDay.setHours(23, 59, 59, 999)

        // 3. active 구독 중 next_billing_date가 7일 뒤인 유저 조회
        const { data: billings, error: billingError } = await supabase
            .from('subscription_billing')
            .select('user_id, plan_id, billing_cycle, next_billing_date')
            .eq('status', 'active')
            .gte('next_billing_date', startOfDay.toISOString())
            .lte('next_billing_date', endOfDay.toISOString())

        if (billingError) {
            console.error('[PaymentReminder] 구독 조회 실패:', billingError)
            return NextResponse.json({ error: billingError.message }, { status: 500 })
        }

        if (!billings || billings.length === 0) {
            console.log('[PaymentReminder] 7일 뒤 결제 예정 유저 없음')
            return NextResponse.json({ sent: 0, message: '대상 없음' })
        }

        // 4. user_subscriptions에서 notification_email 조회
        const userIds = billings.map((b) => b.user_id)
        const { data: subscriptions } = await supabase
            .from('user_subscriptions')
            .select('user_id, notification_email')
            .in('user_id', userIds)

        const emailMap = new Map<string, string>()
        subscriptions?.forEach((s) => {
            if (s.notification_email) {
                emailMap.set(s.user_id, s.notification_email)
            }
        })

        // 5. 이메일 발송
        let sentCount = 0
        let failCount = 0

        for (const billing of billings) {
            const email = emailMap.get(billing.user_id)
            if (!email) {
                console.log(`[PaymentReminder] userId=${billing.user_id}: 이메일 없음, 건너뜀`)
                continue
            }

            const planConfig = PLAN_CONFIG[billing.plan_id]
            if (!planConfig) continue

            const amount =
                billing.billing_cycle === 'yearly'
                    ? planConfig.yearlyPrice
                    : planConfig.price

            const result = await sendEmail({
                to: email,
                subject: `[맵타민] ${formatDate(new Date(billing.next_billing_date))} 결제 예정 안내`,
                react: PaymentReminderEmail({
                    planName: getPlanName(billing.plan_id),
                    amount,
                    billingDate: formatDate(new Date(billing.next_billing_date)),
                    managementUrl: MANAGEMENT_URL,
                }),
            })

            if (result.success) {
                sentCount++
                console.log(`[PaymentReminder] 발송 성공: userId=${billing.user_id}`)
            } else {
                failCount++
                console.error(`[PaymentReminder] 발송 실패: userId=${billing.user_id}`, result.error)
            }
        }

        console.log(`[PaymentReminder] 완료: sent=${sentCount}, failed=${failCount}, total=${billings.length}`)

        return NextResponse.json({
            sent: sentCount,
            failed: failCount,
            total: billings.length,
            message: `${sentCount}건 발송 완료`,
        })
    } catch (error) {
        console.error('[PaymentReminder] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
