import Navigation from '@/components/landing/Navigation'
import Footer from '@/components/landing/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: '개인정보처리방침 | 맵타민',
    description: '맵타민 개인정보처리방침입니다. 개인정보 수집·이용·보관·파기에 관한 정책을 안내합니다.',
}

export default function PrivacyPage() {
    return (
        <>
            <Navigation />

            <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                {/* 타이틀 */}
                <h1 className="mb-8 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
                    개인정보처리방침
                </h1>

                {/* 시행일 안내 */}
                <p className="mb-10 text-center text-sm text-gray-500">
                    시행일: 2026년 2월 26일
                </p>

                {/* 본문 */}
                <div className="prose prose-gray mx-auto max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">

                    {/* 제1조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제1조 (목적)</h2>
                        <p>
                            아카식 허브(이하 &lsquo;회사&rsquo;라고 함)는 회사가 제공하는 &lsquo;맵타민 (Maptamin)&rsquo;
                            및 관련 제반 서비스(이하 &lsquo;회사 서비스&rsquo;)를 이용하는 개인(이하 &lsquo;이용자&rsquo;
                            또는 &lsquo;개인&rsquo;)의 정보(이하 &lsquo;개인정보&rsquo;)를 보호하기 위해,
                            개인정보보호법, 정보통신망 이용촉진 및 정보보호 등에 관한 법률(이하 &lsquo;정보통신망법&rsquo;) 등 관련 법령을 준수하고,
                            서비스 이용자의 개인정보 보호 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여
                            다음과 같이 개인정보처리방침(이하 &lsquo;본 방침&rsquo;)을 수립합니다.
                        </p>
                    </section>

                    {/* 제2조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제2조 (개인정보 처리의 원칙)</h2>
                        <p>
                            개인정보 관련 법령 및 본 방침에 따라 회사는 이용자의 개인정보를 수집할 수 있으며
                            수집된 개인정보는 개인의 동의가 있는 경우에 한해 제3자에게 제공될 수 있습니다.
                            단, 법령의 규정 등에 의해 적법하게 강제되는 경우 회사는 수집한 이용자의 개인정보를
                            사전에 개인의 동의 없이 제3자에게 제공할 수도 있습니다.
                        </p>
                    </section>

                    {/* 제3조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제3조 (본 방침의 공개)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>회사는 이용자가 언제든지 쉽게 본 방침을 확인할 수 있도록 회사 홈페이지 첫 화면 또는 첫 화면과의 연결화면을 통해 본 방침을 공개하고 있습니다.</li>
                            <li>회사는 제1항에 따라 본 방침을 공개하는 경우 글자 크기, 색상 등을 활용하여 이용자가 본 방침을 쉽게 확인할 수 있도록 합니다.</li>
                        </ol>
                    </section>

                    {/* 제4조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제4조 (본 방침의 변경)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>본 방침은 개인정보 관련 법령, 지침, 고시 또는 정부나 회사 서비스의 정책이나 내용의 변경에 따라 개정될 수 있습니다.</li>
                            <li>회사는 제1항에 따라 본 방침을 개정하는 경우 다음 각 호 하나 이상의 방법으로 공지합니다.
                                <ul className="mt-2 list-none space-y-1 pl-4">
                                    <li>가. 회사가 운영하는 인터넷 홈페이지의 첫 화면의 공지사항란 또는 별도의 창을 통하여 공지하는 방법</li>
                                    <li>나. 서면·모사전송·전자우편 또는 이와 비슷한 방법으로 이용자에게 공지하는 방법</li>
                                </ul>
                            </li>
                            <li>회사는 제2항의 공지는 본 방침 개정의 시행일로부터 최소 7일 이전에 공지합니다. 다만, 이용자 권리의 중요한 변경이 있을 경우에는 최소 30일 전에 공지합니다.</li>
                        </ol>
                    </section>

                    {/* 제5조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제5조 (회원 가입을 위한 정보)</h2>
                        <p>회사는 이용자의 회사 서비스에 대한 회원가입을 위하여 다음과 같은 정보를 수집합니다.</p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>필수 수집 정보: 이메일 주소, 이름 및 휴대폰 번호</li>
                        </ul>
                    </section>

                    {/* 제6조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제6조 (회사 서비스 제공을 위한 정보)</h2>
                        <p>회사는 이용자에게 회사의 서비스를 제공하기 위하여 다음과 같은 정보를 수집합니다.</p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>필수 수집 정보: 아이디, 이메일 주소, 이름 및 연락처</li>
                        </ul>
                    </section>

                    {/* 제6조의2 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제6조의2 (결제 서비스를 위한 정보)</h2>
                        <p>
                            회사는 유료 서비스 결제 처리를 위하여 결제 기록(결제일시, 결제금액, 결제상태 등)을 수집합니다.
                            단, 전체 카드번호나 CVC 등 외부 유출 시 악용될 수 있는 민감한 결제 정보는 회사가 직접 수집·보관하지 않으며,
                            결제대행사(PG사)를 통해 처리됩니다. 회사는 결제 수단 확인 및 안내의 목적으로만 식별 불가능하게 마스킹 된 카드 정보(카드사명, 카드번호 끝 4자리) 일부를 수집 및 보관할 수 있습니다. (상세 내용은 제10조 개인정보의 처리 위탁을 참고하시기 바랍니다.)
                        </p>
                    </section>

                    {/* 제7조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제7조 (서비스 이용 및 부정 이용 확인을 위한 정보)</h2>
                        <p>
                            회사는 이용자의 서비스 이용에 따른 통계∙분석 및 부정이용의 확인∙분석을 위하여 다음과 같은 정보를
                            수집합니다. (부정이용이란 회원탈퇴 후 재가입, 상품구매 후 구매취소 등을 반복적으로 행하는 등 회사가
                            제공하는 할인쿠폰, 이벤트 혜택 등의 경제상 이익을 불·편법적으로 수취하는 행위, 이용약관 등에서 금지하고
                            있는 행위, 명의도용 등의 불·편법행위 등을 말합니다.)
                        </p>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>필수 수집 정보: 서비스 이용기록, 쿠키, 접속지 정보 및 기기정보</li>
                        </ul>
                    </section>

                    {/* 제8조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제8조 (개인정보 수집 방법)</h2>
                        <p>회사는 다음과 같은 방법으로 이용자의 개인정보를 수집합니다.</p>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>이용자가 회사의 홈페이지에 자신의 개인정보를 입력하는 방식</li>
                            <li>어플리케이션 등 회사가 제공하는 홈페이지 외의 서비스를 통해 이용자가 자신의 개인정보를 입력하는 방식</li>
                            <li>이용자가 고객센터의 상담, 게시판에서의 활동 등 회사의 서비스를 이용하는 과정에서 이용자가 입력하는 방식</li>
                            <li>제휴사로부터의 제공(카카오톡 등 SNS 간편 로그인)</li>
                        </ol>
                    </section>

                    {/* 제9조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제9조 (개인정보의 이용)</h2>
                        <p>회사는 개인정보를 다음 각 호의 경우에 이용합니다.</p>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>공지사항의 전달 등 회사운영에 필요한 경우</li>
                            <li>이용문의에 대한 회신, 불만의 처리 등 이용자에 대한 서비스 개선을 위한 경우</li>
                            <li>회사의 서비스를 제공하기 위한 경우</li>
                            <li>법령 및 회사 약관을 위반하는 회원에 대한 이용 제한 조치, 부정 이용 행위를 포함하여 서비스의 원활한 운영에 지장을 주는 행위에 대한 방지 및 제재를 위한 경우</li>
                            <li>신규 서비스 개발을 위한 경우</li>
                            <li>이벤트 및 행사 안내 등 마케팅을 위한 경우</li>
                            <li>인구통계학적 분석, 서비스 방문 및 이용기록의 분석을 위한 경우</li>
                            <li>불량 회원의 부정 이용 방지 및 비인가 사용 방지</li>
                        </ol>
                    </section>

                    {/* 제10조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제10조 (개인정보의 처리 위탁)</h2>
                        <p>① 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-gray-300 bg-gray-50">
                                        <th className="px-4 py-3 text-left font-semibold text-gray-900">수탁업체</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-900">위탁업무 내용</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-900">보유 및 이용기간</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-200">
                                        <td className="px-4 py-3 font-medium">엔에이치엔케이씨피(주) (NHN KCP)</td>
                                        <td className="px-4 py-3">신용카드 결제 처리</td>
                                        <td className="px-4 py-3">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="px-4 py-3 font-medium">(주)포트원</td>
                                        <td className="px-4 py-3">결제 시스템 중개</td>
                                        <td className="px-4 py-3">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="px-4 py-3 font-medium">(주)카카오페이</td>
                                        <td className="px-4 py-3">간편결제 처리 (카카오페이)</td>
                                        <td className="px-4 py-3">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="px-4 py-3 font-medium">네이버파이낸셜(주)</td>
                                        <td className="px-4 py-3">간편결제 처리 (네이버페이)</td>
                                        <td className="px-4 py-3">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="px-4 py-3 font-medium">(주)비바리퍼블리카</td>
                                        <td className="px-4 py-3">간편결제 처리 (토스페이)</td>
                                        <td className="px-4 py-3">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="px-4 py-3 font-medium">솔라피(주)</td>
                                        <td className="px-4 py-3">메시지(알림톡) 발송 대행</td>
                                        <td className="px-4 py-3">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="px-4 py-3 font-medium">Resend Inc.</td>
                                        <td className="px-4 py-3">이메일 발송 대행</td>
                                        <td className="px-4 py-3">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="px-4 py-3 font-medium">Vercel Inc.</td>
                                        <td className="px-4 py-3">웹 서비스 호스팅 및 배포</td>
                                        <td className="px-4 py-3">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                                    </tr>
                                    <tr className="border-b border-gray-200">
                                        <td className="px-4 py-3 font-medium">Supabase Inc.</td>
                                        <td className="px-4 py-3">데이터베이스 호스팅 및 인증 처리</td>
                                        <td className="px-4 py-3">회원 탈퇴 시 또는 위탁 계약 종료 시까지</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4">② 회사는 위탁계약 체결 시 개인정보 보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.</p>
                        <p>③ 위탁업무의 내용이나 수탁자가 변경될 경우에는 지체 없이 본 개인정보 처리방침을 통하여 공개하도록 하겠습니다.</p>
                    </section>

                    {/* 제11조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제11조 (개인정보의 보유 및 이용기간)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>회사는 이용자의 개인정보에 대해 개인정보의 수집·이용 목적 달성을 위한 기간 동안 개인정보를 보유 및 이용합니다.</li>
                            <li>전항에도 불구하고 회사는 내부 방침에 의해 서비스 부정이용기록은 부정 가입 및 이용 방지를 위하여 회원 탈퇴 시점으로부터 최대 1년간 보관합니다.</li>
                        </ol>
                    </section>

                    {/* 제12조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제12조 (법령에 따른 개인정보의 보유 및 이용기간)</h2>
                        <p>회사는 관계법령에 따라 다음과 같이 개인정보를 보유 및 이용합니다.</p>
                        <ol className="mt-3 list-decimal space-y-3 pl-5">
                            <li>전자상거래 등에서의 소비자보호에 관한 법률에 따른 보유정보 및 보유기간
                                <ul className="mt-1 list-none space-y-1 pl-4">
                                    <li>가. 계약 또는 청약철회 등에 관한 기록 : 5년</li>
                                    <li>나. 대금결제 및 재화 등의 공급에 관한 기록 : 5년</li>
                                    <li>다. 소비자의 불만 또는 분쟁처리에 관한 기록 : 3년</li>
                                    <li>라. 표시·광고에 관한 기록 : 6개월</li>
                                </ul>
                            </li>
                            <li>통신비밀보호법에 따른 보유정보 및 보유기간
                                <ul className="mt-1 list-none space-y-1 pl-4">
                                    <li>가. 웹사이트 로그 기록 자료 : 3개월</li>
                                </ul>
                            </li>
                            <li>전자금융거래법에 따른 보유정보 및 보유기간
                                <ul className="mt-1 list-none space-y-1 pl-4">
                                    <li>가. 전자금융거래에 관한 기록 : 5년</li>
                                </ul>
                            </li>
                            <li>위치정보의 보호 및 이용 등에 관한 법률
                                <ul className="mt-1 list-none space-y-1 pl-4">
                                    <li>가. 개인위치정보에 관한 기록 : 6개월</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    {/* 제13조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제13조 (개인정보의 파기원칙)</h2>
                        <p>
                            회사는 원칙적으로 이용자의 개인정보 처리 목적의 달성, 보유·이용기간의 경과 등
                            개인정보가 필요하지 않을 경우에는 해당 정보를 지체 없이 파기합니다.
                        </p>
                    </section>

                    {/* 제14조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제14조 (개인정보파기절차)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>이용자가 회원가입 등을 위해 입력한 정보는 개인정보 처리 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라(보유 및 이용기간 참조) 일정 기간 저장된 후 파기 되어집니다.</li>
                            <li>회사는 파기 사유가 발생한 개인정보를 개인정보보호 책임자의 승인절차를 거쳐 파기합니다.</li>
                        </ol>
                    </section>

                    {/* 제15조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제15조 (개인정보파기방법)</h2>
                        <p>
                            회사는 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을
                            사용하여 삭제하며, 종이로 출력된 개인정보는 분쇄기로 분쇄하거나 소각 등을 통하여 파기합니다.
                        </p>
                    </section>

                    {/* 제16조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제16조 (광고성 정보의 전송 조치)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>회사는 전자적 전송매체를 이용하여 영리목적의 광고성 정보를 전송하는 경우 이용자의 명시적인 사전동의를 받습니다. 다만, 다음 각호 어느 하나에 해당하는 경우에는 사전 동의를 받지 않습니다.
                                <ul className="mt-2 list-none space-y-1 pl-4">
                                    <li>가. 회사가 재화 등의 거래관계를 통하여 수신자로부터 직접 연락처를 수집한 경우, 거래가 종료된 날로부터 6개월 이내에 회사가 처리하고 수신자와 거래한 것과 동종의 재화 등에 대한 영리목적의 광고성 정보를 전송하려는 경우</li>
                                    <li>나. 「방문판매 등에 관한 법률」에 따른 전화권유판매자가 육성으로 수신자에게 개인정보의 수집출처를 고지하고 전화권유를 하는 경우</li>
                                </ul>
                            </li>
                            <li>회사는 전항에도 불구하고 수신자가 수신거부의사를 표시하거나 사전 동의를 철회한 경우에는 영리목적의 광고성 정보를 전송하지 않으며 수신거부 및 수신동의 철회에 대한 처리 결과를 알립니다.</li>
                            <li>회사는 오후 9시부터 그다음 날 오전 8시까지의 시간에 전자적 전송매체를 이용하여 영리목적의 광고성 정보를 전송하는 경우에는 제1항에도 불구하고 그 수신자로부터 별도의 사전 동의를 받습니다.</li>
                            <li>회사는 전자적 전송매체를 이용하여 영리목적의 광고성 정보를 전송하는 경우 다음의 사항 등을 광고성 정보에 구체적으로 밝힙니다.
                                <ul className="mt-2 list-none space-y-1 pl-4">
                                    <li>가. 회사명 및 연락처</li>
                                    <li>나. 수신 거부 또는 수신 동의의 철회 의사표시에 관한 사항의 표시</li>
                                </ul>
                            </li>
                            <li>회사는 전자적 전송매체를 이용하여 영리목적의 광고성 정보를 전송하는 경우 다음 각 호의 어느 하나에 해당하는 조치를 하지 않습니다.
                                <ul className="mt-2 list-none space-y-1 pl-4">
                                    <li>가. 광고성 정보 수신자의 수신거부 또는 수신동의의 철회를 회피·방해하는 조치</li>
                                    <li>나. 숫자·부호 또는 문자를 조합하여 전화번호·전자우편주소 등 수신자의 연락처를 자동으로 만들어 내는 조치</li>
                                    <li>다. 영리목적의 광고성 정보를 전송할 목적으로 전화번호 또는 전자우편주소를 자동으로 등록하는 조치</li>
                                    <li>라. 광고성 정보 전송자의 신원이나 광고 전송 출처를 감추기 위한 각종 조치</li>
                                    <li>마. 영리목적의 광고성 정보를 전송할 목적으로 수신자를 기망하여 회신을 유도하는 각종 조치</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    {/* 제17조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제17조 (아동의 개인정보보호)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>회사는 만 14세 미만 아동의 개인정보 보호를 위하여 만 14세 이상의 이용자에 한하여 회원가입을 허용합니다.</li>
                            <li>제1항에도 불구하고 회사는 이용자가 만 14세 미만의 아동일 경우에는, 그 아동의 법정대리인으로부터 그 아동의 개인정보 수집, 이용, 제공 등의 동의를 그 아동의 법정대리인으로부터 받습니다.</li>
                            <li>제2항의 경우 회사는 그 법정대리인의 이름, 생년월일, 성별, 중복가입확인정보(ID), 휴대폰 번호 등을 추가로 수집합니다.</li>
                        </ol>
                    </section>

                    {/* 제18조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제18조 (개인정보 조회 및 수집동의 철회)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>이용자 및 법정 대리인은 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 개인정보수집 동의 철회를 요청할 수 있습니다.</li>
                            <li>이용자 및 법정 대리인은 자신의 가입정보 수집 등에 대한 동의를 철회하기 위해서는 개인정보보호책임자 또는 담당자에게 서면, 전화 또는 전자우편주소로 연락하시면 회사는 지체 없이 조치하겠습니다.</li>
                        </ol>
                    </section>

                    {/* 제19조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제19조 (개인정보 정보변경 등)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>이용자는 회사에게 전조의 방법을 통해 개인정보의 오류에 대한 정정을 요청할 수 있습니다.</li>
                            <li>회사는 전항의 경우에 개인정보의 정정을 완료하기 전까지 개인정보를 이용 또는 제공하지 않으며 잘못된 개인정보를 제3자에게 이미 제공한 경우에는 정정 처리결과를 제3자에게 지체 없이 통지하여 정정이 이루어지도록 하겠습니다.</li>
                        </ol>
                    </section>

                    {/* 제20조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제20조 (이용자의 의무)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>이용자는 자신의 개인정보를 최신의 상태로 유지해야 하며, 이용자의 부정확한 정보 입력으로 발생하는 문제의 책임은 이용자 자신에게 있습니다.</li>
                            <li>타인의 개인정보를 도용한 회원가입의 경우 이용자 자격을 상실하거나 관련 개인정보보호 법령에 의해 처벌받을 수 있습니다.</li>
                            <li>이용자는 전자우편주소, 소셜 로그인 계정 등에 대한 보안을 유지할 책임이 있으며 제3자에게 이를 양도하거나 대여할 수 없습니다.</li>
                        </ol>
                    </section>

                    {/* 제21조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제21조 (회사의 개인정보 관리)</h2>
                        <p>
                            회사는 이용자의 개인정보를 처리함에 있어 개인정보가 분실, 도난, 유출, 변조, 훼손 등이
                            되지 아니하도록 안전성을 확보하기 위하여 필요한 기술적·관리적 보호대책을 강구하고 있습니다.
                        </p>
                    </section>

                    {/* 제22조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제22조 (삭제된 정보의 처리)</h2>
                        <p>
                            회사는 이용자 혹은 법정 대리인의 요청에 의해 해지 또는 삭제된 개인정보는
                            회사가 수집하는 &ldquo;개인정보의 보유 및 이용기간&rdquo;에 명시된 바에 따라 처리하고
                            그 외의 용도로 열람 또는 이용할 수 없도록 처리하고 있습니다.
                        </p>
                    </section>

                    {/* 제23조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제23조 (계정 접근 보안)</h2>
                        <p>
                            회사는 이용자의 계정 보호를 위해 OAuth 2.0 기반의 소셜 로그인(카카오 싱크 등)을
                            사용하며, 이용자의 비밀번호를 직접 저장하지 않습니다. 이용자의 개인정보 확인 및
                            변경은 해당 소셜 로그인 계정의 인증을 통해서만 가능합니다.
                        </p>
                    </section>

                    {/* 제24조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제24조 (해킹 등에 대비한 대책)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>회사는 해킹, 컴퓨터 바이러스 등 정보통신망 침입에 의해 이용자의 개인정보가 유출되거나 훼손되는 것을 막기 위해 최선을 다하고 있습니다.</li>
                            <li>회사는 최신 백신프로그램을 이용하여 이용자들의 개인정보나 자료가 유출 또는 손상되지 않도록 방지하고 있습니다.</li>
                            <li>회사는 만일의 사태에 대비하여 침입차단 시스템을 이용하여 보안에 최선을 다하고 있습니다.</li>
                            <li>회사는 민감한 개인정보(를 수집 및 보유하고 있는 경우)를 암호화 통신 등을 통하여 네트워크상에서 개인정보를 안전하게 전송할 수 있도록 하고 있습니다.</li>
                        </ol>
                    </section>

                    {/* 제25조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제25조 (개인정보 처리 최소화 및 교육)</h2>
                        <p>
                            회사는 개인정보 관련 처리 담당자를 최소한으로 제한하며, 개인정보 처리자에 대한
                            교육 등 관리적 조치를 통해 법령 및 내부방침 등의 준수를 강조하고 있습니다.
                        </p>
                    </section>

                    {/* 제26조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제26조 (개인정보 유출 등에 대한 조치)</h2>
                        <p>
                            회사는 개인정보의 분실·도난·유출(이하 &ldquo;유출 등&rdquo;이라 한다) 사실을 안 때에는 지체 없이 다음 각 호의 모든
                            사항을 해당 이용자에게 알리고 방송통신위원회 또는 한국인터넷진흥원에 신고합니다.
                        </p>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>유출 등이 된 개인정보 항목</li>
                            <li>유출 등이 발생한 시점</li>
                            <li>이용자가 취할 수 있는 조치</li>
                            <li>정보통신서비스 제공자 등의 대응 조치</li>
                            <li>이용자가 상담 등을 접수할 수 있는 부서 및 연락처</li>
                        </ol>
                    </section>

                    {/* 제27조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제27조 (개인정보 유출 등에 대한 조치의 예외)</h2>
                        <p>
                            회사는 전조에도 불구하고 이용자의 연락처를 알 수 없는 등 정당한 사유가 있는 경우에는
                            회사의 홈페이지에 30일 이상 게시하는 방법으로 전조의 통지를 갈음하는 조치를 취할 수 있습니다.
                        </p>
                    </section>

                    {/* 제28조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제28조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)</h2>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 개인정보 자동 수집장치(이하 &lsquo;쿠키&rsquo;)를 사용합니다. 쿠키는 웹사이트를 운영하는데 이용되는 서버(http)가 이용자의 웹브라우저(PC 및 모바일을 포함)에게 보내는 소량의 정보이며 이용자의 저장공간에 저장되기도 합니다.</li>
                            <li>이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서 이용자는 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.</li>
                            <li>다만, 쿠키의 저장을 거부할 경우에는 로그인이 필요한 회사의 일부 서비스는 이용에 어려움이 있을 수 있습니다.</li>
                        </ol>
                    </section>

                    {/* 제29조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제29조 (쿠키 설치 허용 지정 방법)</h2>
                        <p>웹브라우저 옵션 설정을 통해 쿠키 허용, 쿠키 차단 등의 설정을 할 수 있습니다.</p>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>Edge : 웹브라우저 우측 상단의 설정 메뉴 &gt; 쿠키 및 사이트 권한 &gt; 쿠키 및 사이트 데이터 관리 및 삭제</li>
                            <li>Chrome : 웹브라우저 우측 상단의 설정 메뉴 &gt; 개인정보 및 보안 &gt; 쿠키 및 기타 사이트 데이터</li>
                            <li>Whale : 웹브라우저 우측 상단의 설정 메뉴 &gt; 개인정보 보호 &gt; 쿠키 및 기타 사이트 데이터</li>
                        </ol>
                    </section>

                    {/* 제30조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제30조 (회사의 개인정보 보호 책임자 지정)</h2>
                        <p>회사는 이용자의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 관련 부서 및 개인정보 보호 책임자를 지정하고 있습니다.</p>
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-5">
                            <h3 className="mb-3 font-semibold text-gray-900">개인정보 보호 책임자</h3>
                            <ul className="space-y-1">
                                <li><span className="font-medium text-gray-700">성명:</span> 최연준</li>
                                <li><span className="font-medium text-gray-700">직책:</span> 대표</li>
                                <li><span className="font-medium text-gray-700">전화번호:</span> 070-8065-3362</li>
                                <li><span className="font-medium text-gray-700">이메일:</span> maptaminbiz@gmail.com</li>
                            </ul>
                        </div>
                    </section>

                    {/* 제31조 */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">제31조 (권익침해에 대한 구제방법)</h2>
                        <ol className="list-decimal space-y-3 pl-5">
                            <li>정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다. 이 밖에 기타 개인정보침해의 신고, 상담에 대하여는 아래의 기관에 문의하시기 바랍니다.
                                <ul className="mt-2 list-none space-y-1 pl-4">
                                    <li>가. 개인정보분쟁조정위원회 : (국번없이) 1833-6972 (www.kopico.go.kr)</li>
                                    <li>나. 개인정보침해신고센터 : (국번없이) 118 (privacy.kisa.or.kr)</li>
                                    <li>다. 대검찰청 : (국번없이) 1301 (www.spo.go.kr)</li>
                                    <li>라. 경찰청 : (국번없이) 182 (ecrm.cyber.go.kr)</li>
                                </ul>
                            </li>
                            <li>회사는 정보주체의 개인정보자기결정권을 보장하고, 개인정보침해로 인한 상담 및 피해 구제를 위해 노력하고 있으며, 신고나 상담이 필요한 경우 제1항의 담당부서로 연락해주시기 바랍니다.</li>
                            <li>개인정보 보호법 제35조(개인정보의 열람), 제36조(개인정보의 정정·삭제), 제37조(개인정보의 처리정지 등)의 규정에 의한 요구에 대하여 공공기관의 장이 행한 처분 또는 부작위로 인하여 권리 또는 이익의 침해를 받은 자는 행정심판법이 정하는 바에 따라 행정심판을 청구할 수 있습니다.
                                <ul className="mt-2 list-none pl-4">
                                    <li>가. 중앙행정심판위원회 : (국번없이) 110 (www.simpan.go.kr)</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    {/* 부칙 */}
                    <section className="border-t border-gray-200 pt-6">
                        <h2 className="text-lg font-semibold text-gray-900">부칙</h2>
                        <p>본 방침은 2026년 2월 26일부터 시행됩니다.</p>
                    </section>
                </div>
            </main>

            <Footer />
        </>
    )
}
