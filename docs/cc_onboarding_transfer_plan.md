# AudienceOS Command Center — Full Project Transfer Plan

## Context

We built the AudienceOS Command Center (Next.js + Cloudflare Workers gateway + Supabase) under our development accounts. The AudienceOS team is the real client and needs to own and operate this independently. This plan covers **every** service, credential, and configuration that must transfer — validated by a 6-member multi-model council debate (Architect, Designer, Engineer, Researcher, Security, Intern) across 3 rounds.

**Core Principle (unanimous):** Recreate all credentials and OAuth apps. Transfer stateful infrastructure. One team, one set of secrets, no shared history.

---

## Timeline

| Week | Focus |
|------|-------|
| **Week 1** | Assessment, credential recreation, infrastructure provisioning |
| **Week 2** | Data migration, shadow period validation, local dev gate |
| **Week 3** | Cutover day, smoke testing, 4-hour gate validation |
| **Week 4** | Stabilization buffer |
| **Post** | 30 days active support (4h P1 / 24h P2 SLA), 60 days advisory |

---

## Services Inventory (14 Total)

| # | Service | Action | Risk | Monthly Cost |
|---|---------|--------|------|-------------|
| 1 | **Supabase** (DB + Auth) | TRANSFER project | HIGH | ~$25 (Pro) |
| 2 | **Google Cloud** (OAuth app) | RECREATE under their GCP project | HIGH | Free (OAuth) |
| 3 | **Slack App** | RECREATE under their Slack workspace | MEDIUM | Free |
| 4 | **Meta/Facebook App** | RECREATE (non-transferable) | MEDIUM | Free |
| 5 | **Diiiploy Gateway** (CF Worker) | TRANSFER or redeploy to their CF account | HIGH | ~$5 (Workers) |
| 6 | **Airbyte Cloud** (ETL) | TRANSFER workspace or recreate | MEDIUM | Usage-based |
| 7 | **Mem0** (AI memory) | New API key under their account | LOW | Usage-based |
| 8 | **DataForSEO** | New account/credentials | LOW | Usage-based |
| 9 | **Resend** (email) | New account + domain verification | LOW | Free tier likely |
| 10 | **UniPile** (LinkedIn) | New API credentials | LOW | Subscription |
| 11 | **Sentry** (errors) | New project under their account | LOW | Free tier |
| 12 | **Vercel** (hosting) | TRANSFER project to their team | MEDIUM | ~$20/seat |
| 13 | **Browserless** | New token | LOW | Usage-based |
| 14 | **Gemini AI** | New API key from their GCP | LOW | Usage-based |

---

## Phase 0: Assessment (Before Anything Else)

### What We Need FROM AudienceOS

These items BLOCK everything. Nothing starts until we have them.

- [ ] **Team email addresses** — Every person who needs login access (for Supabase Auth + Google OAuth authorized users)
- [ ] **Google Cloud project** — They need a GCP project with billing enabled (we create the OAuth app inside it, or they do)
- [ ] **Cloudflare account** — Account ID for deploying the gateway worker (or decision: do we host it for them?)
- [ ] **Slack workspace admin access** — To create and install the new Slack app
- [ ] **Meta Business Manager** — For Meta Ads OAuth app creation
- [ ] **Vercel team** — Their Vercel team/account for project transfer
- [ ] **Custom domain** (if desired) — Domain name + DNS access for the app
- [ ] **Billing acceptance** — Acknowledgment of ~$70-100+/month infrastructure costs
- [ ] **Tech stack familiarity assessment** — 30-minute call: Do they know Next.js, Supabase, Cloudflare Workers, Hono? This determines how much training we provide

### Blast Radius Audit (We Do)

Before touching anything, grep the ENTIRE codebase for every hardcoded reference:

```bash
# Hardcoded values to find and catalog:
rg "12fb4bee-005d-4690-9afc-2fb2f213e755" ~/audienceos-command-center  # Diiiploy tenant ID
rg "qzkirjjrcblkqvhvalue" ~/audienceos-command-center                  # Supabase project ref
rg "513096303070" ~/audienceos-command-center                           # Google OAuth client ID
rg "7047672065986" ~/audienceos-command-center                          # Slack app ID
rg "diiiploy-gateway.diiiploy.workers.dev" ~/audienceos-command-center  # Gateway URL
rg "v0-audience-os-command-center" ~/audienceos-command-center          # Vercel app URL
rg "chase-6917s-projects" ~/audienceos-command-center                   # Vercel team
rg "team_1mTa9p7mqYNEZXv38OUmZlHV" ~/audienceos-command-center        # Vercel team ID
rg "onboarding@resend.dev" ~/audienceos-command-center                  # Default email
rg "diiiploy" ~/audienceos-command-center ~/projects/diiiploy-gateway   # Any diiiploy refs
```

