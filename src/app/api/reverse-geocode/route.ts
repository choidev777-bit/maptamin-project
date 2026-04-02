import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/reverse-geocode?lat={lat}&lng={lng}
 *
 * 네이버 클라우드 플랫폼 Reverse Geocoding API를 통해
 * 주어진 좌표의 행정동 이름(예: "마포구 망원1동")을 반환합니다.
 *
 * 응답:
 *   성공: { district: "마포구 망원1동" }
 *   실패: { district: null }
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')

    // 파라미터 검증
    if (!lat || !lng) {
        return NextResponse.json({ district: null }, { status: 400 })
    }

    const latNum = parseFloat(lat)
    const lngNum = parseFloat(lng)

    if (isNaN(latNum) || isNaN(lngNum)) {
        return NextResponse.json({ district: null }, { status: 400 })
    }

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID
    const clientSecret = process.env.NCP_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.error('[reverse-geocode] NCP API 키가 설정되지 않았습니다.')
        return NextResponse.json({ district: null }, { status: 500 })
    }

    try {
        // NCP Reverse Geocoding API: coords는 "lng,lat" 순서
        const url = `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lngNum},${latNum}&orders=admcode&output=json`

        const res = await fetch(url, {
            headers: {
                'X-NCP-APIGW-API-KEY-ID': clientId,
                'X-NCP-APIGW-API-KEY': clientSecret,
            },
            // 역지오코딩은 빠른 응답이 중요하므로 캐시 없이 호출
            cache: 'no-store',
        })

        if (!res.ok) {
            const errText = await res.text()
            console.error(`[reverse-geocode] API 오류: ${res.status} ${res.statusText} - ${errText}`)
            return NextResponse.json({ district: null })
        }

        const rawText = await res.text()

        if (!rawText) {
            console.error('[reverse-geocode] 빈 응답')
            return NextResponse.json({ district: null })
        }

        const data = JSON.parse(rawText)

        // 응답 구조: data.results[0].region.area2.name (구) + area3.name (행정동)
        const region = data?.results?.[0]?.region
        const area2 = region?.area2?.name ?? '' // 구 (예: 마포구)
        const area3 = region?.area3?.name ?? '' // 행정동 (예: 망원1동)

        if (!area2 && !area3) {
            return NextResponse.json({ district: null })
        }

        const district = [area2, area3].filter(Boolean).join(' ')
        return NextResponse.json({ district })

    } catch (error) {
        console.error('[reverse-geocode] 예외 발생:', error)
        return NextResponse.json({ district: null })
    }
}
