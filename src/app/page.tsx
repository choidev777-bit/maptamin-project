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
        '네이버 플레이스 상위노출의 시작, 우리 매장 지도 건강검진 맵타민! 키워드별 네이버 스마트플레이스와 구글 지도 순위를 가장 쉽고 빠르게 진단하세요.',
    alternates: {
        canonical: 'https://www.maptamin.com',
    },
    robots: {
        index: true,
        follow: true,
        noimageindex: true,
        'max-image-preview': 'none' as const,
    },
}

const softwareAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: '맵타민 (Maptamin)',
    description:
        '네이버 플레이스·구글 지도 순위를 상권 지도 위에 시각화하는 로컬 SEO 분석 SaaS. 키워드별 히트맵으로 매장의 실제 노출 현황을 한눈에 확인하세요.',
    url: 'https://www.maptamin.com',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: [
        {
            '@type': 'Offer',
            name: '스타터',
            price: '9900',
            priceCurrency: 'KRW',
            description: '키워드 2개, 3×3 그리드, 네이버 전용',
        },
        {
            '@type': 'Offer',
            name: '프로',
            price: '29000',
            priceCurrency: 'KRW',
            description: '키워드 5개, 5×5 그리드, 경쟁사 비교',
        },
        {
            '@type': 'Offer',
            name: '프리미엄',
            price: '79000',
            priceCurrency: 'KRW',
            description: '키워드 5개, 7×7 그리드, 네이버+구글, 경쟁사 비교',
        },
    ],
}

const webSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '맵타민',
    url: 'https://www.maptamin.com',
    description:
        '소상공인을 위한 네이버 플레이스·구글 지도 순위 추적 및 분석 서비스',
}

export default function HomePage() {
    return (
        <div className="scroll-smooth">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
            />
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
