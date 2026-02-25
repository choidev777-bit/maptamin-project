import { KakaoLoginButton } from '@/components/auth/KakaoLoginButton'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
// ⚠️ TODO: PG 심사 완료 후 아래 import 및 EmailLoginForm 사용 부분 제거
import { EmailLoginForm } from '@/components/auth/EmailLoginForm'
import { MaptaminLogo } from '@/components/landing/MaptaminLogo'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ plan?: string; billing?: string; redirectTo?: string }>
}) {
    const { plan, billing, redirectTo } = await searchParams
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
                        <KakaoLoginButton plan={plan} billing={billing} redirectTo={redirectTo} />
                        {/* <GoogleLoginButton plan={plan} billing={billing} redirectTo={redirectTo} /> */}
                    </div>

                    {/* ⚠️ TODO: PG 심사 완료 후 아래 구분선 + EmailLoginForm 제거 */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400">또는</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <EmailLoginForm />

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
