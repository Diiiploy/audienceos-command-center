# AudienceOS Command Center - Project Intelligence

**Project:** AudienceOS Command Center (Client Management Platform)
**Status:** 95% MVP Frontend Complete | 60% Full-Stack Complete
**Last Updated:** 2026-01-14
**Key Learning:** EP-085 "Frontend Complete, Backend Missing" Fallacy (see below)

---

## ⚠️ CRITICAL DISCOVERY: January 14, 2026

**FINDING:** Training Cartridges feature appears "complete" in UI but backend is **completely missing**.

| Layer | Status | Details |
|-------|--------|---------|
| **Frontend** | ✅ 100% Complete | 5 tabs render perfectly: Brand, Voice, Style, Preferences, Instructions |
| **API Routes** | ❌ 0% Complete | All 12 endpoints missing (`/api/v1/cartridges/*`) |
| **Database Tables** | ❌ 0% Complete | No cartridges, voice_cartridges, style_cartridges, preferences, instructions, training_docs tables |
| **Result** | ❌ Non-Functional | UI works but data never persists (404s on save) |

**Pattern:** This is the **"Frontend Complete, Backend Missing" Fallacy** - the most insidious project gap because:
- Static verification (file existence) says "looks good"
- Runtime verification (try to save) says "doesn't work"
- User feedback ("I can't save") → code investigation → ROOT CAUSE revealed

**Impact:** 5-day effort to add 12 API endpoints + 5 DB tables will get from "looks 95% done" to "actually 95% done."

**See:** ErrorPatterns.md (EP-085) + RUNBOOK.md (API Feature Verification)

---

## Quick Reference

| Resource | Location |
|----------|----------|
| Production URL | https://audienceos-agro-bros.vercel.app |
| GitHub | growthpigs/audienceos-command-center |
| Supabase | ebxshdqfaqupnvpghodi |
| Vercel | agro-bros/audienceos |
| Feature Status | features/INDEX.md (most accurate) |

---

## CRITICAL ARCHITECTURE: Diiiploy-Gateway MCP Integration

### The Pattern

**Instead of building custom OAuth flows for each service, use MCP-based integrations via Diiiploy-Gateway.**

