# AudienceOS Command Center - Runbook

> **Operational reference for development, deployment, and troubleshooting**
> Last Updated: 2026-01-05
>
> **Recent Updates (2026-01-05):** Chat system loading optimizations, API response structure fixes, deployment workflow documentation

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build with TypeScript check |
| `npm run typecheck` | Run TypeScript without building |
| `npm run test` | Run Vitest tests |
| `npm run format` | Format with Prettier |

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

### Required for Development

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Supabase Dashboard → Settings → API |

### AI Services

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `ANTHROPIC_API_KEY` | Claude API key | console.anthropic.com |
| `GOOGLE_AI_API_KEY` | Gemini API key (for RAG) | console.cloud.google.com |

### OAuth Integrations

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SLACK_CLIENT_ID` | Slack OAuth app ID | api.slack.com/apps |
| `SLACK_CLIENT_SECRET` | Slack OAuth secret | api.slack.com/apps |
| `SLACK_SIGNING_SECRET` | Slack webhook verification | api.slack.com/apps |
| `GOOGLE_CLIENT_ID` | Google OAuth (Gmail + Ads) | console.cloud.google.com |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | console.cloud.google.com |
| `META_APP_ID` | Meta (Facebook) app ID | developers.facebook.com |
| `META_APP_SECRET` | Meta app secret | developers.facebook.com |

### Security (Required for Production)

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| `OAUTH_STATE_SECRET` | HMAC key for OAuth CSRF protection | `openssl rand -hex 32` |
| `TOKEN_ENCRYPTION_KEY` | AES-256 key for token encryption | `openssl rand -hex 32` |

**Important:** Production builds will fail without these keys. See `instrumentation.ts` for startup validation.

### Monitoring (Optional)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `SENTRY_DSN` | Sentry error tracking (server) | sentry.io |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking (client) | sentry.io |

---

## Local Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or pnpm
- Git
- Supabase CLI (optional, for local DB)

### First-Time Setup

```bash
# 1. Clone repository
git clone https://github.com/growthpigs/audienceos-command-center.git
cd audienceos-command-center

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Start development server
npm run dev
```

### With Local Supabase (Optional)

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > types/database.ts
```

---

## Build & Deployment

### Current Status: Production Deployed ✅

