'use client'

import dynamic from 'next/dynamic'

// @remotion/player는 브라우저 전용이므로 SSR 비활성화 필수
const RemotionPlayer = dynamic(() => import('./HeroVideoPlayer'), { ssr: false })

export default function HeroMapAnimation() {
    return (
        <div className="w-full lg:w-1/2">
            <div className="relative mx-auto w-full max-w-lg">
                <RemotionPlayer />
            </div>
        </div>
    )
}
