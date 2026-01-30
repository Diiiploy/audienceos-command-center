# Auth Fixes Verification Plan - AudienceOS Command Center

## ⚠️ CRITICAL VALIDATION RESULTS

**Original Confidence:** 7/10 → **After Validator:** 3/10

**5 CRITICAL BLOCKERS FOUND** - Must fix before proceeding:
1. ❌ Test user (e2e.test2@gmail.com) existence unverified in production
2. ❌ playwright.config.ts hardcoded to localhost, won't support production
3. ❌ e2e/helpers/ directory doesn't exist
4. ❌ Credential conflicts (existing tests use test@audienceos.com)
5. ❌ No data-testid attributes in components for robust selectors

**Validator Recommendation:** DO NOT PROCEED with original plan. Fix blockers first, start with LOCAL testing.

**Full Validation Report:** `/Users/rodericandrews/.claude/plans/linear-drifting-wren-agent-a8a4729.md`

---

## Context

Three critical auth fixes were implemented on 2026-01-05 that need verification:

1. **Auth Enforcement** (commit a40e9c4) - Removed demo mode bypass, unauthenticated users now redirect to /login
2. **Invitation Flow** (commits 1128881-401bc66) - Service role bypass for invitation acceptance
3. **@supabase/ssr Hang Fix** (commit 5ccc45c) - Bypassed hanging Supabase client methods with direct REST API calls

