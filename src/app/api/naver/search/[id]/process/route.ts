/**
 * Naver Search Process API Route
 * 
 * POST: Oracle VM Worker를 트리거하여 스크래핑 위임
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

    // 4. VM Worker 설정 확인
    const vmWorkerUrl = process.env.VM_WORKER_URL
    const vmWorkerSecret = process.env.VM_WORKER_SECRET

    if (!vmWorkerUrl || !vmWorkerSecret) {
        console.error('[API] Missing VM Worker Config for Naver Search')
        return NextResponse.json({
            error: 'Server configuration error: VM Worker config missing'
        }, { status: 500 })
    }

    try {
        // 5. 상태를 processing으로 업데이트
        await supabase
            .from('searches')
            .update({ status: 'processing' })
            .eq('id', searchId)

        // 6. VM Worker에 크롤링 요청
        console.log(`[API] Dispatching to VM Worker for SearchID: ${searchId}`)

        const response = await fetch(`${vmWorkerUrl}/run`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vmWorkerSecret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                search_id: searchId
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[API] VM Worker Dispatch Failed: ${response.status} ${errorText}`)

            // 실패 시 상태를 failed로 변경
            await supabase
                .from('searches')
                .update({ status: 'failed' })
                .eq('id', searchId)

            throw new Error(`VM Worker dispatch failed: ${response.status}`)
        }

        console.log('[API] Naver Search dispatched to VM Worker successfully')

        return NextResponse.json({
            success: true,
            message: 'Search queued successfully',
            searchId,
        })

    } catch (error) {
        console.error('=== NAVER PROCESS ERROR ===')
        console.error('Error details:', error)

        // 상태를 failed로 업데이트 (안전장치)
        await supabase
            .from('searches')
            .update({ status: 'failed' })
            .eq('id', searchId)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
}

