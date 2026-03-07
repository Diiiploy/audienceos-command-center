# AudienceOS Command Center - Handoff Document

## Current State (2026-03-07, 2:30 PM PST)

**Branch:** `feature/chase-dev` (6 commits ahead of `main`)
**Build Status:** PASSING (zero TypeScript errors)
**Repo:** https://github.com/Diiiploy/audienceos-command-center.git
**Production:** https://v0-audience-os-command-center.vercel.app
**Deploy method:** `npx vercel --prod` (git auto-deploy broken -- repo transfer issue)
**Local dev:** `npx next dev --port 3000`

---

## Session Changes (2026-03-07 -- Integrations Tab + Playwright Verification)

### 1. Client Integrations Tab -- COMPLETE

**Problem:** No dedicated place for clients to link ad account IDs. The AdAccountsSection was buried inside the Performance tab.

**Changes:**
- `app/client/[id]/page.tsx` -- Added "Integrations" tab trigger (between Performance and Media & Files). Moved AdAccountsSection from Performance tab to new Integrations TabsContent with heading and description text.
- `components/client/ad-accounts-section.tsx` -- Added format validation per platform (Google Ads: 10-digit check, Meta Ads: numeric check). Added platform-specific help text showing where to find account IDs. Added input normalization (strip dashes for Google, strip act_ prefix for Meta). Added validation error state and display.

**Commit:** `7339fbe`

### 2. Playwright Visual Verification -- COMPLETE

Verified all three key views via Playwright browser automation:
- **Home Dashboard > Performance:** 8 KPI cards, time filter, platform filter, compare toggle, ad spend chart with metric toggles, platform breakdown -- all rendering correctly.
- **Client > Performance (Kaaba Luum):** Same 8 KPIs + account selector dropdown, time/platform filters, chart, breakdown -- all rendering correctly.
- **Client > Integrations (Kaaba Luum):** Heading, description, Linked Ad Accounts card showing Google Ads 7085645296 Active, Link Account button, unlink button -- all rendering correctly.

### 3. Pipeboard vs Airbyte Analysis -- COMPLETE

**Finding:** Pipeboard.co is NOT a data pipeline/ETL tool. It's an MCP server for AI-powered ad analysis via Claude. Different product category entirely from Airbyte. Not suitable as a replacement.

**Council consensus (4 agents):** Stay with Airbyte Cloud Standard tier. Skip Pipeboard. Skip self-hosted OSS. Build Integrations tab with format validation (done).

### 4. Meta Ads Token Refresh -- DONE (manual)

Chase manually refreshed the Meta Ads access token in Airbyte Cloud. Connection should resume syncing on next scheduled run.

---

## Previous Session (2026-03-06 -- Ad Performance Dashboard Upgrade)

### 1. Ad Performance Dashboard Overhaul -- COMPLETE (commit `a88f858`)
### 2. Architecture Documentation -- COMPLETE
### 3. Meta Ads Data Staleness -- DIAGNOSED, token refreshed 2026-03-07

---

## Previous Session (2026-03-04 -- Airbyte Multi-Client Scaling)

### Phase 1: Dashboard Client Selector -- COMPLETE (commit `fc61b00`)
### Phase 2: Auto-Provision Airbyte Pipeline -- COMPLETE (commit `4124988`)
### Phase 3: Onboarding Flow -- NOT STARTED

---

## The 3-Phase Airbyte Multi-Client Plan

| Phase | Status | What |
|-------|--------|------|
| **1. Dashboard Client Selector** | DONE | Dropdown filters ad data per-client on Performance tab |
| **2. Ad Performance Dashboard** | DONE | 8 KPIs, time filters, comparison, per-account filtering |
| **2.5 Client Integrations Tab** | DONE | Dedicated tab for linking ad accounts with validation |
| **3. Onboarding Flow** | NOT STARTED | Replace Leadsie, add ad account ID fields to onboarding form |

---

## Deferred Work

1. **Onboarding flow (Phase 3)** -- Replace Leadsie with in-app ad account linking during client onboarding
2. **Smart empty state** -- When ad_performance has stale data, show "Latest data from [date]" instead of generic "No performance data" message
3. **Cron/scraping issue** -- Slack and Gmail cron syncs not running (noted in prior session, not investigated)
4. **Deploy to production** -- Changes on `feature/chase-dev` need `npx vercel --prod` or merge to main. Git auto-deploy broken due to repo transfer.
5. **Client profile race condition** -- Direct navigation to `/client/[id]` briefly shows "Client Not Found" before data loads. Auth initialization timing issue.

---

## Key Files

| File | Purpose |
|------|---------|
| `components/dashboard/performance-time-filter.tsx` | Time filter + compare controls |
| `components/dashboard/ad-performance-cards.tsx` | 8 KPI metric cards with comparison |
| `components/dashboard/ad-spend-chart.tsx` | Multi-metric trend chart with toggles |
| `components/dashboard-view.tsx` | Main dashboard with performance tab |
| `app/client/[id]/page.tsx` | Client profile with Performance + Integrations tabs |
| `components/client/ad-accounts-section.tsx` | Ad account linking UI with validation |
| `hooks/use-ad-performance.ts` | Agency-wide ad performance hook |
| `hooks/use-client-ad-performance.ts` | Per-client ad performance hook |
| `hooks/use-client-ad-accounts.ts` | Ad account CRUD hooks |
| `lib/services/dashboard-queries.ts` | Supabase query functions for ad data |
| `app/api/v1/clients/[id]/ad-accounts/route.ts` | Ad account CRUD + auto-provisioning |
| `app/api/v1/webhooks/airbyte/route.ts` | Webhook handler: sync -> transform -> ad_performance |
| `lib/airbyte/provision.ts` | Airbyte source + connection provisioning |
| `CLAUDE.md` | Project context and rules |
| `RUNBOOK.md` | Operations guide |

---

*Last Updated: 2026-03-07 2:30 PM PST*
