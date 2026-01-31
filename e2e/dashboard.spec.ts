
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const projectRef = supabaseUrl.match(/https:\/\/(.+?)\./)![1];
const storageKey = `sb-${projectRef}-auth-token`;

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const authSupabase = createClient(supabaseUrl, anonKey);

test.describe('Dashboard Visualization', () => {
    let testEmail = `e2e-dash-${Date.now()}@example.com`;
    let testPassword = 'test-password-123';
    let testUserId: string;
    let placeId = 'e2e-place-dash-123';

    test.beforeAll(async () => {
        // 1. Create User
        const { data, error } = await adminSupabase.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true
        });
        if (error) console.error('User Create Error:', error);
        if (error) throw error;
        testUserId = data.user!.id;

        // 2. Add Credits
        await adminSupabase.from('user_credits').upsert({
            user_id: testUserId,
            subscription_balance: 1000,
            cash_balance: 0,
            plan_id: 'pro'
        });

        // 3. Add Managed Place (My Shop)
        const { error: placeError } = await adminSupabase.from('managed_places').insert({
            user_id: testUserId,
            place_id: placeId,
            place_name: 'Dashboard Test Shop',
            address: 'Seoul',
            lat: 37.5,
            lng: 127.0,
            platform: 'naver'
        });
        if (placeError) console.error('Place Insert Error:', placeError);
        if (placeError) throw placeError;

        // 4. Seed Search History (for Graph)
        // Entry 1: Yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: search1, error: search1Error } = await adminSupabase.from('searches').insert({
            user_id: testUserId,
            place_id: placeId,
            place_name: 'Dashboard Test Shop',
            place_address: 'Seoul',
            place_lat: 37.5,
            place_lng: 127.0,
            keywords: ['SEO'],
            status: 'completed',
            platform: 'naver',
            created_at: yesterday.toISOString(),
            grid_points: [], // Empty array for test
            grid_distance: 500,
            distance_unit: 'm',
            cost: 0
        }).select().single();

        if (search1Error) console.error('Search1 Error:', search1Error);
        if (search1Error) throw search1Error;

        await adminSupabase.from('search_results').insert({
            search_id: search1!.id,
            keyword: 'SEO',
            rank: 5,
            place_name: 'Dashboard Test Shop',
            grid_index: 0,
            grid_lat: 37.5,
            grid_lng: 127.0
        });

        // Entry 2: Today
        const { data: search2, error: search2Error } = await adminSupabase.from('searches').insert({
            user_id: testUserId,
            place_id: placeId,
            place_name: 'Dashboard Test Shop',
            place_address: 'Seoul',
            place_lat: 37.5,
            place_lng: 127.0,
            keywords: ['SEO'],
            status: 'completed',
            platform: 'naver',
            created_at: new Date().toISOString(),
            grid_points: [], // Empty array for test
            grid_distance: 500,
            distance_unit: 'm',
            cost: 0
        }).select().single();

        if (search2Error) console.error('Search2 Error:', search2Error);
        if (search2Error) throw search2Error;

        await adminSupabase.from('search_results').insert({
            search_id: search2!.id,
            keyword: 'SEO',
            rank: 3, // Improved!
            place_name: 'Dashboard Test Shop'
        });
    });

    test.afterAll(async () => {
        if (testUserId) {
            await adminSupabase.auth.admin.deleteUser(testUserId);
        }
    });

    test('should render Shop Card and Rank Graph', async ({ page, context }) => {
        // --- Login ---
        const { data: { session }, error } = await authSupabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });
        if (error || !session) throw new Error('Login failed');

        await context.addCookies([{
            name: storageKey,
            value: JSON.stringify(session),
            domain: 'localhost',
            path: '/'
        }]);

        await page.addInitScript(({ key, value }) => {
            window.localStorage.setItem(key, value);
        }, { key: storageKey, value: JSON.stringify(session) });

        // --- Navigate to Dashboard ---
        await page.goto('/dashboard');

        // --- Verification ---
        // Check for Shop Card
        try {
            await expect(page.getByText('Dashboard Test Shop')).toBeVisible({ timeout: 10000 });
        } catch (e) {
            console.log('DEBUG: Current URL:', page.url());
            console.log('DEBUG: Body contains "매장 선택":', (await page.locator('body').innerText()).includes('매장 선택'));
            throw e;
        }

        // Check for Rank Graph keywords
        await expect(page.getByText('SEO')).toBeVisible({ timeout: 10000 });
    });
});
