import { createClient } from '@/lib/supabase/server';
import { sendWeeklyReport, sendDailyReport } from '@/lib/kakao/messaging';

/**
 * 예약된 알림 발송 서비스
 * CRON job에서 매 1시간 호출 — notification_schedules 확인 후 대기 중인 알림 발송
 */
export class NotificationService {
    /**
     * 예약 시간이 도래한 pending 알림을 발송합니다.
     * pseudocode.md의 dispatchPendingNotifications() 구현
     */
    static async dispatchPendingNotifications() {
        const supabase = await createClient();

        // KST 기준 현재 요일/시간
        const nowInKst = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
        );
        const currentDay = nowInKst.getDay(); // 0(일) ~ 6(토)
        const hours = nowInKst.getHours().toString().padStart(2, '0');
        const currentTime = `${hours}:00:00`;

        console.log(
            `[NotificationService] Checking notifications for KST Day ${currentDay} @ ${currentTime}`
        );

        // ── 1. 현재 시간에 발송해야 할 notification_schedules 조회 ──
        const { data: activeSchedules, error: scheduleError } = await supabase
            .from('notification_schedules')
            .select('user_id, search_schedule_id')
            .eq('is_immediate', false)
            .eq('notify_day', currentDay)
            .eq('notify_time', currentTime);

        if (scheduleError) {
            console.error(
                '[NotificationService] Schedule fetch error:',
                scheduleError
            );
            return;
        }

        if (!activeSchedules || activeSchedules.length === 0) {
            console.log(
                `[NotificationService] No notification schedules for Day ${currentDay} @ ${currentTime}`
            );
            return;
        }

        console.log(
            `[NotificationService] Found ${activeSchedules.length} notification schedules to process.`
        );

        // ── 2. 각 스케줄에 연결된 pending 알림 로그 조회 → 발송 ──
        for (const ns of activeSchedules) {
            const { data: pendingLogs, error: logError } = await supabase
                .from('notification_logs')
                .select('*')
                .eq('user_id', ns.user_id)
                .eq('status', 'pending')
                .in('type', ['weekly', 'daily']);

            if (logError) {
                console.error(
                    `[NotificationService] Log fetch error for user ${ns.user_id}:`,
                    logError
                );
                continue;
            }

            if (!pendingLogs || pendingLogs.length === 0) {
                continue;
            }

            for (const log of pendingLogs) {
                try {
                    // 해당 search의 place_name 조회
                    const { data: search } = await supabase
                        .from('searches')
                        .select('place_name, platform')
                        .eq('id', log.search_id)
                        .single();

                    if (!search) {
                        console.warn(
                            `[NotificationService] Search not found: ${log.search_id}`
                        );
                        continue;
                    }

                    // 알림톡 발송 (type에 따라 분기)
                    if (log.type === 'daily') {
                        await sendDailyReport(
                            log.user_id,
                            search.place_name,
                            log.search_id,
                            search.platform || 'naver',
                        );
                    } else {
                        await sendWeeklyReport(
                            log.user_id,
                            search.place_name,
                            log.search_id,
                            search.platform || 'naver',
                        );
                    }

                    // 발송 성공 → 상태 업데이트
                    await supabase
                        .from('notification_logs')
                        .update({
                            status: 'sent',
                            sent_at: new Date().toISOString(),
                        })
                        .eq('id', log.id);

                    console.log(
                        `[NotificationService] Sent notification for log ${log.id}`
                    );
                } catch (sendError: any) {
                    // 발송 실패 → 상태 업데이트
                    await supabase
                        .from('notification_logs')
                        .update({
                            status: 'failed',
                            error_message: sendError.message,
                        })
                        .eq('id', log.id);

                    console.error(
                        `[NotificationService] Failed log ${log.id}:`,
                        sendError.message
                    );
                }
            }
        }
    }
}
