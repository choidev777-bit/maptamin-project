import type { Metadata } from 'next'
import Navigation from '@/components/landing/Navigation'
import FAQSection from '@/components/landing/FAQSection'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
    title: '자주 묻는 질문 (FAQ) - 맵타민',
    description:
        '맵타민에 대해 궁금한 점을 확인하세요. 서비스 소개, 요금 안내, 무료 체험, 기존 도구와의 차이점 등 자주 묻는 질문에 대한 답변을 모았습니다.',
}

export default function FAQPage() {
    return (
        <div className="scroll-smooth">
            <Navigation />
            <FAQSection />
            <Footer />
        </div>
    )
}
