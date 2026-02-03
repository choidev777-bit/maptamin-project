/**
 * Queue Dispatcher API Route
 * 
 * POST: Dispatch pending searches to GitHub Actions
 * Called when:
 * 1. New search is created
 * 2. A job completes (webhook)
 * 3. Cron cleanup runs
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize admin client (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
    // Validate service key exists (security check)
    if (!serviceKey) {
        console.error('[Dispatcher] Missing service role key')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // GitHub config
    const ghRepo = process.env.NEXT_PUBLIC_GITHUB_REPO
    const ghPat = process.env.GH_PAT

    if (!ghRepo || !ghPat) {
        console.error('[Dispatcher] Missing GitHub configuration')
        return NextResponse.json({ error: 'GitHub configuration missing' }, { status: 500 })
    }

    try {
        // 1. Call RPC to atomically get and mark jobs as processing
        const { data: jobs, error: rpcError } = await supabase
            .rpc('dispatch_pending_searches')

        if (rpcError) {
            console.error('[Dispatcher] RPC error:', rpcError)
            return NextResponse.json({ error: rpcError.message }, { status: 500 })
        }

        if (!jobs || jobs.length === 0) {
            console.log('[Dispatcher] No pending jobs to dispatch')
            return NextResponse.json({ dispatched: 0, message: 'No pending jobs' })
        }

        console.log(`[Dispatcher] Found ${jobs.length} jobs to dispatch`)

        // 2. Dispatch each job to GitHub Actions
        const [owner, repo] = ghRepo.split('/')
        const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/dispatches`

        let successCount = 0
        let failCount = 0

        for (const job of jobs) {
            try {
                console.log(`[Dispatcher] Dispatching job ${job.search_id}...`)

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
                            search_id: job.search_id
                        }
                    })
                })

                if (!response.ok) {
                    const errorText = await response.text()
                    console.error(`[Dispatcher] GitHub dispatch failed for ${job.search_id}: ${response.status} ${errorText}`)

                    // Rollback to pending on failure
                    await supabase.rpc('rollback_to_pending', { p_search_id: job.search_id })
                    failCount++
                } else {
                    console.log(`[Dispatcher] Job ${job.search_id} dispatched successfully`)
                    successCount++
                }
            } catch (jobError) {
                console.error(`[Dispatcher] Error dispatching job ${job.search_id}:`, jobError)

                // Rollback to pending on error
                await supabase.rpc('rollback_to_pending', { p_search_id: job.search_id })
                failCount++
            }
        }

        console.log(`[Dispatcher] Complete: ${successCount} success, ${failCount} failed`)

        return NextResponse.json({
            dispatched: successCount,
            failed: failCount,
            total: jobs.length
        })

    } catch (error) {
        console.error('[Dispatcher] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
