'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

/* ──────────────────────────────────────────────
 *  FAQ 데이터
 * ────────────────────────────────────────────── */

interface FAQItem {
    question: string
    answer: string | React.ReactNode
}

interface FAQCategory {
    title: string
    icon: string
    items: FAQItem[]
}

const FAQ_DATA: FAQCategory[] = [
    {
        title: '서비스 소개',
        icon: '📍',
        items: [
            {
                question: '맵타민이 뭔가요?',
                answer:
                    '맵타민은 소상공인·자영업자를 위한 \'플레이스 순위 지도 서비스\'입니다. 단순히 키워드 검색량이나 리뷰 수 변화만 보여주는 기존 도구들과 달리, 맵타민은 매장 상권 전체에 수십 개의 좌표를 설정하여 분석합니다. 각 좌표(위치)에서 고객이 실제로 검색했을 때 내 매장이 몇 위에 노출되는지를 초록/노랑/빨강 색상으로 시각화하여, 우리 매장의 실제 노출 현황을 한눈에 파악하게 해줍니다.',
            },
            {
                question: '기존의 플레이스 순위 분석 도구들과 뭐가 다른가요?',
                answer:
                    '기존 도구들은 "건대역 카페" 같은 지역명 키워드의 순위를 하나의 숫자로 보여줍니다. 이 기능은 유용하지만, 상권 내에서 위치마다 내 매장의 순위가 어떤지 보여주지 않습니다.\n\n맵타민은 상권 내 수십 개 좌표에서 각각 순위를 측정하여 지도 위에 시각화합니다. 어느 좌표에서 몇 위인지를 한눈에 볼 수 있다는 점이 근본적인 차이입니다.',
            },
            {
                question: '어떤 업종에 적합한가요?',
                answer:
                    '네이버 플레이스에 등록된 모든 업종에서 사용할 수 있습니다. 음식점, 카페, 미용실, 네일샵, 헬스장, 병원, 학원 등 네이버 지도에서 검색되는 매장이라면 업종에 관계없이 순위 지도를 확인할 수 있습니다.',
            },
            {
                question: '사용법이 어렵지 않나요?',
                answer:
                    '어렵지 않습니다. 매장을 등록하고 분석할 키워드를 입력하면 자동으로 순위 지도가 생성됩니다. 별도의 교육 없이 바로 사용할 수 있으며, 카카오 알림톡으로 매일 리포트를 자동 수신하면 사이트에 직접 접속할 필요도 없습니다.',
            },
        ],
    },
    {
        title: '왜 맵타민이 필요한가요?',
        icon: '🎯',
        items: [
            {
                question: '상권 내 잠재 고객이 보는 진짜 순위를 보여줍니다',
                answer:
                    '상권 안에 이미 들어와 있는 잠재 고객 중 상당수는 "건대역 카페"가 아닌 "근처 카페"처럼 지역명 없이 검색합니다. 지금 바로 갈 곳을 찾는, 구매 의사가 있는 고객들입니다.\n\n이 키워드들은 검색자의 GPS 위치에 따라 순위가 달라집니다. 기존 도구는 단순히 하나의 순위만 보여주지만, 맵타민은 상권 내 각 좌표에서 실제로 몇 위에 노출되는지를 지도 위에 표시합니다.\n\n상권 어디에서 검색해도 내 매장이 상위에 노출된다면, 방문자수가 늘고 지역명 키워드 순위 상승으로도 이어질 수 있습니다.',
            },
            {
                question: '집중할 키워드와 내려놓을 키워드를 구분할 수 있습니다',
                answer:
                    '같은 매장이라도 키워드에 따라 순위 지도는 완전히 다릅니다. 어떤 키워드는 매장 근처에서 3위로 노출되고 있지만, 어떤 키워드는 바로 앞에서 검색해도 20위 밖입니다.\n\n맵타민의 순위 지도를 보면, 어떤 키워드에 마케팅을 집중하고 어떤 키워드를 내려놓을지 판단할 수 있습니다.',
            },
            {
                question: '노출이 약한 구역을 정확히 파악하고, 해당 지역에만 마케팅을 집중할 수 있습니다',
                answer:
                    '기존에는 내 매장이 어느 방향에서 잘 보이고 어디서 안 보이는지 알 길이 없었습니다. 그러다 보니 이미 충분히 잘 노출되는 구역에까지 불필요한 광고비를 쓰곤 했습니다.\n\n맵타민은 어느 구역이 이미 상위 노출 중이고, 어느 구역이 약한지를 지도 위에서 보여줍니다. 약한 구역에 마케팅을 집중한다면, 한정된 예산을 훨씬 효율적으로 사용할 수 있습니다.',
            },
            {
                question: '경쟁사를 키워드별로 좌표 단위로 비교할 수 있습니다',
                answer:
                    '같은 키워드에서 내 매장과 경쟁사 중 어디가 더 높은 순위에 있는지를, 좌표 하나하나 지도 위에서 비교할 수 있습니다. 어느 구역에서 어떤 경쟁사에게 밀리고 있는지를 정확히 파악할 수 있습니다.',
            },
            {
                question: '마케팅 효과와 대행사 성과를 독립적으로 검증할 수 있습니다',
                answer:
                    '체험단이나 리뷰 이벤트, 마케팅 대행사 등을 진행한 후, 실제로 순위가 변했는지 지도의 색상 변화로 직접 확인할 수 있습니다. 대행사가 "순위가 올랐다"고 보고할 때, 어느 구역에서 올랐는지 직접 확인할 수 있습니다.',
            },
            {
                question: '왜 꾸준히 사용해야 하나요? 한 번만 확인하면 되지 않나요?',
                answer:
                    '상권의 경쟁 상황과 네이버 플레이스 알고리즘은 계속 변합니다. 어제까지 1위였던 키워드가 알고리즘 변화로 갑자기 노출에서 사라질 수도 있습니다.\n\n맵타민을 정기적으로 사용하면, 마케팅 진행 전후로 빨간색(하위권)이었던 좌표가 초록색(상위권)으로 얼마나 바뀌었는지 직접 확인할 수 있습니다. 순위가 떨어지는 이상 징후도 빠르게 감지할 수 있습니다.',
            },
        ],
    },
    {
        title: '구독 및 요금',
        icon: '💳',
        items: [
            {
                question: '요금은 얼마인가요?',
                answer:
                    '맵타민은 월 구독 방식이며, 세 가지 플랜이 있습니다. (VAT 포함)\n\n• 스타터: 월 9,900원 — 키워드 2개, (3×3) 9개 좌표 순위 지도\n• 프로: 월 29,000원 — 키워드 5개, (5×5) 25개 좌표 순위 지도, 경쟁사 비교 포함\n• 프리미엄: 월 79,000원 — 키워드 5개, (7×7) 49개 좌표 순위 지도, 구글 지도 분석, 경쟁사 비교 포함\n\n자세한 플랜 비교는 가격 안내 페이지에서 확인하실 수 있습니다.',
            },
            {
                question: '무료 체험이 있나요?',
                answer:
                    '네, 회원가입 후 1회 무료 분석을 제공합니다. 결제 없이 매장의 순위 지도를 직접 확인해보실 수 있습니다.',
            },
        ],
    },
]

