import { defineConfig, devices } from '@playwright/test'

// Support environment switching for local vs production testing
const testEnv = process.env.TEST_ENV || 'local'
const isProduction = testEnv === 'production'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // Dynamic baseURL based on environment
    baseURL: isProduction
      ? 'https://audienceos-agro-bros.vercel.app'
      : 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start dev server for local testing
  webServer: isProduction ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
