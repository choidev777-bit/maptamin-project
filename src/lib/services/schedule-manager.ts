import { createClient } from '@/lib/supabase/server';
import { SearchService } from './search-service';
import { SearchSchedule } from '@/lib/types';
import { sendWeeklyReport } from '@/lib/kakao/messaging';

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

                // Convert stored grid_config (GridPoint[]) to the new format
                const gridPointsArray = job.grid_config as any[];
                const maxRow = Math.max(...gridPointsArray.map((p: any) => Math.abs(p.row)));
                const maxCol = Math.max(...gridPointsArray.map((p: any) => Math.abs(p.col)));
                const gridSize = Math.max(maxRow, maxCol) * 2 + 1;
                const gridDistance = (gridPointsArray[0] as any)?.distance || 1;

                await SearchService.executeSearch(
                    job.user_id,
                    job.place_id,
                    job.keywords,
                    { gridSize, gridDistance },
                    targetPlatform
                );

                // Update last run time
                await supabase
                    .from('search_schedules')
                    .update({ last_run_at: new Date().toISOString() })
                    .eq('id', job.id);

                console.log(`[ScheduleManager] Success: Job ${job.id}`);

                // ── 3. 알림 발송 처리 ──
                try {
                    const { data: notifSchedule } = await supabase
                        .from('notification_schedules')
                        .select('*')
                        .eq('search_schedule_id', job.id)
                        .single();

                    // searchId 조회 (가장 최근 완료된 검색)
                    const { data: latestSearch } = await supabase
                        .from('searches')
                        .select('id, place_name')
                        .eq('user_id', job.user_id)
                        .eq('status', 'completed')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (latestSearch) {
                        if (!notifSchedule || notifSchedule.is_immediate) {
                            // 즉시 발송
                            await sendWeeklyReport(job.user_id, latestSearch.place_name, latestSearch.id);

                            await supabase.from('notification_logs').insert({
                                user_id: job.user_id,
                                search_id: latestSearch.id,
                                type: 'weekly',
                                status: 'sent',
                                sent_via: 'solapi',
                                sent_at: new Date().toISOString(),
                            });
                            console.log(`[ScheduleManager] 알림톡 즉시 발송 완료: Job ${job.id}`);
                        } else {
                            // 예약 발송 큐에 등록
                            await supabase.from('notification_logs').insert({
                                user_id: job.user_id,
                                search_id: latestSearch.id,
                                type: 'weekly',
                                status: 'pending',
                                sent_via: 'solapi',
                            });
                            console.log(`[ScheduleManager] 알림톡 예약 등록: Job ${job.id}`);
                        }
                    }
                } catch (notifError: any) {
                    // 알림 발송 실패해도 검색 결과는 보존
                    console.error(`[ScheduleManager] 알림 발송 실패 (검색 결과는 보존됨): Job ${job.id}`, notifError.message);
                }

            } catch (e: any) {
                console.error(`[ScheduleManager] Failed: Job ${job.id}`, e.message);
                console.warn(`[NOTIFY USER ${job.user_id}] Auto-search failed: ${e.message}`);
            }
        }
    }
}
