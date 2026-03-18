import { KakaoLoginButton } from '@/components/auth/KakaoLoginButton'
import { MaptaminLogo } from '@/components/landing/MaptaminLogo'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ plan?: string; redirectTo?: string }>
}) {
    const { plan, redirectTo } = await searchParams
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-100">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
                    {/* Logo & Title */}
                    <div className="flex justify-center">
                        <MaptaminLogo />
                    </div>

                    {/* Login Button */}
                    <div className="flex flex-col gap-3">
                        <KakaoLoginButton plan={plan} redirectTo={redirectTo} />
                    </div>

                    {/* Terms */}
                    <p className="text-xs text-center text-gray-500">
                        로그인 시{' '}
                        <a href="/terms" className="underline hover:text-gray-700">서비스 이용약관</a>
                        {' '}및{' '}
                        <a href="/privacy" className="underline hover:text-gray-700">개인정보처리방침</a>
                        에 동의하게 됩니다.
                    </p>
                </div>
            </div>
        </div>
    )
}
