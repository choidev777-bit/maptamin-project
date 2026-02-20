import { test, expect } from '@playwright/test';

test('should complete ticket purchase flow', async ({ page }) => {
    try {
        console.log('Test started.');

        // --- Mock PortOne SDK ---
        await page.route('**/browser-sdk.js', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/javascript',
                body: `
                    window.PortOne = {
                        requestPayment: (options) => {
                            return Promise.resolve({
                                paymentId: 'mock-payment-id-' + Date.now(),
                                transactionType: 'PAYMENT',
                                txId: 'mock-tx-id',
                                totalAmount: options.totalAmount,
                            });
                        }
                    };
                `
            });
        });

        // --- Mock Backend Verification API ---
        await page.route('**/api/payment/ticket', async route => {
            const request = route.request();
            const postData = JSON.parse(request.postData() || '{}');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: {
                        tickets: postData.quantity,
                        remaining_naver: 10 + postData.quantity,
                        remaining_google: 0
                    }
                })
            });
        });

        // --- Navigate to Shop ---
        console.log('Going to /dashboard/shop...');
        await page.goto('/dashboard/shop', { waitUntil: 'networkidle' });

        const currentUrl = page.url();
        console.log(`Current URL: ${currentUrl}`);
        await page.screenshot({ path: 'test-results/step-shop-load.png' });

        if (currentUrl.includes('/login')) throw new Error('Redirected to Login');
        if (currentUrl.includes('/onboarding')) throw new Error('Redirected to Onboarding');

        // Verify content
        console.log('Verifying content...');
        await expect(page.getByText('실시간 진단 티켓 구매')).toBeVisible({ timeout: 5000 });

        // Use specific locator to avoid strict mode violation
        const naverTicketBtn = page.locator('button').filter({ hasText: '네이버 티켓' }).first();
        await expect(naverTicketBtn).toBeVisible({ timeout: 5000 });

        // Purchase Flow
        console.log('Clicking quantity...');
        await page.getByLabel('수량 늘리기').click();
        console.log('Clicking purchase...');
        await page.getByRole('button', { name: /결제하기/ }).click();

        // --- Verify Redirection to Result Page ---
        console.log('Waiting for redirect...');
        await page.waitForURL(/\/dashboard\/shop\/result/, { timeout: 10000 });
        console.log('Redirected');
        await page.screenshot({ path: 'test-results/step-result.png' });

        await expect(page.getByText('결제가 완료되었습니다!')).toBeVisible();
        await expect(page.getByText('2장')).toBeVisible();

        // --- Verify Return Flow ---
        console.log('Returning to dashboard...');
        await page.getByRole('button', { name: '대시보드로 이동' }).click();
        await page.waitForURL(/\/dashboard$/, { timeout: 10000 });
        console.log('Done');
        await page.screenshot({ path: 'test-results/step-dashboard.png' });

    } catch (e: any) {
        console.error(`TEST FAILED: ${e.message}`);
        await page.screenshot({ path: `test-results/failure-${Date.now()}.png` });
        throw e;
    }
});
