import { test, expect } from '@playwright/test'
import { login, clearAuth, TEST_USER } from './helpers/auth'

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')

    // Check page title
    await expect(page.locator('h1').filter({ hasText: /AudienceOS/i })).toBeVisible()

    // Check form elements using data-testid for robust selectors
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible()
  })

  test('shows validation error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill in invalid credentials
    await page.fill('[data-testid="login-email"]', 'invalid@test.com')
    await page.fill('[data-testid="login-password"]', 'wrongpassword')

    // Submit form
    await page.click('[data-testid="login-submit"]')

    // Should show error message
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 })
  })

  test('redirects to home after successful login', async ({ page }) => {
    // Use helper to login
    await login(page)

    // Should be at home page
    await expect(page).toHaveURL('/')

    // Should show authenticated UI - user profile visible in sidebar
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible()
  })

  test('unauthenticated access redirects to login', async ({ page }) => {
    // Clear any existing auth
    await clearAuth(page)

    // Try to access protected route
    await page.goto('/')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })
})