| Environment | URL | Status |
|-------------|-----|--------|
| **Production** | [audienceos-agro-bros.vercel.app](https://audienceos-agro-bros.vercel.app) | Active |
| **Vercel Project** | [vercel.com/agro-bros/audienceos](https://vercel.com/agro-bros/audienceos) | Active |

**Deployment:** Auto-deploys on push to `main` branch.

### Production Build

```bash
npm run build
```

Build output:
- 11 static pages
- 24 API routes (dynamic)
- TypeScript check included

### Vercel Environment Variables

| Variable | Status | Notes |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set | `audienceos-cc-fresh` project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Set | JWT format |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | Server-only |
| `GOOGLE_AI_API_KEY` | ✅ Set | Gemini for chat |
| `OAUTH_STATE_SECRET` | ✅ Set | Security |
| `TOKEN_ENCRYPTION_KEY` | ✅ Set | Security |

---

## Database Operations

### Regenerate Types

When database schema changes:

```bash
# From remote Supabase
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

# From local Supabase
supabase gen types typescript --local > types/database.ts
```

### Run Migrations

```bash
# Local
supabase db push

# Remote (via Supabase Dashboard or CLI)
supabase db push --linked
```

---

## ✅ Database Configuration (Completed 2026-01-04)

### Active Supabase Project

| Property | Value |
|----------|-------|
| **Project Name** | `audienceos-cc-fresh` |
| **Project ID** | `qzkirjjrcblkqvhvalue` |
| **Organization** | Badaboost |
| **URL** | `https://qzkirjjrcblkqvhvalue.supabase.co` |

### Schema Status: Applied ✅

The AudienceOS schema (`supabase/migrations/001_initial_schema.sql`) has been applied with all 19 tables:

| Table | Purpose |
|-------|---------|
| `agency` | Tenant root (multi-tenant) |
| `user` | Team members |
| `client` | Client accounts |
| `client_assignment` | Owner/collaborator assignments |
| `stage_event` | Pipeline stage history |
| `task` | Action items |
| `integration` | OAuth connections |
| `communication` | Messages (Slack/Gmail) |
| `alert` | System notifications |
| `document` | Knowledge base files |
| `chat_session` | AI chat sessions |
| `chat_message` | AI chat messages |
| `ticket` | Support tickets |
| `ticket_note` | Ticket comments |
| `workflow` | Automation definitions |
| `workflow_run` | Automation executions |
| `user_preference` | User settings |
| `kpi_snapshot` | Performance metrics |
| `ad_performance` | Ad platform data |

### Seed Data: Present ✅

Test users configured:
- `test@audienceos.dev` - Test User
- `dev@audienceos.dev` - Dev User
- `test@audienceos.com` - Test User
- `admin@acme.agency` - Admin User

### RLS: Enabled ✅

All tables have Row-Level Security with `auth.jwt() ->> 'agency_id'` isolation.

### Regenerate Types (If Schema Changes)

```bash
supabase gen types typescript --project-id qzkirjjrcblkqvhvalue > types/database.ts
```

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/clients` | GET, POST | List/create clients |
| `/api/v1/clients/[id]` | GET, PATCH, DELETE | Client CRUD |
| `/api/v1/clients/[id]/stage` | PUT | Move client stage |
| `/api/v1/clients/[id]/communications` | GET | Client messages |
| `/api/v1/tickets` | GET, POST | List/create tickets |
| `/api/v1/tickets/[id]` | GET, PATCH, DELETE | Ticket CRUD |
| `/api/v1/tickets/[id]/status` | PUT | Update ticket status |
| `/api/v1/tickets/[id]/notes` | POST | Add ticket note |
| `/api/v1/tickets/[id]/resolve` | POST | Resolve ticket |
| `/api/v1/tickets/[id]/reopen` | POST | Reopen ticket |
| `/api/v1/integrations` | GET, POST | List/create integrations |
| `/api/v1/integrations/[id]` | GET, PATCH, DELETE | Integration CRUD |
| `/api/v1/integrations/[id]/sync` | POST | Trigger sync |
| `/api/v1/integrations/[id]/test` | POST | Test connection |
| `/api/v1/workflows` | GET, POST | List/create workflows |
| `/api/v1/workflows/[id]` | GET, PATCH, DELETE | Workflow CRUD |
| `/api/v1/workflows/[id]/toggle` | POST | Enable/disable |
| `/api/v1/workflows/[id]/runs` | GET | Execution history |
| `/api/v1/communications/[id]` | GET, PATCH | Message operations |
| `/api/v1/communications/[id]/reply` | POST | Send reply |
| `/api/v1/communications/[id]/thread` | GET | Get thread |
| `/api/v1/oauth/callback` | GET | OAuth callback handler |

---

## Troubleshooting

### Build Fails with TypeScript Errors

```bash
# Check TypeScript errors
npm run typecheck

# Regenerate database types if schema changed
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

### Supabase Connection Issues

1. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` is valid
3. Ensure RLS policies allow access
4. Check Supabase Dashboard for service status

### OAuth Integration Failures

1. Verify client ID and secret are correct
2. Check redirect URIs match in provider console
3. Verify scopes are properly configured
4. Check token expiry and refresh logic

### API Returns 401/403

1. Check JWT token is present in Authorization header
2. Verify user has correct role/permissions
3. Check RLS policies in Supabase

---

## Monitoring & Alerts

### Health Checks (Local Development)

- **Build Status**: `npm run build` (local verification)
- **Database**: Supabase Dashboard → Database
- **API Errors**: Browser console / Sentry (when configured)

### Key Metrics to Watch

- API response times (< 500ms target)
- Error rate (< 1% target)
- Database connection pool usage
- OAuth token refresh failures

---

## Security Checklist

### Implemented (2026-01-02)
- [x] OAuth state signing with HMAC-SHA256 (SEC-001)
- [x] Token encryption with AES-256-GCM (SEC-002)
- [x] agency_id from database lookup, not JWT (SEC-003)
- [x] Centralized auth middleware (SEC-004)
- [x] Token revocation on disconnect (SEC-005)
- [x] Server-verified auth with `getUser()` (SEC-006)
- [x] Startup validation fails production if keys missing

### Ongoing
- [ ] Never commit `.env.local` or secrets
- [ ] Use Supabase RLS for all tables
- [ ] Validate all API inputs with Zod
- [ ] Rotate API keys every 90 days
- [ ] Review Supabase auth policies

### Pre-Beta (P1 Tech Debt)
- [ ] Add CSRF tokens to state-changing requests (TD-005)
- [ ] Implement distributed rate limiting (TD-004)
- [ ] Fix IP spoofing in rate limiter (TD-008)

---

## Verification Commands

Commands for diagnosing and verifying fixes. Use these when troubleshooting issues.

### Dev Server Stability Check

When suspecting infinite loops or excessive re-renders:

```bash
# 1. Start dev server and capture output
npm run dev 2>&1 | tee /tmp/nextjs-output.log

# 2. In another terminal, monitor log line count (should stabilize)
watch -n 1 'wc -l /tmp/nextjs-output.log'

# Healthy: Line count stabilizes (e.g., 37 lines after page load)
# Unhealthy: Line count grows continuously (1000+ lines/minute = infinite loop)
```

### Network Request Monitoring (Claude in Chrome)

When RSC/API requests seem excessive:

1. Open Claude in Chrome tab context
2. Navigate to app URL
3. Use `read_network_requests` with `urlPattern: "RSC"` or `urlPattern: "/api/"`
4. Check for:
   - 503 errors (server overwhelmed)
   - Request count growing rapidly
   - Repeated identical requests

```
# Expected: Single RSC request per navigation
# Problem: 1000+ RSC requests = infinite re-render loop
```

### API Response Verification

```bash
# Test unauthenticated API returns mock data (demo mode)
curl -s http://localhost:3000/api/v1/workflows | jq '.demo, .workflows | length'
# Expected: true, 5 (or number of mock workflows)

# Test with authentication
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/workflows | jq '.demo'
# Expected: null or absent (not demo mode)
```

### Console Log Monitoring (Claude in Chrome)

```javascript
// Check for React hook warnings
mcp__claude-in-chrome__read_console_messages({
  tabId: TAB_ID,
  pattern: "Maximum update depth|Cannot update|infinite loop"
})
```

### Root Cause Patterns (EP-057)

When infinite loops occur, check:
1. **Singleton clients**: `lib/supabase.ts` - does `createClient()` return same instance?
2. **Effect dependencies**: Check for router/URL state in useEffect deps
3. **State-URL sync**: Does updating URL cause state change that updates URL again?

See `~/.claude/troubleshooting/error-patterns.md` EP-057 for full pattern.

### Dev Server Lock File / Port Conflicts (2025-01-02)

When dev server fails to start with "Unable to acquire lock" or port conflicts:

```bash
# 1. Check what's using ports 3000-3003
lsof -i :3000 -i :3001 -i :3002 -i :3003 | grep LISTEN

# 2. Kill existing Next.js processes
pkill -f "next dev"

# 3. Remove stale lock file
rm -f .next/dev/lock

# 4. Restart cleanly
npm run dev

# 5. Verify running (should show node listening)
lsof -i :3000 | head -3
```

**Root Cause:** Multiple dev sessions or crashed servers leave lock files. Context window resets lose track of background processes.

**Prevention:** Always `pkill -f "next dev"` before starting new session.

### Runtime Environment Verification (Static vs Runtime Check)

**Never trust file existence alone.** Always verify runtime:

```bash
# WRONG - File exists but may be empty/invalid:
ls .env.local  # Shows file exists but doesn't prove config loads

# RIGHT - Runtime verification:
npm run build 2>&1 | head -20  # Proves TypeScript compiles
curl http://localhost:3000/api/v1/workflows | jq '.demo'  # Proves API responds
```

See error-patterns.md "File Existence Fallacy" pattern.

### Settings API Verification (2026-01-04)

**Agency Settings (Admin Only)**

```bash
# Fetch agency configuration
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/settings/agency | jq '.data | {name, timezone, pipeline_stages}'

# Update agency settings
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agency",
    "timezone": "America/New_York",
    "pipeline_stages": ["Lead", "Onboarding", "Live", "Support"]
  }' \
  http://localhost:3000/api/v1/settings/agency | jq '.data.name'
```

**User Management (Admin Only)**

```bash
# List team members
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/settings/users?limit=10 | jq '.data | length'

# Update user role (prevents last admin removal)
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "user"}' \
  http://localhost:3000/api/v1/settings/users/USER_ID | jq '.data.role'