Document every match. Each is a "config bomb" that must be updated.

---

## Phase 1: Pre-Migration (Week 1)

### Section A: What WE Do

#### 1. Create MINIMUM_LOCAL_DEV.env
Separate the 89 env vars into tiers:
- **Tier 1 (Boot):** ~8 vars needed to `npm run dev` and see the UI (Supabase URL, anon key, app URL)
- **Tier 2 (Auth):** Google OAuth client ID/secret for login
- **Tier 3 (Integrations):** All 80+ integration-specific vars (Slack, Meta, Airbyte, etc.)

#### 2. Build Transfer Tooling
- `transfer:preflight` script — validates all env vars, DNS resolution, service connectivity
- `transfer:healthcheck` script — hits every integration endpoint, reports status
- `transfer:rotate-keys` script — versioned key envelope migration (decrypt old → re-encrypt new)
- Health check dashboard page (or API endpoint) showing all 14 service statuses

#### 3. Add key_version Column
Add `key_version` to encrypted token storage (Supabase `integration` table + gateway KV entries) to support dual-key reads during migration.

#### 4. Prepare Maintenance Page
Static HTML maintenance page deployable to Vercel, branded for AudienceOS. Shows estimated return time.

#### 5. Prepare User Communication
- In-app banner component (dismissable) announcing upcoming migration
- Email template for migration notification
- Schedule: 7 days before → 24h before → 1h before → during → after

#### 6. Clean Test Data
- Remove/flag test agency records, test users, synthetic data from Supabase
- Keep full backup of pre-cleanup state
- Update agency record from Diiiploy test org to AudienceOS

#### 7. Document Runbooks
- "OAuth token expired at 2 AM" runbook
- "Airbyte sync failed" runbook
- "Gateway returning 500s" runbook
- "Supabase RLS blocking queries" runbook
- Known quirks doc (Radix UI pointer-events fix, type generation gotchas, etc.)

#### 8. Dependency Freeze
```bash
# Pin all versions, freeze for 30 days post-transfer
cp package-lock.json package-lock.json.frozen
# Add to CLAUDE.md / README: DO NOT run npm update until [date]
```

### Section B: What THEY Do (In Parallel)

#### 1. Create Google Cloud OAuth App
- New GCP project with billing
- OAuth consent screen configured (production, not test mode)
- OAuth 2.0 Client ID created (Web application type)
- Redirect URIs added:
  - `https://{THEIR_GATEWAY_URL}/oauth/google/callback`
  - `https://{THEIR_APP_URL}/api/v1/oauth/callback`
- Scopes: gmail.readonly, gmail.send, gmail.modify, calendar, calendar.events, drive, drive.file, spreadsheets, documents, userinfo.email, userinfo.profile
- **Add all team member emails** to test users (or get app verified for production)
- Generate Gemini AI API key from same project (AI Studio)
- If using Google Ads: Apply for developer token + set customer ID

#### 2. Create Slack App
- New app at api.slack.com/apps under their workspace
- Bot scopes: chat:write, channels:read, channels:manage, channels:history, groups:read, groups:write, users:read, team:read
- Redirect URI: `https://{THEIR_GATEWAY_URL}/oauth/slack/callback`
- Enable Event Subscriptions → Request URL: `https://{THEIR_APP_URL}/api/v1/webhooks/slack`
- Record: Client ID, Client Secret, Signing Secret

#### 3. Create Meta App (If Using Meta Ads)
- New app in Meta Business Manager
- Add "Marketing API" product
- Set redirect URI
- Record: App ID, App Secret

#### 4. Set Up Accounts for API Services
Each service needs their own account + billing:

| Service | Action | What We Need Back |
|---------|--------|-------------------|
| Mem0 | Create account at mem0.ai | API key |
| DataForSEO | Create account | Login + Password |
| Resend | Create account, verify sending domain (SPF/DKIM/DMARC) | API key + verified from-email |
| UniPile | Create account | API key, Client ID, Client Secret |
| Sentry | Create project | DSN (client + server) |
| Browserless | Create account | Token + URL |
| Airbyte Cloud | Create workspace | API key, Workspace ID |

