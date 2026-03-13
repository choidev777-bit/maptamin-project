import { SolapiMessageService } from 'solapi';
import { createClient } from '@/lib/supabase/server';

// ── Solapi 클라이언트 초기화 ──
const messageService = new SolapiMessageService(
    process.env.SOLAPI_API_KEY!,
    process.env.SOLAPI_API_SECRET!
);

const SITE_URL = process.env.SITE_URL || 'https://www.maptamin.com';

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

// ── 리포트 URL 생성 (https:// 제거, 플랫폼별 경로) ──
function getReportUrl(searchId: string, platform: string): string {
    const baseUrl = SITE_URL.replace(/^https?:\/\//, '');
    const urlPath = platform === 'naver' ? 'naver-search' : 'search';
    return `${baseUrl}/${urlPath}/${searchId}`;
}

/**
 * 사용자 전화번호 조회
 */
async function getUserPhone(userId: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('user_subscriptions')
        .select('phone')
        .eq('user_id', userId)
        .single();

    if (error || !data?.phone) {
        throw new Error('전화번호 미등록 — 알림톡 발송 불가. 설정에서 전화번호를 등록하세요.');
    }

    return data.phone;
}

/**
 * 카카오 알림톡 발송 (솔라피 SDK)
 * @param phone - 수신자 전화번호 (01012345678)
 * @param templateId - 심사 승인된 템플릿 코드
 * @param variables - 템플릿 치환 변수
 */
async function sendAlimtalk(
    phone: string,
    templateId: string,
    variables: Record<string, string>
) {
    const result = await messageService.send({
        to: phone,
        from: process.env.SOLAPI_SENDER_NUMBER!,
        kakaoOptions: {
            pfId: process.env.SOLAPI_PFID!,
            templateId,
            variables,
        },
    });

    console.log('[Kakao] 알림톡 발송 성공:', JSON.stringify(result));
    return result;
}

/**
 * 웰컴 리포트 알림톡 발송
 * @param userId - 사용자 ID
 * @param placeName - 매장명
 * @param searchId - 검색 결과 ID
 * @param platform - 플랫폼 ('naver' | 'google')
 */
export async function sendWelcomeReport(
    userId: string,
    placeName: string,
    searchId: string,
    platform: string = 'naver',
): Promise<void> {
    const phone = await getUserPhone(userId);
    const templateId = process.env.KAKAO_TEMPLATE_WELCOME;

    if (!templateId) {
        throw new Error('KAKAO_TEMPLATE_WELCOME 환경 변수가 설정되지 않았습니다.');
    }

    const platformName = platform === 'naver' ? '네이버' : '구글';
    const analysisDate = formatKstDate(getKstNow());
    const reportUrl = getReportUrl(searchId, platform);

    await sendAlimtalk(phone, templateId, {
        '#{가게명}': placeName,
        '#{플랫폼명}': platformName,
        '#{분석일시}': analysisDate,
        '#{리포트URL}': reportUrl,
    });
}

/**
 * 주간 리포트 알림톡 발송
 * @param userId - 사용자 ID
 * @param placeName - 매장명
 * @param searchId - 검색 결과 ID
 * @param platform - 플랫폼 ('naver' | 'google')
 */
export async function sendWeeklyReport(
    userId: string,
    placeName: string,
    searchId: string,
    platform: string = 'naver',
): Promise<void> {
    const phone = await getUserPhone(userId);
    const templateId = process.env.KAKAO_TEMPLATE_WEEKLY;

    if (!templateId) {
        throw new Error('KAKAO_TEMPLATE_WEEKLY 환경 변수가 설정되지 않았습니다.');
    }

    const platformName = platform === 'naver' ? '네이버' : '구글';
    const analysisDate = formatKstDate(getKstNow());
    const reportPeriod = formatReportPeriod();
    const reportUrl = getReportUrl(searchId, platform);

    await sendAlimtalk(phone, templateId, {
        '#{가게명}': placeName,
        '#{플랫폼명}': platformName,
        '#{분석일시}': analysisDate,
        '#{리포트기간}': reportPeriod,
        '#{리포트URL}': reportUrl,
    });
}

/**
 * 일간 리포트 알림톡 발송
 * @param userId - 사용자 ID
 * @param placeName - 매장명
 * @param searchId - 검색 결과 ID
 * @param platform - 플랫폼 ('naver' | 'google')
 */
export async function sendDailyReport(
    userId: string,
    placeName: string,
    searchId: string,
    platform: string = 'naver',
): Promise<void> {
    const phone = await getUserPhone(userId);
    const templateId = process.env.KAKAO_TEMPLATE_DAILY;

    if (!templateId) {
        throw new Error('KAKAO_TEMPLATE_DAILY 환경 변수가 설정되지 않았습니다.');
    }

    const platformName = platform === 'naver' ? '네이버' : '구글';
    const analysisDate = formatKstDate(getKstNow());
    const reportUrl = getReportUrl(searchId, platform);

    await sendAlimtalk(phone, templateId, {
        '#{가게명}': placeName,
        '#{플랫폼명}': platformName,
        '#{분석일시}': analysisDate,
        '#{리포트URL}': reportUrl,
    });
}
