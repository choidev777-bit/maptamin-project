import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// Dynamic imports for scraper functions to avoid load-time errors if they use browser APIs
// We will import them inside the main function or use require if needed, 
// but standard ES import is cleaner if the modules are isomorphic.
// Assuming scraper.ts is isomorphic or Node-safe.
import { scrapeNaverBatch } from '../src/lib/naver/scraper';

dotenv.config();

// Initialize Admin Client (Bypass RLS)
// This script runs in a secure environment (GitHub Actions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function refundCredits(userId: string, amount: number) {
    if (amount <= 0) return;

    try {
        // Fetch current credits
        const { data: credits, error: fetchError } = await supabase
            .from('user_credits')
            .select('subscription_balance')
            .eq('user_id', userId)
            .single();

        if (fetchError || !credits) throw fetchError || new Error('No credit record found');

        // Update with refund
        const { error: updateError } = await supabase
            .from('user_credits')
            .update({
                subscription_balance: credits.subscription_balance + amount,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        console.log(`[Worker] Refunded ${amount} credits to user ${userId}.`);
    } catch (err) {
        console.error(`[Worker] Refund Failed for user ${userId}:`, err);
    }
}

async function processSearch(search: any) {
    console.log(`[Worker] Processing Search ID: ${search.id} (Platform: ${search.platform})`);

    try {
        // 1. Update Status to 'processing'
        await supabase.from('searches').update({ status: 'processing' }).eq('id', search.id);

        // 2. Execute Scrape
        let results = [];
        if (search.platform === 'naver') {
            const keywords = Array.isArray(search.keywords) ? search.keywords : [search.keywords];
            const tasks = keywords.map((k: string, idx: number) => ({
                keyword: k,
                lat: search.place_lat,
                lng: search.place_lng,
                targetBusinessName: search.place_name,
                gridIndex: idx
            }));

            console.log(`[Worker] Starting Naver Scrape for ${search.place_name} (${tasks.length} keywords)...`);
            results = await scrapeNaverBatch(tasks);
        } else {
            console.log('[Worker] Google Search not fully supported in this script yet.');
            return;
        }

        // 3. Save Results
        if (results && results.length > 0) {
            const insertData = results.map((r: any) => ({
                search_id: search.id,
                keyword: r.keyword,
                rank: r.targetRank || null,
                grid_lat: r.lat,
                grid_lng: r.lng,
                place_name: search.place_name,
            }));

            if (insertData.length > 0) {
                const { error: insError } = await supabase.from('search_results').insert(insertData);
                if (insError) throw insError;
            }

            // Completed
            await supabase.from('searches').update({
                status: 'completed',
                completed_at: new Date().toISOString()
            }).eq('id', search.id);

            console.log(`[Worker] Search ${search.id} Completed.`);
        } else {
            throw new Error('No results returned from scraper');
        }

    } catch (error: any) {
        console.error(`[Worker] Search ${search.id} Failed:`, error);

        // Mark as failed
        await supabase.from('searches').update({
            status: 'failed',
            error_message: error.message || 'Unknown error'
        }).eq('id', search.id);

        // REFUND LOGIC
        // Calculate cost: keywords * grid_points (default 1 if missing)
        const kwCount = Array.isArray(search.keywords) ? search.keywords.length : 1;
        const gridCount = Array.isArray(search.grid_points) ? search.grid_points.length : (search.grid_points?.length || 1);
        // Note: Check if grid_points is stored as JSON array in DB.

        const refundAmount = kwCount * gridCount;
        if (refundAmount > 0) {
            await refundCredits(search.user_id, refundAmount);
        }
    }
}

async function processScheduleJob(job: any) {
    console.log(`[Worker] Processing Schedule ID: ${job.id}`);

    // 1. Create a new Search Record from the Schedule
    const { data: search, error } = await supabase.from('searches').insert({
        user_id: job.user_id,
        place_id: job.place_id,
        place_name: job.place_name,
        keywords: job.keywords,
        platform: job.platform,
        grid_points: job.grid_points,
        grid_distance: job.grid_distance,
        status: 'pending', // Will be picked up immediately
        cost: 0, // Automated searches might be free or cost credits
        created_at: new Date().toISOString()
    }).select().single();

    if (error) {
        console.error(`[Worker] Failed to create search for schedule ${job.id}:`, error);
        return;
    }

    // 2. Process it
    await processSearch(search);
}

async function main() {
    const mode = process.argv[2];
    const payload = process.argv[3];

    console.log(`[Worker] Starting in mode: ${mode}`);

    try {
        if (mode === 'SCHEDULE') {
            const { data: jobs, error } = await supabase
                .from('scheduled_searches')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;

            console.log(`[Worker] Found ${jobs?.length || 0} active schedules.`);
            for (const job of jobs || []) {
                await processScheduleJob(job);
            }
        } else if (mode === 'MANUAL') {
            const searchId = payload;
            const { data: search, error } = await supabase
                .from('searches')
                .select('*')
                .eq('id', searchId)
                .single();

            if (error) throw error;

            await processSearch(search);
        } else {
            console.error('Invalid Mode. Use MANUAL or SCHEDULE.');
            process.exit(1);
        }
    } catch (err) {
        console.error('[Worker] Fatal Error:', err);
        process.exit(1);
    }
}

main();
