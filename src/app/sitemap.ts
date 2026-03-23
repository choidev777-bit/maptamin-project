import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://www.maptamin.com'

    return [
        {
            url: baseUrl,
            lastModified: new Date('2026-03-24'),
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/pricing`,
            lastModified: new Date('2026-03-24'),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/faq`,
            lastModified: new Date('2026-03-24'),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date('2026-02-26'),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/privacy`,
            lastModified: new Date('2026-02-26'),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ]
}