```
┌─────────────────────────────────────────────────────────────┐
│                    AudienceOS Command Center                │
│                                                             │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐             │
│  │  Gmail    │   │ Calendar  │   │   Slack   │  ... etc    │
│  │Integration│   │Integration│   │Integration│             │
│  └─────┬─────┘   └─────┬─────┘   └─────┬─────┘             │
│        │               │               │                    │
│        └───────────────┼───────────────┘                    │
│                        ▼                                    │
│            ┌──────────────────────┐                         │
│            │   Diiiploy-Gateway   │                         │
│            │  (Cloudflare Worker) │                         │
│            │                      │                         │
│            │  Per-Agency Creds    │                         │
│            │  MCP Protocol        │                         │
│            │  50+ Tools           │                         │
│            └──────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Why MCP Instead of OAuth APIs?

1. **Per-User Authorization**: Each agency authorizes their own Workspace during onboarding
2. **Unified Protocol**: MCP handles Gmail, Calendar, Drive, Slack, etc. with same interface
3. **Credential Isolation**: Agency tokens stored per-agency, not app-level
4. **Simpler Onboarding**: User clicks authorize, enters tokens, done
5. **Google Workspace MCP**: Works with personal accounts (business accounts need different approach)

### Diiiploy-Gateway Location

```
infrastructure/cloudflare/cc-gateway/
├── src/
│   ├── index.ts        # Main router + MCP protocol handler
│   └── routes/
│       ├── gmail.ts    # Gmail: inbox, read, send, archive
│       ├── calendar.ts # Calendar: events, create
│       ├── drive.ts    # Drive: list, create, move, export
│       ├── sheets.ts   # Sheets: read, write, append
│       ├── docs.ts     # Docs: create, read, append
│       └── ...         # 15+ more service handlers
├── wrangler.toml
└── package.json
```

### Available MCP Tools (50+)

| Service | Tools | Status |
|---------|-------|--------|
| **Gmail** | inbox, read, send, archive | Ready |
| **Calendar** | events, create | Ready |
| **Drive** | list, folder_create, move, search, export, convert | Ready |
| **Sheets** | list, create, read, write, append, metadata | Ready |
| **Docs** | list, create, read, append, create_formatted | Ready |
| **Google Ads** | campaigns, performance | Needs Developer Token |
| **Meta Ads** | accounts, campaigns, insights, campaign_status | Needs App |
| **Slack** | **NOT YET IMPLEMENTED** | Needs Adding |
| **Supabase** | query, insert, rpc, buckets | Ready |
| **Mem0** | add, search | Ready |

### Integration Flow (How It Should Work)

1. **User goes to Settings > Integrations**
2. **Clicks "Connect Gmail"**
3. **Modal opens with credential entry form** (not OAuth popup)
4. **User enters their Google Workspace tokens**
5. **Tokens saved per-agency in Supabase (encrypted)**
6. **Diiiploy-Gateway uses those tokens for that agency's requests**

### TODO: Multi-Tenant Gateway

Currently cc-gateway uses **global** credentials from Cloudflare secrets.
Need to modify to:
1. Accept `agency_id` in requests
2. Look up agency-specific tokens from Supabase
3. Use those tokens for the API calls

---

## Integrations Status

| Integration | Code Built | Credentials | Gateway Route | UI Ready |
|-------------|------------|-------------|---------------|----------|
| Gmail | ✅ | ✅ Google OAuth set | ✅ | ❌ Needs credential entry |
| Calendar | ✅ | ✅ Same as Gmail | ✅ | ❌ Needs adding to integrations |
| Drive | ✅ | ✅ Same as Gmail | ✅ | ❌ Needs adding to integrations |
| Slack | ✅ OAuth flow | ❌ EMPTY | ❌ Not in gateway | ❌ Needs credential entry UI |
| Meta Ads | ✅ OAuth flow | ❌ EMPTY | ✅ | ❌ Needs credential entry |
| Google Ads | ✅ OAuth flow | ❌ Developer Token | ✅ | ❌ Blocked by Google approval |

---

## Critical Rules

### 1. Gemini 3 ONLY
No Gemini 2.x or 1.x. Check `lib/chat/service.ts`.

### 2. RLS on All Data
Every table has `agency_id`, every query filters by it. Multi-tenant isolation.

### 3. Credentials in Fetch
All API calls must include `{ credentials: 'include' }`.

### 4. pb-28 on Pages
Every page needs bottom padding for chat overlay.

### 5. Runtime Verification
Never rely on file existence checks. Execute commands to verify:
- `npm run build` - Build passes
- Claude in Chrome - UI works
- `curl /api/health` - API responds

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, Tailwind, Radix UI |
| State | Zustand |
| Backend | Next.js API Routes |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (email + Google OAuth) |
| AI | Gemini 3 (HGC ported) |
| Memory | Mem0 |
| Gateway | Diiiploy-Gateway (Cloudflare Worker) |

---

## Environment Variables

### Required for Integrations
```bash
# Google Workspace (Gmail, Calendar, Drive)
GOOGLE_CLIENT_ID=       # OAuth client ID
GOOGLE_CLIENT_SECRET=   # OAuth client secret

# Slack
SLACK_CLIENT_ID=        # From api.slack.com/apps
SLACK_CLIENT_SECRET=    # From api.slack.com/apps

# Meta Ads
META_APP_ID=            # From developers.facebook.com
META_APP_SECRET=        # From developers.facebook.com

# Diiiploy Gateway
DIIIPLOY_GATEWAY_URL=https://cc-gateway.roderic-andrews.workers.dev
DIIIPLOY_GATEWAY_API_KEY=   # For authenticated requests
```

---

## File Structure (Key Areas)

```
app/
├── api/v1/
│   ├── integrations/   # Integration CRUD + OAuth URLs
│   ├── oauth/callback/ # OAuth token exchange
│   └── clients/        # Client management
├── settings/
│   └── integrations/   # Integrations UI page

