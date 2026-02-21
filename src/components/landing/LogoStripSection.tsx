import { SiNaver, SiKakaotalk, SiGooglemaps } from 'react-icons/si'
import { Map } from 'lucide-react'

const PLATFORMS = [
    { name: 'NAVER Place', icon: SiNaver },
    { name: 'NAVER Map', icon: Map },
    { name: 'Kakao Talk', icon: SiKakaotalk },
    { name: 'Google Maps', icon: SiGooglemaps },
]

export default function LogoStripSection() {
    return (
        <section className="border-y border-gray-100 bg-gray-50/80 py-8">
            <div className="mx-auto max-w-5xl px-4">
                <div className="mx-auto grid max-w-xs grid-cols-2 items-center gap-8 sm:max-w-none sm:gap-12 md:flex md:justify-center md:gap-16">
                    {PLATFORMS.map((platform) => {
                        const Icon = platform.icon
                        return (
                            <div
                                key={platform.name}
                                className="flex items-center gap-2 text-gray-400"
                            >
                                <Icon className="h-6 w-6" />
                                <span className="text-base font-medium tracking-wide">
                                    {platform.name}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
