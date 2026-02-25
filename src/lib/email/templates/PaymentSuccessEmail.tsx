import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components'
import * as React from 'react'

interface PaymentSuccessEmailProps {
    planName: string
    amount: number
    paidAt: string
    nextBillingDate: string
    receiptUrl?: string
    managementUrl: string
}

export function PaymentSuccessEmail({
    planName = '프로',
    amount = 29000,
    paidAt = '2026년 3월 15일',
    nextBillingDate = '2026년 4월 15일',
    receiptUrl,
    managementUrl = 'https://maptamin.com/dashboard/subscription',
}: PaymentSuccessEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>결제 완료 — {planName} 플랜 {amount.toLocaleString()}원 결제가 완료되었습니다</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={logo}>맵타민</Heading>
                    <Hr style={hr} />

                    <Section style={successBadge}>
                        <Text style={successIcon}>✅</Text>
                        <Text style={successText}>결제가 완료되었습니다</Text>
                    </Section>

                    <Section style={card}>
                        <Text style={cardTitle}>📋 플랜</Text>
                        <Text style={cardValue}>{planName}</Text>
                    </Section>

                    <Section style={card}>
                        <Text style={cardTitle}>💰 결제 금액</Text>
                        <Text style={cardValue}>{amount.toLocaleString()}원</Text>
                    </Section>

                    <Section style={card}>
                        <Text style={cardTitle}>📅 결제일</Text>
                        <Text style={cardValue}>{paidAt}</Text>
                    </Section>

                    <Section style={card}>
                        <Text style={cardTitle}>📅 다음 결제 예정일</Text>
                        <Text style={cardValue}>{nextBillingDate}</Text>
                    </Section>

                    <Section style={btnContainer}>
                        <Link style={button} href={managementUrl}>
                            구독 관리
                        </Link>
                        {receiptUrl && (
                            <>
                                {'  '}
                                <Link style={buttonOutline} href={receiptUrl}>
                                    영수증 보기
                                </Link>
                            </>
                        )}
                    </Section>

                    <Hr style={hr} />
                    <Text style={footer}>
                        본 이메일은 맵타민 서비스의 결제 알림 용도로 발송되었습니다.
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

export default PaymentSuccessEmail

// ── Styles ──

const main: React.CSSProperties = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
}

const container: React.CSSProperties = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px 30px',
    borderRadius: '12px',
    maxWidth: '480px',
}

const logo: React.CSSProperties = {
    color: '#00C896',
    fontSize: '24px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '0 0 20px',
}

const successBadge: React.CSSProperties = {
    textAlign: 'center' as const,
    margin: '20px 0',
}

const successIcon: React.CSSProperties = {
    fontSize: '40px',
    margin: '0',
}

const successText: React.CSSProperties = {
    color: '#00C896',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '8px 0 0',
}

const card: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
}

const cardTitle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '13px',
    margin: '0 0 4px',
}

const cardValue: React.CSSProperties = {
    color: '#111827',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0',
}

const btnContainer: React.CSSProperties = {
    textAlign: 'center' as const,
    margin: '24px 0',
}

const button: React.CSSProperties = {
    backgroundColor: '#00C896',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
}

const buttonOutline: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '10px 24px',
    marginLeft: '8px',
}

const hr: React.CSSProperties = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
}

const footer: React.CSSProperties = {
    color: '#8898aa',
    fontSize: '12px',
    textAlign: 'center' as const,
}