# Delete user with client reassignment
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reassign_to": "OTHER_USER_ID"}' \
  http://localhost:3000/api/v1/settings/users/USER_ID | jq '.message'
```

**Expected Responses:**
- GET agency: 200 with agency config
- PATCH agency: 200 with updated config
- GET users: 200 with paginated list
- PATCH user: 200 with updated user OR 400 if last admin
- DELETE user: 200 with success message OR 400 if reassignment needed

**Permission Checks:**
- All endpoints return 403 if user is not admin
- Last admin protection prevents role demotion
- Self-deletion is blocked

---

### Schema Verification (Before Any DB Changes) (2026-01-03)

**CRITICAL:** Never plan database migrations from documentation alone. Always verify actual schema.

```bash
# 1. Check actual tables in RevOS Supabase
# Via migration files (in chronological order):
ls -la /Users/rodericandrews/_PAI/projects/revos/supabase/migrations/*.sql | head -10
cat /path/to/revos/supabase/migrations/001_initial_schema.sql | head -100

# 2. Check for table name discrepancies
# Expected: 'tenants' | Actual: 'agencies' (RevOS uses 'agencies')
grep -n "CREATE TABLE" /path/to/revos/supabase/migrations/*.sql | head -20

# 3. Check FK patterns in users table
grep -A10 "CREATE TABLE users" /path/to/revos/supabase/migrations/001_*.sql
# Expected: users.id REFERENCES auth.users(id)
# Actual: users.id is standalone UUID (manual sync)

# 4. Check cartridge tables
grep -n "cartridge" /path/to/revos/supabase/migrations/*.sql
# Expected: Single 'cartridges' table
# Actual: 4 tables (style_cartridges, preference_cartridges, etc.)

# 5. Check RLS policies for JWT claim pattern
grep -n "app_metadata" /path/to/revos/supabase/migrations/*.sql
grep -n "tenant_id\|agency_id" /path/to/revos/supabase/migrations/*.sql
# Expected: tenant_id | Actual: agency_id

# 6. Via Supabase Dashboard (if CLI not configured)
# https://supabase.com/dashboard/project/trdoainmejxanrownbuz/database/tables
```

**Verification Checklist (Pre-Migration):**
```
□ Queried actual tables (not assumed from docs)
□ Documented discrepancies between docs and reality
□ Updated execution plan to match ACTUAL schema
□ Tested RLS pattern matches JWT claims in use
□ Created RUNTIME-FINDINGS.md if major discrepancies found
```

**Related:** EP-061 "Schema Assumption Fallacy" in error-patterns.md

---

## Chat System Architecture & Deployment (2026-01-05)

### How Chat Loading Works

**Critical path (should be <16ms from page load to chat visible):**

1. **app/layout.tsx** - Root layout mounts
2. **useEffect (line 36)** - Portal host set to `document.body` (~1ms)
3. **shouldShowChat decision (line 58)** - Check: `chatPortalHost && !excludedPath` (NOT `!isLoading`)
4. **createPortal() renders ChatInterface** into document.body (~5-10ms)
5. **ChatInterface mounts** and renders persistent input bar (should appear immediately)
6. **Message panel slides up on focus** (when user clicks input)
7. **Auth completes in background** (doesn't block chat UI)

**Key:** Chat appears IMMEDIATELY, auth/data fetching happens asynchronously.

### Common Chat Loading Bugs (Fixed 2026-01-05)

#### Bug #1: Chat blocked by auth loading
**Symptom:** Chat takes 10-15 seconds to appear after page load
**Root cause:** `shouldShowChat &&= !isLoading` gate prevents render until auth completes
**Fix:** Remove `isLoading` from condition. Chat renders immediately, auth happens in background.
**Status:** ✅ Fixed in commit `0c78d04`

#### Bug #2: API response structure mismatch
**Symptom:** Chat shows "I received your message." instead of actual API response
**Root cause:**
- API returns: `{ message: { id, content, route, ... }, sessionId }`
- Chat expected: `{ id, content, route, ... }` (flat structure)
**Fix:** Extract `data.message` before accessing properties
**Status:** ✅ Fixed in commit `c61e8d9`

#### Bug #3: Message panel narrower than input bar
**Symptom:** Messages appear misaligned/narrower than input field below
**Root cause:** Messages used `max-w-[80%]` while input bar was 85% width
**Fix:** Change message max-width to `max-w-[85%]` to match input bar
**Status:** ✅ Fixed in commit `088fe6c`

#### Bug #4: Supabase auth getSession() hangs
**Symptom:** App takes 30+ seconds to load, or timeout at 5s mark
**Root cause:** `autoRefreshToken: true` + `detectSessionInUrl: true` caused infinite hangs
**Fix:** Disable both options, rely on cookie-based session
**Status:** ✅ Fixed in commit `68e427b`

### Deployment Checklist (CRITICAL)

**BEFORE DEPLOYING:**

- [ ] **Commit all changes** to local repo (`git status` shows clean)
- [ ] **Run tests** (`npm run test` passes)
- [ ] **Type check** (`npm run typecheck` no errors)
- [ ] **Build locally** (`npm run build` succeeds)
- [ ] **PUSH to GitHub** (`git push origin main` - DO NOT FORGET THIS!)
- [ ] **Verify on GitHub** - Open GitHub repo and confirm commits appear

**AFTER PUSHING:**

- [ ] **Verify Vercel auto-deploys** (check Vercel dashboard, should trigger within 1-2 min)
- [ ] **Check deployment status** (Vercel shows "Ready" not "Building" or "Failed")
- [ ] **Test in production** (hard refresh with Cmd+Shift+R or Ctrl+Shift+R)
- [ ] **Check browser console** for diagnostic logs:
  ```
  [CHAT-VIS] Visibility decision: { shouldShowChat: true, isLoading: ... }
  [CHAT-COMPONENT] ChatInterface mounted
  ```
- [ ] **Type a message** and verify:
  - Chat shows actual response (not "I received your message.")
  - Route indicator displays (Web/RAG/Dashboard/Casual)
  - Timestamp and message align properly

### Common Deployment Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Forgot to push to GitHub | Code committed locally but Vercel deploys old version | `git push origin main` |
| Edited wrong file | Changes don't take effect | Search codebase for correct import location |
| Changed API response structure without updating UI | Chat shows fallback text | Extract nested data structure in chat component |
| Uncommitted changes | Some fixes missing from deployment | `git add -A && git commit` |
| Hard-refresh browser not done | Seeing cached old JavaScript | Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows) |
| Environment variables changed on Vercel | API calls fail with 401/500 | Check Vercel project settings → Environment Variables |

### Debugging Deployed Chat Issues

**Chat not appearing at all:**
1. Check browser console for errors
2. Run `[CHAT-VIS]` log should appear immediately (not after delay)
3. Check if route is in `EXCLUDED_PATHS` ["/login", "/invite", "/onboarding"]
4. Verify `app/layout.tsx` includes `<ChatInterface>` in createPortal

**Chat shows "I received your message." on all replies:**
1. Check API response in Network tab
2. Look for `{ message: { ... }, sessionId: "..." }` structure
3. If correct, chat component needs line `const messageData = data.message`
4. If wrong structure, API route returned invalid format

**Message panel misaligned with input bar:**
1. Inspect message bubble width in DevTools
2. Should be `max-w-[85%]` same as input bar (`width: 85%`)
3. If different, input bar padding/margin needs adjustment

**Auth timeout/hang:**
1. Check Supabase status (Status page)
2. Verify `lib/supabase.ts` has `autoRefreshToken: false`
3. Run `npm run dev` and check for network waterfall in DevTools
4. If `getSession()` takes >5s, check Supabase connection

---

## Related Documents

- [DEVELOPER-ONBOARDING.md](./DEVELOPER-ONBOARDING.md) - Setup guide for new devs
- [DEVOPS.md](../04-technical/DEVOPS.md) - CI/CD and infrastructure
- [API-CONTRACTS.md](../04-technical/API-CONTRACTS.md) - Full API specification
- [DATA-MODEL.md](../04-technical/DATA-MODEL.md) - Database schema

---

*Living Document - Update when operational procedures change*
