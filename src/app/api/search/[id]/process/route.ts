import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchMapRankBatch, MapRankTask } from '@/lib/dataforseo/client'
import { GridPoint } from '@/lib/types'

// Premium 7×7 그리드(~50초) 처리를 위해 타임아웃 확장
export const maxDuration = 60

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: searchId } = await params
    const supabase = await createClient()

    // Verify user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search record
    const { data: search, error: searchError } = await supabase
        .from('searches')
        .select('*')
        .eq('id', searchId)
        .eq('user_id', user.id)
        .single()

    if (searchError || !search) {
        return NextResponse.json({ error: 'Search not found' }, { status: 404 })
    }

    // Check if already processed
    if (search.status === 'completed') {
        return NextResponse.json({ error: 'Search already completed' }, { status: 400 })
    }

    // Update status to processing
    await supabase
        .from('searches')
        .update({ status: 'processing' })
        .eq('id', searchId)

    try {
        const gridPoints: GridPoint[] = search.grid_points
        const keywords: string[] = search.keywords
        const targetPlaceId = search.place_id

        console.log('=== PROCESS ROUTE DEBUG ===')
        console.log('Search ID:', searchId)
        console.log('Target Place ID:', targetPlaceId)
        console.log('Keywords:', keywords)
        console.log('Grid Points count:', gridPoints.length)
        console.log('Grid Points sample:', JSON.stringify(gridPoints[0]))

        // Build tasks: for each keyword x enabled grid point
        const tasks: MapRankTask[] = []
        let gridIndex = 0

        for (const point of gridPoints) {
            if (point.enabled) {
                for (const keyword of keywords) {
                    tasks.push({
                        keyword,
                        lat: point.lat,
                        lng: point.lng,
                        gridIndex,
                        targetPlaceId,
                    })
                }
            }
            gridIndex++
        }

        console.log('Total tasks to process:', tasks.length)
        console.log('Sample task:', JSON.stringify(tasks[0]))

        // Execute batch processing
        console.log('Starting DataForSEO batch processing...')
        const results = await fetchMapRankBatch(tasks, 10)
        console.log('DataForSEO returned results:', results.length)

        // Save results to database
        const resultsToInsert = results.map((result) => ({
            search_id: searchId,
            keyword: result.keyword,
            grid_index: result.gridIndex,
            grid_lat: result.lat,
            grid_lng: result.lng,
            rank: result.rank,
            competitors: result.competitors,
        }))

        console.log('Inserting results to database...')
        const { error: insertError } = await supabase
            .from('search_results')
            .insert(resultsToInsert)

        if (insertError) {
            console.error('Database insert error:', insertError)
            throw new Error(`Failed to save results: ${insertError.message}`)
        }

        // Update search status to completed
        await supabase
            .from('searches')
            .update({ status: 'completed' })
            .eq('id', searchId)

        console.log('=== PROCESS COMPLETE ===')
        return NextResponse.json({
            success: true,
            resultsCount: results.length,
            searchId,
        })
    } catch (error) {
        console.error('=== PROCESS ERROR ===')
        console.error('Error details:', error)

        // Update status to failed
        await supabase
            .from('searches')
            .update({ status: 'failed' })
            .eq('id', searchId)

        // 실패 시 티켓 환불 (웰컴 리포트는 무료이므로 제외)
        if (search.report_type !== 'welcome') {
            try {
                await supabase.rpc('refund_ticket', { p_platform: 'google' })
                console.log(`[Process] Refunded google ticket for search ${searchId}`)
            } catch (refundErr) {
                console.error(`[Process] Ticket refund failed for search ${searchId}:`, refundErr)
            }
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('Error message:', errorMessage)
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