#### 5. Set Up Cloudflare Account
- Create Cloudflare account (or use existing)
- Provide account ID
- Decision: custom domain for gateway? (e.g., `gateway.audienceos.com`)

#### 6. Set Up Vercel Team
- Create Vercel team (or use existing)
- Provide team slug for project transfer
- Add team members

### Section C: What We Do TOGETHER

#### 1. Knowledge Transfer Call (2 hours)
- Architecture walkthrough (Next.js → Gateway → Supabase flow)
- Auth system deep dive (Supabase Auth + Google OAuth + RBAC)
- Integration architecture (gateway as OAuth token manager + API proxy)
- Deployment process (`npx vercel --prod --yes` — git auto-deploy is broken)
- Known issues and quirks
- Emergency runbook walkthrough

#### 2. Local Dev Setup Session (4 hours — this is the gate)
- Clone repo, install dependencies
- Configure `MINIMUM_LOCAL_DEV.env`
- Boot the app, verify login works
- Walk through one integration flow end-to-end
- **ACCEPTANCE CRITERION: They can run the full stack locally within 4 hours**

---

## Phase 2: Cutover (Week 2-3)

### Pre-Cutover Checklist (T-48h)

- [ ] All "FROM them" items received (Phase 0)
- [ ] All their OAuth apps created with correct redirect URIs
- [ ] All API service accounts created with keys provided
- [ ] DNS TTL reduced to 60 seconds (if custom domain)
- [ ] Maintenance page tested and ready
- [ ] User notification sent (T-7d and T-24h)
- [ ] `transfer:preflight` passes in staging
- [ ] Dependency versions frozen
- [ ] Cron jobs documented (to disable on old infra after cutover)

### Cutover Day Sequence

**Duration: ~15 minutes active cutover + 48h monitoring tail**

```
T-1h:   Deploy maintenance page / in-app banner
T-0:    BEGIN CUTOVER
        ├── 1. Transfer Supabase project to their org
        ├── 2. Deploy gateway to their Cloudflare account
        │      ├── Create KV namespace (DIIIPLOY_KV)
        │      ├── Create D1 database (audit)
        │      ├── Set all secrets (wrangler secret put)
        │      └── Deploy worker (wrangler deploy)
        ├── 3. Run token re-encryption migration
        │      ├── Decrypt all KV tokens with OLD key
        │      ├── Re-encrypt with NEW key
        │      ├── Write back with key_version=2
        │      └── Validate by test-refreshing each provider
        ├── 4. Transfer Vercel project to their team
        │      ├── Set all 89 env vars in Vercel dashboard
        │      └── Trigger deploy
        ├── 5. Update DNS (if custom domain)
        │      ├── App: CNAME → their Vercel
        │      └── Gateway: CNAME → their CF worker (or custom domain)
        ├── 6. Staggered OAuth validation
        │      ├── Test Slack OAuth flow end-to-end
        │      ├── Test Google OAuth flow end-to-end
        │      └── Test Meta OAuth flow (if applicable)
        ├── 7. Verify cron jobs firing on new Vercel
        │      ├── /api/cron/slack-sync
        │      ├── /api/cron/gmail-sync
        │      └── /api/cron/workflow-scheduler
        ├── 8. Kill cron jobs on OLD infrastructure
        └── 9. Run transfer:healthcheck --full
T+15m:  Remove maintenance page (if all green)
T+48h:  End of active monitoring tail
```

### Rollback Plan

If healthcheck fails at any point:
- `transfer:rollback` reverts key envelope (key_version=1)
- Re-point DNS back to original (60s TTL = fast)
- Maintenance page stays up
- Post-mortem before retry

---

## Phase 3: Post-Cutover Validation

### UX Smoke Test (Day Zero)
The receiving team must complete these user journeys:

- [ ] Sign up new user via Google OAuth
- [ ] Land on dashboard, see data
- [ ] Connect Slack integration via OAuth
- [ ] Send a test Slack message
- [ ] Connect Gmail, verify sync fires
- [ ] Open AI chat, verify Mem0 context works
- [ ] View ad performance data (if Airbyte active)
- [ ] Invite a team member via Resend email
- [ ] Check Sentry for errors

