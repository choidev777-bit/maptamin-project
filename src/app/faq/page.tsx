import type { Metadata } from 'next'
import Navigation from '@/components/landing/Navigation'
import FAQSection from '@/components/landing/FAQSection'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
    title: '자주 묻는 질문 (FAQ) - 맵타민',
    description:
        '맵타민에 대해 궁금한 점을 확인하세요. 서비스 소개, 요금 안내, 무료 체험, 기존 도구와의 차이점 등 자주 묻는 질문에 대한 답변을 모았습니다.',
    alternates: {
        canonical: 'https://www.maptamin.com/faq',
    },
}

const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: '맵타민이 뭔가요?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: '맵타민은 소상공인·자영업자를 위한 \'플레이스 순위 지도 서비스\'입니다. 매장 상권 전체에 수십 개의 좌표를 설정하여 분석하고, 각 좌표에서 고객이 실제로 검색했을 때 내 매장이 몇 위에 노출되는지를 초록/노랑/빨강 색상으로 시각화합니다.',
            },
        },
        {
            '@type': 'Question',
            name: '기존의 플레이스 순위 분석 도구들과 뭐가 다른가요?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: '기존 도구들은 하나의 순위만 보여주지만, 맵타민은 상권 내 수십 개 좌표에서 각각 순위를 측정하여 지도 위에 시각화합니다. 어느 좌표에서 몇 위인지를 한눈에 볼 수 있습니다.',
            },
        },
        {
            '@type': 'Question',
            name: '어떤 업종에 적합한가요?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: '네이버 플레이스에 등록된 모든 업종에서 사용할 수 있습니다. 음식점, 카페, 미용실, 네일샵, 헬스장, 병원, 학원 등 네이버 지도에서 검색되는 매장이라면 업종에 관계없이 순위 지도를 확인할 수 있습니다.',
            },
        },
        {
            '@type': 'Question',
            name: '요금은 얼마인가요?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: '맵타민은 월 구독 방식이며 세 가지 플랜이 있습니다. 스타터: 월 9,900원 (키워드 2개, 3×3 그리드), 프로: 월 29,000원 (키워드 5개, 5×5 그리드, 경쟁사 비교), 프리미엄: 월 79,000원 (키워드 5개, 7×7 그리드, 구글 지도 분석, 경쟁사 비교).',
            },
        },
        {
            '@type': 'Question',
            name: '무료 체험이 있나요?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: '네, 회원가입 후 1회 무료 분석을 제공합니다. 결제 없이 매장의 순위 지도를 직접 확인해보실 수 있습니다.',
            },
        },
    ],
}

export default function FAQPage() {
    return (
        <div className="scroll-smooth">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <Navigation />
            <FAQSection />
            <Footer />
        </div>
    )
}