infrastructure/
└── cloudflare/
    └── cc-gateway/     # Diiiploy-Gateway (MCP aggregator)
        └── src/
            ├── index.ts    # Main router
            └── routes/     # Service handlers

lib/
├── chat/               # HGC chat system
├── sync/               # Data sync utilities
└── services/           # Business logic
```

---

## Real Current State (2026-01-14)

### ✅ COMPLETE & WORKING (9 MVP Features)
- **Dashboard** - KPIs, charts, metrics (verified E2E 2026-01-09)
- **Client Pipeline** - Kanban board, 20 test clients (verified E2E)
- **Communications Hub** - Email/Slack timeline, reply composer (partial integration)
- **Support Tickets** - Kanban board, ticket details (verified E2E)
- **Intelligence Center** - AI Chat with function calling to Gemini 3 (verified E2E)
- **Knowledge Base** - Document upload, search, RAG (verified E2E)
- **Automations** - Workflow engine, runs tracking (verified E2E)
- **Integrations Hub** - UI complete, OAuth flows stubbed (validated 2026-01-11)
- **Settings** - Agency + User management, all CRUD ops (verified 2026-01-05)

### 🚧 INCOMPLETE (Multi-Org Roles)
- **RBAC System** - Phase 4/4 done (client assignment UI), needs E2E browser testing

### ⚠️ PARTIALLY COMPLETE (Need Backend)
- **Training Cartridges** - 5 UI tabs 100% complete, 0% backend (12 endpoints + 5 tables missing)
- **Onboarding Hub** - Demo data seeded, needs E2E testing

### ❌ NOT YET STARTED
- Slack integration
- Multi-tenant credential storage
- Real Gmail/Calendar/Drive sync (OAuth flows exist, handlers stubbed)

---

## Realistic 30K Foot Assessment

**Status:** The app LOOKS 95% done because:
- ✅ All 9 core features have working UIs
- ✅ Most APIs exist and work
- ✅ Database schema complete
- ✅ Auth working, production deployed

**But ACTUALLY is ~60% done because:**
- ⚠️ Training Cartridges: Frontend done, backend completely missing (5 days of work)
- ⚠️ Integrations: Stubbed OAuth, no real Gmail/Slack/Meta data flowing
- ⚠️ Multi-Org Roles: UI done, not tested end-to-end
- ⚠️ Real-world data: No Gmail sync, no Slack sync, no performance data (still mock data)

---

## Next Steps (What ACTUALLY Needs Doing)

### TIER 1: CRITICAL (Blocking "Actually Works" Claim)
1. **Training Cartridges Backend** (5 days)
   - Create 5 DB tables (cartridges, voice, style, preferences, instructions)
   - Implement 12 API endpoints with CRUD + processing
   - Wire up Gemini calls for brand blueprint generation
   - Run 53-test suite created 2026-01-14
   - **Impact:** Cartridges go from "looks good" to "actually works"

2. **E2E Test Multi-Org Roles** (1 day)
   - Use Claude in Chrome to test role assignment UI
   - Verify permissions enforced on data access
   - **Impact:** RBAC system goes from "code works" to "feature works"

### TIER 2: HIGH (Real Features)
3. **Real Gmail Sync** (3 days)
   - Implement token storage in Supabase (per-agency)
   - Build OAuth callback → store refresh token
   - Create scheduled job to fetch new emails
   - **Impact:** Communications Hub shows real Gmail data, not placeholders

4. **Real Slack Sync** (3 days)
   - Add Slack to diiiploy-gateway
   - Implement token storage + scheduled sync
   - Display Slack messages in timeline

### TIER 3: MEDIUM (Polish)
5. **Multi-Tenant Credentials** - Per-agency token storage
6. **Real Google Ads** - Replace mock data with actual campaign metrics
7. **Real Meta Ads** - Same as Google Ads

---

*Last verified: 2026-01-14 | **Updated with EP-085 learning about Static vs Runtime verification***
