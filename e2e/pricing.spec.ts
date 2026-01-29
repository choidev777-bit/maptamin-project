
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

test.describe('Pricing & Search Flow', () => {
    let testEmail = `e2e-pricing-${Date.now()}@example.com`;
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

        // 2. Add Credits
        await adminSupabase.from('user_credits').upsert({
            user_id: testUserId,
            subscription_balance: 1000,
            cash_balance: 0,
            plan_id: 'basic'
        });

        // 3. Register a Managed Place (for PlaceSelector)
        await adminSupabase.from('managed_places').insert({
            user_id: testUserId,
            place_id: 'e2e-place-123',
            place_name: 'E2E Test Place'
        });
    });

    test.afterAll(async () => {
        if (testUserId) {
            await adminSupabase.auth.admin.deleteUser(testUserId);
        }
    });

    test('User can login, select place, and see cost', async ({ page, context }) => {
        // --- 0. Mock Naver Places Search API ---
        await page.route('/api/naver/places/search*', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    items: [
                        {
                            title: 'E2E Test Place',
                            address: '123 Test Street, Seoul',
                            category: 'Test Category',
                            lat: '37.5665',
                            lng: '126.9780'
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

        // Inject Session into Cookies
        await context.addCookies([{
            name: storageKey,
            value: JSON.stringify(session),
            domain: 'localhost',
            path: '/'
        }]);

        // Inject into LocalStorage
        await page.addInitScript(({ key, value }) => {
            window.localStorage.setItem(key, value);
        }, { key: storageKey, value: JSON.stringify(session) });

        // --- 2. Navigate to New Search ---
        await page.goto('/naver-search/new');
        await expect(page).toHaveURL(/naver-search\/new/);

        // --- 3. Step 1: Place Selection ---
        // A. Select Managed Place (sets ID)
        await page.locator('button', { hasText: '분석할 가게를 선택하세요' }).first().click();
        await page.locator('button', { hasText: 'E2E Test Place' }).first().click();

        // B. Search Place (sets Lat/Lng) - Required to proceed
        const placeSearchInput = page.locator('input[placeholder*="네이버 지도에서 비즈니스 검색"]');
        await placeSearchInput.fill('E2E');
        // Wait for mock result dropdown
        const mockResult = page.locator('li', { hasText: 'E2E Test Place' }).first();
        await expect(mockResult).toBeVisible();
        await mockResult.click();

        // C. Click Next
        const nextButton = page.locator('button', { hasText: '다음' });
        await expect(nextButton).toBeEnabled();
        await nextButton.click();

        // --- 4. Step 2: Keywords ---
        // Wait for Step 2 heading or input
        await expect(page.locator('h2', { hasText: '검색 키워드 입력' })).toBeVisible();

        const keywordInput = page.locator('input[placeholder*="키워드 입력"]');
        await keywordInput.fill('test keyword');

        // Wait for Cost Preview update (3x3 grid = 9 pts)
        await expect(page.locator('body')).toContainText('9 P');

        // Click Next
        await nextButton.click();

        // --- 5. Step 3: Grid ---
        // Wait for Step 3
        await expect(page.locator('h2', { hasText: '검색 그리드 설정' })).toBeVisible();

        // Default is fine. Click Next.
        await nextButton.click();

        // --- 6. Step 4: Confirm ---
        // Wait for Step 4
        await expect(page.locator('h2', { hasText: '결제 및 확인' })).toBeVisible();

        // Verify Content
        await expect(page.locator('body')).toContainText('E2E Test Place');
        await expect(page.locator('body')).toContainText('test keyword');
        await expect(page.locator('body')).toContainText('차감 예정 포인트');

        // Submit
        const submitButton = page.locator('button', { hasText: '결제 및 시작' });
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        // --- 7. Verify Success ---
        // Expect Success Alert or Redirection
        // Note: NewNaverSearchPage uses browser 'alert' for failures. Success redirects.
        // If redirect happens, URL should change to /naver-search/[uuid]
        await expect(page).toHaveURL(/\/naver-search\/.+/);
    });
});
