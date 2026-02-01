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

async function processSearch(search: any) {
    console.log(`[Worker] Processing Search ID: ${search.id} (Platform: ${search.platform})`);

    try {
        // 1. Update Status to 'processing' (if not already)
        await supabase.from('searches').update({ status: 'processing' }).eq('id', search.id);

        // 2. Execute Scrape
        let results = [];
        if (search.platform === 'naver') {
            // scrapeNaverBatch expects: tasks[], onProgress?, searchId?, checkJobExists?
            // Handling multiple keywords if 'keywords' is array
            // If the search record has multiple keywords, we should create multiple tasks?
            // The Result Table expects 'keyword'.
            // For now, let's assume search.keywords is array of strings.
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
            // Save to search_results table
            const insertData = results.map((r: any) => ({
                search_id: search.id,
                keyword: r.keyword,
                rank: r.targetRank || null, // V5 returns targetRank if matched
                grid_lat: r.lat,
                grid_lng: r.lng,
                place_name: search.place_name,
                // Note: V5 returns specific 'results' array (top 50). 
                // If we want to store the full rank list, we need a separate logic or column.
                // Current DB schema 'search_results' likely stores ONE row per Grid Point/Keyword?
                // Let's assume standard behavior: Store the Target Rank found.
            }));

            if (insertData.length > 0) {
                const { error: insError } = await supabase.from('search_results').insert(insertData);
                if (insError) throw insError;
            }

            // Update Search Status to Verified/Completed
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
        await supabase.from('searches').update({
            status: 'failed',
            error_message: error.message
        }).eq('id', search.id);

        // Potential Refund Logic here (Issue D-8) would go here
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
