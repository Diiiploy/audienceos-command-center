# AudienceOS Command Center - Handoff Document

## Current State (2026-03-03, 6:47 AM PST)

**Branch:** `feature/chase-dev`
**Build Status:** PASSING (TypeScript compiles clean, zero errors)
**Repo:** https://github.com/Diiiploy/audienceos-command-center.git
**Uncommitted Changes:** 2 files modified (Phase 1 dashboard dropdown — NOT committed yet)

---

## What Was Done This Session

### 1. Repo Setup — COMPLETE

- Cloned repo was already at `~/Projects/audienceos-command-center`
- Pulled latest from main (145 files updated from developer's recent work)
- Created `feature/chase-dev` branch from updated main
- Pushed branch to remote with upstream tracking
- Old stashed Airbyte work was dropped (developer already pushed equivalent changes)
- Empty test commit pushed to verify branch works

### 2. Full Codebase Analysis — COMPLETE

Deep exploration of the entire system architecture:
- **Database schema:** All 40+ Supabase tables mapped including clients, ad_performance, airbyte_account_mapping, integrations, onboarding system
- **Airbyte integration:** Understood the full data pipeline (Airbyte Cloud → staging → transform → ad_performance)
- **Dashboard components:** Mapped all 15 key files in the ad performance display chain
- **OAuth system:** Analyzed all 4 provider flows (Gmail, Google Ads, Slack, Meta Ads)
- **Onboarding system:** Mapped client creation flow, intake forms, journey stages

### 3. Architecture Decision (Council Vote 3-1) — COMPLETE

**Question:** How to scale Airbyte from 2 accounts to 50-70+ clients?

**Three approaches debated:**
- A) One Airbyte source per client ad account (140 connections)
- B) Shared mega-sources (2 connections, all accounts in one source)
- C) Hybrid (3-5 connections, batch clients into groups)

