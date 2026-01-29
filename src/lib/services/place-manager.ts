import { createClient } from '@/lib/supabase/server';
import { Plan } from '@/lib/types';

export class PlaceManager {
    /**
     * Registers a new "My Place" with 30-day lock.
     */
    static async registerPlace(userId: string, placeId: string, placeName: string) {
        const supabase = createClient();

        // 1. Get User Plan Limits
        const { data: userCredits } = await supabase.from('user_credits').select('plan_id').eq('user_id', userId).single();
        if (!userCredits) throw new Error('User credits not found');

        const { data: planData } = await supabase.from('plans').select('*').eq('id', userCredits.plan_id).single();
        if (!planData) throw new Error('Plan not found');
        const plan = planData as Plan;

        // 2. Check Limit
        const { count, error } = await supabase
            .from('managed_places')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) throw new Error('Failed to fetch places count');

        if ((count || 0) >= plan.limits.places) {
            throw new Error(`Place registration limit reached for ${plan.name} (${plan.limits.places} places max).`);
        }

        // 3. Insert with Lock
        const lockedUntil = new Date();
        lockedUntil.setDate(lockedUntil.getDate() + 30); // 30 days from now

        const { error: insertError } = await supabase.from('managed_places').insert({
            user_id: userId,
            place_id: placeId,
            place_name: placeName,
            locked_until: lockedUntil.toISOString()
        });

        if (insertError) throw new Error(insertError.message);
        return true;
    }

    /**
     * Registers a new "Competitor" with 30-day lock.
     */
    static async registerCompetitor(userId: string, placeId: string, placeName: string) {
        const supabase = createClient();

        // 1. Get User Plan Limits
        const { data: userCredits } = await supabase.from('user_credits').select('plan_id').eq('user_id', userId).single();
        if (!userCredits) throw new Error('User credits not found');

        const { data: planData } = await supabase.from('plans').select('*').eq('id', userCredits.plan_id).single();
        if (!planData) throw new Error('Plan not found');
        const plan = planData as Plan;

        // 2. Check Limit
        const { count, error } = await supabase
            .from('managed_competitors')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) throw new Error('Failed to fetch competitors count');

        if ((count || 0) >= plan.limits.competitors) {
            throw new Error(`Competitor registration limit reached for ${plan.name} (${plan.limits.competitors} competitors max).`);
        }

        // 3. Insert with Lock
        const lockedUntil = new Date();
        lockedUntil.setDate(lockedUntil.getDate() + 30); // 30 days from now

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
        const supabase = createClient();

        // 1. Fetch New Plan
        const { data: newPlanData } = await supabase.from('plans').select('*').eq('id', newPlanId).single();
        if (!newPlanData) throw new Error('Invalid Plan ID');
        const newPlan = newPlanData as Plan;

        // 2. Check Places Count
        const { count: placeCount } = await supabase
            .from('managed_places')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if ((placeCount || 0) > newPlan.limits.places) {
            throw new Error(`Cannot downgrade. You have ${placeCount} places, but ${newPlan.name} only allows ${newPlan.limits.places}. Please remove places first.`);
        }

        // 3. Check Competitors Count
        const { count: compCount } = await supabase
            .from('managed_competitors')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if ((compCount || 0) > newPlan.limits.competitors) {
            throw new Error(`Cannot downgrade. You have ${compCount} competitors, but ${newPlan.name} only allows ${newPlan.limits.competitors}. Please remove competitors first.`);
        }

        // 4. Update Plan
        const { error } = await supabase
            .from('user_credits')
            .update({ plan_id: newPlanId })
            .eq('user_id', userId);

        if (error) throw new Error(error.message);
        return true;
    }
}
