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

interface PaymentReminderEmailProps {
    planName: string
    amount: number
    billingDate: string
    managementUrl: string
}

export function PaymentReminderEmail({
    planName = '프로',
    amount = 29000,
    billingDate = '2026년 3월 15일',
    managementUrl = 'https://maptamin.com/dashboard/subscription',
}: PaymentReminderEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>결제 예정 안내 — {billingDate}에 {planName} 플랜 결제가 예정되어 있습니다</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={logo}>맵타민</Heading>
                    <Hr style={hr} />

                    <Heading style={heading}>결제 예정 안내</Heading>

                    <Section style={card}>
                        <Text style={cardTitle}>📅 결제 예정일</Text>
                        <Text style={cardValue}>{billingDate}</Text>
                    </Section>

                    <Section style={card}>
                        <Text style={cardTitle}>📋 플랜</Text>
                        <Text style={cardValue}>{planName}</Text>
                    </Section>

                    <Section style={card}>
                        <Text style={cardTitle}>💰 결제 금액</Text>
                        <Text style={cardValue}>{amount.toLocaleString()}원</Text>
                    </Section>

                    <Text style={paragraph}>
                        등록된 카드로 자동 결제됩니다. 결제 수단을 변경하시려면 아래 버튼을 눌러주세요.
                    </Text>

                    <Section style={btnContainer}>
                        <Link style={button} href={managementUrl}>
                            구독 관리 페이지
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

export default PaymentReminderEmail

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

const heading: React.CSSProperties = {
    color: '#333',
    fontSize: '20px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    margin: '20px 0',
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

const hr: React.CSSProperties = {
    borderColor: '#e6ebf1',
    margin: '20px 0',
}

const footer: React.CSSProperties = {
    color: '#8898aa',
    fontSize: '12px',
    textAlign: 'center' as const,
}
