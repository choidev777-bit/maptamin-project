import { test, expect } from '@playwright/test'

test.describe('Naver Search Protection', () => {
    test('should redirect unauthenticated user from new naver search', async ({ page }) => {
        await page.goto('/naver-search/new')
        // Should redirect to login page
        await expect(page).toHaveURL(/login/)
    })

    test('should redirect unauthenticated user from naver search results', async ({ page }) => {
        await page.goto('/naver-search/123e4567-e89b-12d3-a456-426614174000')
        // Should redirect to login page
        await expect(page).toHaveURL(/login/)
    })
})
