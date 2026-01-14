# AudienceOS Command Center - RUNBOOK

**Status:** Production active | 95% MVP complete
**Last Updated:** 2026-01-12
**For strategy/status:** See CLAUDE.md | **For day-to-day ops:** This file

---

## ⚡ Quick Navigation

**Starting a work session?** Go to "Development Workflow" below.
**Something broken?** Jump to "Troubleshooting" (Ctrl+F).
**Need to verify a feature works?** See "Claude in Chrome: Verification Protocol."
**Checking deployment status?** See "URLs & Deployment."

---

## ⚠️ TEMPORARY: Kaizen Logo for Demo (2026-01-14)

**STATUS:** Logo temporarily swapped from AudienceOS to Kaizen for demo purposes.

**Files Changed:**
- `components/kaizen-logo.tsx` - New Kaizen logo component (original AudienceOS logo in comments)
- `app/login/page.tsx` - Uses KaizenLogo
- `app/signup/page.tsx` - Uses KaizenLogo
- `app/forgot-password/page.tsx` - Uses KaizenLogo
- `app/reset-password/page.tsx` - Uses KaizenLogo
- `components/linear/sidebar.tsx` - Sidebar logo changed to "kaizen"
- `components/sidebar.tsx` - Sidebar logo changed to "kaizen"

**TO REVERT AFTER DEMO:**
1. Delete `components/kaizen-logo.tsx`
2. In each auth page, restore original `AudienceOSLogo` component (code preserved in `kaizen-logo.tsx`)
3. In sidebars, restore audienceOS text branding
4. Or just `git revert` the commit that added Kaizen branding

**Tracked in:** Mem0 (chi user) - search "Kaizen logo temporary"

---

## 🔧 Development Workflow

### 1. Before You Start

```bash
# Verify you're on latest main
git checkout main && git pull

# Check what's being worked on (status, completion %)
cat features/INDEX.md

# Check active blockers
cat CLAUDE.md  # See "🚀 Active Work" section
```

### 2. Making Changes

```bash
# Edit code in your editor
vim lib/chat/service.ts

# Build locally to catch errors BEFORE committing
npm run build

# If build fails: read the error, fix it, try again
# Common: missing imports, type mismatches, undefined variables

# Commit with clear message
git add . && git commit -m "feat: description of what changed"

# Push to main (Vercel will auto-deploy)
git push
```

### 3. Verify on Production

```bash
# Wait ~2 minutes for Vercel deployment
# Navigate to: https://audienceos-agro-bros.vercel.app

# Test the feature:
# - Click through the UI
# - Check Console for errors
# - Check Network tab for failed requests
# - Take screenshots if claiming "works"
```

### 4. Update Tracking

```bash
# At end of session, log work to project sheet:
mcp__chi-gateway__sheets_append({
  spreadsheetId: "15wGY-DlE1BV5VBLpU_Jghi3nGiPviaNZXXl9Wth68GI",
  range: "Sheet2!A:E",
  values: [["2026-01-14", "Fixed pipeline loading bug", "3", "Bug Fix", "✅"]]
})
```

---

## 🌐 URLs & Deployment

