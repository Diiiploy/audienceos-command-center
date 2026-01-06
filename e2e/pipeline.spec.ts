import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('Pipeline View', () => {
  test.beforeEach(async ({ page }) => {
    // Login using helper
    await login(page)
  })

  test('displays pipeline stages', async ({ page }) => {
    // Check for pipeline column headers (use first() to handle multiple matches)
    await expect(page.locator('text=Onboarding').first()).toBeVisible()
    await expect(page.locator('text=Installation').first()).toBeVisible()
    await expect(page.locator('text=Audit').first()).toBeVisible()
    await expect(page.locator('text=Live').first()).toBeVisible()
  })

  test('displays client cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000)

    // Should have at least one client card
    const clientCards = page.locator('[data-testid="client-card"], .client-card, [class*="card"]').filter({
      has: page.locator('text=/Core|Enterprise/i'),
    })

    await expect(clientCards.first()).toBeVisible({ timeout: 10000 })
  })

  test('sidebar navigation works', async ({ page }) => {
    // Click on Dashboard - verify it loads (no h1 heading, shows metric cards)
    await page.click('text=Dashboard')
    await expect(page.locator('[class*="card"], [class*="metric"]').first()).toBeVisible({ timeout: 5000 })

    // Click on Pipeline - verify pipeline columns appear
    await page.click('text=Pipeline')
    await expect(page.locator('text=Onboarding').first()).toBeVisible({ timeout: 5000 })

    // Click on Intelligence - verify Intelligence Center loads
    await page.click('text=Intelligence')
    await expect(page.locator('text=Intelligence Center')).toBeVisible({ timeout: 5000 })
  })
})
