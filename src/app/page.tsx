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
    title: '맵타민 | 플레이스 상위노출의 시작',
    description:
        '플레이스 상위노출의 시작, 우리 매장 지도 건강검진 맵타민! 키워드별 네이버 스마트플레이스와 구글 지도순위를 가장 쉽고 빠르게 진단하세요.',
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
