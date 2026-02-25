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

interface PaymentFailedEmailProps {
    planName: string
    amount: number
    failedAt: string
    retryCount: number
    maxRetries: number
    isExpired: boolean
    managementUrl: string
}

export function PaymentFailedEmail({
    planName = '프로',
    amount = 29000,
    failedAt = '2026년 3월 15일',
    retryCount = 1,
    maxRetries = 3,
    isExpired = false,
    managementUrl = 'https://maptamin.com/dashboard/subscription',
}: PaymentFailedEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>
                {isExpired
                    ? `구독이 만료되었습니다 — ${planName} 플랜`
                    : `결제 실패 안내 — ${planName} 플랜 결제에 실패했습니다`}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={logo}>맵타민</Heading>
                    <Hr style={hr} />

                    <Section style={warningBadge}>
                        <Text style={warningIcon}>{isExpired ? '⛔' : '⚠️'}</Text>
                        <Text style={warningText}>
                            {isExpired ? '구독이 만료되었습니다' : '결제에 실패했습니다'}
                        </Text>
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
                        <Text style={cardTitle}>📅 실패 일시</Text>
                        <Text style={cardValue}>{failedAt}</Text>
                    </Section>

                    {isExpired ? (
                        <Text style={paragraph}>
                            결제 재시도({maxRetries}회)가 모두 실패하여 구독이 만료되었습니다.
                            서비스를 계속 이용하시려면 다시 구독해주세요.
                        </Text>
                    ) : (
                        <>
                            <Section style={retryBadge}>
                                <Text style={retryText}>
                                    재시도 {retryCount}/{maxRetries}회
                                </Text>
                            </Section>
                            <Text style={paragraph}>
                                등록된 카드로 결제에 실패했습니다.
                                카드 잔액 또는 유효기간을 확인해주세요.
                                자동으로 재시도되며, {maxRetries}회 실패 시 구독이 만료됩니다.
                            </Text>
                        </>
                    )}

                    <Section style={btnContainer}>
                        <Link style={button} href={managementUrl}>
                            {isExpired ? '다시 구독하기' : '카드 정보 확인'}
                        </Link>
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

export default PaymentFailedEmail

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

const warningBadge: React.CSSProperties = {
    textAlign: 'center' as const,
    margin: '20px 0',
}

const warningIcon: React.CSSProperties = {
    fontSize: '40px',
    margin: '0',
}

const warningText: React.CSSProperties = {
    color: '#dc2626',
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

const retryBadge: React.CSSProperties = {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center' as const,
    margin: '16px 0',
}

const retryText: React.CSSProperties = {
    color: '#92400e',
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '0',
}

const paragraph: React.CSSProperties = {
    color: '#555',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '20px 0',
}

const btnContainer: React.CSSProperties = {
    textAlign: 'center' as const,
    margin: '24px 0',
}

const button: React.CSSProperties = {
    backgroundColor: '#dc2626',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
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
