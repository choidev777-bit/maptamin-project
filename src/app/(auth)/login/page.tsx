import { KakaoLoginButton } from '@/components/auth/KakaoLoginButton'
import { MaptaminLogo } from '@/components/landing/MaptaminLogo'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ plan?: string; redirectTo?: string }>
}) {
    const { plan, redirectTo } = await searchParams
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #00C896 0%, #00a87e 40%, #007a5c 100%)' }}
        >
            {/* 배경 장식 블롭들 */}
            {/* 좌상단 큰 원 */}
            <div
                className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
            />
            {/* 우하단 큰 원 */}
            <div
                className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
            />
            {/* 중앙 우측 중간 원 */}
            <div
                className="absolute top-1/2 -right-16 w-64 h-64 rounded-full opacity-10"
                style={{ background: 'radial-gradient(circle, #b2ffe8 0%, transparent 70%)' }}
            />
            {/* 좌하단 작은 원 */}
            <div
                className="absolute bottom-20 left-16 w-40 h-40 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, #e0fff5 0%, transparent 70%)' }}
            />
            {/* 우상단 작은 원 */}
            <div
                className="absolute top-16 right-24 w-28 h-28 rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)' }}
            />

            {/* 카드 */}
            <div className="relative z-10 max-w-md w-full mx-4">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-6">
                    {/* Logo */}
                    <div className="flex justify-center">
                        <MaptaminLogo />
                    </div>

                    {/* 환영 문구 */}
                    <div className="text-center space-y-1">
                        <p className="text-sm text-gray-500">플레이스 상위노출의 시작, 우리 매장 지도 건강검진 맵타민</p>
                    </div>

                    {/* Login Button */}
                    <div className="flex flex-col gap-3">
                        <KakaoLoginButton plan={plan} redirectTo={redirectTo} />
                    </div>

                    {/* Terms */}
                    <p className="text-xs text-center text-gray-400">
                        회원가입 시{' '}
                        <a href="/terms" className="underline hover:text-gray-600">서비스 이용약관</a>
                        {' '}및{' '}
                        <a href="/privacy" className="underline hover:text-gray-600">개인정보처리방침</a>
                        에 동의하게 됩니다.
                    </p>
                </div>
            </div>
        </div>
    )
}
