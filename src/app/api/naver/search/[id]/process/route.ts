/**
 * Naver Search Process API Route
 * 
 * POST: Playwright 스크래핑 실행 및 결과 저장
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { scrapeNaverBatch, NaverScrapeTask } from '@/lib/naver'
import { GridPoint } from '@/lib/types'

export async function POST(
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
        .eq('platform', 'naver')  // 네이버 플랫폼만
        .single()

    if (searchError || !search) {
        return NextResponse.json({ error: 'Search not found' }, { status: 404 })
    }

    // 이미 완료된 검색 체크
    if (search.status === 'completed') {
        return NextResponse.json({ error: 'Search already completed' }, { status: 400 })
    }

    // 상태를 processing으로 업데이트
    await supabase
        .from('searches')
        .update({ status: 'processing' })
        .eq('id', searchId)

    try {
        const gridPoints: GridPoint[] = search.grid_points
        const keywords: string[] = search.keywords
        const targetBusinessName = search.place_name  // 타겟 비즈니스명

        console.log('=== NAVER PROCESS ROUTE DEBUG ===')
        console.log('Search ID:', searchId)
        console.log('Target Business:', targetBusinessName)
        console.log('Keywords:', keywords)
        console.log('Grid Points count:', gridPoints.length)

        // 태스크 구성: keyword × enabled grid point
        const tasks: NaverScrapeTask[] = []
        let gridIndex = 0

        for (const point of gridPoints) {
            if (point.enabled) {
                for (const keyword of keywords) {
                    tasks.push({
                        keyword,
                        lat: point.lat,
                        lng: point.lng,
                        gridIndex,
                        targetBusinessName,
                    })
                }
            }
            gridIndex++
        }

        console.log('Total tasks to process:', tasks.length)

        // Playwright 스크래핑 실행
        console.log('Starting Naver scraping...')
        const results = await scrapeNaverBatch(tasks)
        console.log('Scraping returned results:', results.length)

        // 결과를 DB에 저장
        const resultsToInsert = results.map((result) => ({
            search_id: searchId,
            keyword: result.keyword,
            grid_index: result.gridIndex,
            grid_lat: result.lat,
            grid_lng: result.lng,
            rank: result.targetRank,
            competitors: result.results.map((r, idx) => ({
                name: r.businessName,
                rank: r.rank,
                place_id: r.naverPlaceId || '',
            })),
        }))

        console.log('Inserting results to database...')
        const { error: insertError } = await supabase
            .from('search_results')
            .insert(resultsToInsert)

        if (insertError) {
            console.error('Database insert error:', insertError)
            throw new Error(`Failed to save results: ${insertError.message}`)
        }

        // 상태를 completed로 업데이트
        await supabase
            .from('searches')
            .update({ status: 'completed' })
            .eq('id', searchId)

        console.log('=== NAVER PROCESS COMPLETE ===')
        return NextResponse.json({
            success: true,
            resultsCount: results.length,
            searchId,
        })

    } catch (error) {
        console.error('=== NAVER PROCESS ERROR ===')
        console.error('Error details:', error)

        // 상태를 failed로 업데이트
        await supabase
            .from('searches')
            .update({ status: 'failed' })
            .eq('id', searchId)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error message:', errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