### Break-Fix Exercise
Intentionally break something (e.g., revoke a test OAuth token) and have the receiving team fix it using the runbooks while we observe.

---

## Phase 4: Cleanup & Access Revocation

### Security Hardening (Rook's Non-Negotiables)

- [ ] Revoke our access to their Supabase project
- [ ] Revoke our access to their Cloudflare account
- [ ] Revoke our access to their Vercel team
- [ ] Remove our SSH keys / deploy tokens from their GitHub repo
- [ ] Rotate any secrets that were visible to us during transfer
- [ ] Audit git history for committed secrets — rotate if found
- [ ] Enable GitHub secret scanning on repo
- [ ] Document all secrets in a sealed vault (1Password, Doppler, etc.)
- [ ] Set 90-day rotation schedule for all keys

### Decommission Old Infrastructure

- [ ] Delete old Vercel project (or archive)
- [ ] Remove old gateway worker from our Cloudflare
- [ ] Clear our KV namespace of their tenant data
- [ ] Remove their data from our D1 database
- [ ] Revoke old OAuth app credentials
- [ ] Sign access termination acknowledgment

---

## Complete Credential Matrix

Every credential that must be created/transferred, who creates it, and where it goes:

| Credential | Created By | Set In | Notes |
|-----------|-----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Transfer | Vercel env | New project URL after transfer |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Transfer | Vercel env | Regenerate after transfer |
| `SUPABASE_SERVICE_ROLE_KEY` | Transfer | Vercel env | Regenerate after transfer |
| `GOOGLE_CLIENT_ID` | THEM | Vercel env + gateway | From their GCP OAuth app |
| `GOOGLE_CLIENT_SECRET` | THEM | Vercel env + gateway | From their GCP OAuth app |
| `GOOGLE_AI_API_KEY` | THEM | Vercel env | Gemini API from their GCP |
| `GOOGLE_ADS_CLIENT_ID` | THEM | Vercel env | If using Google Ads |
| `GOOGLE_ADS_CLIENT_SECRET` | THEM | Vercel env | If using Google Ads |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | THEM | Gateway secret | Apply to Google |
| `GOOGLE_ADS_CUSTOMER_ID` | THEM | Gateway secret | Their MCC ID |
| `SLACK_CLIENT_ID` | THEM | Vercel env + gateway | From their Slack app |
| `SLACK_CLIENT_SECRET` | THEM | Vercel env + gateway | From their Slack app |
| `SLACK_SIGNING_SECRET` | THEM | Vercel env + gateway | From their Slack app |
| `META_APP_ID` | THEM | Vercel env | From their Meta app |
| `META_APP_SECRET` | THEM | Vercel env | From their Meta app |
| `DIIIPLOY_GATEWAY_URL` | Transfer | Vercel env | Their CF worker URL |
| `DIIIPLOY_GATEWAY_API_KEY` | WE generate | Vercel env + gateway KV | New dgw_ key for their tenant |
| `DIIIPLOY_TENANT_ID` | WE generate | Vercel env + gateway KV | New UUID (replaces 12fb4bee...) |
| `OAUTH_STATE_SECRET` | WE generate | Vercel env + gateway | `openssl rand -base64 32` |
| `TOKEN_ENCRYPTION_KEY` | WE generate | Vercel env + gateway | `openssl rand -base64 32` |
| `INTERNAL_API_KEY` | WE generate | Vercel env | `openssl rand -base64 32` |
| `CRON_SECRET` | WE generate | Vercel env | `openssl rand -base64 32` |
| `AIRBYTE_API_KEY` | THEM | Vercel env | From their Airbyte workspace |
| `AIRBYTE_WORKSPACE_ID` | THEM | Vercel env | From their Airbyte workspace |
| `AIRBYTE_DESTINATION_ID` | THEM | Vercel env | Points to their Supabase |
| `AIRBYTE_WEBHOOK_SECRET` | WE generate | Vercel env + Airbyte config | Shared secret for webhook |
| `MEM0_API_KEY` | THEM | Gateway secret | From their Mem0 account |
| `DATAFORSEO_LOGIN` | THEM | Gateway secret | From their DataForSEO |
| `DATAFORSEO_PASSWORD` | THEM | Gateway secret | From their DataForSEO |
| `RESEND_API_KEY` | THEM | Vercel env | From their Resend account |
| `RESEND_FROM_EMAIL` | THEM | Vercel env | Their verified domain |
| `UNIPILE_API_KEY` | THEM | Vercel env | From their UniPile |
| `UNIPILE_CLIENT_ID` | THEM | Vercel env | From their UniPile |
| `UNIPILE_CLIENT_SECRET` | THEM | Vercel env | From their UniPile |
| `SENTRY_DSN` | THEM | Vercel env | From their Sentry project |
| `NEXT_PUBLIC_SENTRY_DSN` | THEM | Vercel env | Client-side DSN |
| `NEXT_PUBLIC_APP_URL` | THEM | Vercel env | Their custom domain or Vercel URL |
| `BROWSERLESS_TOKEN` | THEM | Gateway secret | From their Browserless |
| `BROWSERLESS_URL` | THEM | Gateway secret | Their Browserless endpoint |