**Current State:**
- Existing E2E tests use `test@audienceos.com` (3 files)
- Playwright config only supports localhost:3000
- Login test on line 31 of auth.spec.ts is SKIPPED (comment: "FIXME: Test credentials don't work")
- No test helper infrastructure (e2e/helpers/ doesn't exist)
- Components lack data-testid attributes

**Revised Approach:**
- **Phase 0:** Fix all 5 critical blockers
- **Phase 1:** Verify auth works locally with existing tests
- **Phase 2:** Extend to production testing (only after Phase 1 passes)

## Test Credentials Decision

**CONFLICT IDENTIFIED:**
- Plan originally proposed: `e2e.test2@gmail.com`
- Existing tests use: `test@audienceos.com`

**Resolution:** Standardize on `test@audienceos.com` (already used in 3 test files)
- Email: `test@audienceos.com`
- Password: `TestPassword123!` (assumed - needs verification)
- Role: unknown (needs verification)

## Critical Files

**Auth Implementation:**
- `/Users/rodericandrews/_PAI/projects/command_center_audience_os/hooks/use-auth.ts` - Main auth hook with direct REST API bypass
- `/Users/rodericandrews/_PAI/projects/command_center_audience_os/lib/supabase.ts` - Supabase client factory
- `/Users/rodericandrews/_PAI/projects/command_center_audience_os/middleware.ts` - Route protection
- `/Users/rodericandrews/_PAI/projects/command_center_audience_os/app/login/page.tsx` - Login UI

**Test Files to Update:**
- `/Users/rodericandrews/_PAI/projects/command_center_audience_os/e2e/auth.spec.ts` - Basic auth tests (needs credentials update)
- `/Users/rodericandrews/_PAI/projects/command_center_audience_os/e2e/pipeline.spec.ts` - Uses wrong credentials in beforeEach
- `/Users/rodericandrews/_PAI/projects/command_center_audience_os/playwright.config.ts` - Only localhost, needs production config

**New Test File:**
- `/Users/rodericandrews/_PAI/projects/command_center_audience_os/e2e/auth-comprehensive.spec.ts` - Comprehensive auth verification

## Implementation Phases

### PHASE 0: Fix Critical Blockers (Required First)

**Estimated Time:** 2-3 hours

Must complete ALL blockers before writing any new tests.

#### Blocker 1: Verify Test User Credentials

**Problem:** Credential conflict - existing tests use test@audienceos.com, unclear if user exists

**Action:** Query production database to verify which test user exists

**File:** Create `scripts/verify-test-user.sql`
```sql
-- Run in Supabase SQL Editor (production: qzkirjjrcblkqvhvalue)
SELECT
  u.id,
  u.email,
  u.first_name,
  u.last_name,
  u.role,
  u.agency_id,
  a.name as agency_name,
  COUNT(c.id) as client_count
FROM "user" u
LEFT JOIN agency a ON u.agency_id = a.id
LEFT JOIN client c ON c.agency_id = u.agency_id
WHERE u.email IN ('test@audienceos.com', 'e2e.test2@gmail.com')
GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.agency_id, a.name;
```

**Decision Matrix:**
- If `test@audienceos.com` exists → Use this, keep existing tests
- If `e2e.test2@gmail.com` exists → Update all tests to use this
- If BOTH exist → Pick one, document the other as backup
- If NEITHER exist → Create test user via Supabase Auth UI with known password

**Output:** Document chosen credentials in `e2e/README.md`

#### Blocker 2: Update Playwright Config for Multi-Environment

**Problem:** Config hardcoded to localhost, won't support production testing

**File:** `playwright.config.ts`

**Changes:**
```typescript
import { defineConfig, devices } from '@playwright/test'

// Support environment switching
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
```

**Verification:** Run `TEST_ENV=production npx playwright test --list` (should not start dev server)

#### Blocker 3: Create Test Helper Infrastructure

**Problem:** e2e/helpers/ directory doesn't exist, no reusable auth utilities

**Action:** Create helper structure

**New Directory:** `e2e/helpers/`

**New File:** `e2e/helpers/auth.ts`
```typescript
import { Page, expect } from '@playwright/test'

// Credentials (will be updated after Blocker 1 verification)
export const TEST_USER = {
  email: 'test@audienceos.com', // UPDATE after DB verification
  password: 'TestPassword123!', // UPDATE if different
}

/**
 * Logs in test user and waits for redirect to home page
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/login')

  // Use test IDs once added (Blocker 5)
  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')

  // Wait for successful redirect
  await expect(page).toHaveURL('/', { timeout: 10000 })
}

/**
 * Clears auth cookies to simulate logged-out state
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.context().clearCookies()
}

/**
 * Checks if user is authenticated by looking for profile indicator
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Look for any auth indicator (profile menu, user name, etc.)
    // This is a simple check - enhance based on actual UI
    await page.locator('[data-testid="user-profile"]').waitFor({
      state: 'visible',
      timeout: 2000
    })
    return true
  } catch {
    return false
  }
}
```

**New File:** `e2e/README.md`
```markdown
# E2E Tests for AudienceOS Command Center

## Test Credentials

**Email:** test@audienceos.com
**Password:** TestPassword123!
**Role:** [UPDATE after verification]
**Agency:** [UPDATE after verification]

## Running Tests

**Local:**
```bash
npm run test:e2e              # Run all tests
npm run test:e2e -- auth.spec.ts  # Run specific test
```

**Production:**
```bash
TEST_ENV=production npm run test:e2e -- auth.spec.ts
```

## Helper Utilities

All auth helpers are in `e2e/helpers/auth.ts`:
- `login(page)` - Logs in test user
- `clearAuth(page)` - Clears auth cookies
- `isAuthenticated(page)` - Checks auth state
```

#### Blocker 4: Add Test IDs to Login Components

**Problem:** No data-testid attributes, tests will be brittle

**File:** `app/login/page.tsx` (around lines 35-55)

**Changes:**
```tsx
// Add data-testid to email input
<Input
  id="email"
  data-testid="login-email"  // ADD THIS
  type="email"
  placeholder="name@company.com"
  // ... rest of props
/>

// Add data-testid to password input
<Input
  id="password"
  data-testid="login-password"  // ADD THIS
  type="password"
  // ... rest of props
/>

// Add data-testid to submit button
<Button
  type="submit"
  data-testid="login-submit"  // ADD THIS
  className="w-full"
  disabled={loading}
>
  {loading ? 'Signing in...' : 'Sign in'}
</Button>

// Add data-testid to error message container (if exists)
{error && (
  <div data-testid="login-error" className="...">  // ADD THIS
    {error}
  </div>
)}
```

**Also Add:** Profile/user menu data-testid for auth verification
- Find profile/user component (likely in `components/sidebar.tsx` or `components/header.tsx`)
- Add `data-testid="user-profile"` to the profile menu/name display

#### Blocker 5: Update Existing Tests to Use Helpers

**Problem:** Tests have inline login logic, no standardization

**File:** `e2e/auth.spec.ts`

**Changes:**
```typescript
import { test, expect } from '@playwright/test'
import { login, clearAuth, TEST_USER } from './helpers/auth'  // ADD THIS

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')

    // Update to use test IDs
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible()
  })

  test('shows validation error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Use test IDs
    await page.fill('[data-testid="login-email"]', 'invalid@test.com')
    await page.fill('[data-testid="login-password"]', 'wrongpassword')
    await page.click('[data-testid="login-submit"]')

    // Check for error message
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 10000 })
  })

  // UNSKIP this test after blockers fixed
  test('redirects to home after successful login', async ({ page }) => {
    // Use helper instead of inline login
    await login(page)

    // Verify we're on home page
    await expect(page).toHaveURL('/')

    // Verify user profile visible (profile shows real name, not "Brent CEO")
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible()
  })
})
```

**File:** `e2e/pipeline.spec.ts`

**Changes:**
```typescript
import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'  // ADD THIS

test.describe('Pipeline View', () => {
  test.beforeEach(async ({ page }) => {
    // Use helper instead of inline login
    await login(page)
  })

  // Rest of tests remain the same
})
```

---

### PHASE 1: Local Testing (Build Confidence)

**Estimated Time:** 1 hour

**Goal:** Get existing tests passing locally to verify infrastructure works

#### Step 1: Run Existing Tests Locally

```bash
cd /Users/rodericandrews/_PAI/projects/command_center_audience_os
npm run test:e2e
```

**Expected Results:**
- ✅ auth.spec.ts - 3 tests pass (including previously skipped one)
- ✅ pipeline.spec.ts - 4 tests pass
- ✅ intelligence.spec.ts - tests pass

**If tests fail:**
- Check test user exists locally (create via invitation flow if needed)
- Verify .env.local has correct Supabase credentials
- Check dev server is running

#### Step 2: Verify Auth Fix (Profile Loading)

**Goal:** Confirm profile shows real user name, not "Brent CEO"

**Test:** Add assertion to auth.spec.ts
```typescript
test('profile loads with real user data', async ({ page }) => {
  await login(page)

  // Should NOT show hardcoded "Brent CEO"
  await expect(page.locator('text=Brent CEO')).not.toBeVisible()

  // Should show actual test user name
  await expect(page.locator('[data-testid="user-profile"]')).toContainText('Test') // or actual name
})
```

#### Step 3: Verify Auth Enforcement

**Test:** Add test for unauthenticated redirect
```typescript
test('unauthenticated access redirects to login', async ({ page }) => {
  await clearAuth(page)
  await page.goto('/')

  // Should redirect to login
  await expect(page).toHaveURL(/\/login/)
})
```

**Success Criteria for Phase 1:**
- All existing tests pass locally
- Profile shows real user (not "Brent CEO")
- Unauthenticated users redirect to /login
- No auth hang (profile loads in <1000ms)

---

### PHASE 2: Production Testing (After Phase 1 Success)

**Estimated Time:** 1 hour

**Prerequisites:**
- Phase 0 blockers ALL fixed
- Phase 1 tests ALL passing locally
- Test user verified to exist in production database

#### Step 1: Run Basic Auth Test on Production

```bash
TEST_ENV=production npm run test:e2e -- auth.spec.ts
```

**Watch for:**
- Login succeeds (not 401/403)
- Profile loads (not "Brent CEO")
- No CORS errors
- No cookie domain issues

#### Step 2: Run Full Test Suite on Production

```bash
TEST_ENV=production npm run test:e2e
```

**Monitor:**
- All tests that passed locally also pass in production
- Response times (slower due to network, but should complete)
- No production data modification

#### Step 3: Document Results

**File:** `working/active-tasks.md`

Append verification results:
```markdown
## Auth Verification Complete (2026-01-XX)

### Phase 0: Blockers Fixed ✅
- Test user: test@audienceos.com (verified in production)
- playwright.config.ts: Supports TEST_ENV variable
- e2e/helpers/auth.ts: Created with login/clearAuth helpers
- Login components: Added data-testid attributes
- Existing tests: Updated to use helpers

### Phase 1: Local Testing ✅
- auth.spec.ts: 3/3 tests pass
- pipeline.spec.ts: 4/4 tests pass
- Profile shows real user (not "Brent CEO")
- Auth loads in <500ms (no hang)
- Unauthenticated redirect works

### Phase 2: Production Testing ✅
- auth.spec.ts: 3/3 tests pass on production
- Profile loads correctly on audienceos-agro-bros.vercel.app
- No CORS/cookie issues
- All three auth fixes verified:
  ✅ Auth enforcement (redirect works)
  ✅ Invitation flow (user exists and can log in)
  ✅ @supabase/ssr hang fix (profile loads quickly)
```

---

## Execution Order (Sequential - NO Shortcuts)

**CRITICAL:** Each phase BLOCKS the next. Do not skip ahead.

1. **PHASE 0: Fix All 5 Blockers** (2-3 hours)
   - Blocker 1: Verify test user with SQL query
   - Blocker 2: Update playwright.config.ts
   - Blocker 3: Create e2e/helpers/auth.ts
   - Blocker 4: Add data-testid to login components
   - Blocker 5: Update existing tests to use helpers
   - **Commit after each blocker fix**

2. **PHASE 1: Local Testing** (1 hour)
   - Run `npm run test:e2e` locally
   - Verify all tests pass
   - Add auth fix verification tests
   - **Only proceed if 100% pass rate**

3. **PHASE 2: Production Testing** (1 hour)
   - Run `TEST_ENV=production npm run test:e2e -- auth.spec.ts`
   - Verify auth works on audienceos-agro-bros.vercel.app
   - Run full suite on production
   - Document results in working/active-tasks.md

**Total Estimated Time:** 4-5 hours

---

## Success Criteria

### Phase 0 Complete When:
- ✅ Test user verified to exist (or created) in production
- ✅ playwright.config.ts supports TEST_ENV variable
- ✅ e2e/helpers/auth.ts exists with login/clearAuth functions
- ✅ Login page has all data-testid attributes
- ✅ All existing tests import and use helpers

### Phase 1 Complete When:
- ✅ `npm run test:e2e` passes 100% locally
- ✅ Profile shows real user name (NOT "Brent CEO")
- ✅ Unauthenticated access redirects to /login
- ✅ Auth completes in <1000ms (no hang)

### Phase 2 Complete When:
- ✅ `TEST_ENV=production npm run test:e2e` passes on production
- ✅ No CORS or cookie errors
- ✅ All three auth fixes verified:
  - Auth enforcement (redirect works)
  - Invitation flow (user can log in)
  - @supabase/ssr hang fix (profile loads quickly)
- ✅ Results documented in working/active-tasks.md

---

## Risk Mitigation

### If Phase 0 Fails:
- **Test user doesn't exist:** Create via Supabase Auth UI or invitation flow
- **Config breaks:** Revert to original, test locally first
- **Helpers have bugs:** Start with minimal login() function, expand incrementally

### If Phase 1 Fails:
- **Tests timeout:** Increase timeouts, check dev server logs
- **Profile shows "Brent CEO":** Auth fix didn't work, investigate use-auth.ts
- **Redirect doesn't work:** Check middleware.ts PUBLIC_ROUTES

### If Phase 2 Fails:
- **Production test user missing:** Verify in Supabase dashboard, create if needed
- **CORS errors:** Check Supabase CORS settings, may need allowlist
- **Cookie issues:** Test manually in browser first, verify cookies persist

---

## Notes from Validator

**Key Findings:**
- Original plan had 5 critical blockers that would cause immediate failure
- Confidence dropped from 7/10 to 3/10 after validation
- Infrastructure (helpers, test IDs) doesn't exist yet
- Credential conflicts need resolution
- Production safety concerns addressed by phased approach

**What Changed:**
- ❌ Removed: Immediate comprehensive test suite
- ✅ Added: Phase 0 to fix blockers first
- ✅ Added: Local testing phase to build confidence
- ✅ Changed: Standardize on test@audienceos.com (used by existing tests)
- ✅ Added: SQL verification step before any automation

**Why This Approach is Better:**
- Fixes infrastructure before writing tests
- Builds confidence locally before touching production
- Addresses each blocker systematically
- Reduces risk of production testing failures
- Provides clear stopping points to validate progress

---

## Future Enhancements (After Phases 0-2 Complete)

Once basic auth verification works, consider:
- Add comprehensive edge case tests (session expiry, concurrent sessions)
- Add RLS policy verification tests
- Add performance tests (profile load time)
- Add cross-browser testing (Firefox, WebKit)
- Create CI/CD pipeline for automated testing
- Add test coverage reporting

**But first:** Get the basics working with the phased approach above.

---

**Plan Status:** VALIDATED and REVISED
**Confidence:** 8/10 (after fixing blockers, down from 3/10 pre-fix)
**Ready to Execute:** Yes (follow phases sequentially)
