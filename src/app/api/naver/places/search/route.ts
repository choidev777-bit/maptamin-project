import { NextResponse } from 'next/server'
import { convertKatechToWgs84 } from '@/lib/naver/katech-converter'

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET

export async function GET(request: Request) {
    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
        console.error('Naver API keys not configured')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')

    if (!query) {
        return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 })
    }

    try {
        const response = await fetch(`https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`, {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
            },
        })

        if (!response.ok) {
            console.error('Naver API error:', response.status, await response.text())
            return NextResponse.json({ error: 'Failed to fetch from Naver API' }, { status: response.status })
        }

        const data = await response.json()

        // Transform results: HTML tags removal & coordinate conversion
        const items = data.items.map((item: any) => {
            const { lat, lng } = convertKatechToWgs84(item.mapx, item.mapy)
            return {
                title: item.title.replace(/<[^>]*>?/gm, ''), // Remove HTML tags
                address: item.roadAddress || item.address,
                category: item.category,
                lat,
                lng,
            }
        })

        return NextResponse.json({ items })

    } catch (error) {
        console.error('Error in Naver Places Search Proxy:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