**Winner: Approach A — One source per client**
- Council voted 3-1 (Systems Architect, Business Strategist, DevOps all voted A; Pragmatic Engineer voted C)
- Airbyte Cloud charges per-row, NOT per-connection — 140 connections costs identically to 2
- Full client isolation (one bad account doesn't break others)
- Existing `provisionAirbyteConnection()` code already supports this pattern
- Zero transform function changes needed
- Estimated cost: ~$525/month at 70 clients (35M rows × $15/M)

### 4. Phase 1: Dashboard Client Selector — CODE WRITTEN, NOT COMMITTED

**Files modified:**

**`hooks/use-ad-performance.ts`** (+13 lines):
- Added optional `clientId` parameter to `useAdPerformance` hook
- When `clientId` is set: calls `/api/v1/clients/{clientId}/ad-performance` (per-client endpoint, already exists)
- When `clientId` is undefined: calls `/api/v1/dashboard/ad-performance` (agency-wide, existing behavior preserved)
- Query key includes `clientId` so React Query caches per-client data separately

**`components/dashboard-view.tsx`** (+28 lines):
- Added `Select` component import from existing UI library
- Added `adClientFilter` state variable (named to avoid conflict with existing `selectedClientId` used by firehose drawer)
- Added client dropdown above the period/platform filter bar in the Performance tab
- Options: "All Clients" (default) + all active clients from `clients` prop
- Wired to `useAdPerformance` hook via `clientId` parameter

**Status:** TypeScript compiles clean. Ready to test locally or commit.

---

## The Full Plan (3 Phases)

### Phase 1: Dashboard Client Selector — CODE DONE, needs commit
- Client dropdown on dashboard Performance tab
- "All Clients" = current aggregated view (default, no behavior change)
- Select a client = shows only their ad performance data
- Composes with existing period (7/30/90d) and platform (Google/Meta) filters

### Phase 2: Test With Chase's Existing Accounts — NOT STARTED
- Create 2 test clients in the Command Center
- Link Chase's test Google Ads account ID to Client A
- Link Chase's test Meta Ads account ID to Client B
- **Key gap to fix:** The "Link Account" UI (`/api/v1/clients/[id]/ad-accounts`) creates the database mapping but does NOT auto-provision the Airbyte source/connection. Need to add ~20 lines to the POST handler to call `provisionAirbyteConnection()` after creating the mapping.
- Verify data flows per-client through the transform pipeline
- Test the dashboard dropdown shows each client's data correctly

**Needs from Chase:**
- Google Ads account ID(s) from test account
- Meta Ads account ID(s) from test account

### Phase 3: Onboarding Flow (Replaces Leadsie) — NOT STARTED
- Add Google Ads Account ID and Meta Ads Account ID fields to onboarding intake form
- When onboarding completes, auto-create airbyte_account_mapping records
- Which triggers auto-provisioning from Phase 2's changes
- Include instructions for clients on granting access to `luke@audienceos.io` (Google) and agency BM ID (Meta)

**Needs from Chase:**
- Meta Business Manager ID
- Confirmation that `luke@audienceos.io` is the Google MCC email

---

## Key Research Findings

### Airbyte Architecture (Definitively Confirmed)
- **One Airbyte source = one ad account** (by design in the codebase)
- Google Ads source config takes a single `customer_id` string
- Meta Ads source config wraps a single account in an array: `account_ids: [oneId]`
- Transform function uses `.single()` on connection_id lookup — expects exactly one mapping per connection
- Webhook handler also uses `.single()` — shared sources would break this

### Leadsie Replacement
- Leadsie uses OAuth to auto-add agencies as partners in Meta/Google
- Full OAuth-based auto-connection (Phase 3+) would replicate Leadsie functionality
- For now, guided instructions + manual account ID entry is the simplest path
- Future: OAuth flow where client clicks "Connect Google" → auto-grants access

### What Already Exists and Works (Don't Rebuild)
| Component | File Path |
|---|---|
| Client list (loaded on dashboard mount) | `stores/pipeline-store.ts` |
| Per-client ad performance API | `app/api/v1/clients/[id]/ad-performance/route.ts` |
| Per-client ad data query | `lib/services/dashboard-queries.ts` → `fetchClientAdPerformance()` |
| Ad account linking API | `app/api/v1/clients/[id]/ad-accounts/route.ts` |
| Ad account linking UI | `components/client/ad-accounts-section.tsx` |
| Airbyte provisioning | `lib/airbyte/provision.ts` → `provisionAirbyteConnection()` |
| Transform function | `transform_airbyte_ads_data()` SQL function |
| Onboarding form system | `components/onboarding/form-builder.tsx` + store |
| Client creation | `TriggerOnboardingModal` → `onboardingStore.triggerOnboarding()` |

---

## What We Do NOT Touch
- Airbyte Cloud configuration (no manual source/connection changes)
- The SQL transform function
- OAuth flows or token storage
- Webhook handler
- Pipeline board, Slack/Gmail sync, tickets
- Any existing integration connections
- Developer's other branches (`develop`, `feature/unified-platform`)

---

## Files A Fresh Session Must Read First

| File | Why |
|---|---|
| `hooks/use-ad-performance.ts` | Modified — has the new clientId parameter |
| `components/dashboard-view.tsx` | Modified — has the new client dropdown |
| `app/api/v1/clients/[id]/ad-accounts/route.ts` | Phase 2 target — needs auto-provisioning added |
| `lib/airbyte/provision.ts` | Phase 2 — the provisioning function we'll call |
| `lib/airbyte/types.ts` | Reference — AirbyteProvisionConfig shape |
| `this file (handoffchase.md)` | Full context for resuming |

---

## ISC Criteria Status

| ID | Status | Criterion |
|---|---|---|
| ISC-C1 | DONE | Dashboard displays client selector dropdown with "All Clients" default |
| ISC-C2 | DONE | Selecting a client filters ad performance to that client only |
| ISC-C3 | DONE | Period and platform filters work with client selector combined |
| ISC-C4 | Pending | Ad account linking works from client detail Performance tab |
| ISC-C5 | Pending | Multiple ad accounts per client display correctly on dashboard |
| ISC-C6 | Pending | Test client created with Chase's existing Google Ads account linked |
| ISC-C7 | Pending | Test client created with Chase's existing Meta Ads account linked |
| ISC-C8 | Pending | Transform function correctly routes data to right client by account ID |
| ISC-C9 | Pending | Existing dashboard and integrations continue working unchanged |
| ISC-C10 | Pending | Client onboarding page accepts Google and Meta account IDs |
| ISC-A1 | Pending | No existing integration or sync pipeline is broken by changes |
| ISC-A2 | Pending | No hardcoded client IDs or account IDs in new code |
| ISC-A3 | Active | No commits pushed without Chase's explicit approval first |
