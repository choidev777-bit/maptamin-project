import { Grid3X3 } from 'lucide-react'

export default function BridgeSection2() {
    return (
        <section className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    {/* 태그 */}
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-[#00C896]/10 px-4 py-2 text-sm font-bold tracking-wide text-[#00C896]">
                        <Grid3X3 className="h-4 w-4" />
                        플레이스 순위 지도
                    </div>

                    {/* 타이틀 */}
                    <h2 className="break-keep text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
                        사장님 폰에서 나오는 1등,
                        <br />
                        <span className="text-[#00C896]">
                            길 건너 손님에게도 똑같이 보일까요?
                        </span>
                    </h2>

                    {/* 서브 타이틀 */}
                    <p className="mx-auto mt-8 max-w-2xl break-keep text-base leading-relaxed text-gray-600 sm:text-lg">
                        내 가게 주변을{' '}
                        <strong className="text-gray-800">
                            바둑판처럼 나누어
                        </strong>
                        , 각 지점마다 고객이
                        <br />
                        <strong className="text-gray-800">
                            &lsquo;업종 키워드
                        </strong>
                        <span className="text-gray-400">
                            (예: 근처삼겹살, 필라테스, 조용한카페)
                        </span>
                        <strong className="text-gray-800">&rsquo;</strong>를
                        검색했을 때의
                        <br />
                        <strong className="text-gray-800">
                            &lsquo;진짜 순위&rsquo;
                        </strong>
                        를 지도 위에 색깔로 한눈에 보여드립니다.
                    </p>

                    {/* 시각적 비유 — 바둑판 그리드 */}
                    <div className="mx-auto mt-12 max-w-sm">
                        <div className="grid grid-cols-5 gap-1.5">
                            {[
                                'bg-[#00C896]',
                                'bg-[#00C896]',
                                'bg-yellow-400',
                                'bg-red-400',
                                'bg-red-400',
                                'bg-[#00C896]',
                                'bg-[#00C896]',
                                'bg-[#00C896]',
                                'bg-yellow-400',
                                'bg-red-400',
                                'bg-yellow-400',
                                'bg-[#00C896]',
                                'bg-[#00C896]/80',
                                'bg-[#00C896]',
                                'bg-yellow-400',
                                'bg-red-400',
                                'bg-yellow-400',
                                'bg-[#00C896]',
                                'bg-[#00C896]',
                                'bg-[#00C896]',
                                'bg-red-400',
                                'bg-red-400',
                                'bg-yellow-400',
                                'bg-[#00C896]',
                                'bg-[#00C896]',
                            ].map((color, i) => (
                                <div
                                    key={i}
                                    className={`aspect-square rounded-md ${color} ${i === 12 ? 'ring-2 ring-gray-900 ring-offset-2' : ''} opacity-80`}
                                />
                            ))}
                        </div>
                        <p className="mt-3 text-xs text-gray-400">
                            가운데(■)가 내 가게 위치
                        </p>
                    </div>

                    {/* 범례 */}
                    <div className="mx-auto mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-sm bg-[#00C896]" />
                            상위 노출
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-sm bg-yellow-400" />
                            주의
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-sm bg-red-400" />
                            노출 안 됨
                        </span>
                    </div>
                </div>
            </div>
        </section>
    )
}
