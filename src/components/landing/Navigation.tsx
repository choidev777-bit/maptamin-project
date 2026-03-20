'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { MaptaminLogo } from './MaptaminLogo'

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2 outline-none">
                    <MaptaminLogo />
                </Link>

                {/* 데스크탑: 중앙 네비 링크 */}
                <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex">
                    <Link
                        href="/"
                        className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                    >
                        서비스 소개
                    </Link>
                    <Link
                        href="/pricing"
                        className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                    >
                        가격 안내
                    </Link>
                </div>

                {/* 데스크탑: 오른쪽 버튼 */}
                <div className="hidden items-center gap-3 md:flex">
                    <Link
                        href="/login"
                        className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50"
                    >
                        로그인
                    </Link>
                    <Link
                        href="/login?redirectTo=/free-trial"
                        className="rounded-xl bg-[#00C896] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#00B386] hover:shadow-md"
                    >
                        무료 체험하기
                    </Link>
                </div>

                {/* 모바일: 햄버거 버튼 */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex size-10 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 md:hidden"
                    aria-label="메뉴 열기"
                >
                    {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {/* 모바일: 드롭다운 메뉴 */}
            {isOpen && (
                <div className="border-t border-gray-100 bg-white px-4 pb-6 pt-4 md:hidden">
                    <div className="flex flex-col gap-3">
                        <Link
                            href="/"
                            onClick={() => setIsOpen(false)}
                            className="rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                        >
                            서비스 소개
                        </Link>
                        <Link
                            href="/pricing"
                            onClick={() => setIsOpen(false)}
                            className="rounded-xl px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                        >
                            가격 안내
                        </Link>
                        <hr className="border-gray-100" />
                        <Link
                            href="/login"
                            onClick={() => setIsOpen(false)}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
                        >
                            로그인
                        </Link>
                        <Link
                            href="/login?redirectTo=/free-trial"
                            onClick={() => setIsOpen(false)}
                            className="rounded-xl bg-[#00C896] px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#00B386]"
                        >
                            무료 체험하기
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    )
}
