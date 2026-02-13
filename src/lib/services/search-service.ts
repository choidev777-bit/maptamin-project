import { createClient } from '@/lib/supabase/server';
import { CostCalculator } from '@/lib/pricing/cost-calculator';
import { PlanV2 } from '@/lib/types';

interface ScraperResult {
    success: boolean;
    data?: any;
    error?: any;
}

export class SearchService {
    /**
     * 실시간 진단 검색 실행 (티켓 기반)
     * @see Docs/pseudocode.md — 1. 실시간 진단 티켓 사용 로직
     */
    static async executeSearch(
        userId: string,
        placeId: string,
        keywords: string[],
        gridConfig: { gridSize: number; gridDistance: number },
        platform: 'naver' | 'google' = 'naver'
    ): Promise<ScraperResult> {
        const supabase = await createClient();

        // ── 0. 사용자 구독 정보 조회 ──
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select('plan_id, remaining_tickets_naver, remaining_tickets_google')
            .eq('user_id', userId)
            .single();

        if (subError || !subscription) {
            throw new Error('구독 정보를 찾을 수 없습니다.');
        }

        // ── 1. 플랜 정보 조회 ──
        const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('*')
            .eq('id', subscription.plan_id)
            .single();

        if (planError || !plan) {
            throw new Error('요금제 정보를 찾을 수 없습니다.');
        }

        const userPlan = plan as PlanV2;

        // ── 2. 채널 접근 권한 검증 ──
        CostCalculator.validateChannel(platform, userPlan.channels);

        // ── 3. 티켓 잔량 확인 ──
        const remainingTickets = platform === 'naver'
            ? subscription.remaining_tickets_naver
            : subscription.remaining_tickets_google;

        if (!CostCalculator.canUseTicket(remainingTickets)) {
            throw new Error('이번 달 실시간 진단 티켓이 모두 소진되었습니다.');
        }

        // ── 4. 그리드 크기 검증 ──
        CostCalculator.validateGridSize(gridConfig.gridSize, userPlan.max_grid_size);

        // ── 5. 키워드 수 검증 ──
        const maxKeywords = platform === 'naver'
            ? userPlan.max_keywords_naver
            : userPlan.max_keywords_google;
        CostCalculator.validateKeywordCount(keywords.length, maxKeywords);

        // ── 6. 티켓 차감 (Supabase RPC — 원자적) ──
        const { error: deductError } = await supabase.rpc('deduct_ticket', {
            p_platform: platform,
        });

        if (deductError) {
            throw new Error('티켓 차감 실패: ' + deductError.message);
        }

        // ── 7. 스크래퍼 실행 ──
        try {
            // TODO: Replace with actual Scraper call
            console.log(`[SearchService] Scraping ${placeId} with ${keywords.length} keywords on ${platform}...`);

            // Simulating success for now. Replace with actual logic.
            return { success: true, data: { status: 'completed' } };

        } catch (e: any) {
            console.error('Scraper Execution Failed:', e);

            // ── 8. 실패 시 티켓 환불 (Supabase RPC) ──
            const { error: refundError } = await supabase.rpc('refund_ticket', {
                p_platform: platform,
                p_search_id: null,
            });

            if (refundError) {
                console.error('⚠️ CRITICAL: 티켓 환불 실패 — 관리자 알림 필요', refundError);
            }

            throw new Error(`검색 실패: ${e.message || '알 수 없는 오류'}. 티켓이 환불되었습니다.`);
        }
    }
}
