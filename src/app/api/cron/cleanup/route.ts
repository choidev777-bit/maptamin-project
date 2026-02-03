/**
 * Cron Cleanup API Route
 * 
 * GET: Clean up zombie jobs and trigger dispatcher
 * Scheduled via Vercel Cron (every 5 minutes)
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // If CRON_SECRET is set, validate it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!serviceKey) {
        console.error('[Cleanup] Missing service role key')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    try {
        // 1. Clean up zombie jobs (30 minute timeout)
        const { data: cleanedCount, error: cleanupError } = await supabase
            .rpc('cleanup_zombie_jobs', { timeout_minutes: 30 })

        if (cleanupError) {
            console.error('[Cleanup] Error cleaning zombies:', cleanupError)
        } else {
            console.log(`[Cleanup] Cleaned up ${cleanedCount} zombie jobs`)
        }

        // 2. Trigger dispatcher to fill available slots
        const dispatcherUrl = new URL('/api/queue/dispatch', request.url)

        try {
            const dispatchResponse = await fetch(dispatcherUrl.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            const dispatchResult = await dispatchResponse.json()
            console.log('[Cleanup] Dispatch result:', dispatchResult)

            return NextResponse.json({
                cleanedZombies: cleanedCount || 0,
                dispatched: dispatchResult.dispatched || 0,
                message: 'Cleanup completed'
            })
        } catch (dispatchError) {
            console.error('[Cleanup] Error calling dispatcher:', dispatchError)
            return NextResponse.json({
                cleanedZombies: cleanedCount || 0,
                dispatched: 0,
                error: 'Dispatcher call failed'
            })
        }

    } catch (error) {
        console.error('[Cleanup] Unexpected error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
