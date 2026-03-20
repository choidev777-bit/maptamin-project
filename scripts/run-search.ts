import 'dotenv/config'; // Must be first to ensure env vars are loaded before other imports
import { createClient } from '@supabase/supabase-js';
import { SolapiMessageService } from 'solapi';
import nodemailer from 'nodemailer';

import { scrapeNaverBatch } from '../src/lib/naver/scraper_ex2';
import { NaverScrapeTask } from '../src/lib/naver/types';
import { fetchMapRankBatch, MapRankTask } from '../src/lib/dataforseo/client';

// ── 재시도 상수 ──
const MAX_SEARCH_RETRIES = 3;

// Initialize Admin Client (Bypass RLS)
// This script runs in a secure environment (Oracle VM Worker)
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

// KST 기준 날짜 문자열 (YYYY-M-D) — 네이버 매일 중복 방지용
function getKstDateString(utcDateStr?: string): string {
    const d = utcDateStr
        ? new Date(new Date(utcDateStr).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
        : getKstNow();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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

    // 2. 템플릿 ID 결정 (3분기: daily → DAILY, weekly → WEEKLY, welcome → WELCOME)
    function getTemplateId(reportType: string): string | undefined {
        switch (reportType) {
            case 'daily': return process.env.KAKAO_TEMPLATE_DAILY;
            case 'weekly': return process.env.KAKAO_TEMPLATE_WEEKLY;
            case 'welcome': return process.env.KAKAO_TEMPLATE_WELCOME;
            case 'free_trial': return process.env.KAKAO_TEMPLATE_FREE_TRIAL;
            default: return undefined;
        }
    }
    const templateId = getTemplateId(search.report_type);

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

    if (search.report_type === 'weekly') {
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

async function refundTicket(userId: string, platform: 'naver' | 'google') {
    try {
        // service role 호출이므로 p_user_id를 명시적으로 전달
        const { error } = await supabase.rpc('refund_ticket', {
            p_platform: platform,
            p_user_id: userId,
        });
        if (error) throw error;
        console.log(`[Worker] Refunded 1 ${platform} ticket for user ${userId}.`);
    } catch (err) {
        console.error(`[Worker] Ticket refund failed for user ${userId}:`, err);
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

            console.log(`[Worker] Starting Naver Scrape for ${search.place_name} (${tasks.length} industry tasks)...`);

            // ── 지역명 키워드 태스크 추가 (좌표 없이, gridIndex = -1) ──
            const localKeywords: string[] = Array.isArray(search.local_keywords) ? search.local_keywords : [];
            if (localKeywords.length > 0) {
                for (const localKw of localKeywords) {
                    tasks.push({
                        keyword: localKw,
                        // lat, lng 생략 (undefined)
                        gridIndex: -1,
                        targetBusinessName,
                    });
                }
                console.log(`[Worker] Added ${localKeywords.length} local keyword tasks (total: ${tasks.length})`);
            }

            results = await scrapeNaverBatch(tasks, undefined, search.id, checkJobStatus);

        } else if (search.platform === 'google') {
            // Google: DataForSEO API 호출
            const keywords = Array.isArray(search.keywords) ? search.keywords : [search.keywords];
            const gridPoints = Array.isArray(search.grid_points) ? search.grid_points : [];
            const targetPlaceId = search.place_id;

            const tasks: MapRankTask[] = [];
            let gridIndex = 0;

            console.log(`[Worker] Generating Google tasks for ${gridPoints.length} grid points x ${keywords.length} keywords`);

            for (const point of gridPoints) {
                if (point.enabled === undefined || point.enabled === true) {
                    for (const keyword of keywords) {
                        tasks.push({
                            keyword,
                            lat: point.lat,
                            lng: point.lng,
                            gridIndex,
                            targetPlaceId,
                        });
                    }
                }
                gridIndex++;
            }

            console.log(`[Worker] Starting DataForSEO batch for ${search.place_name} (${tasks.length} tasks)...`);
            const googleResults = await fetchMapRankBatch(tasks, 10);
            console.log(`[Worker] DataForSEO returned ${googleResults.length} results`);

            // DataForSEO 결과를 search_results 스키마에 맞게 변환
            results = googleResults.map(r => ({
                keyword: r.keyword,
                gridIndex: r.gridIndex,
                lat: r.lat,
                lng: r.lng,
                rank: r.rank,
                competitors: r.competitors,
            }));
        } else {
            console.log(`[Worker] Unknown platform: ${search.platform}. Skipping.`);
            return;
        }

        // 3. Save Results (Check if alive to avoid FK Error)
        const isAlive = await checkJobStatus(search.id);

        if (isAlive && results && results.length > 0) {
            // ── 부분 실패 감지 (Naver only) ──
            if (search.platform === 'naver') {
                // 업종 키워드(gridIndex >= 0)만 부분 실패 감지 (지역명은 결과가 없을 수 있음)
                const industryResults = results.filter((r: any) => r.gridIndex >= 0);
                const failedTasks = industryResults.filter((r: any) => !r.results || r.results.length === 0);
                if (failedTasks.length > 0) {
                    throw new Error(
                        `Partial failure: ${failedTasks.length}/${industryResults.length} industry tasks have empty results`
                    );
                }
            }

            console.log(`[Worker] Saving ${results.length} results to database...`);

            // Map to 'search_results' table schema (platform별 매핑)
            const insertData = results.map((r: any) => {
                if (search.platform === 'google') {
                    // Google: DataForSEO 결과 (이미 올바른 형태)
                    return {
                        search_id: search.id,
                        keyword: r.keyword,
                        rank: r.rank,
                        grid_index: r.gridIndex,
                        grid_lat: r.lat,
                        grid_lng: r.lng,
                        competitors: r.competitors,
                    };
                } else {
                    // Naver: scrapeNaverBatch 결과
                    return {
                        search_id: search.id,
                        keyword: r.keyword,
                        rank: r.targetRank || null,
                        grid_index: r.gridIndex,
                        grid_lat: r.lat ?? null,
                        grid_lng: r.lng ?? null,
                        competitors: r.results.map((c: any) => ({
                            name: c.businessName,
                            rank: c.rank,
                            place_id: c.naverPlaceId || '',
                        }))
                    };
                }
            });

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

                    // 🔔 알림톡 발송 (daily/weekly/welcome)
                    if (search.report_type === 'daily' || search.report_type === 'weekly' || search.report_type === 'welcome' || search.report_type === 'free_trial') {
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

        const currentRetryCount = search.retry_count ?? 0;
        const isScheduled = search.report_type === 'daily' || search.report_type === 'weekly' || search.report_type === 'welcome' || search.report_type === 'free_trial';

        if (isScheduled && currentRetryCount < MAX_SEARCH_RETRIES) {
            // 정기리포트: retry_count 증가 후 즉시 재실행
            const nextRetry = currentRetryCount + 1;
            console.log(`[Worker] 🔄 Scheduled job retry ${nextRetry}/${MAX_SEARCH_RETRIES}`);

            await supabase.from('searches').update({
                status: 'pending',
                retry_count: nextRetry,
            }).eq('id', search.id);

            // 30초 대기 후 즉시 재실행 (dispatch/cron 의존하지 않음)
            const RETRY_DELAY_MS = 30_000;
            console.log(`[Worker] Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

            // search 객체에 retry_count 반영 후 재호출
            search.retry_count = nextRetry;
            search.status = 'pending';
            await processSearch(search);
        } else {
            // 실시간 진단 또는 재시도 한도 초과 → 최종 실패
            await supabase.from('searches').update({
                status: 'failed',
            }).eq('id', search.id);

            if (search.report_type === 'realtime') {
                const platform = search.platform || 'naver';
                await refundTicket(search.user_id, platform);
            } else if (search.report_type === 'free_trial') {
                // 무료체험 최종 실패 → free_trial_used 롤백 (재시도 가능하게)
                try {
                    await supabase.from('user_subscriptions')
                        .update({ free_trial_used: false })
                        .eq('user_id', search.user_id);
                    console.log(`[Worker] 🔄 free_trial_used 롤백 완료 (user: ${search.user_id})`);
                } catch (rollbackErr: any) {
                    console.error(`[Worker] ❌ free_trial_used 롤백 실패 (user: ${search.user_id}):`, rollbackErr.message);
                }
            } else if (isScheduled) {
                console.log(`[Worker] ❌ Search ${search.id} permanently failed after ${currentRetryCount} retries.`);
                // 🚨 관리자 이메일 알림
                await sendAdminAlert({
                    searchId: search.id,
                    placeName: search.place_name,
                    platform: search.platform,
                    retryCount: currentRetryCount,
                    errorMessage: error.message || 'Unknown error',
                });
            }
        }
    }
}

// ── 관리자 이메일 알림 (최종 실패 시) ──
async function sendAdminAlert(info: {
    searchId: string;
    placeName: string;
    platform: string;
    retryCount: number;
    errorMessage: string;
}) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!adminEmail || !gmailPassword) {
        console.log('[Admin Alert] 이메일 환경변수 미설정 — 알림 건너뜀');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: adminEmail, pass: gmailPassword },
        });

        const kstTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

        await transporter.sendMail({
            from: adminEmail,
            to: adminEmail,
            subject: `🚨 [Maptamin] 정기리포트 최종 실패: ${info.placeName}`,
            text: [
                `정기리포트가 ${info.retryCount + 1}회 시도 후 최종 실패했습니다.`,
                ``,
                `Search ID: ${info.searchId}`,
                `업체명: ${info.placeName}`,
                `플랫폼: ${info.platform}`,
                `재시도 횟수: ${info.retryCount}`,
                `에러: ${info.errorMessage}`,
                `발생 시각: ${kstTime}`,
                ``,
                `Supabase에서 해당 검색을 확인해주세요.`,
            ].join('\n'),
        });

        console.log(`[Admin Alert] ✅ 관리자 이메일 발송 완료`);
    } catch (emailError: any) {
        console.error(`[Admin Alert] ❌ 이메일 발송 실패:`, emailError.message);
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
        local_keywords: job.local_keywords || [],
        platform: job.platform || 'naver',
        grid_points: gridConfig,
        grid_distance: job.grid_distance || (gridConfig[0] as any)?.distance || 1,
        status: 'pending',
        report_type: (job.platform || 'naver') === 'google' ? 'weekly' : 'daily',
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

            // 2. 플랫폼별 분기: 네이버=매일(crawling_days), 구글=주 1회(crawling_day)
            const currentDateStr = getKstDateString();
            const currentWeek = getISOWeekKST();
            const jobs = (allSchedules || []).filter(s => {
                if ((s.platform || 'naver') === 'naver') {
                    // ── 네이버: crawling_days 배열 기반 매일 실행 ──
                    const days: number[] = s.crawling_days || [];
                    if (days.length === 0) return false;  // 활성화 안 됨
                    if (!days.includes(currentDay)) return false;  // 오늘 요일 미포함
                    // 오늘 KST 날짜에 이미 실행했으면 skip
                    if (s.last_run_at && getKstDateString(s.last_run_at) === currentDateStr) return false;
                } else {
                    // ── 구글: crawling_day 단수 기반 주 1회 ──
                    if (s.crawling_day === null || s.crawling_day === undefined) return false;  // 활성화 안 됨
                    if (s.crawling_day !== currentDay) return false;  // 요일 불일치
                    // 같은 ISO 주차면 skip
                    if (s.last_run_at && getISOWeekKST(s.last_run_at) === currentWeek) return false;
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

