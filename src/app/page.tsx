import type { Metadata } from 'next'
import Navigation from '@/components/landing/Navigation'
import HeroSection from '@/components/landing/HeroSection'
import LogoStripSection from '@/components/landing/LogoStripSection'
import ProblemSection from '@/components/landing/ProblemSection'
import BridgeSection1 from '@/components/landing/BridgeSection1'
import BridgeSection2 from '@/components/landing/BridgeSection2'
import SolutionSection from '@/components/landing/SolutionSection'
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
            {/* 1. 히어로 */}
            <HeroSection />
            {/* 1.5 띠 */}
            <LogoStripSection />
            {/* 2. 문제 */}
            <ProblemSection />
            {/* 2.5 브릿지 1 */}
            <BridgeSection1 />
            {/* 3. 브릿지 2 */}
            <BridgeSection2 />
            {/* 4. 솔루션 */}
            <SolutionSection />
            {/* 5. 기능 */}
            <FeatureSection />
            {/* 6. 소셜 프루프 */}
            <SocialProofSection />
            {/* 7. 가격 */}
            <PricingSection />
            <Footer />
        </div>
    )
}
