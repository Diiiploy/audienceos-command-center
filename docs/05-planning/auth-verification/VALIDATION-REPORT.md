# Critical Validation: Auth Verification Plan for AudienceOS Command Center

**Date:** 2026-01-06
**Validator:** Chi (Critical QA Mode)
**Project:** `/Users/rodericandrews/_PAI/projects/command_center_audience_os`

---

## Executive Summary

**Confidence Before:** 7/10 (plan looks comprehensive)
**Confidence After:** 3/10 (multiple critical assumptions unverified, infrastructure gaps, production safety concerns)

**Critical Blockers Found:** 5
**Major Issues Found:** 8
**Minor Issues Found:** 4

**Recommendation:** DO NOT PROCEED without addressing Critical Blockers 1-5. The plan assumes infrastructure that doesn't exist and test data that isn't verified.

---

## Phase 1: Core Assumption Verification

### ✅ VERIFIED (with evidence)

#### 1. Production URL is Correct and Accessible
- **Assumption:** audienceos-agro-bros.vercel.app is the real production URL
- **Proof:**
  - `CLAUDE.md:44` states "Production URL: audienceos-agro-bros.vercel.app"
  - `docs/06-reference/RUNBOOK.md` lists it as "Production | Active"
  - Deployment confirmed as of 2026-01-05
- **Status:** ✅ VERIFIED

#### 2. Middleware PUBLIC_ROUTES Array Exists
- **Assumption:** middleware.ts has PUBLIC_ROUTES array
- **Proof:** `middleware.ts:59-65` contains PUBLIC_ROUTES with /login, /auth/callback, /invite routes
- **Status:** ✅ VERIFIED

#### 3. Hooks File Has Required Functions
- **Assumption:** hooks/use-auth.ts has getSessionFromCookie and fetchProfileDirect
- **Proof:**
  - `hooks/use-auth.ts:21-52` - getSessionFromCookie() implementation
  - `hooks/use-auth.ts:58-91` - fetchProfileDirect() implementation
- **Status:** ✅ VERIFIED

#### 4. Playwright is Installed
- **Assumption:** Playwright dependencies are present
- **Proof:**
  - `package.json:93` - "@playwright/test": "^1.57.0"
  - `package.json:12-13` - Scripts test:e2e and test:e2e:ui exist
  - `playwright.config.ts` exists and configured
- **Status:** ✅ VERIFIED

---

### ⚠️ UNVERIFIED (needs validation before proceeding)

#### 1. Test Credentials Exist and Work in Production
- **Assumption:** e2e.test2@gmail.com exists in production database with password TestPassword123!
- **Risk:** Tests will fail immediately if user doesn't exist or password is wrong
- **Evidence Found:**
  - ❌ NO SQL seed files contain e2e.test2@gmail.com
  - ❌ NO database migrations create this user
  - ✅ `working/active-tasks.md` mentions "e2e.test2@gmail.com" as credentials
  - ✅ `working/active-tasks.md` states "Verified: Full login → dashboard with real user profile 'E2E Tester'"
  - ❌ BUT: No proof user exists in PRODUCTION database (qzkirjjrcblkqvhvalue.supabase.co)
- **Critical Question:** Was this user created manually? Does it exist in production or only local?
- **How to Verify:**
  ```sql
  -- Run in Supabase SQL Editor (production project)
  SELECT id, email, first_name, last_name, role
  FROM "user"
  WHERE email = 'e2e.test2@gmail.com';
  ```

#### 2. Test User Has Correct Profile Data
- **Assumption:** e2e.test2@gmail.com has first_name="E2E" last_name="Tester"
- **Risk:** Test assertions checking for "E2E Tester" will fail if name is different
- **Evidence Found:**
  - ✅ `working/active-tasks.md` states profile showed "E2E Tester" during manual testing
  - ❌ NO database seed proving this data exists
- **How to Verify:** Same SQL query as above

#### 3. Production Has Test Data (Clients)
- **Assumption:** Production database has 20+ clients for testing
- **Risk:** Tests expecting client data may fail or give false positives with empty data
- **Evidence Found:**
  - ✅ `supabase/migrations/012_complete_seed.sql` seeds 6 clients for Diiiploy agency
  - ❌ Migration was for agency_id '11111111-1111-1111-1111-111111111111'
  - ❌ Test user's agency_id unknown - may not have access to these clients due to RLS
