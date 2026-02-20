import { chromium, FullConfig } from '@playwright/test';
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

async function globalSetup(config: FullConfig) {
    const { baseURL, storageState } = config.projects[0].use;
    const browser = await chromium.launch();
    const page = await browser.newPage();

    console.log('Global Setup: Creating Test User...');
    const email = `e2e-global-${Date.now()}@example.com`;
    const password = 'test-password-123';

    // 1. Create User via Admin API
    const { data, error } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) {
        console.error('Global Setup Error:', error);
        throw error;
    }
    const userId = data.user!.id;
    process.env.TEST_USER_ID = userId; // Export for teardown (if needed in same process, but env vars don't persist well across workers)

    console.log(`Global Setup: User created (${userId}). Seeding data...`);

    // 2. Seed Essential Data (Subscription, Credits, etc.)
    await adminSupabase.from('user_subscriptions').upsert({
        user_id: userId,
        plan_id: 'pro',
        onboarding_completed: true,
        remaining_tickets_naver: 10,
        remaining_tickets_google: 5
    });

    await adminSupabase.from('user_credits').upsert({
        user_id: userId,
        subscription_balance: 1000,
        cash_balance: 0,
        plan_id: 'pro'
    });

    // 3. Login via UI or API to capture Storage State
    // Since UI login might be tricky with simple email/pass, we use API + Context injection
    console.log('Global Setup: Logging in to capture state...');

    const { data: { session }, error: loginError } = await authSupabase.auth.signInWithPassword({
        email,
        password
    });

    if (loginError || !session) {
        throw new Error('Global Setup Login Failed');
    }

    // Navigate to baseURL to set localStorage/cookies on correct origin
    if (baseURL) {
        await page.goto(baseURL);
    }

    // Manually construct storage state
    // We mock what Supabase Auth + Next.js expects in LocalStorage & Cookies
    await page.context().addCookies([{
        name: storageKey,
        value: JSON.stringify(session),
        domain: 'localhost',
        path: '/'
    }]);

    await page.evaluate(({ key, value }) => {
        window.localStorage.setItem(key, value);
    }, { key: storageKey, value: JSON.stringify(session) });

    // Save state
    await page.context().storageState({ path: 'playwright/.auth/user.json' });

    console.log('Global Setup: Auth state saved to playwright/.auth/user.json');
    await browser.close();
}

export default globalSetup;
