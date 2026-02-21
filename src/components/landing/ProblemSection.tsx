import { AlertTriangle, ShieldAlert } from 'lucide-react'

export default function ProblemSection() {
    return (
        <section className="relative overflow-hidden bg-white py-24 sm:py-32">
            {/* 배경 장식 */}
            <div className="absolute inset-0 -z-10 h-full origin-top-left -skew-y-3 transform bg-gray-50" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    {/* 태그 */}
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold tracking-wide text-red-600">
                        <ShieldAlert className="h-4 w-4" />
                        주의
                    </div>

                    {/* 타이틀 */}
                    <h2 className="break-keep text-2xl font-extrabold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
                        돈 써서 순위 올리는 시대는 끝났습니다.
                        <br />
                        <span className="text-red-500">
                            이제는 계정이 삭제될 수도 있습니다.
                        </span>
                    </h2>

                    {/* 본문 */}
                    <p className="mx-auto mt-8 max-w-2xl break-keep text-base leading-relaxed text-gray-600 sm:text-lg">
                        네이버는 최근 가짜 영수증, 허위 트래픽 등에 대한 제재를
                        대폭 강화했습니다.
                        <br className="hidden sm:block" />
                        <strong className="text-gray-800">
                            1회만 적발되어도 업체 단위 페널티
                        </strong>
                        가 적용됩니다.
                    </p>

                    {/* 경고 카드 */}
                    <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-2xl border border-red-100 bg-white shadow-lg">
                        {/* 카드 헤더 */}
                        <div className="flex items-center gap-3 bg-red-500 px-6 py-4">
                            <AlertTriangle className="h-6 w-6 text-white" />
                            <span className="text-base font-bold text-white sm:text-lg">
                                네이버 스마트플레이스 제재 항목
                            </span>
                        </div>

                        {/* 카드 본문 */}
                        <div className="p-6 sm:p-8">
                            <ul className="space-y-4 text-left">
                                {[
                                    '허위 클릭을 과다하게 유발하는 경우',
                                    '가짜 영수증을 통한 허위 리뷰',
                                    '마케팅 대행사, 리워드 서비스 등을 통한 허위 리뷰 작성',
                                ].map((item, index) => (
                                    <li
                                        key={index}
                                        className="flex items-start gap-3"
                                    >
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                                        <span className="text-base font-semibold leading-relaxed text-gray-700 sm:text-lg">
                                            {item}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* 카드 푸터 */}
                        <div className="border-t border-red-50 bg-red-50/50 px-6 py-4 text-center">
                            <p className="text-sm font-medium text-red-600 sm:text-base">
                                더 이상 위험한 방식에 내 매장의 운명을 맡기지
                                마세요.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