/* ──────────────────────────────────────────────
 *  아코디언 아이템
 * ────────────────────────────────────────────── */

function AccordionItem({ item }: { item: FAQItem }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div
            className={`rounded-2xl border bg-white transition-all duration-300 ${
                isOpen
                    ? 'border-[#00C896]/30 shadow-lg shadow-[#00C896]/5'
                    : 'border-gray-100 shadow-sm hover:border-[#00C896]/20 hover:shadow-md'
            }`}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left sm:px-8 sm:py-6"
            >
                <h3 className="text-base font-bold text-gray-900 sm:text-lg">{item.question}</h3>
                <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#00C896] transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="border-t border-gray-50 px-6 pb-6 pt-4 sm:px-8 sm:pb-8">
                    <div className="whitespace-pre-line text-[15px] leading-relaxed text-gray-600">
                        {item.answer}
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ──────────────────────────────────────────────
 *  카테고리 사이드바 버튼
 * ────────────────────────────────────────────── */

function CategoryButton({
    category,
    isActive,
    onClick,
}: {
    category: FAQCategory
    isActive: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`flex w-full items-center gap-3 rounded-xl px-5 py-4 text-left text-sm font-bold transition-all duration-200 ${
                isActive
                    ? 'bg-[#00C896] text-white shadow-lg shadow-[#00C896]/20'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
        >
            {category.title}
        </button>
    )
}

/* ──────────────────────────────────────────────
 *  메인 FAQ 섹션
 * ────────────────────────────────────────────── */

export default function FAQSection() {
    const [activeCategory, setActiveCategory] = useState(0)

    return (
        <main className="min-h-screen bg-gradient-to-b from-white via-gray-50/50 to-white">
            {/* Hero */}
            <section className="pb-12 pt-28 text-center sm:pb-16 sm:pt-32">
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                    <span className="mb-4 inline-block rounded-full bg-[#00C896]/10 px-4 py-1.5 text-xs font-bold tracking-wider text-[#00C896]">
                        FAQ
                    </span>
                    <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
                        자주 묻는 질문
                    </h1>
                    <p className="text-base text-gray-500 sm:text-lg">
                        맵타민에 대해 궁금한 점을 확인하세요
                    </p>
                </div>
            </section>

            {/* Content Grid */}
            <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
                    {/* 사이드바 (데스크탑) */}
                    <div className="lg:col-span-3">
                        <div className="flex gap-2 overflow-x-auto pb-4 lg:sticky lg:top-24 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
                            {FAQ_DATA.map((category, index) => (
                                <CategoryButton
                                    key={category.title}
                                    category={category}
                                    isActive={activeCategory === index}
                                    onClick={() => setActiveCategory(index)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 아코디언 콘텐츠 */}
                    <div className="lg:col-span-9">
                        {FAQ_DATA.map((category, catIndex) => (
                            <div
                                key={category.title}
                                className={catIndex === activeCategory ? 'block' : 'hidden'}
                            >
                                <div className="mb-8">
                                    <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                                        {category.title}
                                    </h2>
                                </div>
                                <div className="space-y-4">
                                    {category.items.map((item) => (
                                        <AccordionItem key={item.question} item={item} />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* 요금 안내 카드 — 구독 탭에만 노출 */}
                        {activeCategory === 2 && (
                            <div className="relative mt-10 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white sm:p-10">
                                <div className="relative z-10">
                                    <h3 className="mb-2 text-xl font-bold">
                                        플랜 상세 비교가 필요하신가요?
                                    </h3>
                                    <p className="mb-6 text-gray-300">
                                        각 플랜에 포함된 기능을 상세하게 비교해 보세요.
                                    </p>
                                    <Link
                                        href="/pricing"
                                        className="inline-flex items-center gap-2 font-bold text-[#00C896] transition-colors hover:text-[#3adfab]"
                                    >
                                        가격 안내 페이지 보기
                                        <span className="transition-transform group-hover:translate-x-1">
                                            →
                                        </span>
                                    </Link>
                                </div>
                                <div className="pointer-events-none absolute -bottom-6 -right-6 text-[120px] leading-none opacity-5">
                                    💳
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
                <div className="relative overflow-hidden rounded-3xl bg-gray-900 p-8 text-center text-white sm:p-12">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#006c4f] to-[#00C896] opacity-10" />
                    <div className="relative z-10">
                        <h2 className="mb-3 text-2xl font-extrabold sm:text-3xl">
                            더 궁금한 점이 있으신가요?
                        </h2>
                        <p className="mx-auto mb-8 max-w-lg text-gray-400">
                            카카오톡으로 문의하시면 빠르게 답변 드리겠습니다.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <a
                                href="https://pf.kakao.com/_exhYRX/chat"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-bold text-gray-900 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
                            >
                                💬 카카오톡 문의하기
                            </a>
                            <Link
                                href="/login?redirectTo=/free-trial"
                                className="inline-flex items-center gap-2 rounded-full border-2 border-white/20 px-8 py-3.5 font-bold text-white transition-all hover:bg-white/10 active:scale-95"
                            >
                                무료 체험 시작하기
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}
