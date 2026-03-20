import { Search, Trophy, ArrowRight } from 'lucide-react'
import { PiArrowsOutBold } from 'react-icons/pi'
import Link from 'next/link'

const STEPS = [
    {
        step: '1',
        label: '진단',
        icon: Search,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-100',
        description:
            '맵타민 지도로 우리 매장의 약점인 빨간불을 찾습니다.',
    },
    {
        step: '2',
        label: '확장',
        icon: PiArrowsOutBold,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-100',
        description:
            '빨간불을 집중 공략하여 초록불로 바꿉니다.',
    },
    {
        step: '3',
        label: '달성',
        icon: Trophy,
        color: 'text-[#00C896]',
        bgColor: 'bg-[#00C896]/5',
        borderColor: 'border-[#00C896]/20',
        description:
            "초록불이 많아지면 네이버가 '지역 대표 매장'으로 인식하여, 지역명 키워드까지 상위노출 됩니다.",
    },
]

export default function SolutionSection() {
    return (
        <section className="border-t border-gray-100 bg-slate-50 py-10 lg:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
                    {/* 왼쪽: 3단계 프로세스 카드 */}
                    <div className="order-2 space-y-4 lg:order-1">
                        {STEPS.map((item, index) => {
                            const Icon = item.icon
                            return (
                                <div
                                    key={index}
                                    className={`rounded-2xl border ${item.borderColor} ${item.bgColor} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* 아이콘 */}
                                        <div
                                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${index === 0
                                                ? 'bg-red-100'
                                                : index === 1
                                                    ? 'bg-yellow-100'
                                                    : 'bg-[#00C896]/15'
                                                }`}
                                        >
                                            <Icon
                                                className={`h-6 w-6 ${item.color}`}
                                            />
                                        </div>

                                        {/* 텍스트 */}
                                        <div>
                                            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-400">
                                                Step {item.step}
                                            </div>
                                            <h3 className="mb-1 text-lg font-extrabold text-gray-900">
                                                {item.label}
                                            </h3>
                                            <p className="break-keep text-sm leading-relaxed text-gray-600 sm:text-base">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* 오른쪽: 타이틀 + 서브 카피 */}
                    <div className="order-1 lg:order-2">
                        <h2 className="break-keep text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
                            지역명 키워드 상위노출은 결과일 뿐,
                            <br />
                            시작은{' '}
                            <span className="text-[#00C896]">
                                &lsquo;내 매장 근처&rsquo;
                            </span>
                            부터입니다.
                        </h2>
                        <p className="mt-6 break-keep text-base text-gray-600 sm:text-lg">
                            매장 앞{' '}
                            <strong className="text-gray-800">
                                100m, 300m
                            </strong>
                            부터 초록불로 만드세요.
                        </p>
                        <Link
                            href="/login?redirectTo=/free-trial"
                            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#00C896] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#00C896]/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-xl sm:text-base"
                        >
                            무료로 내 매장 진단 시작하기
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
