import { NextRequest, NextResponse } from 'next/server'

/**
 * V-World 행정구역(읍면동) 경계 GeoJSON 프록시 API
 *
 * 요청: GET /api/boundary?lat=37.55&lng=126.97&zoom=14
 * 응답: GeoJSON FeatureCollection (properties.full_nm 포함)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const apiKey = process.env.VWORLD_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'VWORLD_API_KEY not configured' }, { status: 500 })
  }

  // 바운딩 박스: 직접 전달받거나, center 기반 ±0.05도로 계산
  let x1: number, y1: number, x2: number, y2: number

  if (searchParams.has('x1') && searchParams.has('y1') && searchParams.has('x2') && searchParams.has('y2')) {
    x1 = parseFloat(searchParams.get('x1')!)
    y1 = parseFloat(searchParams.get('y1')!)
    x2 = parseFloat(searchParams.get('x2')!)
    y2 = parseFloat(searchParams.get('y2')!)
  } else {
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat,lng or x1,y1,x2,y2 required' }, { status: 400 })
    }
    const offset = 0.05
    x1 = lng - offset
    y1 = lat - offset
    x2 = lng + offset
    y2 = lat + offset
  }

  const url = new URL('https://api.vworld.kr/req/data')
  url.searchParams.set('service', 'data')
  url.searchParams.set('request', 'GetFeature')
  url.searchParams.set('data', 'LT_C_ADEMD_INFO')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('domain', 'https://www.maptamin.com')
  url.searchParams.set('geomFilter', `BOX(${x1},${y1},${x2},${y2})`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('size', '1000')
  url.searchParams.set('crs', 'EPSG:4326')

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 86400 } }) // 24시간 캐시
    const data = await res.json()

    if (data.response?.status !== 'OK') {
      console.error('V-World API error:', data.response?.error)
      return NextResponse.json({ error: 'V-World API error', detail: data.response?.error }, { status: 502 })
    }

    const features = data.response?.result?.featureCollection?.features || []

    // 클라이언트에 필요한 최소 데이터만 전달: geometry + full_nm
    const simplified = features.map((f: { geometry: unknown; properties: { full_nm?: string; emd_kor_nm?: string } }) => ({
      geometry: f.geometry,
      full_nm: f.properties?.full_nm || f.properties?.emd_kor_nm || '',
    }))

    return NextResponse.json(
      { features: simplified },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      }
    )
  } catch (err) {
    console.error('V-World fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch boundary data' }, { status: 500 })
  }
}
