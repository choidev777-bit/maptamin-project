import { Resend } from 'resend'

/**
 * Resend 이메일 클라이언트
 *
 * 환경변수:
 *   RESEND_API_KEY — Resend API 키
 *   EMAIL_FROM — 발신자 (예: "맵타민 <noreply@send.maptamin.com>")
 */
const resend = new Resend(process.env.RESEND_API_KEY)

const DEFAULT_FROM = process.env.EMAIL_FROM || '맵타민 <noreply@send.maptamin.com>'

interface SendEmailOptions {
    to: string | string[]
    subject: string
    react: React.ReactElement
}

/**
 * 이메일 발송 유틸
 *
 * @returns { success, data?, error? }
 */
export async function sendEmail({ to, subject, react }: SendEmailOptions) {
    try {
        const { data, error } = await resend.emails.send({
            from: DEFAULT_FROM,
            to: Array.isArray(to) ? to : [to],
            subject,
            react,
        })

        if (error) {
            console.error('[Email] 발송 실패:', error)
            return { success: false, error: error.message }
        }

        console.log('[Email] 발송 성공:', { to, subject, id: data?.id })
        return { success: true, data }
    } catch (err) {
        console.error('[Email] 발송 중 오류:', err)
        return {
            success: false,
            error: err instanceof Error ? err.message : '이메일 발송 실패',
        }
    }
}

export { resend }
