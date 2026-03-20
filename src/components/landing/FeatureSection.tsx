import {
    CheckCircle2,
    AlertTriangle,
    BarChart3,
    Map,
    ClipboardCheck,
    MessageCircle,
    Zap,
    Flame,
    ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

/* 5×5 경쟁사 비교 그리드 데이터 (중앙은 '나') */
const COMPARISON_GRID = [
    ['win', 'win', 'lose', 'lose', 'lose'],
    ['win', 'win', 'win', 'lose', 'lose'],
    ['win', 'win', 'my', 'win', 'win'],
    ['lose', 'lose', 'win', 'win', 'win'],
    ['lose', 'lose', 'win', 'win', 'win'],
] as const

export default function FeatureSection() {
    return (
        <>
            <section className="mx-auto max-w-7xl px-6 py-10 lg:py-20">
                <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1fr_2fr]">
                    {/* 1. 텍스트 & 신호등 설명 */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <span className="inline-block rounded-full bg-[#00C896]/10 px-4 py-1.5 text-sm font-bold text-[#00C896]">
                                Smart Analysis
                            </span>
                            <h2 className="break-keep text-2xl font-black leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
                                맵타민이 진단하는<br />
                                우리 매장 건강 상태
                            </h2>
                        </div>
                        <div className="space-y-6">
                            <div className="group flex gap-4">
                                <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-[#00C896]/10 text-[#00C896] transition-all group-hover:scale-110">
                                    <CheckCircle2 className="h-6 w-6 font-bold" />
                                </div>
                                <div>
                                    <h3 className="flex items-center gap-2 text-lg font-bold">
                                        🟢 초록불 (안전){' '}
                                        <span className="text-sm font-normal text-slate-400">1~5위</span>
                                    </h3>
                                    <p className="break-keep text-sm leading-relaxed text-slate-500 sm:text-base">
                                        사장님이 완벽하게 장악한 &lsquo;내 구역&rsquo; 입니다.<br />
                                        매출이 발생하는 안전지대입니다.
                                    </p>
                                </div>
                            </div>
                            <div className="group flex gap-4">
                                <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-yellow-400/10 text-yellow-500 transition-all group-hover:scale-110">
                                    <AlertTriangle className="h-6 w-6 font-bold" />
                                </div>
                                <div>
                                    <h3 className="flex items-center gap-2 text-lg font-bold">
                                        🟡 노란불 (주의){' '}
                                        <span className="text-sm font-normal text-slate-400">6~10위</span>
                                    </h3>
                                    <p className="break-keep text-sm leading-relaxed text-slate-500 sm:text-base">
                                        마케팅을 집중하면 상위권 진입이 가능한 기회 구역입니다.
                                    </p>
                                </div>
                            </div>
                            <div className="group flex gap-4">
                                <div className="flex size-12 flex-none items-center justify-center rounded-2xl bg-red-500/10 text-red-500 transition-all group-hover:scale-110">
                                    <Flame className="h-6 w-6 font-bold" />
                                </div>
                                <div>
                                    <h3 className="flex items-center gap-2 text-lg font-bold">
                                        🔴 빨간불 (위험){' '}
                                        <span className="text-sm font-normal text-slate-400">10위 밖</span>
                                    </h3>
                                    <p className="break-keep text-sm leading-relaxed text-slate-500 sm:text-base">
                                        경쟁사에게 손님을 모두 뺏기고 있습니다.<br />
                                        지금 당장 조치가 필요한 경고 신호입니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. 히트맵 시각화 카드 */}
                    <div className="group relative">
                        <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-[#00C896]/10 to-transparent blur-xl opacity-30 transition-opacity group-hover:opacity-60" />
                        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-lg">
                            <Image
                                src="/images/feature-analysis-hq.png"
                                alt="맵타민 플레이스 순위 지도 분석 결과 화면"
                                width={2560}
                                height={1800}
                                className="h-auto w-full"
                                quality={100}
                                sizes="(max-width: 1024px) 100vw, 67vw"
                                priority
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* 경쟁사 비교 분석 섹션 (SocialProof에서 이동) */}
            <section id="competitor-analysis" className="bg-[#f8fafc] py-12 lg:py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid items-center gap-8 lg:gap-12 lg:grid-cols-[1fr_3fr]">
                        {/* 왼쪽: 텍스트 및 특징 설명 */}
                        <div>
                            <h2 className="mb-6 break-keep text-2xl font-bold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
                                똑똑한 사장님들은 &lsquo;<span className="text-[#00C896]">맵타민</span>&rsquo;으로<br />
                                한 주를 시작하고 있습니다.
                            </h2>
                            <ul className="space-y-4">
                                {[
                                    '상세 구역별 승/패 분석',
                                ].map((feature, idx) => (
                                    <li key={idx} className="flex items-center gap-3 text-slate-600">
                                        <CheckCircle2 className="h-5 w-5 text-[#00C896]" />
                                        <span className="font-medium">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-10">
                                <Link href="/login" className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-gray-900 transition-all hover:border-[#00C896]/50 hover:bg-[#00C896]/5">
                                    경쟁사 분석 시작하기
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </div>
                        </div>

                        {/* 오른쪽: 경쟁사 비교 실제 화면 */}
                        <div className="group relative">
                            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-slate-200 to-slate-100 blur-xl opacity-70" />
                            <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
                                <Image
                                    src="/images/new_competitor_feature_waifu2x.png"
                                    alt="맵타민 경쟁사 비교 분석 지도 화면"
                                    width={2200}
                                    height={1060}
                                    className="h-auto w-full"
                                    quality={100}
                                    sizes="(max-width: 1024px) 100vw, 75vw"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. 장점 3가지 카드 — 주석 처리 (사용자 요청) */}
            {/*
            <section className="bg-[#f5f8f8] py-24">
                <div className="mx-auto max-w-7xl px-6">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 text-3xl font-bold">왜 맵타민이어야 할까요?</h2>

                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        {[
                            {
                                icon: BarChart3,
                                title: '이해하기 쉬운 신호등 시스템',
                                desc: '초록불, 노란불, 빨간불로 내 매장의 위치별 진짜 순위를 한눈에 파악하세요.',
                            },
                            {
                                icon: ClipboardCheck,
                                title: '팩트 체크',
                                desc: '마케팅 대행사가 일을 제대로 하는지 감시하세요. 성과가 나타나면 지도의 색깔이 실시간으로 바뀝니다. 투명한 마케팅 성과를 확인하세요.',
                            },
                            {
                                icon: Map,
                                title: '경쟁사 땅따먹기',
                                desc: '주변 경쟁 업체의 강점 지역과 약점 지역을 파악하여 전략적인 마케팅 포인트를 잡으세요. 비어있는 시장을 공략할 수 있습니다.',
                            },
                        ].map((feature, idx) => (
                            <div
                                key={idx}
                                className="transition-all hover:-translate-y-2 rounded-2xl border border-slate-100 bg-white p-10 shadow-sm hover:shadow-xl"
                            >
                                <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#00C896]/10 text-[#00C896]">
                                    <feature.icon className="h-8 w-8" />
                                </div>
                                <h3 className="mb-4 text-xl font-bold">{feature.title}</h3>
                                <p className="leading-relaxed text-slate-500">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            */}

            {/* 4. 알림 서비스 */}
            <section className="mx-auto max-w-7xl px-6 py-10 lg:py-24">
                <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
                    {/* 왼쪽 요소: 카드 리스트 */}
                    <div className="order-2 space-y-6 lg:order-1">
                        <div className="group flex cursor-pointer items-center gap-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 transition-all hover:bg-white hover:shadow-lg">
                            <div className="flex size-16 flex-none items-center justify-center rounded-2xl bg-white text-[#00C896] shadow-sm transition-transform group-hover:rotate-12">
                                <MessageCircle className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="mb-1 break-keep text-base font-bold sm:text-lg">
                                    띵동! 배달 왔습니다
                                    <span className="block text-sm font-normal text-[#00C896] sm:inline sm:ml-1">
                                        (일간 리포트)
                                    </span>
                                </h3>
                                <p className="break-keep text-xs leading-relaxed text-slate-500 sm:text-sm">
                                    사장님이 가장 한가한 시간을 알려주세요. 맵타민이 알아서
                                    <br className="hidden lg:block" />
                                    매일 카톡으로 &lsquo;플레이스 순위 지도&rsquo;를 보내드립니다.
                                </p>
                            </div>
                        </div>

                        <div className="group flex cursor-pointer items-center gap-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 transition-all hover:bg-white hover:shadow-lg">
                            <div className="flex size-16 flex-none items-center justify-center rounded-2xl bg-white text-yellow-500 shadow-sm transition-transform group-hover:rotate-12">
                                <Zap className="h-8 w-8" />
                            </div>
                            <div className="flex-1">
                                <h3 className="mb-1 break-keep text-base font-bold sm:text-lg">
                                    지금 당장 확인하고 싶다면?
                                    <span className="block text-sm font-normal text-yellow-500 sm:inline sm:ml-1">
                                        (실시간 분석 티켓)
                                    </span>
                                </h3>
                                <p className="break-keep text-xs leading-relaxed text-slate-500 sm:text-sm">
                                    궁금할 때 참지 마세요. &lsquo;실시간 분석 티켓&rsquo;으로 지금
                                    이 순간의 순위를 즉시 분석할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 오른쪽 요소: 텍스트 */}
                    <div className="order-1 text-left lg:order-2">
                        <h2 className="break-keep text-2xl font-bold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
                            매일 접속하지 않으셔도 됩니다.
                        </h2>
                        <p className="mt-4 break-keep text-base text-slate-500 sm:text-lg">
                            바쁜 사장님을 위해 맵타민이 직접 찾아갑니다.
                        </p>
                    </div>
                </div>
            </section>
        </>
    )
}
