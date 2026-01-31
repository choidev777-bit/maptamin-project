import { createClient } from '@/lib/supabase/server';
import { SearchService } from './search-service';
import { SearchSchedule } from '@/lib/types';

export class ScheduleManager {
    /**
     * Runs scheduled searches.
     * This function is intended to be called by a CRON job (e.g., Vercel Cron, Supabase PG_CRON)
     * periodically (e.g., every hour).
     */
    static async runScheduledSearches() {
        const supabase = await createClient();

        // Fix Timezone: Convert Server Time (UTC) to KST (UTC+9)
        // We need to find "What time is it in Seoul right now?"
        const nowInKst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));

        const currentDay = nowInKst.getDay(); // 0 (Sun) - 6 (Sat) in KST

        // Format KST time to HH:MM:00
        const hours = nowInKst.getHours().toString().padStart(2, '0');
        const timePrefix = `${hours}:00:00`;

        console.log(`[ScheduleManager] Checking schedules for KST Day ${currentDay} @ ${timePrefix}`);

        // 1. Fetch Active Schedules matching KST Day & Time
        const { data: schedules, error } = await supabase
            .from('search_schedules')
            .select('*')
            .eq('is_active', true)
            .eq('crawling_time', timePrefix)
            .contains('crawling_days', [currentDay]);

        if (error) {
            console.error('[ScheduleManager] Fetch error:', error);
            return;
        }

        if (!schedules || schedules.length === 0) {
            console.log(`[ScheduleManager] No schedules found for Day ${currentDay} @ ${timePrefix}`);
            return;
        }

        console.log(`[ScheduleManager] Found ${schedules.length} schedules to run.`);

        // 2. Execute Each Schedule
        for (const schedule of schedules) {
            const job = schedule as SearchSchedule;
            try {
                // Determine Platform from schedule (fallback to 'naver' if missing)
                const targetPlatform = job.platform || 'naver';

                await SearchService.executeSearch(
                    job.user_id,
                    job.place_id,
                    job.keywords,
                    job.grid_config,
                    targetPlatform
                );

                // Update last run time
                await supabase
                    .from('search_schedules')
                    .update({ last_run_at: new Date().toISOString() })
                    .eq('id', job.id);

                console.log(`[ScheduleManager] Success: Job ${job.id}`);

            } catch (e: any) {
                console.error(`[ScheduleManager] Failed: Job ${job.id}`, e.message);

                // 3. Notification (Mock Implementation)
                // In real world: EmailService.send(user.email, "Auto-search failed due to low balance")
                // For now, we just log it as a critical event.
                console.warn(`[NOTIFY USER ${job.user_id}] Auto-search failed: ${e.message}`);
            }
        }
    }
}
