import Link from 'next/link'
import { ArrowRight, TrendingUp, Shield } from 'lucide-react'

/* ── 7×7 도트 히트맵 데이터 ── */
const DOT_COLORS: string[][] = [
    ['#22C55E', '#22C55E', '#22C55E', '#22C55E', '#22C55E', '#EAB308', '#EAB308'],
    ['#22C55E', '#22C55E', '#22C55E', '#22C55E', '#22C55E', '#EAB308', '#EF4444'],
    ['#22C55E', '#22C55E', '#22C55E', '#22C55E', '#22C55E', '#EAB308', '#EF4444'],
    ['#22C55E', '#22C55E', '#22C55E', '#22C55E', '#EAB308', '#EF4444', '#EF4444'],
    ['#22C55E/60', '#22C55E', '#22C55E', '#EAB308', '#EF4444', '#EF4444', '#EF4444'],
]

/* 글로우 색상 매핑 */
function glowStyle(color: string): React.CSSProperties {
    if (color.includes('22C55E')) return { backgroundColor: '#22C55E', boxShadow: '0 0 10px rgba(34,197,94,0.6)' }
    if (color.includes('EAB308')) return { backgroundColor: '#EAB308', boxShadow: '0 0 8px rgba(234,179,8,0.5)' }
    return { backgroundColor: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }
}

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

            <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
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
                        <p className="mx-auto max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg lg:mx-0 lg:text-xl">
                            초록색은 내 구역, 빨간색은 놓친 구역.
                            <br />
                            매주 카톡으로 배달되는 [플레이스 순위 지도]로
                            <br />
                            사장님의 <strong className="text-gray-700">진짜 상권 순위</strong>를 팩트 체크하세요.
                        </p>

                        {/* CTA 버튼 */}
                        <div className="flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                            <Link
                                href="/login"
                                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#00C896] px-8 py-4 text-base font-bold text-white shadow-[0_20px_40px_-10px_rgba(0,199,149,0.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#00B386] hover:shadow-[0_25px_50px_-10px_rgba(0,199,149,0.4)] sm:w-auto sm:text-lg"
                            >
                                우리 가게 &lsquo;진짜 순위&rsquo; 확인하기
                                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>

                    {/* ── 우측: 지도 목업 카드 ── */}
                    <div className="w-full lg:w-1/2">
                        <div className="relative mx-auto w-full max-w-lg">
                            {/* 플로팅 Rank 카드 (bounce) */}
                            <div
                                className="absolute -right-4 -top-10 z-20 flex h-20 w-20 animate-bounce items-center justify-center rounded-2xl bg-white p-3 shadow-xl sm:-right-8 sm:-top-12 sm:h-24 sm:w-24"
                                style={{ animationDuration: '3s' }}
                            >
                                <div className="text-center">
                                    <span className="mb-1 block text-xs text-gray-400">순위</span>
                                    <span className="flex items-center gap-0.5 text-xl font-bold text-[#00C896] sm:text-2xl">
                                        #1
                                        <TrendingUp className="h-4 w-4" />
                                    </span>
                                </div>
                            </div>

                            {/* 메인 카드 */}
                            <div className="relative z-10 rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_30px_60px_-12px_rgba(15,35,30,0.1)] sm:p-4">
                                {/* 브라우저 크롬 */}
                                <div className="mb-3 flex items-center gap-2 px-2">
                                    <div className="h-3 w-3 rounded-full bg-red-400" />
                                    <div className="h-3 w-3 rounded-full bg-yellow-400" />
                                    <div className="h-3 w-3 rounded-full bg-green-400" />
                                    <div className="ml-4 h-6 flex-1 rounded-md bg-gray-100" />
                                </div>

                                {/* 지도 영역 */}
                                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                                    {/* CSS 지도 배경 패턴 */}
                                    <div
                                        className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-gray-100"
                                        style={{
                                            backgroundImage:
                                                'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
                                            backgroundSize: '30px 30px',
                                        }}
                                    />
                                    {/* 오버레이 */}
                                    <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-[0.5px]" />

                                    {/* 5×7 도트 그리드 */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="grid grid-cols-7 gap-3 p-6 sm:gap-4 sm:p-8">
                                            {DOT_COLORS.map((row, rowIdx) =>
                                                row.map((color, colIdx) => {
                                                    const isCenter = rowIdx === 2 && colIdx === 2
                                                    return (
                                                        <div
                                                            key={`${rowIdx}-${colIdx}`}
                                                            className={`h-3 w-3 rounded-full transition-transform duration-200 sm:h-4 sm:w-4 ${isCenter
                                                                ? 'scale-125 border-2 border-white animate-pulse'
                                                                : 'hover:scale-110'
                                                                }`}
                                                            style={glowStyle(color)}
                                                        />
                                                    )
                                                })
                                            )}
                                        </div>

                                        {/* 중앙 핀 라벨 */}
                                        <div className="absolute left-1/2 top-[38%] z-20 -translate-x-1/2 -translate-y-full">
                                            <div className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-gray-800 shadow-lg">
                                                <span className="h-2 w-2 rounded-full bg-[#00C896]" />
                                                내 가게
                                            </div>
                                            <div className="mx-auto h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white drop-shadow-sm" />
                                        </div>
                                    </div>

                                    {/* 하단 Health Score 오버레이 */}
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/20 bg-white/90 p-3 shadow-lg backdrop-blur-md">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00C896]/10 text-[#00C896]">
                                                <Shield className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-gray-500">
                                                    지도 건강 점수
                                                </div>
                                                <div className="text-sm font-bold text-gray-900">
                                                    우수 (92/100)
                                                </div>
                                            </div>
                                        </div>
                                        {/* 스파크라인 */}
                                        <svg
                                            className="h-8 w-16 text-[#00C896]"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 40 20"
                                        >
                                            <path
                                                d="M0 15 L10 12 L20 16 L30 5 L40 8"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
