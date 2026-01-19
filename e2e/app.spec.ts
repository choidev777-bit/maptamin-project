import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
    test('should load successfully', async ({ page }) => {
        await page.goto('/')

        // Check page has RankTracker branding
        await expect(page.locator('text=RankTracker')).toBeVisible()
    })

    test('should have Sign in link', async ({ page }) => {
        await page.goto('/')

        // Look for Sign in link
        const signInLink = page.getByRole('link', { name: /Sign in/i })
        await expect(signInLink).toBeVisible()
    })

    test('should have Get Started button', async ({ page }) => {
        await page.goto('/')

        // Look for Get Started Free button
        const getStartedButton = page.getByRole('link', { name: /Get Started Free/i })
        await expect(getStartedButton).toBeVisible()
    })
})

test.describe('Login Page', () => {
    test('should load login page', async ({ page }) => {
        await page.goto('/login')

        // Check for Google login button
        const googleButton = page.getByRole('button', { name: /google/i })
        await expect(googleButton).toBeVisible()
    })
})

test.describe('Dashboard Protection', () => {
    test('should redirect unauthenticated user from dashboard', async ({ page }) => {
        await page.goto('/dashboard')

        // Should redirect to login
        await expect(page).toHaveURL(/login/)
    })

    test('should redirect unauthenticated user from new search', async ({ page }) => {
        await page.goto('/search/new')

        // Should redirect to login
        await expect(page).toHaveURL(/login/)
    })
})
