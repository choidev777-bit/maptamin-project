import { createClient } from '@/lib/supabase/server';

export class ChargeService {
    /**
     * Adds points to a user's cash wallet.
     * Restricted: typically called by Admin or Payment Webhook.
     */
    static async chargePoints(userId: string, amount: number) {
        const supabase = await createClient();

        // In a real scenario, verification of payment status would happen here.

        const { error } = await supabase.rpc('charge_points', {
            p_user_id: userId,
            p_amount: amount
        });

        if (error) {
            throw new Error(`Charge failed: ${error.message}`);
        }

        return true;
    }
}
