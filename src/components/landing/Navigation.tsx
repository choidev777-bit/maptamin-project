import Link from 'next/link'
import { MaptaminLogo } from './MaptaminLogo'

export default function Navigation() {
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2 outline-none">
                    <MaptaminLogo />
                </Link>

                {/* 중앙 네비 링크 */}
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-4 sm:gap-6">
                    <Link
                        href="/"
                        className="text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 sm:text-sm"
                    >
                        서비스 소개
                    </Link>
                    <Link
                        href="/pricing"
                        className="text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 sm:text-sm"
                    >
                        가격 안내
                    </Link>
                </div>

                {/* 오른쪽 버튼 */}
                <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                        href="/login"
                        className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 sm:px-5 sm:text-sm"
                    >
                        로그인
                    </Link>
                    <Link
                        href="/login"
                        className="rounded-xl bg-[#00C896] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-md sm:px-5 sm:text-sm"
                    >
                        회원가입
                    </Link>
                </div>
            </div>
        </nav>
    )
}