| Environment | URL | Status |
|-------------|-----|--------|
| **Production** | [audienceos-agro-bros.vercel.app](https://audienceos-agro-bros.vercel.app) | ✅ Active |
| **GitHub** | [growthpigs/audienceos-command-center](https://github.com/growthpigs/audienceos-command-center) | Main branch |
| **Vercel** | [vercel.com/agro-bros/audienceos](https://vercel.com/agro-bros/audienceos) | Deployment logs |

**Deployment:** Push to `main` → Vercel auto-deploys → Check URL after 2 min

---

## 📱 Claude in Chrome: Verification Protocol

**Use this EVERY TIME you claim a feature works.** Don't guess—verify runtime behavior.

### Setup
1. Open Claude in Chrome (MCP tool)
2. Navigate to [audienceos-agro-bros.vercel.app](https://audienceos-agro-bros.vercel.app)
3. Sign in as test user (available in Supabase)

### Verification Steps
1. **Navigate to feature** - Click through UI to the feature you changed
2. **Trigger the action** - Click button, fill form, whatever should happen
3. **Check Console** - Open DevTools → Console tab
   - Look for red errors (means something broke)
   - Look for custom logs (if you added them)
4. **Check Network** - Open DevTools → Network tab
   - Trigger action again
   - Look for failed requests (red X = 400/500 error)
   - Click successful request → preview tab to see response
5. **Take screenshot** - If claiming "works", show proof (not just "I added the code")

### Examples

**Claim:** "Fixed the client loading issue"
**Evidence:**
- Screenshot showing Network tab with successful `/api/v1/clients` response
- Console showing no errors
- UI showing client list loaded

**Claim:** "Chat is working"
**Evidence:**
- Screenshot showing chat interface
- Network tab showing POST to `/api/chat/route.ts` with response
- Console showing Gemini response parsed correctly

---

## ✅ Verification Commands (Runtime-First Checks)

**CRITICAL RULE:** Never rely on file existence checks alone. Always execute runtime verification.

### Build & Test Verification
```bash
# Verify build passes (REQUIRED before claiming fix)
npm run build

# Run specific test suite
npm run test -- --run __tests__/api/

# Check for TypeScript errors
npx tsc --noEmit
```

### API Endpoint Verification
```bash
# Health check for production
curl -s https://audienceos-agro-bros.vercel.app/api/v1/health | jq .status

# Test client API (requires auth cookie)
# Use Claude in Chrome to verify authenticated endpoints
```

### UI Component Verification (Claude in Chrome Required)
```
# For Add Client Modal:
1. Navigate to Pipeline view
2. Click "Add Client" button
3. Verify modal opens with form fields
4. Check Console for errors
5. Take screenshot as evidence

# For Command Palette:
1. Press Cmd+K (Mac) or Ctrl+K (Windows)
2. Verify navigation items appear (Go to Dashboard, Go to Pipeline, etc.)
3. Test "New Client" quick action opens modal
4. Verify actual navigation works (not just UI display)
```

### API Feature Verification (CRITICAL - Added 2026-01-14)

**RULE:** Before claiming a feature is "complete", verify the FULL STACK works:

```bash
# Step 1: Verify API endpoint EXISTS (not 404)
echo "🔍 Checking if /api/v1/cartridges/voice exists..."
curl -X POST https://audienceos-agro-bros.vercel.app/api/v1/cartridges/voice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(get_auth_token)" \
  -d '{"name":"test-voice"}' 2>/dev/null | jq -r '.error // .id'

# Expected: Either error message (400/401) or ID (200) - NOT 404
# If you see: curl: (7) Failed to connect OR "404 Not Found" → ENDPOINT DOESN'T EXIST

# Step 2: Verify database table exists
echo "🔍 Checking if voice_cartridges table exists..."
# Use Supabase UI at https://supabase.com/dashboard/project/[project-id]/editor
# Or query via API:
curl -X GET https://ebxshdqfaqupnvpghodi.supabase.co/rest/v1/voice_cartridges \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" 2>/dev/null | jq '.error'

# Expected: No error, or "Unauthorized" (401) - NOT "relation does not exist"

# Step 3: Test full integration (UI → API → Database)
echo "🔍 Running full-stack cartridge test..."
npm run test:e2e -- cartridges.spec.ts

# Expected: Tests pass without "404" or "relation does not exist" errors
```

**Cartridges Status (2026-01-14):**
```
Component Status:
├─ UI Rendering: ✅ 100% (all 5 tabs load)
├─ Form Validation: ✅ 100% (required fields, formats)
├─ Component State: ✅ 100% (manages form data locally)
├─ API Endpoints: ❌ 0% (5 routes missing)
├─ Database Tables: ❌ 0% (no cartridge schema)
├─ Data Persistence: ❌ 0% (lost on page reload)
└─ ACTUAL COMPLETION: ~25% (UI only, no backend)

Missing Endpoints:
  ❌ POST /api/v1/cartridges/voice (Create voice cartridge)
  ❌ POST /api/v1/cartridges/style/upload (Upload style documents)
  ❌ POST /api/v1/cartridges/style/analyze (Analyze writing style)
  ❌ POST /api/v1/cartridges/preferences (Save preferences)
  ❌ POST /api/v1/cartridges/instructions (Create instruction set)
  ❌ POST /api/v1/cartridges/instructions/[id]/upload (Upload training docs)
  ❌ POST /api/v1/cartridges/instructions/[id]/process (Process documents)
  ❌ POST /api/v1/cartridges/brand (Save brand info)
  ❌ POST /api/v1/cartridges/brand/blueprint (Generate 112-Point Blueprint)
  ❌ POST /api/v1/cartridges/brand/logo (Upload logo)
```

### Data Contract Verification
```bash
# Check API response shape matches frontend expectations
# Example: Verify stage enum values match
grep -r "VALID_STAGES" app/api/v1/clients/

# Frontend stage values must match backend EXACTLY
# Known issue (fixed): "Off-Boarding" vs "Off-boarding" case mismatch
```

### Session Verification Commands Added: 2026-01-14
- **Issue Found:** Frontend used `Off-boarding`, API validated against `Off-Boarding`
- **Impact:** Clients silently got wrong stage on creation
- **Verification:** Always grep both frontend and backend for enum values

### Email Delivery Verification (2026-01-14 - Critical Fix)

**Issue:** Boolean logic bug `!== false` showed success when email status was undefined
**Fix Applied:** Changed to `=== true`, added `email_sent?: boolean` type
**Verification Command:**

```bash
# 1. Verify code change
git log --oneline | head -2
# Should show: "fix: Correct boolean logic and add type safety to email delivery"

# 2. Run test suite
npm test 2>&1 | tail -20
# Expect: 711 passed, 4 unrelated failures in auth-callback tests

# 3. Verify build succeeds
npm run build 2>&1 | tail -5
# Expect: "✓ Compiled successfully"

# 4. RUNTIME TEST: Trigger onboarding in production
# Use Claude in Chrome to navigate to:
# https://audienceos-agro-bros.vercel.app/onboarding
# Click "Trigger Onboarding" button
# Enter test email: rodericandrews+test@gmail.com
# Submit and verify toast notification is ACCURATE:
#   - If Resend API succeeds: "Onboarding link sent!"
#   - If Resend API fails: "Onboarding created, but email failed"
# Check Resend dashboard: https://resend.com/emails
# Verify email delivery status matches toast message

# 5. Edge case: Simulate undefined email_sent
# Check network response in DevTools:
# Network tab → /api/v1/onboarding/instances POST
# Response should include: "email_sent": true/false (never undefined)
```

**Critical Rule for Future Sessions:**
- Never assume API response includes boolean fields - check actual JSON response
- Always execute `npm test` before claiming type-safety fix
- Always test on production UI (not just code review)
- Boolean comparisons: use `=== true`/`=== false`, never `!== false`

---

## 🐛 Troubleshooting

### Build Fails After Changes
```bash
npm run build
# Read the error message carefully
# Common issues:
# - Import missing: Add "import X from 'y'"
# - Type error: Check property names match interface
# - Undefined variable: Make sure it's declared

# Fix it, commit, push
git add . && git commit -m "fix: issue"
git push
```

### "401 No session" on API Calls
**Issue:** Feature data won't load, Network tab shows 401 responses
**Fix:** Fetch calls need `{ credentials: 'include' }`
```typescript
// ❌ WRONG - no cookies sent
const response = await fetch('/api/v1/clients');

// ✅ CORRECT - browser sends auth cookie
const response = await fetch('/api/v1/clients', {
  credentials: 'include'
});
```
**Already fixed in:** All stores, hooks (Commit 59cd1e6). If adding new API call, add this option.

### Sidebar Shows "Loading... Member" Forever
**Issue:** User profile in sidebar footer won't load
**Root Cause:** Stale Supabase auth cookie from old project
**Fix Options:**

Option 1 (Quick): Clear cookies in DevTools
- Open DevTools → Application → Cookies
- Delete all `sb-*-auth-token` cookies
- Refresh page

Option 2 (JavaScript): Run in console
```javascript
// Delete the stale cookie
document.cookie = 'sb-OLD_PROJECT_REF-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
location.reload();
```

Option 3 (Permanent): Fix was applied in Commit 69c4881
- `hooks/use-auth.ts` now extracts project ref from env var
- Specifically looks for `sb-{projectRef}-auth-token`
- Ignores stale cookies from other projects

### TypeScript Errors in Editor
**Issue:** VS Code shows red squiggles, but code might still compile
```bash
# Get the actual errors:
npx tsc --noEmit

# Or run full build:
npm run build
```

### Feature Not Loading on Production
**Scenario:** Code looks correct, builds pass, but feature doesn't work on prod
**Debug Steps:**

1. **Take screenshot** of broken state
2. **Open DevTools Console** → Look for errors
3. **Open DevTools Network** → Did requests succeed?
4. **Check response data** → Click request → Preview tab
5. **Search for similar issues** in CLAUDE.md troubleshooting section

**Don't assume.** Check actual network responses and console output.

### Phantom Numbers in Sidebar (UI-001)
**Issue:** Random numbers (61, 12, 8) appear next to menu items
**Root Cause:** NOT a code bug—usually browser extension or cached build
**Fix:**
```bash
# 1. Clear Next.js cache
rm -rf .next && npm run dev

# 2. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

# 3. Disable extensions temporarily
# Check if numbers disappear—if yes, one of your extensions is the cause

# 4. Check React DevTools accessibility tree is off
```

---

## 🔌 Environment Setup

### Local Development (`.env.local`)
```bash
# Copy example
cp .env.example .env.local

# Fill in actual values:
NEXT_PUBLIC_SUPABASE_URL=https://ebxshdqfaqupnvpghodi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_AI_API_KEY=AIza...
```

**Don't commit `.env.local`** - It's gitignored for security.

### Vercel Secrets
All env vars are also set in Vercel project settings (handled by Roderic/admins).
No additional action needed—just commit code, push, Vercel uses its env vars.

---

## 📊 Active Work Assignments

### Roderic (Main Branch)
**Current Status:** Core features complete, Phase 4/5 of multi-org roles in progress

**What's Done:**
- ✅ All 12 MVP features (pipeline, dashboard, chat, integrations, etc.)
- ✅ Gemini 3 chat integration working end-to-end
- ✅ Supabase auth (email/password + Google OAuth)
- ✅ Multi-org roles Phase 1-4 (RLS, middleware, API routes, client assignment UI)

**What's In Progress:**
- 🚧 Multi-org roles Phase 5 (E2E testing)
- 🚧 Dark mode toggle

**Next Up:**
- Phase 5 E2E testing for multi-org roles
- Integrate Trevor's OAuth signup branch
- Production hardening

### Trevor (OAuth Branch)
**Current Status:** OAuth working, signup page pending

**What's Done:**
- ✅ Google OAuth provider configured (Supabase)
- ✅ "Sign in with Google" button on login page
- ✅ OAuth callback handler at `/auth/callback/route.ts`
- ✅ Verified working end-to-end with Google account chooser

**What's In Progress:**
- Signup page at `/signup` (email/password + Google SSO)
- Google SSO toggle in settings

**How to Coordinate:**
1. Trevor creates PR from `trevor/oauth-backend` → `main`
2. Roderic reviews and merges
3. Test on production URL after merge

---

## 🔗 External Dependencies

### Diiiploy-Gateway (MCP Aggregator) - CRITICAL ARCHITECTURE

**Location:** `infrastructure/cloudflare/cc-gateway/`
**URL:** https://cc-gateway.roderic-andrews.workers.dev
**Status:** ✅ Deployed (63 MCP tools)

**Purpose:** MCP-based integration gateway. Instead of building OAuth flows for each service, we use a single gateway with 50+ MCP tools.

**Architecture Pattern:**
```
User Onboarding → Enter Credentials → Store per-agency → Gateway uses agency tokens
```

**Available MCP Tools (50+):**
| Service | Tools |
|---------|-------|
| Gmail | inbox, read, send, archive |
| Calendar | events, create |
| Drive | list, folder_create, move, search, export |
| Sheets | list, create, read, write, append |
| Docs | list, create, read, append |
| Google Ads | campaigns, performance |
| Meta Ads | accounts, campaigns, insights |
| Supabase | query, insert, rpc |
| Mem0 | add, search |

**Deployment Command:**
```bash
cd infrastructure/cloudflare/cc-gateway
wrangler deploy
```

**Adding New Integration:**
1. Create handler in `src/routes/[service].ts`
2. Add MCP tool definition in `src/index.ts` MCP_TOOLS array
3. Add case in `executeToolCall` switch
4. Deploy with `wrangler deploy`

**Credential Entry UI Required:**
Users need to enter their own tokens during onboarding:
- Slack: Client ID, Client Secret, Signing Secret
- Google Workspace: Done via OAuth (credentials already set)
- Meta: App ID, App Secret

### diiiploy-gateway (Legacy Reference)
**URL:** https://diiiploy-gateway.roderic-andrews.workers.dev

**Purpose:** Centralized API gateway for third-party integrations (Google Ads, DataForSEO, etc.)

**Available Endpoints:**
- `/google-ads/*` - Google Ads API (campaigns, performance, customers)
- `/dataforseo/*` - SEO enrichment (keyword ideas, SERP, domain analysis)

**Note:** AudienceOS uses diiiploy-gateway (not chi-gateway). Chi-gateway is personal PAI infrastructure.

### Google Ads Integration Status
| Component | Status | Notes |
|-----------|--------|-------|
| OAuth Flow | ✅ Complete | Refresh token obtained |
| Gateway Secrets | ✅ Complete | All credentials configured |
| Developer Token | ⚠️ Pending | Requires Google approval (5 days) |
| Sync Implementation | ✅ Complete | Code ready at `lib/sync/google-ads-sync.ts` |
| Live Testing | ⏳ Blocked | Waiting on Developer Token approval |

**To Unblock:** Apply for Google Ads API Standard Access at https://ads.google.com/home/tools/manager-accounts/

### DataForSEO Integration
**Status:** ✅ Working (Fixed EP-072: Jan 10)
**Issue:** `dataforseo_ideas` endpoint expects `keywords` array, not `keyword` string
**Fix Location:** `lib/sync/google-ads-sync.ts` → getKeywordIdeas function
**Verification:**
```bash
curl -s https://diiiploy-gateway.roderic-andrews.workers.dev/health | jq .tools
# Should include 7 DataForSEO tools with fix
```

---

## 📧 Email Infrastructure

**Status:** ⏳ Waiting on DNS configuration

### Current State
- Supabase custom SMTP: DISABLED (using built-in with rate limits)
- Resend account: EXISTS (org: rodericandrews)
- Email issue: Signup confirmation emails don't send

### Solution (Requires DNS Access)
Use subdomain: `audienceos.diiiploy.io`

**Steps:**
1. Add domain to Resend: [resend.com/domains](https://resend.com/domains)
2. Add DNS records Resend provides (MX, SPF, DKIM)
3. Enable custom SMTP in Supabase Auth settings
4. Use `noreply@audienceos.diiiploy.io` as sender

**Owner:** Roderic (DNS access needed)

---

## 💾 Database Info

**Supabase Project:** `audienceos-cc-fresh` (Project ID: `ebxshdqfaqupnvpghodi`)
**Connection:** Secure (SSL required), RLS enabled on all tables

### Key Tables
| Table | Purpose | RLS | Rows |
|-------|---------|-----|------|
| agency | Tenant root | ✅ | 1 test |
| user | Team members | ✅ | 4 test |
| client | Customers | ✅ | 20 test |
| stage_event | Pipeline history | ✅ | 100+ |
| integration | Connected platforms | ✅ | 8 test |
| communication | Email/Slack threads | ✅ | 50+ |
| ticket | Support tickets | ✅ | 5+ |
| document | Knowledge base | ✅ | 9 test |
| onboarding | Intake hub instances | ✅ | 4 demo |

### Test Credentials
Query test users:
```sql
SELECT id, email, first_name FROM "user"
ORDER BY created_at DESC LIMIT 5;
```

---

## 🔐 Critical Rules

**These are non-negotiable. Violating them breaks production.**

1. **Gemini 3 ONLY** - No Gemini 2.x or 1.x anywhere. Check `lib/chat/service.ts`
2. **RLS on all data** - Every table has `agency_id`, every query filters by it
3. **Credentials in fetch** - All API calls must include `{ credentials: 'include' }`
4. **pb-28 on pages** - Every page needs bottom padding for chat overlay
5. **E2E verification** - Test on production with Claude in Chrome, don't guess

See CLAUDE.md for detailed explanation of each rule.

---

## 📋 Commands Reference

```bash
# Development
npm run dev          # Local server (NOT recommended—use Vercel)
npm run build        # Production build (run before committing)
npm run lint         # ESLint check
npm run typecheck    # TypeScript check

# Database
supabase gen types   # Generate TypeScript types from schema

# Deployment
git push             # Triggers Vercel auto-deploy
```

---

## 🎯 When to Update This File

Update RUNBOOK.md when:
- ✅ Fixing a bug (add to Troubleshooting section)
- ✅ Changing a deployment step (update URLs & Deployment)
- ✅ Starting new active work (update Active Work Assignments)
- ✅ External dependency status changes (update diiiploy-gateway section)
- ❌ Don't repeat info from CLAUDE.md (reference it instead)

---

## 🔗 Quick Links

| Link | Purpose |
|------|---------|
| [CLAUDE.md](CLAUDE.md) | Project strategy, status, architecture |
| [features/INDEX.md](features/INDEX.md) | Feature completion tracking |
| [docs/01-product/MVP-PRD.md](docs/01-product/MVP-PRD.md) | What we're building |
| [docs/04-technical/ARCHITECTURE.md](docs/04-technical/ARCHITECTURE.md) | How it works |
| [Project Sheet](https://docs.google.com/spreadsheets/d/15wGY-DlE1BV5VBLpU_Jghi3nGiPviaNZXXl9Wth68GI) | Work tracking |

---

*Last verified: 2026-01-12 | Production working ✅ | All blockers resolved ✅*