---

## Webhook URLs That Must Be Updated

| Service | Webhook/Callback URL | Update To |
|---------|---------------------|-----------|
| Google OAuth | `{GATEWAY}/oauth/google/callback` | Their gateway URL |
| Slack OAuth | `{GATEWAY}/oauth/slack/callback` | Their gateway URL |
| Slack Events | `{APP}/api/v1/webhooks/slack` | Their app URL |
| Airbyte | `{APP}/api/v1/webhooks/airbyte?token=SECRET` | Their app URL |
| LinkedIn/UniPile | `{APP}/api/v1/integrations/linkedin/callback` | Their app URL |

---

## CORS Configuration Update

File: `~/projects/diiiploy-gateway/wrangler.toml` (ALLOWED_ORIGINS)

Must change from:
```
https://v0-audience-os-command-center.vercel.app,https://*.diiiploy.io,http://localhost:3000
```
To:
```
https://{THEIR_APP_DOMAIN},https://*.{THEIR_DOMAIN},http://localhost:3000
```

---

## Files That Require Modification

### Command Center (`~/audienceos-command-center`)
- `.env.local` → All 89 env vars updated
- `lib/env.ts` → Verify all env var names still match
- `vercel.json` → Cron jobs (paths stay same, just verify)
- Any files containing hardcoded Diiiploy tenant ID
- Any files containing hardcoded Supabase project ref
- Any files referencing old Vercel URL

### Gateway (`~/projects/diiiploy-gateway`)
- `wrangler.toml` → GATEWAY_URL, AUDIENCEOS_URL, ALLOWED_ORIGINS
- `.dev.vars` → All local dev secrets
- KV namespace bindings → New namespace IDs
- D1 database binding → New database ID

---

## Verification

### Pre-Transfer
- [ ] `transfer:preflight` passes (all services reachable)
- [ ] Blast radius audit complete (all hardcoded values cataloged)
- [ ] 4-hour local dev gate passed by receiving team
- [ ] All "FROM them" items received

### During Transfer
- [ ] `transfer:healthcheck --full` passes after cutover
- [ ] Each OAuth flow tested end-to-end (staggered)
- [ ] Cron jobs verified firing on new infrastructure
- [ ] Maintenance page deploys/removes cleanly

### Post-Transfer
- [ ] UX smoke test passed (full user journey)
- [ ] Break-fix exercise completed
- [ ] All old access revoked
- [ ] Secret scanning enabled
- [ ] 48h monitoring tail clean

---

## Council Vote Summary

| Member | Final Position |
|--------|---------------|
| **Architect (Serena)** | Recreate OAuth, stagger cutover. Versioned key envelope. 4-hour gate. Health dashboard. |
| **Designer (Aditi)** | User communication timeline mandatory. Maintenance page + degraded-state UI. UX smoke test. |
| **Engineer (Marcus)** | 15-min atomic cutover with TTL pre-staging. MINIMUM_LOCAL_DEV.env. Pre-flight script. |
| **Researcher (Ava)** | 3-4 week timeline. 90-day support warranty. Shadow period > doc dump. |
| **Security (Rook)** | One team, one set of secrets. Revoke all old access. 90-day rotation schedule. Vault mandatory. |
| **Intern (Dev)** | Day Zero break-fix. Webhook replay strategy. Cron orphan prevention. Assess receiving team first. |

**Vote: 6/6 unanimous on core plan. All tensions resolved through debate.**
