/**
 * Naver Search Process API Route
 * 
 * POST: GitHub Actions 워크플로우를 트리거하여 스크래핑 위임
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: searchId } = await params
    const supabase = await createClient()

    // 1. 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 검색 레코드 조회
    const { data: search, error: searchError } = await supabase
        .from('searches')
        .select('*')
        .eq('id', searchId)
        .eq('user_id', user.id)
        .eq('platform', 'naver')
        .single()

    if (searchError || !search) {
        return NextResponse.json({ error: 'Search not found' }, { status: 404 })
    }

    // 3. 중복 실행 방지 (이미 완료되었거나 처리 중인 경우)
    if (search.status === 'completed' || search.status === 'processing') {
        return NextResponse.json({ error: 'Search already completed or processing' }, { status: 400 })
    }

    // 4. GitHub Actions 트리거 설정을 위한 환경 변수 확인
    const ghRepo = process.env.NEXT_PUBLIC_GITHUB_REPO
    const ghPat = process.env.GH_PAT

    if (!ghRepo || !ghPat) {
        console.error('[API] Missing GitHub Config for Naver Search')
        return NextResponse.json({
            error: 'Server configuration error: GitHub secrets missing'
        }, { status: 500 })
    }

    try {
        // 5. 상태를 processing으로 업데이트
        await supabase
            .from('searches')
            .update({ status: 'processing' })
            .eq('id', searchId)

        // 6. GitHub Dispatch 실행
        const [owner, repo] = ghRepo.split('/')
        const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/dispatches`

        console.log(`[API] Dispatching manual_search to ${owner}/${repo} for SearchID: ${searchId}`)

        const response = await fetch(dispatchUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ghPat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_type: 'manual_search',
                client_payload: {
                    search_id: searchId
                }
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[API] GitHub Dispatch Failed: ${response.status} ${errorText}`)

            // 실패 시 상태를 failed로 변경
            await supabase
                .from('searches')
                .update({
                    status: 'failed',
                    // user_credits 환불 로직은 별도 처리하거나 수동 조치 필요하지만
                    // 여기서는 일단 상태만 업데이트함
                })
                .eq('id', searchId)

            throw new Error(`GitHub Dispatch failed: ${response.status}`)
        }

        console.log('[API] Naver Search dispatched successfully')

        return NextResponse.json({
            success: true,
            message: 'Search queued successfully',
            searchId,
        })

    } catch (error) {
        console.error('=== NAVER PROCESS ERROR ===')
        console.error('Error details:', error)

        // 상태를 failed로 업데이트 (이미 위에서 일부 처리했으나 안전장치)
        await supabase
            .from('searches')
            .update({ status: 'failed' })
            .eq('id', searchId)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}
