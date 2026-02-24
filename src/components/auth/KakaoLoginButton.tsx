'use client'

import { createClient } from '@/lib/supabase/client'

const VALID_PLANS = ['starter', 'pro', 'premium']

interface Props {
    plan?: string
    billing?: string
    redirectTo?: string
}

export function KakaoLoginButton({ plan, billing, redirectTo }: Props) {
    const handleLogin = async () => {
        const supabase = createClient()

        const callbackUrl = `${window.location.origin}/auth/callback`
        let finalRedirectTo = callbackUrl

        if (plan && VALID_PLANS.includes(plan)) {
            // plan이 있으면 checkout 우선 (기존 동작)
            const billingParam = billing === 'yearly' ? '&billing=yearly' : ''
            const nextUrl = `/dashboard/subscription/checkout?plan=${plan}${billingParam}`
            finalRedirectTo = `${callbackUrl}?next=${encodeURIComponent(nextUrl)}`
        } else if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
            // redirectTo가 있으면 해당 경로로 (보안: 상대경로만 허용)
            finalRedirectTo = `${callbackUrl}?next=${encodeURIComponent(redirectTo)}`
        }

        await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: finalRedirectTo,
            },
        })
    }

    return (
        <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] transition-all font-medium"
        >
            {/* Kakao Logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 3C6.477 3 2 6.463 2 10.691c0 2.72 1.8 5.108 4.516 6.463-.197.735-.714 2.666-.818 3.08-.128.512.188.505.395.367.163-.108 2.592-1.76 3.644-2.476.737.11 1.494.167 2.263.167 5.523 0 10-3.463 10-7.601C22 6.463 17.523 3 12 3Z"
                    fill="#181600"
                />
            </svg>
            <span className="text-sm font-semibold text-[#181600]">
                카카오 로그인
            </span>
        </button>
    )
}