- **Critical Question:** What agency_id is e2e.test2@gmail.com associated with? Does RLS allow access to test data?
- **How to Verify:**
  ```sql
  -- Check user's agency and client count
  SELECT u.agency_id, a.name as agency_name, COUNT(c.id) as client_count
  FROM "user" u
  LEFT JOIN agency a ON u.agency_id = a.id
  LEFT JOIN client c ON c.agency_id = u.agency_id
  WHERE u.email = 'e2e.test2@gmail.com'
  GROUP BY u.agency_id, a.name;
  ```

#### 4. Auth Cookies Work in Playwright External Tests
- **Assumption:** Playwright can authenticate against external production URL
- **Risk:** CORS, cookie domain restrictions, or CSP headers may block auth
- **Evidence Found:**
  - ⚠️ Current `playwright.config.ts:11` has `baseURL: 'http://localhost:3000'`
  - ❌ NO production environment configuration exists
  - ❌ NO existing tests verify external URL authentication
  - ⚠️ Plan proposes environment variable approach, but config file doesn't support it yet
- **How to Verify:**
  1. Update playwright.config.ts to support TEST_ENV variable
  2. Run a simple login test against production
  3. Check if cookies are set and persist across requests

#### 5. Test User Can Access Profile Route
- **Assumption:** /api/v1/user/profile returns data for test user
- **Risk:** RLS policies may block access, API may return 401
- **Evidence Found:**
  - ✅ `hooks/use-auth.ts:69` shows direct REST API call to `/rest/v1/user?id=eq.{userId}`
  - ⚠️ Uses Postgres REST endpoint (not app API route)
  - ❌ NO verification that RLS policies allow this query for test user
- **How to Verify:**
  ```bash
  # Test direct API access (need to get access_token from login first)
  curl -X GET \
    "https://qzkirjjrcblkqvhvalue.supabase.co/rest/v1/user?id=eq.{USER_ID}&select=*" \
    -H "apikey: {ANON_KEY}" \
    -H "Authorization: Bearer {ACCESS_TOKEN}"
  ```

---

## Phase 2: Missing Edge Cases

### Critical Edge Cases NOT Covered

#### 1. Test User Doesn't Exist in Production
- **Scenario:** e2e.test2@gmail.com was created locally but never seeded to production
- **Impact:** ALL tests fail immediately with "Invalid login credentials"
- **Detection:** No pre-flight check in plan to verify user exists
- **Fix Needed:** Add setup script that verifies or creates test user before running tests

#### 2. Test User Exists But Password is Wrong
- **Scenario:** User exists but password was changed or is different in production
- **Impact:** All tests fail at login step
- **Detection:** Plan has no password verification mechanism
- **Fix Needed:** Document password reset process or secure password storage strategy

#### 3. Test User Exists But Is Disabled
- **Scenario:** User record has `is_active = false`
- **Impact:** Login succeeds but access is denied by middleware or RLS
- **Detection:** Plan doesn't check user.is_active status
- **Fix Needed:** Add assertion after login to verify user is active

#### 4. Test User Has No Agency Association
- **Scenario:** User exists but agency_id is NULL or invalid
- **Impact:** Dashboard loads but shows no data due to RLS filtering by agency_id
- **Detection:** Tests expecting client data will fail, but won't know why
- **Fix Needed:** Add agency_id verification in test setup

#### 5. Production Data is in Different State
- **Scenario:** Production was reset, seeded differently, or has live customer data
- **Impact:** Tests expecting specific client names or counts fail unpredictably
- **Detection:** No data state verification before tests run
- **Fix Needed:** Use read-only assertions (check structure, not specific values)

#### 6. Rate Limits on Login Attempts
- **Scenario:** Supabase has rate limiting on auth endpoints (likely)
- **Impact:** Parallel tests or rapid re-runs get 429 errors
- **Detection:** Plan runs tests in parallel without rate limit handling
- **Fix Needed:** Add rate limit handling, use auth token caching between tests

#### 7. Session Expiry During Test Suite
- **Scenario:** Test suite runs longer than session TTL (default 1 hour)
- **Impact:** Later tests fail with 401 even though login succeeded
- **Detection:** No session refresh logic in test helpers
- **Fix Needed:** Add session refresh before each test or use longer-lived tokens

