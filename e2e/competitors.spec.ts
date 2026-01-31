
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Setup Supabase Clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const projectRef = supabaseUrl.match(/https:\/\/(.+?)\./)![1];
const storageKey = `sb-${projectRef}-auth-token`;

const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const authSupabase = createClient(supabaseUrl, anonKey);

test.describe('Competitor Management', () => {
    let testEmail = `e2e-comp-${Date.now()}@example.com`;
    let testPassword = 'test-password-123';
    let testUserId: string;

    test.beforeAll(async () => {
        // 1. Create User
        const { data, error } = await adminSupabase.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true
        });
        if (error) throw error;
        testUserId = data.user!.id;

        // 2. Add Credits/Plan (Basic allows 3 competitors)
        await adminSupabase.from('user_credits').upsert({
            user_id: testUserId,
            subscription_balance: 1000,
            cash_balance: 0,
            plan_id: 'basic'
        });
    });

    test.afterAll(async () => {
        if (testUserId) {
            await adminSupabase.auth.admin.deleteUser(testUserId);
        }
    });

    test('should allow adding and deleting a competitor', async ({ page, context }) => {
        // --- 0. Mock Naver Places Search API ---
        await page.route('/api/naver/places/search*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    items: [
                        {
                            title: 'Test Competitor Store',
                            address: '123 Comp Street',
                            category: 'Test Category',
                            lat: '37.1234',
                            lng: '127.1234'
                        }
                    ]
                })
            });
        });

        // --- 1. Programmatic Login ---
        const { data: { session }, error } = await authSupabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (error || !session) throw new Error('Login failed during test setup');

        // Inject Session
        await context.addCookies([{
            name: storageKey,
            value: JSON.stringify(session),
            domain: 'localhost',
            path: '/'
        }]);

        await page.addInitScript(({ key, value }) => {
            window.localStorage.setItem(key, value);
        }, { key: storageKey, value: JSON.stringify(session) });

        // --- 2. Navigate to Settings ---
        await page.goto('/settings');
        await expect(page.locator('h1, h2').filter({ hasText: /설정/ })).toBeVisible();

        // --- 3. Add Competitor ---
        // Click Add Button
        await page.getByText('경쟁사 추가하기').click();

        // In Modal: Search for place
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
        await modal.locator('input[placeholder*="비즈니스 검색"]').fill('Test Comp');

        // Select Fake Result
        const resultItem = modal.locator('li').filter({ hasText: 'Test Competitor Store' }).first();
        await expect(resultItem).toBeVisible();
        await resultItem.click();

        // Confirm Add
        await modal.getByRole('button', { name: '등록하기' }).click();

        // --- 4. Verify Addition ---
        // Verify Modal Closed
        await expect(modal).not.toBeVisible();

        // Verify List Item Exists
        await expect(page.getByText('Test Competitor Store')).toBeVisible();

        // --- 5. Delete Competitor ---
        // Handle Confirm Dialog
        page.on('dialog', dialog => dialog.accept());

        // Find Delete Button (Trash Icon) for the item
        // Assuming it's the only item, or use filter
        const deleteBtn = page.locator('button').filter({ has: page.locator('.lucide-trash-2') }).first();
        await deleteBtn.click();

        // --- 6. Verify Deletion ---
        // Should disappear
        await expect(page.getByText('Test Competitor Store')).not.toBeVisible();
        await expect(page.getByText('등록된 경쟁사가 없습니다')).toBeVisible();
    });
});
