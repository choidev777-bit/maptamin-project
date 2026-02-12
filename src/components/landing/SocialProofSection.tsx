import { MapPin, Heart } from 'lucide-react'

export default function SocialProofSection() {
    return (
        <section className="bg-[#002959] py-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-6">
                <div className="flex justify-center">
                    <div className="flex flex-col gap-12 md:flex-row md:items-center md:gap-20 lg:gap-32">
                        {/* 분석한 좌표 수 */}
                        <div className="flex items-center gap-6">
                            <div className="rounded-2xl bg-white/20 p-4">
                                <MapPin className="h-9 w-9 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="mb-1 break-keep text-lg font-bold text-white/90 sm:text-xl md:text-2xl">
                                    분석한 좌표 수
                                </p>
                                <p className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
                                    53,000개+
                                </p>
                            </div>
                        </div>

                        {/* 베타 서비스 기간 재구독률 */}
                        <div className="flex items-center gap-6">
                            <div className="rounded-2xl bg-white/20 p-4">
                                <Heart className="h-9 w-9 text-white" />
                            </div>
                            <div className="text-left">
                                <p className="mb-1 break-keep text-lg font-bold text-white/90 sm:text-xl md:text-2xl">
                                    베타 서비스 기간 재구독률
                                </p>
                                <p className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">
                                    93% 달성
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
