
/**
 * @jest-environment node
 */

import { createClient } from '@supabase/supabase-js';
import { createTestClient } from '@/lib/supabase/test-client';

jest.mock('@/lib/supabase/server', () => ({
    createClient: async () => createTestClient(),
}));

jest.setTimeout(30000);

describe('Pricing System Integration Test', () => {
    const adminSupabase = createTestClient();
    let userSupabase: any;
    let testUserId: string;

    beforeAll(async () => {
        // 1. Create User via Admin
        const email = `test-pricing-${Date.now()}@example.com`;
        const password = 'test-password-123';

        try {
            const { data, error } = await adminSupabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true
            });

            if (error) throw error;
            if (!data.user) throw new Error('Failed to create test user');

            testUserId = data.user.id;
            console.log('Created test user:', testUserId);

            // 2. Setup Credits (Upsert)
            // Wait to ensure user is visible to triggers (though upsert handles it)
            await new Promise(r => setTimeout(r, 1000));

            const { error: upsertError } = await adminSupabase
                .from('user_credits')
                .upsert({
                    user_id: testUserId,
                    subscription_balance: 1000,
                    cash_balance: 0,
                    plan_id: 'basic'
                })
                .select();

            if (upsertError) throw upsertError;

            // 3. Initialize User Client & Sign In
            // We need a separate client to simulate the USER calling the RPC (so auth.uid() works)
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

            if (!supabaseUrl || !anonKey) {
                throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or ANON KEY');
            }

            userSupabase = createClient(supabaseUrl, anonKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            const { error: loginError } = await userSupabase.auth.signInWithPassword({
                email,
                password
            });

            if (loginError) throw loginError;

        } catch (e) {
            console.error('Setup failed:', e);
            throw e;
        }
    });

    afterAll(async () => {
        if (testUserId) {
            await adminSupabase.auth.admin.deleteUser(testUserId);
            console.log('Deleted test user:', testUserId);
        }
    });

    it('should verify initial balance', async () => {
        const { data } = await adminSupabase
            .from('user_credits')
            .select('*')
            .eq('user_id', testUserId)
            .single();

        expect(data).toBeDefined();
        expect(data?.subscription_balance).toBe(1000);
    });

    it('should deduct points correctly via RPC', async () => {
        const cost = 50;

        // RPC: deduct_points(p_cost)
        // Note: The RPC checks auth.uid().
        const { data, error } = await userSupabase.rpc('deduct_points', {
            p_cost: cost
        });

        if (error) console.error('Deduct Error:', error);
        expect(error).toBeNull();
        expect(data).toBe(true);

        // Verify balance via Admin check (db state)
        const { data: credit } = await adminSupabase
            .from('user_credits')
            .select('*')
            .eq('user_id', testUserId)
            .single();

        expect(credit?.subscription_balance).toBe(950);
    });

    it('should prevent deduction if insufficient funds', async () => {
        const hugeCost = 2000;

        const { data, error } = await userSupabase.rpc('deduct_points', {
            p_cost: hugeCost
        });

        // RPC raises exception
        expect(error).toBeDefined();
        expect(error?.message).toMatch(/Insufficient/i);

        // Verify balance unchanged
        const { data: credit } = await adminSupabase
            .from('user_credits')
            .select('*')
            .eq('user_id', testUserId)
            .single();

        expect(credit?.subscription_balance).toBe(950);
    });

    it('should refund points correctly', async () => {
        const refundAmount = 50;
        // RPC: refund_points(p_amount)
        const { data, error } = await userSupabase.rpc('refund_points', {
            p_amount: refundAmount
        });

        expect(error).toBeNull();
        expect(data).toBe(true);

        const { data: credit } = await adminSupabase
            .from('user_credits')
            .select('*')
            .eq('user_id', testUserId)
            .single();

        expect(credit?.subscription_balance).toBe(1000);
    });
});
