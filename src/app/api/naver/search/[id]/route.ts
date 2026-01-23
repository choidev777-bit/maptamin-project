/**
 * Naver Search Detail API Route
 * 
 * GET: 특정 검색의 상태 및 결과 조회
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: searchId } = await params
    const supabase = await createClient()

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 검색 레코드 조회
    const { data: search, error: searchError } = await supabase
        .from('searches')
        .select('*')
        .eq('id', searchId)
        .eq('user_id', user.id)
        .single()

    if (searchError || !search) {
        return NextResponse.json({ error: 'Search not found' }, { status: 404 })
    }

    // 결과 조회 (completed 상태인 경우만)
    let results = null
    if (search.status === 'completed') {
        const { data: searchResults } = await supabase
            .from('search_results')
            .select('*')
            .eq('search_id', searchId)
            .order('keyword', { ascending: true })
            .order('grid_index', { ascending: true })

        results = searchResults
    }

    // 진행률 계산
    const gridPoints = search.grid_points || []
    const keywords = search.keywords || []
    const enabledPoints = gridPoints.filter((p: { enabled: boolean }) => p.enabled).length
    const totalTasks = enabledPoints * keywords.length
    const completedTasks = results ? results.length : 0

    return NextResponse.json({
        search: {
            id: search.id,
            placeName: search.place_name,
            placeAddress: search.place_address,
            placeLat: search.place_lat,
            placeLng: search.place_lng,
            keywords: search.keywords,
            gridPoints: search.grid_points,
            gridDistance: search.grid_distance,
            distanceUnit: search.distance_unit,
            status: search.status,
            platform: search.platform || 'google',
            createdAt: search.created_at,
        },
        results,
        progress: {
            total: totalTasks,
            completed: completedTasks,
            percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
    })
}
