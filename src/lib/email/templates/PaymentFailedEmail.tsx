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
    Row,
    Column,
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
    amount = 26600,
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
                    ? `구독 만료 — ${planName} 플랜`
                    : `결제 실패 — ${planName} 플랜 (재시도 ${retryCount}/${maxRetries})`}
            </Preview>
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
                        <div style={isExpired ? expiredBadge : warningBadge}>
                            <Text style={isExpired ? expiredBadgeText : warningBadgeText}>
                                {isExpired ? '⛔ 구독 만료' : '⚠ 결제 실패'}
                            </Text>
                        </div>
                    </Section>

                    {/* Amount Highlight */}
                    <Section style={amountSection}>
                        <Text style={amountLabel}>미결제 금액</Text>
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
                            <Column style={detailLabelCol}>실패 일시</Column>
                            <Column style={detailValueCol}>{failedAt}</Column>
                        </Row>
                        {!isExpired && (
                            <Row style={detailRow}>
                                <Column style={detailLabelCol}>재시도</Column>
                                <Column style={detailValueCol}>
                                    {retryCount} / {maxRetries}회
                                </Column>
                            </Row>
                        )}
                    </Section>

                    <Hr style={divider} />

                    {/* Message */}
                    <Section style={messageSection}>
                        {isExpired ? (
                            <Text style={messageText}>
                                결제 재시도({maxRetries}회)가 모두 실패하여 구독이 만료되었습니다.
                                서비스를 계속 이용하시려면 다시 구독해주세요.
                            </Text>
                        ) : (
                            <>
                                {/* Retry Progress */}
                                <div style={progressContainer}>
                                    {Array.from({ length: maxRetries }).map((_, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                ...progressDot,
                                                backgroundColor: i < retryCount ? '#ef4444' : '#e4e4e7',
                                            }}
                                        />
                                    ))}
                                </div>
                                <Text style={messageText}>
                                    등록된 카드로 결제에 실패했습니다.
                                    카드 잔액 또는 유효기간을 확인해주세요.
                                    {maxRetries - retryCount}회 더 실패하면 구독이 만료됩니다.
                                </Text>
                            </>
                        )}
                    </Section>

                    {/* CTA */}
                    <Section style={ctaSection}>
                        <Link style={isExpired ? expiredButton : dangerButton} href={managementUrl}>
                            {isExpired ? '다시 구독하기' : '카드 정보 확인'}
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

export default PaymentFailedEmail

// ── Linear-inspired Styles ──

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

const warningBadge: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: '100px',
    padding: '8px 20px',
}

const warningBadgeText: React.CSSProperties = {
    color: '#c2410c',
    fontSize: '14px',
    fontWeight: '600',
    margin: '0',
}

const expiredBadge: React.CSSProperties = {
    display: 'inline-block',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '100px',
    padding: '8px 20px',
}

const expiredBadgeText: React.CSSProperties = {
    color: '#dc2626',
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

const progressContainer: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '16px',
}

const progressDot: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
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

const dangerButton: React.CSSProperties = {
    backgroundColor: '#001011',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    borderRadius: '10px',
    padding: '12px 32px',
    display: 'inline-block',
}

const expiredButton: React.CSSProperties = {
    backgroundColor: '#00C896',
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