#### 8. CSRF Token Mismatch
- **Scenario:** Middleware sets CSRF cookie, but Playwright doesn't send it back
- **Impact:** POST requests to API routes fail with CSRF validation error
- **Detection:** Plan doesn't mention CSRF handling in test helpers
- **Fix Needed:** Ensure CSRF cookie is captured and sent with API requests

#### 9. Auth Cookie Domain Restrictions
- **Scenario:** Cookie set with secure/sameSite strict flags doesn't work in test context
- **Impact:** Login appears to succeed but cookie isn't accessible to subsequent requests
- **Detection:** No cookie validation in test helpers
- **Fix Needed:** Add explicit cookie verification after login

#### 10. Profile Loading Race Condition
- **Scenario:** Dashboard page renders before profile fetch completes
- **Impact:** Tests see loading state or default fallback, not real profile
- **Detection:** Plan uses generic waitForTimeout(2000) which may be too short or long
- **Fix Needed:** Wait for specific data attributes or loading states to complete

---

## Phase 3: Configuration Validation

### playwright.config.ts Issues

#### ❌ CRITICAL: No Environment Variable Support
```typescript
// Current config (line 11):
baseURL: 'http://localhost:3000',

// Plan assumes:
baseURL: process.env.TEST_ENV === 'production'
  ? 'https://audienceos-agro-bros.vercel.app'
  : 'http://localhost:3000',
```
**Status:** NOT IMPLEMENTED - Config must be updated before running production tests

#### ❌ CRITICAL: webServer Config Will Break Production Tests
```typescript
// Current config (lines 21-26):
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 120000,
},
```
**Problem:** webServer always starts local dev server, even for production tests
**Impact:** Tests may hit localhost instead of production, giving false results
**Fix:** Conditionally disable webServer when TEST_ENV=production

#### ✅ MINOR: Projects Array is Minimal
- Only has 'chromium' project
- Missing Firefox/WebKit for cross-browser testing
- Not blocking, but production tests should verify multiple browsers

### package.json Scripts

