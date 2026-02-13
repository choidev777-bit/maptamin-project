import { createClient } from '@/lib/supabase/server';
import { PlanV2 } from '@/lib/types';

export class PlaceManager {
    /**
     * Registers a new "My Place" with 30-day lock.
     */
    static async registerPlace(userId: string, placeId: string, placeName: string) {
        const supabase = await createClient();

        // 1. Get User Plan Limits
        const { data: subscription } = await supabase.from('user_subscriptions').select('plan_id').eq('user_id', userId).single();
        if (!subscription) throw new Error('구독 정보를 찾을 수 없습니다.');

        const { data: planData } = await supabase.from('plans').select('*').eq('id', subscription.plan_id).single();
        if (!planData) throw new Error('요금제 정보를 찾을 수 없습니다.');
        const plan = planData as PlanV2;

        // 2. Check Limit (Premium: unlimited via place_lock=false)
        if (plan.place_lock) {
            const { count, error } = await supabase
                .from('managed_places')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            if (error) throw new Error('가게 수 조회 실패');

            // starter & pro: 1곳 제한
            if ((count || 0) >= 1) {
                throw new Error(`${plan.name} 플랜은 가게 1곳까지 등록 가능합니다.`);
            }
        }

        // 3. Insert with Lock
        const lockedUntil = new Date();
        lockedUntil.setDate(lockedUntil.getDate() + 30); // 30 days from now

        const { error: insertError } = await supabase.from('managed_places').insert({
            user_id: userId,
            place_id: placeId,
            place_name: placeName,
            locked_until: plan.place_lock ? lockedUntil.toISOString() : null
        });

        if (insertError) throw new Error(insertError.message);
        return true;
    }

    /**
     * Registers a new "Competitor" with 30-day lock.
     */
    static async registerCompetitor(userId: string, placeId: string, placeName: string) {
        const supabase = await createClient();

        // 1. Get User Plan Limits
        const { data: subscription } = await supabase.from('user_subscriptions').select('plan_id').eq('user_id', userId).single();
        if (!subscription) throw new Error('구독 정보를 찾을 수 없습니다.');

        const { data: planData } = await supabase.from('plans').select('*').eq('id', subscription.plan_id).single();
        if (!planData) throw new Error('요금제 정보를 찾을 수 없습니다.');
        const plan = planData as PlanV2;

        // 2. Check Limit
        const { count, error } = await supabase
            .from('managed_competitors')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) throw new Error('경쟁사 수 조회 실패');

        if ((count || 0) >= plan.max_competitors) {
            throw new Error(`${plan.name} 플랜은 경쟁사 ${plan.max_competitors}곳까지 등록 가능합니다.`);
        }

        // 3. Insert with Lock
        const lockedUntil = new Date();
        lockedUntil.setDate(lockedUntil.getDate() + 30);

        const { error: insertError } = await supabase.from('managed_competitors').insert({
            user_id: userId,
            place_id: placeId,
            place_name: placeName,
            locked_until: lockedUntil.toISOString()
        });

        if (insertError) throw new Error(insertError.message);
        return true;
    }

    /**
     * Downgrade Guard: Check compliance before changing plan.
     */
    static async changePlan(userId: string, newPlanId: string) {
        const supabase = await createClient();

        // 1. Fetch New Plan
        const { data: newPlanData } = await supabase.from('plans').select('*').eq('id', newPlanId).single();
        if (!newPlanData) throw new Error('유효하지 않은 플랜입니다.');
        const newPlan = newPlanData as PlanV2;

        // 2. Check Competitors Count
        const { count: compCount } = await supabase
            .from('managed_competitors')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if ((compCount || 0) > newPlan.max_competitors) {
            throw new Error(`다운그레이드 불가: 경쟁사 ${compCount}개 등록 중이지만 ${newPlan.name} 플랜은 ${newPlan.max_competitors}개까지만 허용합니다.`);
        }

        // 3. Update Plan
        const { error } = await supabase
            .from('user_subscriptions')
            .update({ plan_id: newPlanId })
            .eq('user_id', userId);

        if (error) throw new Error(error.message);
        return true;
    }
}
