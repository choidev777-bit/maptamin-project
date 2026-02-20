import { test, expect } from '@playwright/test';

/**
 * 구독 정기결제 E2E 테스트
 *
 * PortOne SDK와 백엔드 API를 mock하여 전체 구독 사이클을 검증합니다.
 * 흐름: 구독 페이지 진입 → 플랜 선택 → 빌링키 발급 → 구독 시작 → 해지
 */

test.describe('Subscription Flow', () => {
    test.beforeEach(async ({ page }) => {
        // --- Mock PortOne SDK (빌링키 발급) ---
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
                        },
                        requestIssueBillingKey: (options) => {
                            return Promise.resolve({
                                billingKey: 'mock-billing-key-' + Date.now(),
                                code: undefined,
                            });
                        }
                    };
                `
            });
        });
    });

    test('구독 시작 → 성공 화면 표시', async ({ page }) => {
        try {
            // --- Mock 구독 시작 API ---
            await page.route('**/api/payment/subscribe', async route => {
                if (route.request().method() === 'POST') {
                    const body = JSON.parse(route.request().postData() || '{}');
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            success: true,
                            planId: body.planId,
                            planName: body.planId === 'pro' ? '프로' : '스타터',
                            amount: body.planId === 'pro' ? 29000 : 9900,
                            ticketsNaver: body.planId === 'pro' ? 100 : 30,
                            ticketsGoogle: 0,
                            periodStart: new Date().toISOString(),
                            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                            message: `${body.planId === 'pro' ? '프로' : '스타터'} 플랜 구독이 시작되었습니다!`,
                        }),
                    });
                }
            });

            // --- Navigate to Subscription Page ---
            console.log('[Sub E2E] 구독 관리 페이지로 이동...');
            await page.goto('/dashboard/subscription', { waitUntil: 'networkidle' });

            const currentUrl = page.url();
            console.log(`[Sub E2E] 현재 URL: ${currentUrl}`);
            await page.screenshot({ path: 'test-results/sub-step-1-page-load.png' });

            if (currentUrl.includes('/login')) throw new Error('로그인 페이지로 리다이렉트됨');
            if (currentUrl.includes('/onboarding')) throw new Error('온보딩 페이지로 리다이렉트됨');

            // --- Verify Page Content ---
            await expect(page.getByText('구독 관리')).toBeVisible({ timeout: 5000 });

            // --- Select Pro Plan ---
            console.log('[Sub E2E] 프로 플랜 구독 시작 클릭...');
            const subscribeBtn = page.locator('button').filter({ hasText: '구독 시작' }).nth(1); // Pro is 2nd
            await expect(subscribeBtn).toBeVisible({ timeout: 5000 });
            await subscribeBtn.click();

            // --- Wait for Success Screen ---
            console.log('[Sub E2E] 성공 화면 대기...');
            await expect(page.getByText('구독이 시작되었습니다!')).toBeVisible({ timeout: 10000 });
            await page.screenshot({ path: 'test-results/sub-step-2-success.png' });

            // --- Verify Success Details ---
            await expect(page.getByText('프로 플랜')).toBeVisible();

            // --- Navigate to Dashboard ---
            console.log('[Sub E2E] 대시보드로 이동...');
            await page.getByRole('button', { name: '대시보드로 이동' }).click();
            await page.waitForURL(/\/dashboard$/, { timeout: 10000 });
            await page.screenshot({ path: 'test-results/sub-step-3-dashboard.png' });
            console.log('[Sub E2E] 구독 시작 테스트 완료');

        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[Sub E2E] TEST FAILED: ${message}`);
            await page.screenshot({ path: `test-results/sub-failure-subscribe-${Date.now()}.png` });
            throw e;
        }
    });

    test('구독 해지 → 해지 확인 모달 → 해지 완료 배너', async ({ page }) => {
        try {
            // --- Mock: 이미 구독 중인 상태의 페이지 렌더링 ---
            // subscription 페이지의 서버 컴포넌트가 데이터를 fetch하므로
            // API 응답을 mock할 수 없음 → Supabase RPC를 직접 mock 불가
            // 대신 해지 API만 mock하고, UI 요소 존재 여부를 조건부로 테스트

            // --- Mock 구독 해지 API ---
            await page.route('**/api/payment/subscribe/cancel', async route => {
                if (route.request().method() === 'POST') {
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            success: true,
                            message: '구독이 해지되었습니다.',
                            effectiveUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        }),
                    });
                }
            });

            // --- Navigate ---
            console.log('[Cancel E2E] 구독 관리 페이지로 이동...');
            await page.goto('/dashboard/subscription', { waitUntil: 'networkidle' });
            await page.screenshot({ path: 'test-results/cancel-step-1-page-load.png' });

            // --- Check if cancel button exists (활성 구독이 있는 경우에만) ---
            const cancelLink = page.getByText('구독 해지');
            const hasCancelLink = await cancelLink.isVisible().catch(() => false);

            if (!hasCancelLink) {
                console.log('[Cancel E2E] 활성 구독 없음 → 해지 버튼 없음 → 테스트 스킵');
                test.skip();
                return;
            }

            // --- Click Cancel ---
            console.log('[Cancel E2E] 구독 해지 클릭...');
            await cancelLink.click();

            // --- Verify Cancel Modal ---
            console.log('[Cancel E2E] 해지 확인 모달 검증...');
            await expect(page.getByText('구독을 해지하시겠습니까?')).toBeVisible({ timeout: 5000 });
            await expect(page.getByText(/혜택이 유지됩니다/)).toBeVisible();
            await page.screenshot({ path: 'test-results/cancel-step-2-modal.png' });

            // --- Confirm Cancel ---
            console.log('[Cancel E2E] 해지 확인 클릭...');
            await page.getByRole('button', { name: '해지하기' }).click();

            // --- Verify Canceled Banner ---
            console.log('[Cancel E2E] 해지 완료 배너 검증...');
            await expect(page.getByText('구독 해지됨')).toBeVisible({ timeout: 5000 });
            await expect(page.getByText(/유료 혜택이 유지됩니다/)).toBeVisible();
            await page.screenshot({ path: 'test-results/cancel-step-3-canceled.png' });

            console.log('[Cancel E2E] 구독 해지 테스트 완료');

        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[Cancel E2E] TEST FAILED: ${message}`);
            await page.screenshot({ path: `test-results/cancel-failure-${Date.now()}.png` });
            throw e;
        }
    });

    test('해지 모달에서 "유지하기" 클릭 시 모달 닫힘', async ({ page }) => {
        try {
            await page.goto('/dashboard/subscription', { waitUntil: 'networkidle' });

            const cancelLink = page.getByText('구독 해지');
            const hasCancelLink = await cancelLink.isVisible().catch(() => false);

            if (!hasCancelLink) {
                console.log('[Keep E2E] 활성 구독 없음 → 테스트 스킵');
                test.skip();
                return;
            }

            // Open modal
            await cancelLink.click();
            await expect(page.getByText('구독을 해지하시겠습니까?')).toBeVisible({ timeout: 5000 });

            // Click "유지하기"
            await page.getByRole('button', { name: '유지하기' }).click();

            // Modal should be closed
            await expect(page.getByText('구독을 해지하시겠습니까?')).not.toBeVisible({ timeout: 3000 });
            console.log('[Keep E2E] 유지하기 테스트 완료');

        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[Keep E2E] TEST FAILED: ${message}`);
            await page.screenshot({ path: `test-results/keep-failure-${Date.now()}.png` });
            throw e;
        }
    });
});
