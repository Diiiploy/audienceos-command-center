# AudienceOS Command Center - Handoff Document

## Current State (2026-03-06, 10:30 AM PST)

**Branch:** `feature/chase-dev` (5 commits ahead of `main`)
**Build Status:** PASSING (zero TypeScript errors)
**Repo:** https://github.com/Diiiploy/audienceos-command-center.git
**Production:** https://v0-audience-os-command-center.vercel.app
**Deploy method:** `npx vercel --prod` (git auto-deploy broken -- repo transfer issue)
**Local dev:** `npx next dev --port 3000`

---

## Session Changes (2026-03-06 -- Ad Performance Dashboard Upgrade)

### 1. Ad Performance Dashboard Overhaul -- COMPLETE

**Problem:** Performance tab had basic button-row time filters, only 4 KPI metrics, no comparison functionality, and the compare toggle was wired in the UI but never actually sent comparison dates to the API.

**Created:**
- `components/dashboard/performance-time-filter.tsx` -- New time filter component with dropdown presets, custom date range picker, and comparison period selector (Previous Period / Same Period Last Year / Custom Range). Exports `computeCompareDates()` and `getCompareLabel()` helpers.
- `components/ui/calendar.tsx` -- Calendar component (shadcn) for date range picker
- `components/ui/date-range-picker.tsx` -- Date range picker component for custom date selection

**Modified:**
- `components/dashboard/ad-performance-cards.tsx` -- Expanded from 4 to 8 KPI cards (added Clicks, Conversions, CVR, CPA). Added `compareEnabled`, `compareLabel`, `previousValue` props. When compare is on, each card shows the previous value (e.g., "+12% from $8.5k") with a dynamic label.
- `components/dashboard/ad-spend-chart.tsx` -- Added toggleable metric pills (Spend, Clicks, Conversions, Impressions) to show/hide chart series
- `components/dashboard/platform-breakdown.tsx` -- Added conversions to platform breakdown display
- `components/dashboard/index.ts` -- Re-exported new PerformanceTimeFilter component
- `components/dashboard-view.tsx` -- Replaced inline button filters with PerformanceTimeFilter. Wired `computeCompareDates()` for all compare presets. Passes `compareEnabled`/`compareLabel` to AdPerformanceCards.
- `app/client/[id]/page.tsx` -- Same filter upgrade on client profile Performance tab. Wired compare dates to `useClientAdPerformance` hook (was completely missing). Added per-account ad account selector dropdown.
- `hooks/use-ad-performance.ts` -- Added `startDate`, `endDate`, `compareStartDate`, `compareEndDate` params
- `hooks/use-client-ad-performance.ts` -- Same additions plus `accountId` param for per-account filtering
- `app/api/v1/clients/[id]/ad-performance/route.ts` -- Added `startDate`, `endDate`, `compareStartDate`, `compareEndDate`, `accountId` query params
- `app/api/v1/dashboard/ad-performance/route.ts` -- Added same date params
- `lib/services/dashboard-queries.ts` -- Added `computeDateRanges()` helper, `fetchClientAdPerformance()` function, `conversionRate`, `cpm`, `cpa` to `AdPerformanceSummary` type. Both agency-wide and per-client queries now support custom date ranges and comparison periods.

**Commit:** `a88f858`

### 2. Architecture Documentation -- COMPLETE

Produced a full architecture breakdown of the ad account linking + Airbyte pipeline + dashboard data flow for team sharing. Covers:
- Flow 1: Linking new ad accounts (UI -> API -> Airbyte auto-provisioning)
- Flow 2: Data sync pipeline (Airbyte cron -> webhook -> transform RPC -> ad_performance)
- Flow 3: Dashboard reads (agency-wide vs per-client, same component reuse)

### 3. Meta Ads Data Staleness -- DIAGNOSED, NOT FIXED

**Finding:** Diiiploy client's Performance tab shows "No performance data" because Meta Ads data only exists from Jul 22 - Sep 19, 2025. The Meta Ads Airbyte connection (`b45323b7-...`) has been inactive for ~6 months. Google Ads (Kaaba Luum) data is fresh through Feb 27, 2026.

**Action needed:** Check Airbyte Cloud for Meta Ads connection status. Likely expired access token or disabled schedule.

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
| **3. Onboarding Flow** | NOT STARTED | Replace Leadsie, add ad account ID fields to onboarding form |

---

## Deferred Work

1. **Meta Ads sync fix** -- Airbyte connection `b45323b7-...` inactive since Sep 2025. Check Airbyte Cloud, refresh Meta access token, re-trigger sync.
2. **Onboarding flow (Phase 3)** -- Replace Leadsie with in-app ad account linking during client onboarding
3. **Smart empty state** -- When ad_performance has stale data, show "Latest data from [date]" instead of generic "No performance data" message
4. **Cron/scraping issue** -- Slack and Gmail cron syncs not running (noted in prior session, not investigated)
5. **Force push branch** -- Branch diverged from earlier rebase. Need `git push --force-with-lease origin feature/chase-dev` to sync remote.

---

## Key Files

| File | Purpose |
|------|---------|
| `components/dashboard/performance-time-filter.tsx` | Time filter + compare controls (new) |
| `components/dashboard/ad-performance-cards.tsx` | 8 KPI metric cards with comparison |
| `components/dashboard/ad-spend-chart.tsx` | Multi-metric trend chart with toggles |
| `components/dashboard-view.tsx` | Main dashboard with performance tab |
| `app/client/[id]/page.tsx` | Client profile with performance tab |
| `hooks/use-ad-performance.ts` | Agency-wide ad performance hook |
| `hooks/use-client-ad-performance.ts` | Per-client ad performance hook |
| `lib/services/dashboard-queries.ts` | Supabase query functions for ad data |
| `app/api/v1/clients/[id]/ad-accounts/route.ts` | Ad account CRUD + auto-provisioning |
| `app/api/v1/webhooks/airbyte/route.ts` | Webhook handler: sync -> transform -> ad_performance |
| `lib/airbyte/provision.ts` | Airbyte source + connection provisioning |
| `CLAUDE.md` | Project context and rules |
| `RUNBOOK.md` | Operations guide |

---

*Last Updated: 2026-03-06 10:30 AM PST*
