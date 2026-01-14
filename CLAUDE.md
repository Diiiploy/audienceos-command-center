# AudienceOS Command Center - Project Intelligence

**Project:** AudienceOS Command Center (Client Management Platform)
**Status:** 95% MVP Complete | Integrations Phase
**Last Updated:** 2026-01-14

---

## Quick Reference

| Resource | Location |
|----------|----------|
| Production URL | https://audienceos-agro-bros.vercel.app |
| GitHub | growthpigs/audienceos-command-center |
| Supabase | ebxshdqfaqupnvpghodi |
| Vercel | agro-bros/audienceos |

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

## Next Steps (Priority Order)

1. **Add Slack to cc-gateway** - Create routes/slack.ts handler
2. **Build credential entry UI** - Modal for users to enter tokens
3. **Deploy cc-gateway** - `wrangler deploy` to get live URL
4. **Expand integrations list** - Add Calendar, Drive to UI
5. **Multi-tenant credentials** - Per-agency token storage

---

*Last verified: 2026-01-14 | UI 95% | Integrations 30%*
