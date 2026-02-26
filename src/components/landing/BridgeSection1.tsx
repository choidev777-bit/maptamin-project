import { Lightbulb } from 'lucide-react'

export default function BridgeSection1() {
    return (
        <section className="bg-slate-50 py-10 lg:py-20">
            <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                <div className="inline-flex items-center justify-center rounded-full bg-[#00C896]/10 p-3">
                    <Lightbulb className="h-6 w-6 text-[#00C896]" />
                </div>
                <p className="mx-auto mt-6 max-w-2xl break-keep text-xl font-semibold leading-relaxed text-gray-800 sm:text-2xl">
                    위험한 조작 없이도
                    <br className="sm:hidden" />
                    {' '}순위를 올릴 방법은 없을까요?
                </p>
                <p className="mt-4 break-keep text-xl font-bold text-[#00C896] sm:text-2xl">
                    있습니다.
                </p>
                <p className="mx-auto mt-4 max-w-lg break-keep text-base leading-relaxed text-gray-500 sm:text-lg">
                    그러려면 먼저
                    <br className="hidden sm:block" />
                    {' '}내 매장의 <strong className="text-gray-700">&lsquo;진짜 상태&rsquo;</strong>부터 알아야 합니다.
                </p>
            </div>
        </section>
    )
}
