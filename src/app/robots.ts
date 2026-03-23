import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/dashboard/',
                    '/naver-search/',
                    '/search/',
                    '/settings/',
                    '/history/',
                    '/onboarding/',
                    '/report-settings/',
                    '/api/',
                    '/auth/',
                    '/login',
                ],
            },
        ],
        sitemap: 'https://www.maptamin.com/sitemap.xml',
    }
}
