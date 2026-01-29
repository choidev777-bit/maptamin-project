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

        const now = new Date();
        const currentDay = now.getDay(); // 0 (Sun) - 6 (Sat)

        // Format current time to HH:MM:00 for simple matching
        const hours = now.getHours().toString().padStart(2, '0');
        // We assume the cron runs hourly, so we check for schedules set to this hour.
        // If we support minute-level, we'd need precise matching logic. 
        // Here we assume "XX:00:00" format in DB time column.
        const timePrefix = `${hours}:00:00`;

        // 1. Fetch Active Schedules matching Day & Time
        // Note: 'crawling_days' is an integer array. using 'cs' operator for "contains" in Supabase URL params,
        // but in JS client we use .contains().
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
                await SearchService.executeSearch(
                    job.user_id,
                    job.place_id,
                    job.keywords,
                    job.grid_config,
                    'naver' // Defaulting to naver as per context, or add platform to schedule schema
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
