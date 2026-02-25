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
    amount = 26600,
    paidAt = '2026년 3월 15일',
    nextBillingDate = '2026년 4월 15일',
    receiptUrl,
    managementUrl = 'https://maptamin.com/dashboard/subscription',
}: PaymentSuccessEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>결제 완료 — {planName} 플랜 {amount.toLocaleString()}원</Preview>
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

                    {/* Status Badge */}
                    <Section style={statusSection}>
                        <div style={statusBadge}>
                            <Text style={statusBadgeText}>✓ 결제 완료</Text>
                        </div>
                    </Section>

                    {/* Amount Highlight */}
                    <Section style={amountSection}>
                        <Text style={amountLabel}>결제 금액</Text>
                        <Text style={amountValue}>{amount.toLocaleString()}원</Text>
                    </Section>

                    <Hr style={divider} />

                    {/* Details Table */}
                    <Section style={detailsSection}>
                        <Row style={detailRow}>
                            <Column style={detailLabel}>플랜</Column>
                            <Column style={detailValue}>{planName}</Column>
                        </Row>
                        <Row style={detailRow}>
                            <Column style={detailLabel}>결제일</Column>
                            <Column style={detailValue}>{paidAt}</Column>
                        </Row>
                        <Row style={detailRow}>
                            <Column style={detailLabel}>다음 결제 예정일</Column>
                            <Column style={detailValue}>{nextBillingDate}</Column>
                        </Row>
                    </Section>

                    <Hr style={divider} />

                    {/* CTA */}
                    <Section style={ctaSection}>
                        <Link style={primaryButton} href={managementUrl}>
                            구독 관리
                        </Link>
                        {receiptUrl && (
                            <Link style={secondaryButton} href={receiptUrl}>
                                영수증 보기
                            </Link>
                        )}
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            본 이메일은 맵타민 결제 알림 용도로 발송되었습니다.
                        </Text>
                        <Text style={footerLink}>
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

export default PaymentSuccessEmail

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

const statusSection: React.CSSProperties = {
    padding: '32px 40px 0',
    textAlign: 'center' as const,
}

const statusBadge: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '100px',
    padding: '8px 20px',
}

const statusBadgeText: React.CSSProperties = {
    color: '#059669',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0',
}

const amountSection: React.CSSProperties = {
    padding: '24px 40px 28px',
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

const detailLabel: React.CSSProperties = {
    color: '#71717a',
    fontSize: '13px',
    fontWeight: '500',
    width: '140px',
    verticalAlign: 'top' as const,
    paddingBottom: '16px',
}

const detailValue: React.CSSProperties = {
    color: '#18181b',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'right' as const,
    paddingBottom: '16px',
}

const ctaSection: React.CSSProperties = {
    padding: '8px 40px 32px',
    textAlign: 'center' as const,
}

const primaryButton: React.CSSProperties = {
    backgroundColor: '#00C896',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    borderRadius: '10px',
    padding: '12px 32px',
    display: 'inline-block',
}

const secondaryButton: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: '#71717a',
    fontSize: '13px',
    fontWeight: '500',
    textDecoration: 'underline',
    padding: '12px 16px',
    display: 'inline-block',
    marginLeft: '8px',
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

const footerLink: React.CSSProperties = {
    color: '#a1a1aa',
    fontSize: '12px',
    margin: '0',
}

const footerAnchor: React.CSSProperties = {
    color: '#71717a',
    textDecoration: 'underline',
}
