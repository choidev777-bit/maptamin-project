import type { Metadata } from 'next'
import Navigation from '@/components/landing/Navigation'
import HeroSection from '@/components/landing/HeroSection'
import ProblemSection from '@/components/landing/ProblemSection'
import FeatureSection from '@/components/landing/FeatureSection'
import SocialProofSection from '@/components/landing/SocialProofSection'
import PricingSection from '@/components/landing/PricingSection'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
    title: '맵타민 - 우리 가게 지도 순위 추적 서비스',
    description:
        '플레이스 순위 지도로 내 가게의 진짜 순위를 확인하세요. 네이버 지도 상위 노출을 위한 데이터 기반 로컬 SEO 분석 도구.',
}

export default function HomePage() {
    return (
        <div className="scroll-smooth">
            <Navigation />
            <HeroSection />
            <ProblemSection />
            <FeatureSection />
            <SocialProofSection />
            <PricingSection />
            <Footer />
        </div>
    )
}
