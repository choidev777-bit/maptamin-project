import { AlertTriangle, Megaphone, ArrowRight, Quote } from 'lucide-react'

export default function ProblemSection() {
    return (
        <section>
            {/* ── 1. 경고 섹션 (Problem) ── */}
            <div className="relative overflow-hidden bg-white py-24 sm:py-32">
                <div className="absolute inset-0 h-full origin-top-left -skew-y-3 transform bg-gray-50 -z-10" />

                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl text-center">
                        {/* 헤더 (Warning) */}
                        <div className="mb-12 space-y-4">
                            <div className="inline-flex items-center gap-2 rounded border border-red-500/20 bg-red-50 px-3 py-1 text-sm font-bold uppercase tracking-wider text-red-500">
                                <AlertTriangle className="h-4 w-4" /> Warning
                            </div>
                            <h2 className="text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl lg:text-5xl">
                                사장님의 플레이스, <br />
                                <span className="text-red-500">내일이면 사라질 수도 있습니다.</span>
                            </h2>
                        </div>

                        {/* 공지사항 경고 카드 */}
                        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-xl transition-transform duration-300 hover:-translate-y-1">
                            <div className="flex items-center gap-3 bg-red-500 p-4 sm:p-5">
                                <AlertTriangle className="h-8 w-8 text-white" />
                                <h3 className="text-lg font-bold text-white sm:text-xl">
                                    [네이버 스마트플레이스 공지사항]
                                </h3>
                            </div>
                            <div className="space-y-6 bg-white p-8 sm:p-10">
                                <ul className="space-y-4">
                                    {[
                                        '허위 클릭을 과다하게 유발하는 경우',
                                        '가짜 영수증을 통한 허위 리뷰',
                                        '마케팅 대행사, 리워드 서비스 등을 통한 허위 리뷰 작성 등',
                                    ].map((item, index) => (
                                        <li key={index} className="flex items-start gap-4">
                                            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                                            <span className="leading-relaxed text-lg font-bold text-gray-700 sm:text-xl">
                                                {item}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="border-t border-gray-100 bg-gray-50 p-6 text-center">
                                <p className="text-base font-medium text-red-500 sm:text-lg">
                                    위 어뷰징 행위가 <span className="font-extrabold">1회</span>만
                                    확인되더라도, <span className="font-extrabold">페널티</span>를 즉각 적용!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2. 솔루션 섹션 (Solution) ── */}
            <div className="border-t border-gray-100 bg-slate-50 py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 items-center gap-12 text-left lg:grid-cols-2 lg:gap-20">
                        {/* 좌측 텍스트 */}
                        <div className="order-2 space-y-8 lg:order-1">
                            <h3 className="text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl lg:text-[2.5rem]">
                                정답은 <span className="text-[#00C896]">&lsquo;진짜 인기&rsquo;</span>에
                                있습니다.
                            </h3>
                            <p className="break-keep text-xl leading-relaxed text-gray-600 sm:text-2xl">
                                숨어있는 <span className="font-bold text-red-500">빨간불</span>을 찾아
                                공략하세요.
                                <br className="hidden md:block" />
                                <span className="font-bold text-[#00C896]">초록불</span>이 늘어날수록{' '}
                                <strong className="text-gray-900">&lsquo;지역 1등&rsquo;</strong>에
                                가까워집니다.
                            </p>

                        </div>

                        {/* 우측 인용 카드 */}
                        <div className="relative order-1 lg:order-2">
                            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-[#00C896]/10 to-transparent blur-2xl" />
                            <div className="relative rounded-3xl border border-gray-200 bg-white p-8 shadow-xl dark:border-white/5 md:p-10">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00C896]/10">
                                        <Megaphone className="h-5 w-5 text-[#00C896]" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                        Official Guide
                                    </span>
                                </div>
                                <blockquote className="break-keep text-xl font-bold leading-snug text-gray-900 md:text-2xl">
                                    &ldquo;네이버는 공식적으로{' '}
                                    <span className="underline decoration-[#00C896]/30 decoration-4 underline-offset-4">
                                        인기도가 높으면
                                    </span>{' '}
                                    거리가 멀어도 상위 노출된다고 밝혔습니다.&rdquo;
                                </blockquote>
                                <div className="mt-8 flex items-end gap-4 border-t border-gray-50 pt-6">
                                    <div className="text-sm font-medium text-gray-400">
                                        출처: 네이버 스마트플레이스 공식 가이드
                                    </div>
                                    <Quote className="ml-auto h-8 w-8 text-gray-100" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
