# AudienceOS Command Center - Handoff Document

## Current State (2026-03-04, 2:50 PM PST)

**Branch:** `feature/chase-dev` (rebased on latest `main` as of `ec4738a`)
**Build Status:** PASSING (zero TypeScript errors)
**Repo:** https://github.com/Diiiploy/audienceos-command-center.git
**Production:** https://v0-audience-os-command-center.vercel.app
**Deploy method:** `npx vercel --prod` (git auto-deploy broken — repo transfer issue)
**Local divergence:** Branch has 16 local commits, 1 remote — needs force push to sync

---

## Session Changes (2026-03-04 — Airbyte Multi-Client Scaling)

### 1. Phase 1: Dashboard Client Selector — COMPLETE

**Problem:** Dashboard Performance tab showed agency-wide ad data with no way to filter by client.
**Solution:** Added a client dropdown that switches between "All Clients" (agency-wide, default) and per-client ad performance data.

**Modified:**
- `hooks/use-ad-performance.ts` — Added optional `clientId` parameter to query key factory, fetch function, and hook options. When `clientId` is set, routes to `/api/v1/clients/{clientId}/ad-performance` (per-client endpoint); otherwise falls back to `/api/v1/dashboard/ad-performance` (agency-wide).
- `components/dashboard-view.tsx` — Added `Select` component imports, `adClientFilter` state variable, wired `clientId` to `useAdPerformance` hook, added dropdown UI in Performance tab filter bar above period/platform selectors. Maps through `clients` prop to populate options.

**Commit:** `fc61b00`

### 2. Phase 2 Prep: Auto-Provision Airbyte Pipeline — COMPLETE

**Problem:** Linking an ad account via POST `/api/v1/clients/[id]/ad-accounts` only created a database mapping record. The Airbyte source and connection (the actual data pipeline) had to be created manually in Airbyte Cloud.
**Solution:** After inserting the mapping, the handler now looks up the agency's existing platform integration (Google Ads or Meta Ads) for OAuth/credential tokens, and calls `provisionAirbyteConnection()` to automatically create the Airbyte source + connection.

**Modified:**
- `app/api/v1/clients/[id]/ad-accounts/route.ts` — Added import for `provisionAirbyteConnection` and `AirbytePlatform`. After mapping insert, queries `integration` table for agency's platform credentials. If found, provisions Airbyte source + connection, updates mapping with `airbyte_source_id`, `airbyte_connection_id`, and `table_prefix`. Returns `provisioning` status in response (`provisioned`, `failed`, or `pending`).

**Commit:** `4124988`

### 3. Context Recovery & Branch Maintenance — COMPLETE

- Recovered full project context from `handoffchase.md` (prior session 2026-03-03)
- Rebased `feature/chase-dev` onto latest `origin/main` (`ec4738a`) — clean rebase, no conflicts
- Stash/pop of uncommitted Phase 1 changes applied cleanly after rebase
- Created `.env.local` from `.env.production.local` for local dev server

---

## The 3-Phase Airbyte Multi-Client Plan

| Phase | Status | What |
|-------|--------|------|
| **1. Dashboard Client Selector** | DONE (committed) | Dropdown filters ad data per-client on Performance tab |
| **2. Test With Real Accounts** | IN PROGRESS | Auto-provisioning wired; needs real account IDs to test end-to-end |
| **3. Onboarding Flow** | NOT STARTED | Replace Leadsie, add ad account ID fields to onboarding form |

### Phase 2 Remaining Work

1. **Push branch** — `git push --force-with-lease origin feature/chase-dev` (branch diverged from rebase)
2. **Deploy preview** — `npx vercel` (not --prod) to get a preview URL with feature branch
3. **Test with real accounts** — Need Chase's Google Ads customer ID and Meta Ads account ID
4. **Verify auto-provisioning** — Link an ad account via UI, confirm Airbyte source + connection created
5. **Verify dashboard** — After Airbyte syncs, confirm per-client data appears in dropdown

### Phase 2 Blockers

- **Google Ads account ID** — Chase needs to provide test customer ID
- **Meta Ads account ID** — Chase needs to provide test account ID
- **Platform integrations** — Agency must have Google Ads / Meta Ads integration connected (with tokens) for auto-provisioning to work

---

## Architecture Notes (Airbyte Pipeline)

```
Client grants ad account access
  → Chase enters account ID in Command Center UI (client detail → Ad Accounts → Link)
    → POST /api/v1/clients/{id}/ad-accounts
      → DB mapping created (airbyte_account_mapping)
      → Looks up agency's platform integration for credentials
      → provisionAirbyteConnection() creates Airbyte source + connection
      → Airbyte syncs daily at 6am UTC
      → Webhook fires on sync complete → transform_airbyte_ads_data()
      → ad_performance table populated with client-scoped data
        → Dashboard dropdown shows per-client ad data
```

**Existing seeded accounts (in DB):**
- Google Ads `7085645296` → Kaaba Luum Hotel (connection: `b13b1c76-...`)
- Meta Ads `763923942896969` → Diiiploy AI (connection: `b45323b7-...`)

---

## Key Files

| File | Purpose |
|------|---------|
| `hooks/use-ad-performance.ts` | Ad performance hook with clientId parameter (Phase 1) |
| `components/dashboard-view.tsx` | Dashboard with client selector dropdown (Phase 1) |
| `app/api/v1/clients/[id]/ad-accounts/route.ts` | Ad account linking + auto-provisioning (Phase 2) |
| `lib/airbyte/provision.ts` | Airbyte source + connection provisioning function |
| `lib/airbyte/client.ts` | Airbyte Cloud API client (v1 REST) |
| `lib/airbyte/types.ts` | Airbyte TypeScript types and source definition IDs |
| `handoffchase.md` | Prior session handoff (2026-03-03) with full plan details |
| `CLAUDE.md` | Project context, rules, architecture |
| `RUNBOOK.md` | Operations guide, verification commands |

---

## Cron / Scraping Issue (Noted, Not Addressed)

- `vercel.json` has 2 cron entries (slack-sync every 30min, gmail-sync every 15min)
- Cron routes exist at `app/api/cron/slack-sync/` and `app/api/cron/gmail-sync/`
- No scraping has happened in the last week (per earlier session finding)
- Root cause not investigated this session — deferred

---

*Last Updated: 2026-03-04 2:50 PM PST*
