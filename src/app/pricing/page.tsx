import type { Metadata } from 'next'
import Navigation from '@/components/landing/Navigation'
import PricingDetailSection from '@/components/landing/PricingDetailSection'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
    title: '가격 안내 - 맵타민',
    description:
        '맵타민 요금제를 확인하세요. 스타터 월 9,900원 | 프로 월 29,000원 | 프리미엄 월 79,000원. 네이버 플레이스 순위 지도 서비스, 지금 바로 시작하세요.',
    alternates: {
        canonical: 'https://www.maptamin.com/pricing',
    },
}

export default function PricingPage() {
    return (
        <div className="scroll-smooth">
            <Navigation />
            <PricingDetailSection />
            <Footer />
        </div>
    )
}
