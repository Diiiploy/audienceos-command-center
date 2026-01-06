# E2E Tests for AudienceOS Command Center

End-to-end tests for authentication, navigation, and core features.

## Test Credentials

**Email:** test@audienceos.com
**Password:** TestPassword123!
**Role:** [UPDATE after Blocker 1 verification]
**Agency:** [UPDATE after Blocker 1 verification]

## Running Tests

### Local Development

Run all E2E tests locally:
```bash
npm run test:e2e
```

Run a specific test file:
```bash
npm run test:e2e -- e2e/auth.spec.ts
```

Run with UI (visual debugging):
```bash
npm run test:e2e:ui
```

### Production Testing

Run all E2E tests against production:
```bash
TEST_ENV=production npm run test:e2e
```

Run specific test on production:
```bash
TEST_ENV=production npm run test:e2e -- e2e/auth.spec.ts
```

## Helper Utilities

All reusable auth helpers are in `e2e/helpers/auth.ts`:

- **`login(page)`** - Logs in test user and waits for redirect
- **`clearAuth(page)`** - Clears auth cookies to simulate logout
- **`isAuthenticated(page)`** - Returns true if user is authenticated

### Example Usage

```typescript
import { test, expect } from '@playwright/test'
import { login, clearAuth } from './helpers/auth'

test('authenticated user can see dashboard', async ({ page }) => {
  // Login using helper
  await login(page)

  // Page is now at '/' authenticated
  await expect(page.locator('text=Dashboard')).toBeVisible()
})

test('logout redirects to login', async ({ page }) => {
  await login(page)

  // Clear auth cookies
  await clearAuth(page)

  // Navigate to protected route
  await page.goto('/')

  // Should redirect to login
  await expect(page).toHaveURL(/\/login/)
})
```

## Data Attributes for Testing

Key components have `data-testid` attributes for robust selectors:

- **Login Form:**
  - `data-testid="login-email"` - Email input
  - `data-testid="login-password"` - Password input
  - `data-testid="login-submit"` - Submit button
  - `data-testid="login-error"` - Error message container

- **Sidebar:**
  - `data-testid="user-profile"` - User profile button (shows name and role)

## Test Organization

- `auth.spec.ts` - Authentication and login flow tests
- `pipeline.spec.ts` - Pipeline view and navigation tests
- `intelligence.spec.ts` - Intelligence Center tests
- `helpers/auth.ts` - Shared auth utilities

## Troubleshooting

**Tests timeout locally:**
- Check if dev server is running: `npm run dev`
- Verify Supabase credentials in `.env.local`
- Increase timeout: `await page.goto('/login', { timeout: 30000 })`

**Tests fail on production:**
- Verify test user exists in production database (Blocker 1)
- Check CORS settings in Supabase dashboard
- Verify cookies persist (check browser DevTools)

**Profile shows "Brent CEO" instead of real name:**
- This indicates the @supabase/ssr auth hang fix isn't working
- Check `hooks/use-auth.ts` is using direct REST API
- Verify profile data is being fetched correctly

## CI/CD Integration

Tests are configured to run in CI with retries:
```bash
# CI mode (with retries)
npm run test:e2e

# Local development (no retries)
npm run test:e2e
```
