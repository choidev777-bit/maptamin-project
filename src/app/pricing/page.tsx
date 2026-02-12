import type { Metadata } from 'next'
import Navigation from '@/components/landing/Navigation'
import PricingDetailSection from '@/components/landing/PricingDetailSection'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
    title: '가격 안내 - 맵타민',
    description:
        '맵타민 가격 정책을 확인하세요. 마케팅 대행사 월 50만원, 분석앱 월 33만원. 맵타민은 하루 330원부터 시작합니다.',
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
