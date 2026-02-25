import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
    Row,
    Column,
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
            <Preview>결제 예정 안내 — {billingDate}에 {planName} 플랜 {amount.toLocaleString()}원 결제 예정</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={header}>
                        <table cellPadding="0" cellSpacing="0" style={{ margin: '0' }}>
                            <tr>
                                <td style={{ paddingRight: '12px', verticalAlign: 'middle' }}>
                                    <table cellPadding="0" cellSpacing="2" style={{ borderCollapse: 'separate' }}>
                                        {[0, 1, 2].map(row => (
                                            <tr key={row}>
                                                {[0, 1, 2].map(col => (
                                                    <td key={col} style={{
                                                        width: '14px', height: '14px',
                                                        backgroundColor: row === 1 && col === 1 ? '#00C896' : '#002959',
                                                        borderRadius: '2px',
                                                    }} />
                                                ))}
                                            </tr>
                                        ))}
                                    </table>
                                </td>
                                <td style={{ verticalAlign: 'middle' }}>
                                    <Text style={logoText}>Maptamin</Text>
                                </td>
                            </tr>
                        </table>
                    </Section>

                    {/* Title */}
                    <Section style={titleSection}>
                        <Text style={titleText}>결제 예정 안내</Text>
                        <Text style={subtitleText}>
                            아래 결제가 {billingDate}에 자동으로 처리됩니다.
                        </Text>
                    </Section>

                    <Hr style={divider} />

                    {/* Amount Highlight */}
                    <Section style={amountSection}>
                        <Text style={amountLabel}>결제 예정 금액</Text>
                        <Text style={amountValue}>{amount.toLocaleString()}원</Text>
                    </Section>

                    <Hr style={divider} />

                    {/* Details Table */}
                    <Section style={detailsSection}>
                        <Row style={detailRow}>
                            <Column style={detailLabelCol}>플랜</Column>
                            <Column style={detailValueCol}>{planName}</Column>
                        </Row>
                        <Row style={detailRow}>
                            <Column style={detailLabelCol}>결제 예정일</Column>
                            <Column style={detailValueCol}>{billingDate}</Column>
                        </Row>
                        <Row style={detailRow}>
                            <Column style={detailLabelCol}>결제 수단</Column>
                            <Column style={detailValueCol}>등록된 카드</Column>
                        </Row>
                    </Section>

                    <Hr style={divider} />

                    {/* Message */}
                    <Section style={messageSection}>
                        <Text style={messageText}>
                            결제 수단을 변경하시거나 구독을 관리하려면 아래 버튼을 눌러주세요.
                        </Text>
                    </Section>

                    {/* CTA */}
                    <Section style={ctaSection}>
                        <Link style={primaryButton} href={managementUrl}>
                            구독 관리
                        </Link>
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            본 이메일은 맵타민 결제 알림 용도로 발송되었습니다.
                        </Text>
                        <Text style={footerLinkRow}>
                            <Link href={managementUrl} style={footerAnchor}>구독 관리</Link>
                            {' · '}
                            <Link href="https://maptamin.com" style={footerAnchor}>맵타민 홈</Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

export default PaymentReminderEmail

const main: React.CSSProperties = {
    backgroundColor: '#f4f4f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '40px 0',
}

const container: React.CSSProperties = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    maxWidth: '520px',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #e4e4e7',
}

const header: React.CSSProperties = {
    backgroundColor: '#ffffff',
    padding: '28px 40px',
    borderBottom: '3px solid #00C896',
}

const logoText: React.CSSProperties = {
    color: '#002959',
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    margin: '0',
}

const titleSection: React.CSSProperties = {
    padding: '32px 40px 8px',
    textAlign: 'center' as const,
}

const titleText: React.CSSProperties = {
    color: '#18181b',
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 8px',
    letterSpacing: '-0.3px',
}

const subtitleText: React.CSSProperties = {
    color: '#71717a',
    fontSize: '14px',
    margin: '0',
    lineHeight: '22px',
}

const amountSection: React.CSSProperties = {
    padding: '24px 40px',
    textAlign: 'center' as const,
}

const amountLabel: React.CSSProperties = {
    color: '#71717a',
    fontSize: '13px',
    fontWeight: '500',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
}

const amountValue: React.CSSProperties = {
    color: '#001011',
    fontSize: '36px',
    fontWeight: '700',
    margin: '0',
    letterSpacing: '-1px',
}

const divider: React.CSSProperties = {
    borderColor: '#f4f4f5',
    borderWidth: '1px',
    margin: '0 40px',
}

const detailsSection: React.CSSProperties = {
    padding: '24px 40px',
}

const detailRow: React.CSSProperties = {
    marginBottom: '16px',
}

const detailLabelCol: React.CSSProperties = {
    color: '#71717a',
    fontSize: '13px',
    fontWeight: '500',
    width: '140px',
    verticalAlign: 'top' as const,
    paddingBottom: '16px',
}

const detailValueCol: React.CSSProperties = {
    color: '#18181b',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'right' as const,
    paddingBottom: '16px',
}

const messageSection: React.CSSProperties = {
    padding: '0 40px 8px',
}

const messageText: React.CSSProperties = {
    color: '#52525b',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0',
    textAlign: 'center' as const,
}

const ctaSection: React.CSSProperties = {
    padding: '24px 40px 32px',
    textAlign: 'center' as const,
}

const primaryButton: React.CSSProperties = {
    backgroundColor: '#001011',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    borderRadius: '10px',
    padding: '12px 32px',
    display: 'inline-block',
}

const footer: React.CSSProperties = {
    backgroundColor: '#fafafa',
    borderTop: '1px solid #f4f4f5',
    padding: '24px 40px',
    textAlign: 'center' as const,
}

const footerText: React.CSSProperties = {
    color: '#a1a1aa',
    fontSize: '12px',
    margin: '0 0 8px',
    lineHeight: '18px',
}

const footerLinkRow: React.CSSProperties = {
    color: '#a1a1aa',
    fontSize: '12px',
    margin: '0',
}

const footerAnchor: React.CSSProperties = {
    color: '#71717a',
    textDecoration: 'underline',
}