#### ✅ VERIFIED: Existing Scripts Work
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
```
**Status:** Scripts exist and will run tests

#### ⚠️ CONFLICT RISK: Proposed Scripts May Collide
Plan proposes:
```json
"test:auth": "playwright test e2e/auth-comprehensive.spec.ts",
"test:auth:prod": "TEST_ENV=production playwright test e2e/auth-comprehensive.spec.ts"
```
**Risk:** If added, these are fine. But script naming should follow existing pattern (test:e2e:*)
**Recommendation:** Use "test:e2e:auth" and "test:e2e:auth:prod" for consistency

### Environment Variables

#### ❌ CRITICAL: No .env.test File
- Plan assumes .env.test exists for test credentials
- File does NOT exist in project
- Tests will use .env.local which has production credentials (security risk)

#### ⚠️ SECURITY: Production Credentials in .env.local
`.env.local` contains REAL production keys:
- NEXT_PUBLIC_SUPABASE_URL (qzkirjjrcblkqvhvalue.supabase.co)
- SUPABASE_SERVICE_ROLE_KEY (exposed in readable file)
- OAUTH_STATE_SECRET, TOKEN_ENCRYPTION_KEY

**Risk:** If tests create data, they'll create it in production
**Fix:** Create .env.test with TEST_ENV variable, document in plan

#### ✅ VERIFIED: MOCK_MODE Disabled
`.env.local:68` has `NEXT_PUBLIC_MOCK_MODE=false`
Production auth is enforced as expected.

---

## Phase 4: Test Implementation Gaps

### Selector Robustness Issues

#### ⚠️ FRAGILE: Generic Input Selectors
```typescript
// Proposed in plan:
await page.fill('input[type="email"]', email)
```
**Problem:** Multiple email inputs may exist on page (search, filters, etc)
**Risk:** Test fills wrong input, gets false positive/negative
**Fix:** Use more specific selectors:
```typescript
await page.fill('form [id="email"]', email) // Target form's email input
await page.fill('[data-testid="login-email"]', email) // Use test IDs
```

#### ⚠️ FRAGILE: Text-Based Assertions
```typescript
// Proposed:
expect(page.locator('text=E2E Tester')).toBeVisible()
```
**Problem:** Text may appear in multiple places (comments, logs, other users)
**Risk:** Test passes but isn't checking the right element
**Fix:** Use specific component selectors:
```typescript
expect(page.locator('[data-testid="user-profile-name"]')).toHaveText('E2E Tester')
```

#### ❌ CRITICAL: No Test IDs in Existing Components
- Checked `app/login/page.tsx` - NO data-testid attributes
- Checked `components/sidebar.tsx` (inferred) - NO test attributes
- Plan assumes robust selectors but UI isn't instrumented

**Impact:** Tests will be brittle, break on UI changes
**Fix:** Add data-testid attributes to key components before writing tests

### Wait/Timeout Issues

#### ⚠️ ARBITRARY: 10000ms Timeouts
```typescript
// Proposed:
await expect(page).toHaveURL('/', { timeout: 10000 })
```
**Problem:** 10 seconds is arbitrary - may be too long (slows tests) or too short (flaky)
**Fix:** Use Playwright's default timeout (30s) or configure per-test based on observed behavior

#### ❌ ANTI-PATTERN: waitForTimeout Usage
```typescript
// Existing in pipeline.spec.ts:23:
await page.waitForTimeout(2000)
```
**Problem:** Race condition - data may not load in 2 seconds, or may waste 2 seconds waiting
**Fix:** Wait for specific element or network idle:
```typescript
await page.waitForSelector('[data-testid="client-card"]')
// or
await page.waitForLoadState('networkidle')
```

### Error Handling Gaps

#### ❌ MISSING: No Error Recovery
Plan doesn't handle:
- What if login button is disabled?
- What if network request fails mid-test?
- What if unexpected modal/popup appears?

**Fix:** Add try/catch blocks and meaningful error messages:
```typescript
try {
  await page.click('button[type="submit"]')
} catch (e) {
  throw new Error(`Failed to click login button. Button state: ${await page.$eval('button[type="submit"]', btn => btn.disabled)}`)
}
```

---

## Phase 5: Dependency Verification

### File Existence Check

#### ✅ EXISTS: e2e/auth.spec.ts
- File exists at `/Users/rodericandrews/_PAI/projects/command_center_audience_os/e2e/auth.spec.ts`
- Contains 3 tests (login page render, invalid credentials, successful login - SKIPPED)
- Line 31 comment: "FIXME: Test credentials don't work with mock auth - needs Supabase test user"

#### ✅ EXISTS: e2e/pipeline.spec.ts
- File exists with 4 tests
- Lines 7-8 use 'test@audienceos.com' credentials (different from plan's e2e.test2@gmail.com)
- CONFLICT: Existing tests use different credentials than plan proposes

#### ❌ DOES NOT EXIST: e2e/helpers/auth.ts
- Directory `/e2e/helpers/` does NOT exist
- Plan assumes helper file exists with reusable auth functions
- Must be created from scratch

#### ❌ DOES NOT EXIST: scripts/test-auth.sh
- No `scripts/` directory in project root
- Plan proposes test execution script that doesn't exist
- Must be created

### Credential Conflicts

#### ⚠️ CRITICAL: Multiple Test Accounts
Plan proposes: `e2e.test2@gmail.com`
Existing tests use: `test@audienceos.com`

**Problem:** Plan doesn't address existing test account
**Questions:**
1. Does test@audienceos.com exist in production?
2. Should we migrate existing tests to e2e.test2@gmail.com?
3. Or should we update plan to use test@audienceos.com?

**Evidence from existing tests:**
- `e2e/auth.spec.ts:35` - Uses test@audienceos.com
- `e2e/pipeline.spec.ts:7` - Uses test@audienceos.com
- `e2e/intelligence.spec.ts` - Uses test@audienceos.com

**Recommendation:** Document which account is correct, update all tests consistently

---

## Phase 6: Production Safety

### Data Modification Risks

#### ⚠️ MEDIUM: Tests May Create Data
Plan includes tests that:
- Log in (creates session records)
- Fetch profile (read-only, safe)
- Load dashboard (read-only, safe)
- Navigate pages (read-only, safe)

**Current Risk:** Low - no write operations proposed
**Future Risk:** High - if tests are extended to create clients, tickets, etc.

**Safeguards Needed:**
1. Use read-only test account (role = viewer)
2. Add API-level checks to prevent test user from writes
3. Use dedicated test agency that can be reset

#### ❌ HIGH: No Cleanup After Tests
- Tests don't clean up auth sessions
- Auth tokens may accumulate in Supabase auth.sessions table
- No rate limit consideration

**Fix:** Add afterAll hook to sign out and clean up

#### ⚠️ MEDIUM: Test User Has Admin Role?
If e2e.test2@gmail.com has role='admin', tests running in production could:
- Access all agencies (if RLS is misconfigured)
- Trigger admin-only features
- Create/delete users

**Mitigation:** Verify test user has minimal permissions

### Interference with Real Users

#### ⚠️ LOW: Shared Database
Tests run against same database as live users
**Risk:** Test queries may slow down production
**Mitigation:** Run tests during low-traffic hours or use read replicas

#### ✅ ISOLATED: Separate Agency
If test user is in dedicated test agency, RLS prevents data leakage
**Verify:** Confirm e2e.test2@gmail.com is NOT in a real customer agency

---

## ❌ FOUND ISSUES

### Critical Issues (Block Implementation)

#### CRITICAL-1: Test User May Not Exist in Production
- **Impact:** All tests fail immediately
- **Evidence:** No seed file, no migration creating e2e.test2@gmail.com
- **Fix:** Run SQL to verify user exists, or create setup script to seed test user

#### CRITICAL-2: playwright.config.ts Doesn't Support Production Tests
- **Impact:** Tests always hit localhost, never production
- **Evidence:** Config has hardcoded baseURL and webServer
- **Fix:** Update config to support TEST_ENV variable BEFORE running any tests

#### CRITICAL-3: No Test Helper Infrastructure
- **Impact:** Cannot write comprehensive tests as proposed
- **Evidence:** e2e/helpers/ directory doesn't exist
- **Fix:** Create helper file with auth utilities before writing test suite

#### CRITICAL-4: Test Credentials Conflict
- **Impact:** Existing tests use different email, causing confusion
- **Evidence:** auth.spec.ts uses test@audienceos.com, plan uses e2e.test2@gmail.com
- **Fix:** Standardize on ONE test account, update all references

#### CRITICAL-5: No data-testid Attributes in Components
- **Impact:** Tests will be brittle, break on UI refactors
- **Evidence:** login/page.tsx has no test IDs
- **Fix:** Add data-testid to critical UI elements before writing selectors

### Major Issues (Risk of False Positives/Negatives)

#### MAJOR-1: No RLS Verification
- **Impact:** Tests may pass but user can't access data in production
- **Fix:** Add SQL queries to verify RLS policies work for test user

#### MAJOR-2: No Session Persistence Verification
- **Impact:** Auth may succeed but cookies don't persist
- **Fix:** Add explicit cookie checks after login

#### MAJOR-3: No Rate Limit Handling
- **Impact:** Tests may get 429 errors on rapid re-runs
- **Fix:** Add retry logic and rate limit detection

#### MAJOR-4: No CSRF Handling
- **Impact:** API tests may fail with CSRF errors
- **Fix:** Add CSRF token extraction and header inclusion

#### MAJOR-5: Arbitrary Timeouts
- **Impact:** Tests flaky or slow
- **Fix:** Use event-based waits instead of fixed timeouts

#### MAJOR-6: No Error Recovery
- **Impact:** Cryptic test failures without actionable info
- **Fix:** Add try/catch with detailed error messages

#### MAJOR-7: No Production Data State Assumptions
- **Impact:** Tests expect specific clients that may not exist
- **Fix:** Use structural assertions (check fields exist, not specific values)

#### MAJOR-8: No Cleanup Strategy
- **Impact:** Sessions accumulate, potential auth token leakage
- **Fix:** Add afterAll hooks to sign out

### Minor Issues (Best Practice)

#### MINOR-1: No Cross-Browser Testing
- **Impact:** Chrome-specific bugs may slip through
- **Fix:** Add Firefox and WebKit to playwright.config projects

#### MINOR-2: Script Naming Inconsistency
- **Impact:** Confusing package.json scripts
- **Fix:** Use test:e2e:* prefix for consistency

#### MINOR-3: No .env.test Documentation
- **Impact:** Developers may accidentally test against production
- **Fix:** Create .env.test.example with safe defaults

#### MINOR-4: No Test Coverage Reporting
- **Impact:** Unknown how much auth flow is covered
- **Fix:** Add Playwright coverage plugin

---

## Missing from Plan (Additional Coverage Needed)

### Authentication Edge Cases

1. **Login with wrong password** ✅ (plan covers this)
2. **Login with non-existent email** ❌ (not covered)
3. **Login with disabled user** ❌ (not covered)
4. **Session expiry handling** ❌ (not covered)
5. **Concurrent session limits** ❌ (not covered)
6. **Password reset flow** ❌ (not covered)
7. **OAuth social login** ❌ (not covered, but may not apply)

### Authorization Edge Cases

1. **User with no agency access** ❌ (not covered)
2. **User with role=viewer vs admin** ❌ (not covered)
3. **RLS blocking queries** ❌ (not covered)
4. **Cross-agency data leakage** ❌ (not covered)

### Performance Edge Cases

1. **Large dashboard data sets** ❌ (not covered)
2. **Slow network simulation** ❌ (not covered)
3. **Concurrent user load** ❌ (not covered)

---

## Confidence Score

### Before Validation: 7/10
**Reasoning:** Plan looked comprehensive with 7 test groups, clear structure, good helpers

### After Validation: 3/10
**Reasoning for Drop:**

1. **Infrastructure Missing (-2):** Test helpers don't exist, playwright config won't work
2. **Test User Unverified (-1):** Core assumption that e2e.test2@gmail.com exists is unproven
3. **Credential Conflicts (-1):** Existing tests use different account, no plan to reconcile
4. **No Test IDs (-1):** UI isn't instrumented, tests will be brittle
5. **Production Safety Unclear (-1):** RLS policies unverified, cleanup strategy missing

**Would be 8/10 if:**
- Test user existence was confirmed with SQL query results
- playwright.config.ts changes were made FIRST
- e2e/helpers/auth.ts was created
- data-testid attributes were added to components
- Credential conflicts were resolved

---

## Recommendations

### Immediate Actions (Before Writing Any Tests)

1. **Verify test user exists:**
   ```sql
   SELECT * FROM "user" WHERE email = 'e2e.test2@gmail.com';
   ```
   If doesn't exist, create with known password.

2. **Update playwright.config.ts:**
   ```typescript
   const isProduction = process.env.TEST_ENV === 'production'
   export default defineConfig({
     baseURL: isProduction
       ? 'https://audienceos-agro-bros.vercel.app'
       : 'http://localhost:3000',
     webServer: isProduction ? undefined : { /* ... */ },
   })
   ```

3. **Create e2e/helpers/auth.ts** with login helper

4. **Add data-testid to app/login/page.tsx:**
   ```tsx
   <Input id="email" data-testid="login-email" ... />
   <Input id="password" data-testid="login-password" ... />
   <Button type="submit" data-testid="login-submit" ... />
   ```

5. **Standardize test credentials:** Choose ONE account (either test@audienceos.com or e2e.test2@gmail.com), update all tests

### Next Steps (Sequential)

1. Fix playwright config
2. Create test helpers
3. Verify test user in production DB
4. Add test IDs to login page
5. Write simplified login test (just verify auth works)
6. THEN expand to full test suite

### Production Testing Strategy

**Recommendation:** Use STAGING environment, not production

If staging doesn't exist:
1. Create dedicated test agency in production
2. Use read-only test user
3. Run tests during maintenance windows
4. Add monitoring to detect test-generated load

---

## Final Verdict

**Status:** 🔴 DO NOT PROCEED with current plan

**Blockers:**
1. Test user existence unverified
2. Playwright config incompatible with production tests
3. No test infrastructure (helpers)
4. UI not instrumented for testing
5. Credential conflicts between plan and existing tests

**Estimated Effort to Fix:** 4-6 hours
1. Verify/create test user (30 min)
2. Update playwright config (30 min)
3. Create test helpers (1 hour)
4. Add test IDs to components (1-2 hours)
5. Reconcile credentials (30 min)
6. Write first passing test (1 hour)
7. Expand to full suite (2-3 hours)

**Alternative Approach:**
Start with LOCAL testing first:
1. Get existing skipped test (auth.spec.ts:31) to pass locally
2. Add test helpers incrementally
3. Instrument UI with test IDs
4. THEN tackle production testing

This builds confidence in infrastructure before risking production testing.

---

**End of Critical Validation Report**
