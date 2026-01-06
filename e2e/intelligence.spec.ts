import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('Intelligence Center', () => {
  test.beforeEach(async ({ page }) => {
    // Login using helper
    await login(page)

    // Navigate to Intelligence Center
    await page.click('text=Intelligence')
    await expect(page.locator('h1, h2').filter({ hasText: /Intelligence Center/i })).toBeVisible({ timeout: 5000 })
  })

  test('displays overview with AI capabilities', async ({ page }) => {
    // Check for AI capability cards
    await expect(page.locator('text=Client Communication')).toBeVisible()
    await expect(page.locator('text=Knowledge Search')).toBeVisible()
    await expect(page.locator('text=At-Risk Detection')).toBeVisible()
  })

  // Note: "Chat" section removed - use "Chat History" for conversation access
  // See CLAUDE.md "Intelligence Center > Sidebar Navigation" for canonical nav structure

  test('Chat History section displays conversation logs', async ({ page }) => {
    // Click on Chat History in sub-nav
    await page.click('nav >> text=Chat History')

    // Should show filter tabs
    await expect(page.locator('text=All')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Your Messages')).toBeVisible()
    await expect(page.locator('text=AI Responses')).toBeVisible()
  })

  test('Cartridges section displays training cartridges', async ({ page }) => {
    // Click on Training Cartridges
    await page.click('text=Training Cartridges')

    // Should show cartridge tabs (Voice, Style, etc.)
    await expect(page.locator('text=Voice').first()).toBeVisible({ timeout: 5000 })
  })
})
