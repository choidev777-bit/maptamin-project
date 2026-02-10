import {
    CheckCircle2,
    ArrowRight,
} from 'lucide-react'

/* 5×5 경쟁사 비교 그리드 데이터 (중앙은 '나') */
const COMPARISON_GRID = [
    ['win', 'win', 'lose', 'lose', 'lose'],
    ['win', 'win', 'win', 'lose', 'lose'],
    ['win', 'win', 'my', 'win', 'win'], // 중앙 'my' (나)
    ['lose', 'lose', 'win', 'win', 'win'],
    ['lose', 'lose', 'win', 'win', 'win'],
] as const

export default function SocialProofSection() {
    return (
        <section id="social-proof" className="bg-[#f8fafc] py-24">
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid items-center gap-16 lg:grid-cols-2">
                    {/* 왼쪽: 텍스트 및 특징 설명 */}
                    <div>
                        <h2 className="mb-6 text-3xl font-bold leading-tight text-gray-900 lg:text-4xl">
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
                            <button className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-gray-900 transition-all hover:border-[#00C896]/50 hover:bg-[#00C896]/5">
                                경쟁사 분석 시작하기
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    </div>

                    {/* 오른쪽: 경쟁사 비교 비주얼 카드 */}
                    <div className="group relative">
                        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-slate-200 to-slate-100 blur-xl opacity-70" />
                        <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
                            {/* 카드 헤더 */}
                            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-lg font-bold text-gray-900">경쟁사 비교 분석</h3>
                                    <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
                                        <div className="rounded bg-white px-3 py-1 text-[#00C896] shadow-sm">
                                            내 가게
                                        </div>
                                        <div className="px-3 py-1 text-slate-400">경쟁사 A</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                    <span className="size-2 rounded-full bg-[#00C896]" /> 승(Win)
                                    <span className="ml-2 size-2 rounded-full bg-red-500" /> 패(Loss)
                                </div>
                            </div>

                            {/* 5×5 비교 그리드 */}
                            <div className="aspect-square rounded-xl border border-slate-100 bg-slate-50 p-4">
                                <div className="grid h-full grid-cols-5 gap-2">
                                    {COMPARISON_GRID.flat().map((status, idx) => {
                                        if (status === 'my') {
                                            return (
                                                <div
                                                    key={idx}
                                                    className="relative z-10 flex items-center justify-center"
                                                >
                                                    <div className="flex size-12 items-center justify-center rounded-full border-4 border-white bg-[#00C896] text-base font-bold text-white shadow-xl">
                                                        나
                                                    </div>
                                                </div>
                                            )
                                        }

                                        const isWin = status === 'win'
                                        const bgColor = isWin ? 'bg-[#00C896]' : 'bg-red-500'
                                        const shadowColor = isWin
                                            ? 'shadow-[#00C896]/20'
                                            : 'shadow-red-500/20'
                                        const label = isWin ? '승' : '패'

                                        return (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-center"
                                            >
                                                <div
                                                    className={`flex size-10 transform cursor-default items-center justify-center rounded-full ${bgColor} text-sm font-bold text-white shadow-md ${shadowColor} transition-transform hover:scale-110`}
                                                >
                                                    {label}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
