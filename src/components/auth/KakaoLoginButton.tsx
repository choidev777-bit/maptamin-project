'use client'

import { createClient } from '@/lib/supabase/client'

export function KakaoLoginButton() {
    const handleLogin = async () => {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    return (
        <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg hover:brightness-95 transition-all"
            style={{ backgroundColor: '#FEE500' }}
        >
            {/* Kakao Logo SVG */}
            <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 3C6.48 3 2 6.36 2 10.44c0 2.6 1.72 4.88 4.32 6.2l-1.1 4.02c-.1.36.3.64.62.44l4.7-3.1c.48.06.96.1 1.46.1 5.52 0 10-3.36 10-7.66C22 6.36 17.52 3 12 3z"
                    fill="#191919"
                />
            </svg>
            <span className="text-sm font-medium" style={{ color: '#191919' }}>
                카카오 로그인
            </span>
        </button>
    )
}
