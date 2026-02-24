import 'dotenv/config'; // Must be first to ensure env vars are loaded before other imports
import { createClient } from '@supabase/supabase-js';
import { SolapiMessageService } from 'solapi';

import { scrapeNaverBatch } from '../src/lib/naver/scraper_ex2';
import { NaverScrapeTask } from '../src/lib/naver/types';

// Initialize Admin Client (Bypass RLS)
// This script runs in a secure environment (GitHub Actions)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase Environment Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// ── KST 시간 유틸 ──
function getKstNow(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

function formatKstDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}.${m}.${d} ${h}:${min}`;
}

function formatReportPeriod(): string {
    const now = getKstNow();
    const end = new Date(now);
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const fmt = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    return `${fmt(start)} ~ ${fmt(end)}`;
}

// KST 기준 ISO 주차 계산 (월~일 = 1주)
function getISOWeekKST(utcDateStr?: string): string {
    const d = utcDateStr
        ? new Date(new Date(utcDateStr).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
        : getKstNow();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
}

// ── 솔라피 알림톡 발송 ──
async function sendKakaoAlimtalk(search: {
    id: string; user_id: string; place_name: string;
    platform: string; report_type: string;
}): Promise<void> {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const senderNumber = process.env.SOLAPI_SENDER_NUMBER;
    const pfId = process.env.SOLAPI_PFID;
    const siteUrl = process.env.SITE_URL || 'https://www.maptamin.com';

    if (!apiKey || !apiSecret || !senderNumber || !pfId) {
        console.log('[AlimTalk] 솔라피 환경변수 미설정 — 알림톡 건너뜀');
        return;
    }

    // 1. 사용자 전화번호 조회
    const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('phone')
        .eq('user_id', search.user_id)
        .single();

    if (!sub?.phone) {
        console.log(`[AlimTalk] 전화번호 미등록 — user ${search.user_id}, 알림톡 건너뜀`);
        return;
    }

    // 2. 템플릿 ID 결정
    const isWeekly = search.report_type === 'weekly';
    const templateId = isWeekly
        ? process.env.KAKAO_TEMPLATE_WEEKLY
        : process.env.KAKAO_TEMPLATE_WELCOME;

    if (!templateId) {
        console.log(`[AlimTalk] 템플릿 ID 미설정 (${search.report_type}) — 건너뜀`);
        return;
    }

    // 3. 변수 매핑
    const platformName = search.platform === 'naver' ? '네이버' : '구글';
    const analysisDate = formatKstDate(getKstNow());
    const baseUrl = siteUrl.replace(/^https?:\/\//, '');
    const urlPath = search.platform === 'naver' ? 'naver-search' : 'search';
    const reportUrl = `${baseUrl}/${urlPath}/${search.id}`;

    const variables: Record<string, string> = {
        '#{가게명}': search.place_name,
        '#{플랫폼명}': platformName,
        '#{분석일시}': analysisDate,
        '#{리포트URL}': reportUrl,
    };

    if (isWeekly) {
        variables['#{리포트기간}'] = formatReportPeriod();
    }

    // 4. 발송
    try {
        const messageService = new SolapiMessageService(apiKey, apiSecret);
        await messageService.send({
            to: sub.phone,
            from: senderNumber,
            kakaoOptions: {
                pfId,
                templateId,
                variables,
            },
        });

        console.log(`[AlimTalk] ✅ 발송 성공: ${search.report_type} → ${sub.phone}`);

        // 5. notification_logs 기록
        await supabase.from('notification_logs').insert({
            user_id: search.user_id,
            search_id: search.id,
            type: search.report_type,
            status: 'sent',
            sent_via: 'solapi',
            sent_at: new Date().toISOString(),
        });
    } catch (sendError: any) {
        console.error(`[AlimTalk] ❌ 발송 실패:`, sendError.message || sendError);

        await supabase.from('notification_logs').insert({
            user_id: search.user_id,
            search_id: search.id,
            type: search.report_type,
            status: 'failed',
            sent_via: 'solapi',
            error_message: sendError.message || 'Unknown error',
        });
    }
}

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

// 🛡️ Zombie Killer Logic
// Checks if the job is still valid (exists and not cancelled)
async function checkJobStatus(searchId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('searches')
            .select('status')
            .eq('id', searchId)
            .maybeSingle();

        // 1. Row Missing (Physically Deleted)
        if (!data) {
            console.log(`[Zombie Killer] 💀 Job ${searchId} missing in DB. Killing...`);
            return false;
        }

        // 2. Status is 'cancelled' or 'failed' (Soft Deleted)
        if (data.status === 'cancelled' || data.status === 'failed') {
            console.log(`[Zombie Killer] 🛑 Job ${searchId} status is '${data.status}'. Stopping...`);
            return false;
        }

        return true; // Alive
    } catch (e) {
        console.warn(`[Zombie Killer] ⚠️ Network warning during status check. Assuming ALIVE.`);
        return true;
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
            const gridPoints = Array.isArray(search.grid_points) ? search.grid_points : [];
            const targetBusinessName = search.place_name;

            // Generate Tasks (Grid x Keywords)
            const tasks: NaverScrapeTask[] = [];
            let gridIndex = 0;

            console.log(`[Worker] Generating tasks for ${gridPoints.length} grid points x ${keywords.length} keywords`);

            // Iterate over grid points (assuming they are ordered)
            if (gridPoints.length > 0) {
                for (const point of gridPoints) {
                    // Only process enabled points
                    if (point.enabled === undefined || point.enabled === true) {
                        for (const keyword of keywords) {
                            tasks.push({
                                keyword,
                                lat: point.lat,
                                lng: point.lng,
                                gridIndex,
                                targetBusinessName,
                            });
                        }
                    }
                    gridIndex++;
                }
            } else {
                // Fallback for no grid points (legacy)
                for (const keyword of keywords) {
                    tasks.push({
                        keyword,
                        lat: search.place_lat,
                        lng: search.place_lng,
                        gridIndex: 0,
                        targetBusinessName,
                    });
                }
            }

            console.log(`[Worker] Starting Naver Scrape for ${search.place_name} (${tasks.length} tasks)...`);
            results = await scrapeNaverBatch(tasks, undefined, search.id, checkJobStatus);

        } else {
            console.log('[Worker] Google Search not fully supported in this script yet.');
            return;
        }

        // 3. Save Results (Check if alive to avoid FK Error)
        const isAlive = await checkJobStatus(search.id);

        if (isAlive && results && results.length > 0) {
            console.log(`[Worker] Saving ${results.length} results to database...`);

            // Map to 'search_results' table schema
            const insertData = results.map((r: any) => ({
                search_id: search.id,
                keyword: r.keyword,
                rank: r.targetRank || null,
                grid_index: r.gridIndex,    // Added: Required column
                grid_lat: r.lat,
                grid_lng: r.lng,
                competitors: r.results.map((c: any) => ({  // Added: JSONB column
                    name: c.businessName,
                    rank: c.rank,
                    place_id: c.naverPlaceId || '',
                }))
                // Removed: place_name (column does not exist)
            }));

            if (insertData.length > 0) {
                try {
                    const { error: insError } = await supabase.from('search_results').insert(insertData);
                    if (insError) throw insError;

                    // Completed
                    const updatePayload: any = {
                        status: 'completed'
                    };
                    await supabase.from('searches').update(updatePayload).eq('id', search.id);
                    console.log(`[Worker] Search ${search.id} Completed.`);

                    // 🔔 알림톡 발송 (weekly/welcome만)
                    if (search.report_type === 'weekly' || search.report_type === 'welcome') {
                        try {
                            await sendKakaoAlimtalk(search);
                        } catch (alimtalkError: any) {
                            console.error(`[Worker] 알림톡 발송 실패 (검색 결과는 보존됨):`, alimtalkError.message);
                        }
                    }

                } catch (saveError: any) {
                    if (saveError.message?.includes('foreign key') || saveError.code === '23503') {
                        console.log(`[Worker] ⚠️ Parent search ${search.id} was deleted during save. Ignoring.`);
                    } else {
                        throw saveError;
                    }
                }
            }

        } else if (!isAlive) {
            console.log(`[Worker] 🧟 Job ${search.id} was killed/cancelled. Skipping save.`);
        } else {
            throw new Error('No results returned from scraper');
        }

    } catch (error: any) {
        console.error(`[Worker] Search ${search.id} Failed:`, error);

        // Mark as failed
        await supabase.from('searches').update({
            status: 'failed',
            // error_message column doesn't exist in schema, so we skip saving it to DB
            // error_message: error.message || 'Unknown error' 
        }).eq('id', search.id);

        // REFUND LOGIC
        // Calculate cost: keywords * grid_points (default 1 if missing)
        const kwCount = Array.isArray(search.keywords) ? search.keywords.length : 1;

        let gridCount = 1;
        if (Array.isArray(search.grid_points)) {
            gridCount = search.grid_points.filter((p: any) => p.enabled !== false).length;
            if (gridCount === 0) gridCount = 1;
        }

        const refundAmount = kwCount * gridCount;
        if (refundAmount > 0) {
            await refundCredits(search.user_id, refundAmount);
        }
    }
}

async function processScheduleJob(job: any) {
    console.log(`[Worker] Processing Schedule ID: ${job.id} (${job.place_name})`);

    // 0. last_run_at 선행 업데이트 (중복 실행 방지)
    await supabase
        .from('search_schedules')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', job.id);

    // 1. managed_places에서 좌표/주소 조회
    const { data: place } = await supabase
        .from('managed_places')
        .select('lat, lng, address')
        .eq('user_id', job.user_id)
        .eq('platform', job.platform || 'naver')
        .maybeSingle();

    // 2. 검색 레코드 생성
    const gridConfig = Array.isArray(job.grid_config) ? job.grid_config : [];
    const { data: search, error } = await supabase.from('searches').insert({
        user_id: job.user_id,
        place_id: job.place_id,
        place_name: job.place_name || '',
        place_address: place?.address || '',
        place_lat: place?.lat || 0,
        place_lng: place?.lng || 0,
        keywords: job.keywords || [],
        platform: job.platform || 'naver',
        grid_points: gridConfig,
        grid_distance: job.grid_distance || (gridConfig[0] as any)?.distance || 1,
        status: 'pending',
        report_type: 'weekly',
        created_at: new Date().toISOString()
    }).select().single();

    if (error) {
        console.error(`[Worker] Failed to create search for schedule ${job.id}:`, error);
        return;
    }

    // 3. 크롤링 실행
    await processSearch(search);
}

async function main() {
    const mode = process.argv[2];
    const payload = process.argv[3];

    console.log(`[Worker] Starting in mode: ${mode}`);

    try {
        if (mode === 'SCHEDULE') {
            // KST 기준 현재 요일/시간
            const kstNow = getKstNow();
            const currentDay = kstNow.getDay(); // 0=Sun, 6=Sat
            const currentHour = kstNow.getHours();
            const timePrefix = `${String(currentHour).padStart(2, '0')}:00:00`;

            console.log(`[Worker] KST: Day=${currentDay}, Time=${timePrefix}`);

            // 1. 활성 스케줄 중 오늘 요일 + 현재 시간에 해당하는 것 조회
            const { data: allSchedules, error } = await supabase
                .from('search_schedules')
                .select('*')
                .eq('is_active', true)
                .eq('crawling_time', timePrefix);

            if (error) throw error;

            // 2. crawling_day (단수) 또는 crawling_days (배열) 매칭 + ISO 주차 중복 방지
            const currentWeek = getISOWeekKST();
            const jobs = (allSchedules || []).filter(s => {
                // 요일 매칭: crawling_day(주 컬럼) 우선, 없으면 crawling_days(레거시)
                const dayMatch = s.crawling_day !== null && s.crawling_day !== undefined
                    ? s.crawling_day === currentDay
                    : Array.isArray(s.crawling_days) && s.crawling_days.includes(currentDay);

                if (!dayMatch) return false;

                // 같은 ISO 주차면 skip (주 1회 제한)
                if (s.last_run_at) {
                    const lastRunWeek = getISOWeekKST(s.last_run_at);
                    if (lastRunWeek === currentWeek) return false;
                }

                return true;
            });

            console.log(`[Worker] Found ${jobs.length} schedules to run (of ${allSchedules?.length || 0} active at ${timePrefix}).`);

            for (const job of jobs) {
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

