/**
 * GET /api/test/send-email
 *
 * 이메일 템플릿 테스트 발송 (개발용)
 * ?type=success|failed|reminder
 * ?to=이메일주소
 */

import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/client'
import { PaymentSuccessEmail } from '@/lib/email/templates/PaymentSuccessEmail'
import { PaymentFailedEmail } from '@/lib/email/templates/PaymentFailedEmail'
import { PaymentReminderEmail } from '@/lib/email/templates/PaymentReminderEmail'

export async function GET(request: Request) {
    // 프로덕션 차단
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: '프로덕션에서는 사용 불가' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'success'
    const to = searchParams.get('to')

    if (!to) {
        return NextResponse.json({
            error: 'to 파라미터가 필요합니다',
            usage: '/api/test/send-email?to=이메일&type=success|failed|reminder',
        }, { status: 400 })
    }

    let result

    if (type === 'success') {
        result = await sendEmail({
            to,
            subject: '[맵타민 테스트] 결제 완료',
            react: PaymentSuccessEmail({
                planName: '프로',
                amount: 26600,
                paidAt: '2026년 2월 26일',
                nextBillingDate: '2026년 3월 26일',
                managementUrl: 'https://maptamin.com/dashboard/subscription',
            }),
        })
    } else if (type === 'failed') {
        result = await sendEmail({
            to,
            subject: '[맵타민 테스트] 결제 실패',
            react: PaymentFailedEmail({
                planName: '프로',
                amount: 26600,
                failedAt: '2026년 2월 26일',
                retryCount: 1,
                maxRetries: 3,
                isExpired: false,
                managementUrl: 'https://maptamin.com/dashboard/subscription',
            }),
        })
    } else if (type === 'reminder') {
        result = await sendEmail({
            to,
            subject: '[맵타민 테스트] 결제 예정 안내',
            react: PaymentReminderEmail({
                planName: '프로',
                amount: 26600,
                billingDate: '2026년 3월 5일',
                managementUrl: 'https://maptamin.com/dashboard/subscription',
            }),
        })
    } else {
        return NextResponse.json({ error: 'type은 success, failed, reminder 중 하나' }, { status: 400 })
    }

    return NextResponse.json({ type, to, ...result })
}
