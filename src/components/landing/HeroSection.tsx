import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import HeroMapAnimation from './HeroMapAnimation'

export default function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-white">
            {/* ── 배경 장식 (Stitch 스타일) ── */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#00C896]/5 to-transparent" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#00C896]/10 blur-3xl" />
            <div className="pointer-events-none absolute left-0 top-1/2 h-72 w-72 rounded-full bg-blue-400/5 blur-3xl" />

            {/* ── 그리드 배경 패턴 ── */}
            <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(0,199,149,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,199,149,0.05) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
            />

            <div className="relative z-10 mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
                <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-20">
                    {/* ── 좌측: 텍스트 ── */}
                    <div className="space-y-8 text-center lg:w-[60%] lg:text-left">
                        {/* Eyebrow — 펄싱 도트 */}
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#00C896]/10 px-4 py-2 text-sm font-bold tracking-wide text-[#00C896] shadow-sm ring-1 ring-[#00C896]/20">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C896] opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C896]" />
                            </span>
                            국내 최초 [플레이스 순위 지도] 도입
                        </div>

                        {/* 타이틀 — SVG 밑줄 장식 */}
                        <h1 className="break-keep text-2xl font-extrabold leading-[1.25] tracking-tight text-gray-900 sm:text-3xl lg:text-4xl xl:text-[2.75rem]">
                            데이터 분석, 몰라도 됩니다.
                            <br />
                            <span className="text-red-500">빨간색</span>만{' '}
                            <span className="text-[#00C896]">초록색</span>으로 바꾸세요.
                        </h1>

                        {/* 서브 텍스트 */}
                        <p className="mx-auto max-w-xl break-keep text-base leading-relaxed text-gray-500 sm:text-lg lg:mx-0 lg:text-xl">
                            초록색은 내 구역, 빨간색은 놓친 구역.
                            <br />
                            매일 카톡으로 배달되는 [플레이스 순위 지도]로
                            <br />
                            사장님의 <strong className="text-gray-700">진짜 상권 순위</strong>를 팩트 체크하세요.
                        </p>

                        {/* CTA 버튼 */}
                        <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                            <Link
                                href="/login?redirectTo=/free-trial"
                                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#00C896] px-8 py-4 text-base font-bold text-white shadow-[0_20px_40px_-10px_rgba(0,199,149,0.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#00B386] hover:shadow-[0_25px_50px_-10px_rgba(0,199,149,0.4)] sm:w-auto sm:text-lg"
                            >
                                <span className="flex flex-col items-center leading-tight sm:items-start">
                                    <span className="text-sm font-medium opacity-90 sm:text-base">무료로 1분만에</span>
                                    <span>우리 매장 &lsquo;진짜 순위&rsquo; 확인하기</span>
                                </span>
                                <ArrowRight className="h-5 w-5 ml-3 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>

                    {/* ── 우측: 3단계 순위 애니메이션 ── */}
                    <HeroMapAnimation />
                </div>
            </div>
        </section>
    )
}
