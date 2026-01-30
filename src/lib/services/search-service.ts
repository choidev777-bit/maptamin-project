import { createClient } from '@/lib/supabase/server';
import { CostCalculator } from '@/lib/pricing/cost-calculator';
import { GridPoint, Plan } from '@/lib/types';

// Define Scraper Interface (Placeholder or Import logic)
// Assuming we have a Scraper class or function. For now, using a placeholder logic.
// In real implementation, this would import the actual scraper service.
interface ScraperResult {
    success: boolean;
    data?: any;
    error?: any;
}

export class SearchService {
    /**
     * Executes a search with strict gating and point deduction.
     */
    static async executeSearch(
        userId: string,
        placeId: string,
        keywords: string[],
        gridPoints: GridPoint[],
        platform: 'naver' | 'google' = 'naver'
    ): Promise<ScraperResult> {
        const supabase = await createClient();

        // 0. Fetch User Plan & Validation
        const { data: userCredits, error: creditError } = await supabase
            .from('user_credits')
            .select('plan_id')
            .eq('user_id', userId)
            .single();

        if (creditError || !userCredits) {
            throw new Error('User credits not found');
        }

        const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('*')
            .eq('id', userCredits.plan_id)
            .single();

        if (planError || !plan) {
            throw new Error('User plan not found');
        }

        const userPlan = plan as Plan;

        // 1. Map Size Gating
        const currentGridSize = Math.sqrt(gridPoints.length);
        // Tolerance for floating point or irregular grids? 
        // Assuming standard square grids: 3x3=9, 5x5=25, 7x7=49
        // If user sends 9 points, size is 3. 
        // If plan max is 3, 3 <= 3 OK. 
        // If user sends 25 points (5x5), size is 5. If plan max 3, 5 > 3 ERROR.
        if (currentGridSize > userPlan.max_grid_size) {
            throw new Error(`Current plan (${userPlan.name}) supports up to ${userPlan.max_grid_size}x${userPlan.max_grid_size} grids.`);
        }

        // 2. Place/Competitor Gating
        // Check if place is Managed Place OR Managed Competitor
        const { data: isMyPlace } = await supabase
            .from('managed_places')
            .select('id')
            .eq('user_id', userId)
            .eq('place_id', placeId)
            .single();

        const { data: isCompetitor } = await supabase
            .from('managed_competitors')
            .select('id')
            .eq('user_id', userId)
            .eq('place_id', placeId)
            .single();

        if (!isMyPlace && !isCompetitor) {
            throw new Error('Only registered places or competitors can be searched.');
        }

        // 3. Calculate Cost
        const cost = CostCalculator.calculate(keywords, gridPoints);

        // 4. Atomic Deduct Points
        const { error: deductError } = await supabase.rpc('deduct_points', { p_cost: cost });
        if (deductError) {
            throw new Error(`Insufficient points. Required: ${cost}`);
        }

        // 5. Execute Scraper
        try {
            // TODO: Replace with actual Scraper call
            // const result = await Scraper.run(placeId, keywords, gridPoints, platform);

            // Mocking Scraper Execution for Phase 2 Logic verification
            console.log(`[SearchService] Scraping ${placeId} with ${keywords.length} keywords...`);

            // Simulating success for now. Replace with actual logic.
            return { success: true, data: { status: 'completed' } };

        } catch (e: any) {
            console.error('Scraper Execution Failed:', e);

            // 6. Fail-Safe: Refund Points
            const { error: refundError } = await supabase.rpc('refund_points', { p_amount: cost });
            if (refundError) {
                console.error('CRITICAL: Refund failed after scraper error', refundError);
                // In production, this should trigger an urgent alert to admin
            }

            throw new Error(`Search failed: ${e.message || 'Unknown error'}. Points have been refunded.`);
        }
    }
}
