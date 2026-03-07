# Ad Performance Architecture

> How ad account data flows from Google Ads / Meta Ads into the AudienceOS Command Center dashboards.

---

## Table of Contents

1. [Overview](#overview)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Flow 1: Linking Ad Accounts](#flow-1-linking-ad-accounts)
4. [Flow 2: Data Sync Pipeline](#flow-2-data-sync-pipeline)
5. [Flow 3: Dashboard Reads](#flow-3-dashboard-reads)
6. [Database Schema](#database-schema)
7. [Key Files Reference](#key-files-reference)
8. [Multi-Tenant Isolation](#multi-tenant-isolation)
9. [Airbyte Configuration](#airbyte-configuration)
10. [Operational Notes](#operational-notes)

---

## Overview

The ad performance system connects agency clients' Google Ads and Meta Ads accounts to Supabase via Airbyte Cloud, then surfaces the data through two dashboard views:

- **Agency Dashboard** (`/` > Performance tab) -- Aggregate KPIs across all clients
- **Client Dashboard** (`/client/[id]` > Performance tab) -- Per-client KPIs with account-level filtering
- **Client Integrations** (`/client/[id]` > Integrations tab) -- Link/unlink ad accounts

The system supports **50+ clients** with programmatic Airbyte connection provisioning (no manual setup per client).

---

## Data Flow Diagram

```
+------------------+     +------------------+     +------------------+
|   Google Ads     |     |    Meta Ads      |     |   (Future:       |
|   API            |     |    API           |     |   LinkedIn, etc) |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+--------+------------------------+------------------------+---------+
|                        Airbyte Cloud                                |
|   Per-client Source + Connection (auto-provisioned via API)         |
|   Schedule: Daily at 6 AM UTC (cron: 0 6 * * *)                   |
|   Destination: Shared Supabase (airbyte_staging schema)            |
+--------+-----------------------------------------------------------+
         |
         | Raw data lands in airbyte_staging.{table_prefix}{stream}
         v
+--------+-----------------------------------------------------------+
|                     Supabase (PostgreSQL)                           |
|                                                                     |
|   airbyte_staging schema                                           |
|     agency_{short_id}_campaigns                                    |
|     agency_{short_id}_campaign_stats                               |
|     agency_{short_id}_ads_insights                                 |
|                                                                     |
|   Webhook trigger --> transform_airbyte_data() RPC                 |
|     |                                                               |
|     v                                                               |
|   public.ad_performance (normalized, query-ready)                  |
|     - agency_id, client_id, platform, account_id                   |
|     - date, impressions, clicks, spend, conversions                |
|                                                                     |
|   public.client_ad_account_mapping                                 |
|     - Links client <-> external ad account ID                      |
|     - Tracks Airbyte source/connection IDs                         |
|                                                                     |
|   public.airbyte_account_mapping                                   |
|     - Maps agency + platform to Airbyte resources                  |
|     - table_prefix for multi-tenant isolation                      |
+--------+-----------------------------------------------------------+
         |
         v
+--------+-----------------------------------------------------------+
|                     Next.js App (Frontend)                          |
|                                                                     |
|   Agency Dashboard (/)                                             |
|     > Performance tab                                              |
|       - Client selector dropdown                                   |
|       - Time filter (presets + custom range)                       |
|       - Platform filter                                            |
|       - Compare toggle (previous period / same period last year)   |
|       - 8 KPI cards with comparison deltas                         |
|       - Ad spend trend chart (multi-metric toggles)                |
|       - Platform breakdown table                                   |
|                                                                     |
|   Client Profile (/client/[id])                                    |
|     > Performance tab                                              |
|       - Same 8 KPIs, filters, chart, breakdown                    |
|       - Account-level selector (filter by specific ad account)     |
|     > Integrations tab                                             |
|       - Link/unlink ad accounts                                    |
|       - Format validation (Google: 10-digit, Meta: numeric)        |
|       - Auto-provisions Airbyte connection on link                 |
+--------------------------------------------------------------------+
```

---

## Flow 1: Linking Ad Accounts

**Entry point:** Client profile > Integrations tab > "Link Account" button

### Step-by-step:

1. **User fills form**: Selects platform (Google Ads / Meta Ads), pastes account ID
2. **Frontend validates**: `validateAccountId()` checks format (Google: 10-digit, Meta: numeric after stripping `act_` prefix)
3. **Frontend normalizes**: Strips dashes from Google IDs, strips `act_` prefix from Meta IDs
4. **POST `/api/v1/clients/[id]/ad-accounts`**: Sends `{ platform, external_account_id }`
5. **API creates mapping**: Inserts into `client_ad_account_mapping` table
6. **API auto-provisions Airbyte** (if agency has platform credentials):
   - Looks up `integration` table for matching platform + agency
   - Calls `provisionAirbyteConnection()` which:
     a. Creates Airbyte Source via API (with OAuth credentials)
     b. Creates Airbyte Connection (source -> shared Supabase destination)
     c. Stores `airbyte_source_id`, `airbyte_connection_id` in integration config
     d. Creates `airbyte_account_mapping` record with `table_prefix`
7. **API returns**: Account mapping + provisioning status

### Key files:

| File | Role |
|------|------|
| `components/client/ad-accounts-section.tsx` | Link/unlink UI with validation |
| `hooks/use-client-ad-accounts.ts` | React Query hooks for CRUD |
| `app/api/v1/clients/[id]/ad-accounts/route.ts` | REST API (GET/POST/DELETE) |
| `lib/airbyte/provision.ts` | Airbyte source + connection creation |
| `lib/airbyte/client.ts` | Low-level Airbyte API client |
| `lib/airbyte/types.ts` | Platform definitions, stream configs |

### Unlinking:

DELETE to the same endpoint deactivates the mapping (`is_active = false`). Does NOT delete the Airbyte connection (data preservation). Full deprovision available via `deprovisionAirbyteConnection()`.

---

## Flow 2: Data Sync Pipeline

### Airbyte sync cycle:

1. **Schedule**: Cron `0 6 * * *` (daily at 6 AM UTC)
2. **Airbyte pulls** from Google Ads / Meta Ads API using stored OAuth credentials
3. **Data lands** in `airbyte_staging` schema with table prefix for isolation:
   - `airbyte_staging.agency_a1b2c3d4_campaigns`
   - `airbyte_staging.agency_a1b2c3d4_campaign_stats`
   - `airbyte_staging.agency_a1b2c3d4_ads_insights`
4. **Webhook fires** on sync completion: POST to `/api/v1/webhooks/airbyte`
5. **Webhook handler** calls `transform_airbyte_data()` Supabase RPC
6. **RPC normalizes** raw data into `public.ad_performance` table:
   - Maps platform-specific fields to common schema
   - Deduplicates by (agency_id, client_id, platform, account_id, date)
   - Calculates derived metrics (CTR, CPC, CVR, CPA)

### Key files:

| File | Role |
|------|------|
| `app/api/v1/webhooks/airbyte/route.ts` | Webhook receiver, triggers transform |
| `lib/airbyte/provision.ts` | Connection config (streams, schedule, prefix) |

### Stream configurations:

**Google Ads:**
- `campaigns` (incremental, cursor: `segments.date`)
- `campaign_stats` (incremental, cursor: `segments.date`)
- `ad_groups` (incremental, cursor: `segments.date`)

**Meta Ads:**
- `campaigns` (incremental, cursor: `date_start`)
- `ads_insights` (incremental, cursor: `date_start`)
- `ads_insights_action_type` (incremental, cursor: `date_start`)

---

## Flow 3: Dashboard Reads

### Agency-wide dashboard (`/` > Performance tab)

```
dashboard-view.tsx
  -> useAdPerformance({ days, startDate, endDate, compareStartDate, compareEndDate, platform })
    -> GET /api/v1/dashboard/ad-performance?days=30&platform=all
      -> fetchAgencyAdPerformance() in dashboard-queries.ts
        -> SELECT from ad_performance WHERE agency_id = ? GROUP BY ...
```

**Components:**
- `PerformanceTimeFilter` -- Dropdown presets (7/14/30/60/90 days), custom date range, compare toggle
- `AdPerformanceCards` -- 8 KPI cards (Spend, Impressions, CTR, CPC, Clicks, Conversions, CVR, CPA)
- `AdSpendChart` -- Recharts line chart with toggleable metric pills
- `PlatformBreakdown` -- Per-platform stats table

### Per-client dashboard (`/client/[id]` > Performance tab)

```
app/client/[id]/page.tsx
  -> useClientAdPerformance({ clientId, days, accountId, platform, ... })
    -> GET /api/v1/clients/[id]/ad-performance?days=30&accountId=...
      -> fetchClientAdPerformance() in dashboard-queries.ts
        -> SELECT from ad_performance WHERE client_id = ? AND ...
```

Same components as agency dashboard, plus:
- **Account selector dropdown** -- Filter by specific linked ad account
- Data scoped to single client via `client_id` filter

### Comparison periods:

When "Compare" is enabled, the API receives `compareStartDate` and `compareEndDate`. The query runs twice (current period + comparison period) and returns both datasets. Frontend calculates deltas and displays them on each KPI card.

**Compare presets:**
- Previous Period (same duration, immediately prior)
- Same Period Last Year
- Custom Range

### Key files:

| File | Role |
|------|------|
| `components/dashboard-view.tsx` | Agency dashboard orchestration |
| `app/client/[id]/page.tsx` | Client dashboard orchestration |
| `components/dashboard/performance-time-filter.tsx` | Time filter + compare controls |
| `components/dashboard/ad-performance-cards.tsx` | 8 KPI cards with comparison |
| `components/dashboard/ad-spend-chart.tsx` | Multi-metric trend chart |
| `components/dashboard/platform-breakdown.tsx` | Per-platform breakdown table |
| `hooks/use-ad-performance.ts` | Agency-wide React Query hook |
| `hooks/use-client-ad-performance.ts` | Per-client React Query hook |
| `lib/services/dashboard-queries.ts` | Supabase query functions |
| `app/api/v1/dashboard/ad-performance/route.ts` | Agency API route |
| `app/api/v1/clients/[id]/ad-performance/route.ts` | Client API route |

---

## Database Schema

### `public.ad_performance`

The normalized, query-ready table. One row per (agency, client, platform, account, date).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agency_id | uuid | FK to agency |
| client_id | uuid | FK to client |
| platform | text | `google_ads` or `meta_ads` |
| account_id | text | External account ID |
| date | date | Performance date |
| impressions | bigint | Total impressions |
| clicks | bigint | Total clicks |
| spend | numeric | Total spend (USD) |
| conversions | bigint | Total conversions |
| ctr | numeric | Click-through rate (computed) |
| cpc | numeric | Cost per click (computed) |
| cpm | numeric | Cost per mille (computed) |
| cvr | numeric | Conversion rate (computed) |
| cpa | numeric | Cost per acquisition (computed) |

### `public.client_ad_account_mapping`

Links clients to their ad platform accounts.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| client_id | uuid | FK to client |
| agency_id | uuid | FK to agency |
| platform | text | `google_ads` or `meta_ads` |
| external_account_id | text | Platform account ID |
| is_active | boolean | Soft delete flag |
| created_at | timestamptz | When linked |

### `public.airbyte_account_mapping`

Maps agencies to their Airbyte resources for each platform.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| agency_id | uuid | FK to agency |
| client_id | uuid | FK to client |
| platform | text | `google_ads` or `meta_ads` |
| external_account_id | text | Platform account ID |
| airbyte_source_id | text | Airbyte source UUID |
| airbyte_connection_id | text | Airbyte connection UUID |
| table_prefix | text | Multi-tenant prefix (e.g., `agency_a1b2c3d4_`) |
| is_active | boolean | Whether connection is active |

---

## Multi-Tenant Isolation

Each agency gets a unique table prefix in the `airbyte_staging` schema:

```
table_prefix = "agency_" + agencyId.substring(0, 8) + "_"
```

This means agency `a1b2c3d4-...` gets tables like:
- `airbyte_staging.agency_a1b2c3d4_campaigns`
- `airbyte_staging.agency_a1b2c3d4_campaign_stats`

The prefix is set at connection creation time and stored in `airbyte_account_mapping.table_prefix`.

All `ad_performance` queries filter by `agency_id` (enforced via Supabase RLS + API auth).

---

## Airbyte Configuration

| Setting | Value |
|---------|-------|
| **Platform** | Airbyte Cloud |
| **Sync schedule** | Daily at 6 AM UTC (`0 6 * * *`) |
| **Destination** | Shared Supabase instance (one destination for all connections) |
| **Namespace** | `airbyte_staging` (custom namespace) |
| **Sync mode** | Incremental append (cursor-based) |
| **API auth** | Bearer token (`AIRBYTE_API_TOKEN` env var) |
| **Provisioning** | Programmatic via Airbyte Cloud API (no manual setup) |

### OAuth token lifecycle:

| Platform | Token Expiry | Auto-Refresh |
|----------|-------------|--------------|
| Google Ads | Refresh tokens don't expire (unless revoked) | Yes (Airbyte handles) |
| Meta Ads | ~60 days | No -- must manually refresh in Airbyte Cloud |

**Meta token refresh is the biggest operational risk at scale.** When a Meta token expires, that client's sync silently stops. Monitor via Airbyte Cloud connection status.

---

## Operational Notes

### Adding a new client's ad accounts:

1. Navigate to client profile > Integrations tab
2. Click "+ Link Account"
3. Select platform, paste account ID
4. System auto-validates format and auto-provisions Airbyte connection
5. Data starts flowing on next sync cycle (or trigger manual sync in Airbyte Cloud)

### Debugging missing data:

1. Check `client_ad_account_mapping` -- is the account linked and `is_active = true`?
2. Check `airbyte_account_mapping` -- does an Airbyte connection exist?
3. Check Airbyte Cloud -- is the connection healthy? Last sync successful?
4. Check `ad_performance` -- does data exist for this client_id + date range?
5. Check the time filter -- default is "Past 30 Days", data might be outside this range

### KPI definitions:

| KPI | Formula |
|-----|---------|
| **Total Ad Spend** | SUM(spend) |
| **Impressions** | SUM(impressions) |
| **CTR** | SUM(clicks) / SUM(impressions) * 100 |
| **CPC** | SUM(spend) / SUM(clicks) |
| **Clicks** | SUM(clicks) |
| **Conversions** | SUM(conversions) |
| **CVR** | SUM(conversions) / SUM(clicks) * 100 |
| **CPA** | SUM(spend) / SUM(conversions) |

### Future platforms:

To add a new ad platform (e.g., LinkedIn Ads, TikTok Ads):

1. Add source definition ID to `AIRBYTE_SOURCE_DEFINITIONS` in `lib/airbyte/types.ts`
2. Add stream configuration array in `lib/airbyte/provision.ts`
3. Add platform to `buildSourceConfig()` in `lib/airbyte/provision.ts`
4. Add platform label/color/placeholder/help text in `components/client/ad-accounts-section.tsx`
5. Add validation rules in `validateAccountId()` in `ad-accounts-section.tsx`
6. Add transform logic in `transform_airbyte_data()` Supabase RPC
7. No dashboard changes needed -- components are platform-agnostic

---

*Last Updated: 2026-03-07*
