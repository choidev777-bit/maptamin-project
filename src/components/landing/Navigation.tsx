import Link from 'next/link'
import { MaptaminLogo } from './MaptaminLogo'

export default function Navigation() {
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2 outline-none">
                    <MaptaminLogo />
                </Link>
                <Link
                    href="/login"
                    className="rounded-xl bg-[#00C896] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-md"
                >
                    로그인
                </Link>
            </div>
        </nav>
    )
}
