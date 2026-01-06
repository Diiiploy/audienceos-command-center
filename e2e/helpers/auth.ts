import { Page, expect } from '@playwright/test'

/**
 * Test user credentials
 * IMPORTANT: Update these after verifying which user exists in production
 */
export const TEST_USER = {
  email: 'test@audienceos.com', // UPDATE after DB verification
  password: 'TestPassword123!', // UPDATE if different in production
}

/**
 * Logs in test user and waits for redirect to home page
 *
 * @param page - Playwright page object
 * @throws Error if login fails or redirect doesn't occur
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/login')

  // Use data-testid attributes for robust selectors
  await page.fill('[data-testid="login-email"]', TEST_USER.email)
  await page.fill('[data-testid="login-password"]', TEST_USER.password)
  await page.click('[data-testid="login-submit"]')

  // Wait for successful redirect to home page
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

/**
 * Clears auth cookies to simulate logged-out state
 *
 * @param page - Playwright page object
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.context().clearCookies()
}

/**
 * Checks if user is authenticated by looking for profile indicator
 *
 * @param page - Playwright page object
 * @returns true if user profile is visible, false otherwise
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Look for user profile indicator in sidebar
    await page.locator('[data-testid="user-profile"]').waitFor({
      state: 'visible',
      timeout: 2000,
    })
    return true
  } catch {
    return false
  }
}
