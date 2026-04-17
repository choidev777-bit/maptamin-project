import Link from 'next/link'
import { MaptaminLogo } from './MaptaminLogo'

export default function Footer() {
    return (
        <footer className="border-t border-gray-100 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
                    {/* 로고 + 서비스 설명 */}
                    <div className="flex flex-col items-center gap-3 sm:items-start">
                        <MaptaminLogo />
                        <p className="text-sm text-gray-500">
                            플레이스 상위노출의 시작, 우리 매장 지도 건강검진 맵타민
                        </p>
                    </div>

                    {/* 링크 */}
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                        <Link
                            href="/terms"
                            className="transition-colors hover:text-gray-600"
                        >
                            이용약관
                        </Link>
                        <Link
                            href="/privacy"
                            className="transition-colors hover:text-gray-600"
                        >
                            개인정보처리방침
                        </Link>
                    </div>
                </div>

                <div className="mt-8 border-t border-gray-100 pt-8 text-center sm:text-left">
                    {/* ──────────────────────────────────────────────
                     * [PORTFOLIO MODE] 사업자 폐업으로 인해 주석처리 (2026-04-17)
                     * 원복 시 아래 주석을 해제하고, 포트폴리오 모드 블록을 삭제하세요.
                     * ────────────────────────────────────────────── */}
                    {/* <h3 className="mb-2 text-sm font-bold text-gray-900">아카식 허브</h3>
                    <div className="space-y-1 text-xs text-gray-500">
                        <p>대표: 최연준 | 사업자등록번호: 186-35-01741 | 통신판매업신고: 제 2026-고양일산서-0229 호</p>
                        <p>주소: 경기도 고양시 일산서구 대산로 142, 305동 802호 | 개인정보관리책임자: 최연준</p>
                        <p>대표번호: 070-8065-3362 | 이메일: maptaminbiz@gmail.com</p>
                    </div> */}

                    {/* [PORTFOLIO MODE] 대체 표시 */}
                    <h3 className="mb-2 text-sm font-bold text-gray-900">맵타민 (Maptamin)</h3>
                    <div className="space-y-1 text-xs text-gray-500">
                        <p>이 서비스는 포트폴리오 데모 환경입니다.</p>
                        <p>문의: maptaminbiz@gmail.com</p>
                    </div>

                    {/* 고객 문의 채널 */}
                    {/* [PORTFOLIO MODE] 카카오톡 문의 주석처리 (2026-04-17) */}
                    {/* <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-3">
                        <a
                            href="https://pf.kakao.com/_exhYRX/chat"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FEE500] bg-[#FEE500]/10 px-4 py-2 text-xs font-semibold text-gray-800 transition-all hover:-translate-y-0.5 hover:bg-[#FEE500]/20 hover:shadow-sm"
                        >
                            💬 카카오톡 문의
                        </a>
                    </div> */}
                </div>

                <div className="mt-8 border-t border-gray-100 pt-6 text-center">
                    <p className="text-xs text-gray-400">
                        © {new Date().getFullYear()} 맵타민 (Maptamin). All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}
