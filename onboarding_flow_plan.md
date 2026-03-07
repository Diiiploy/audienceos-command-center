# Onboarding Flow: Next Steps Implementation Plan

> **Created:** 2026-03-05
> **Context:** Follow-up to PR #14 (`feat/onboarding-flow-complete`) — a +2,783/-719 line overhaul of the entire onboarding system. This plan was formulated via multi-model council debate (Architect, Designer, Engineer, Researcher) and approved by Trevor.
>
> **Timeline:** 2-3 weeks
> **Branch strategy:** Always push via feature branch + PR. Never push directly to main.

---

## Table of Contents

1. [What Was Already Built (PR #14)](#1-what-was-already-built-pr-14)
2. [Current Architecture Overview](#2-current-architecture-overview)
3. [Priority 1: Day 1 Housekeeping](#3-priority-1-day-1-housekeeping)
4. [Priority 2: Test Coverage Expansion (Week 1)](#4-priority-2-test-coverage-expansion-week-1)
5. [Priority 3: Mobile Responsiveness (Week 1)](#5-priority-3-mobile-responsiveness-week-1)
6. [Priority 4: Supabase Realtime (Week 2)](#6-priority-4-supabase-realtime-week-2)
7. [Priority 5: Error State Design (Week 2)](#7-priority-5-error-state-design-week-2)
8. [Priority 6: Client Self-Service Status Page (Week 2)](#8-priority-6-client-self-service-status-page-week-2)
9. [Priority 7: Onboarding State Machine (Week 3)](#9-priority-7-onboarding-state-machine-week-3)
10. [Priority 8: Automated Follow-Up Sequences (Week 3)](#10-priority-8-automated-follow-up-sequences-week-3)
11. [Deferred Items](#11-deferred-items)
12. [Environment & Configuration Reference](#12-environment--configuration-reference)
13. [Testing Infrastructure Reference](#13-testing-infrastructure-reference)
14. [File Reference Map](#14-file-reference-map)

---

## 1. What Was Already Built (PR #14)

PR #14 addressed 27 identified issues (6 broken, 9 missing, 7 partial, 5 UX) across 23 files. Here's what's in production:

### Client Portal (`app/onboarding/start/page.tsx`)
- **4-step wizard:** Welcome → Your Info → Platform Access → Complete
- **Real provisioning:** Slack channel creation via diiiploy-gateway, Drive folder via diiiploy-gateway (needs creds)
- **Dynamic forms only:** Legacy hardcoded fields removed entirely. Uses `DynamicFormFields` component with `useDynamicFormState` hook
- **Inline validation:** Email regex, URL via `new URL()`, custom `validation_regex` from DB, touched-state tracking
- **Configurable platforms:** Step 3 reads `access_delegation_config` JSONB from journey. N/A toggle per platform
- **Session persistence:** localStorage keyed by `onboarding_progress_${token}` — survives browser close
- **Video embeds:** YouTube/Loom regex detection, iframe embed with fallback
- **Step names:** "Welcome", "Your Info", "Platform Access" (replaced internal jargon)

### Admin Hub
- **Active Onboardings** (`components/onboarding/active-onboardings.tsx`): DnD wired to `updateStageStatus()` (was console.log stub), days-in-stage uses `stage_status.updated_at`, 30s polling + tab-focus refresh, resend email button, notification dots
- **Trigger Modal** (`components/onboarding/trigger-onboarding-modal.tsx`): Journey selector dropdown, `journey_id` in payload, title "Send Onboarding Invite"
- **Journey Config** (`components/onboarding/client-journey-config.tsx`): Journey selector, "Create New Journey" card, try/catch error handling
- **Form Builder** (`components/onboarding/field-row.tsx`): Debounced edits (500ms), delete confirmation AlertDialog, select options editor, regex editor
- **Form Preview** (`components/onboarding/form-preview.tsx`): Dark theme matching portal, real select options, regex display

### API
- `POST /api/public/onboarding/[token]/provision` — Real Slack + Drive provisioning, idempotent
- `POST /api/v1/onboarding/instances/[id]/resend-email` — RBAC-protected, rate-limited (5/min)
- `GET /api/public/onboarding/[token]` — Returns provisioning columns, agency_name, access_delegation_config

### Store (`stores/onboarding-store.ts`)
- Error propagation in `saveJourney()` (was swallowing errors)
- `createJourney(name)`, `resendEmail(instanceId)` actions
- `isLoadingInstance` separate from `isLoadingInstances`
- `hasUnseenUpdates()` with localStorage-backed `lastViewedInstances`
- Optimistic updates with error rollback

### Email (`lib/email/onboarding.ts`)
- `sendOnboardingEmail()` — Welcome email with SEO summary section, reply_to header
- `sendOnboardingConfirmationEmail()` — Post-submission email with Slack channel info
- Domain fixed: `.io` not `.com`
- Fallback URL fixed: `v0-audience-os-command-center.vercel.app`

### Database (Migration `20260304_onboarding_provisioning.sql` — APPLIED)
- `onboarding_instance`: `slack_channel_id`, `slack_channel_name`, `drive_folder_id`, `drive_folder_url`, `provisioning_data` (JSONB)
- `onboarding_journey`: `access_delegation_config` (JSONB, seeded with Meta/Google/Shopify defaults)
- Index on `slack_channel_id`

### Tests (50 passing)
| File | Tests | Covers |
|------|-------|--------|
| `__tests__/api/onboarding-public-token.test.ts` | 6 | GET /api/public/onboarding/[token] |
| `__tests__/api/onboarding-public-submit.test.ts` | 8 | POST /api/public/onboarding/[token]/submit |
| `__tests__/api/onboarding-instances.test.ts` | 10 | GET/POST /api/v1/onboarding/instances |
| `__tests__/lib/email/onboarding-email.test.ts` | 8 | Email service functions |
| `__tests__/components/onboarding/dynamic-form-fields.test.tsx` | 18 | Validation logic (pure, no React) |

### CI Pipeline (`.github/workflows/ci.yml` — ALREADY EXISTS)
- Lint → Type Check → Unit Tests → Build → Smoke Test (Vercel deployment health check on PRs)
- Runs on push to main and all PRs

---

## 2. Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENCY ADMIN HUB                         │
│  /onboarding (authenticated)                                │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Active Board  │  │ Journey      │  │ Form Builder     │  │
│  │ (DnD pipeline)│  │ Config       │  │ (DnD fields)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘  │
│         │                 │                  │              │
│         ▼                 ▼                  ▼              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Zustand Store (onboarding-store.ts)       │    │
│  │  journeys, fields, instances, notifications         │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │ fetchWithCsrf()                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     API Routes (RBAC + CSRF + Rate Limiting)        │    │
│  │  /api/v1/onboarding/instances                       │    │
│  │  /api/v1/onboarding/instances/[id]/stage            │    │
│  │  /api/v1/onboarding/instances/[id]/resend-email     │    │
│  │  /api/v1/onboarding/journeys                        │    │
│  └──────────────────────┬──────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────┘
                          │ Supabase (RLS by agency_id)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE                              │
│  onboarding_instance, onboarding_journey,                   │
│  onboarding_stage_status, intake_form_field,                │
│  intake_response, client, agency, user                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ Public API (service role key)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT PORTAL                             │
│  /onboarding/start?token=... (public, no auth)              │
│                                                             │
│  Step 1: Welcome   → POST /provision (Slack + Drive)        │
│  Step 2: Your Info → DynamicFormFields + useDynamicFormState │
│  Step 3: Platform  → access_delegation_config from journey  │
│  Step 4: Complete  → POST /submit + confirmation email      │
│                                                             │
│  Session: localStorage keyed by token                       │
│  Token: 64-char hex link_token on onboarding_instance       │
└─────────────────────────────────────────────────────────────┘
```

### Key Integration Points
- **Slack:** diiiploy-gateway → `createSlackChannelForClient()` in `lib/integrations/slack-channel-service.ts`
- **Google Drive:** diiiploy-gateway `POST /drive/folder` (needs `DIIIPLOY_GATEWAY_URL` + `DIIIPLOY_GATEWAY_API_KEY`)
- **Email:** Resend API via `lib/email/onboarding.ts` (needs `RESEND_API_KEY`)
- **Auth:** Supabase Google OAuth (trevor@diiiploy.io is Google-only, no password)

### Internal Conventions (Session Handoff)
A fresh session should know these non-obvious patterns used throughout the codebase:
- **`fetchWithCsrf()`** (`lib/csrf.ts`) — Custom fetch wrapper that auto-attaches CSRF tokens. The Zustand store uses this for ALL authenticated API calls, not raw `fetch()`.
- **`sonner` toast** — Toast notifications use the `toast` import from `sonner`, not a custom hook. Pattern: `toast.success('Message')`, `toast.error('Message')`.
- **`withPermission()`** (`lib/rbac/with-permission.ts`) — RBAC wrapper for API routes. Usage: `export const GET = withPermission({ resource: 'clients', action: 'read' })(handler)`.
- **`withRateLimit()`** / **`withCsrfProtection()`** (`lib/security.ts`) — Rate limiting and CSRF validation middleware for API routes.
- **`createRouteHandlerClient()`** (`lib/supabase.ts`) — Creates authenticated Supabase client for API routes. Returns `{ supabase, user, agencyId }`.
- **`(supabase as any)`** — Used for new DB columns not yet in `types/database.ts`. First priority to fix.

### Type Safety Note
New DB columns added in the provisioning migration use `(supabase as any)` casts because `types/database.ts` hasn't been regenerated. This is the **first thing to fix** (Priority 1).

---

## 3. Priority 1: Day 1 Housekeeping

**Time estimate:** 2-3 hours total
**Reasoning:** These are zero-risk, high-impact tasks that unblock everything else. The council unanimously agreed these come first.

### 3A. Regenerate Supabase Types

**Why:** Every `(supabase as any)` cast is a type-safety hole. One wrong column name → silent runtime failure with zero compiler warning. The migration added 7 new columns that are currently invisible to TypeScript.

**Steps:**
1. Generate types using the Supabase Management API (NO local CLI needed — the DB is cloud-hosted, not local):
   ```bash
   # Option A: Use Supabase MCP (if authenticated)
   # The MCP's generate_typescript_types tool does this directly

   # Option B: Use the Management API via curl
   curl -s 'https://api.supabase.com/v1/projects/qzkirjjrcblkqvhvalue/types/typescript' \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" > types/database.ts

   # Option C: If neither works, use npx (downloads CLI temporarily, no local DB needed)
   npx supabase gen types typescript --project-id qzkirjjrcblkqvhvalue > types/database.ts
   ```
2. Diff the output against the old file. Watch for:
   - `set_cartridge_default` RPC — manually added, not in PostgREST introspection. Re-add if missing.
   - `user_role` enum — DB has `"admin" | "user"` but app uses `"owner" | "admin" | "manager" | "member" | "user"`. Preserve the app's wider enum.
   - Any custom enums or functions that were manually maintained.
3. Search for all `(supabase as any)` casts: `rg "supabase as any" --type ts`
4. Replace each cast with properly typed Supabase client calls
5. Run `npx tsc --noEmit` to verify zero type errors
6. Run `npm test` to verify no regressions

**Important:** The `supabase/` directory in the project (`config.toml`, `seeds/`, `.temp/`) was created by a previous session running `supabase init`. This is local development scaffolding that is NOT used — the database is cloud-hosted on Supabase. The only useful content in `supabase/` is the `migrations/` folder which holds reference copies of SQL migrations. Do not attempt to run `supabase start` or any local Supabase commands.

**Files affected:**
- `types/database.ts` (regenerated)
- Run `rg "supabase as any" --type ts` at execution time — the list below covers onboarding files only, but the session should fix ALL instances across the entire codebase while the regenerated types are fresh:
  - `app/api/public/onboarding/[token]/route.ts` (remove cast)
  - `app/api/public/onboarding/[token]/provision/route.ts` (remove cast)
  - `app/api/public/onboarding/[token]/submit/route.ts` (check for cast)
  - `stores/onboarding-store.ts` (check for cast)
  - Plus any other files found by the grep — fix them all in one pass

### 3B. Fix Test File Type Error

**Why:** There's one TS error in `__tests__/lib/email/onboarding-email.test.ts:16` — the `global.fetch = mockFetch` assignment has a type mismatch. Non-blocking for tests but blocks `tsc --noEmit` in CI.

**Fix:** Cast the mock: `global.fetch = mockFetch as unknown as typeof fetch`

### 3C. Fix `.env.local` Email Domain

**Why:** `.env.local` still has `RESEND_FROM_EMAIL="noreply@audienceos.com"` — should be `.io`. The code fallback handles this, but the env var override wins.

**Fix:** Change to `RESEND_FROM_EMAIL="noreply@audienceos.io"` in `.env.local`

---

## 4. Priority 2: Test Coverage Expansion (Week 1)

**Time estimate:** 3-4 days
**Reasoning:** The council's engineer (Marcus) and architect (Serena) both emphasized that the Zustand store is where the real complexity lives — step transitions, partial completion, error recovery. Zero store coverage is a gap. Component tests catch UI regressions that unit tests miss.

### 4A. Store Tests (30 cases)

**File:** `__tests__/stores/onboarding-store.test.ts` (already exists — read it first and skip any categories already covered)

**Mock strategy:**
- Mock `fetchWithCsrf` from `@/lib/csrf` — this is what the store uses for all API calls
- Mock `toast` from `sonner` for notification assertions
- Use `act()` wrapper for async state updates

**Test categories:**

| Category | Cases | What to test |
|----------|-------|--------------|
| Journey CRUD | 5 | fetchJourneys, createJourney (success + error), saveJourney (success + error propagation) |
| Field CRUD | 6 | fetchFields, createField, updateField, deleteField, reorderFields (optimistic + rollback) |
| Instance management | 8 | fetchInstances, fetchInstance, triggerOnboarding (success + email failure), updateStageStatus (optimistic update + rollback) |
| Resend email | 3 | Success, rate limit error, network error |
| Notifications | 4 | markInstanceViewed, hasUnseenUpdates, localStorage persistence, initial load from localStorage |
| Edge cases | 4 | Concurrent operations, empty state handling, selectedInstance sync with instances array |

**Store mock skeleton:**
```typescript
vi.mock('@/lib/csrf', () => ({
  fetchWithCsrf: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { fetchWithCsrf } from '@/lib/csrf'
const mockFetch = fetchWithCsrf as ReturnType<typeof vi.fn>
```

**Key assertion patterns:**
```typescript
// Verify optimistic update
store.updateStageStatus('inst-1', 'stage-2', 'completed')
expect(store.selectedInstance?.stage_statuses[1].status).toBe('completed') // Immediate

// Verify rollback on error
await waitFor(() => expect(store.selectedInstance?.stage_statuses[1].status).toBe('in_progress'))
```

### 4B. Component Tests

**Important:** The project's shadcn/Radix dependency tree causes OOM in jsdom when importing full components. Use the **pure logic test** pattern established in `dynamic-form-fields.test.tsx` — extract and test the logic without React imports.

| File | Cases | Strategy |
|------|-------|----------|
| `__tests__/components/onboarding/trigger-onboarding-modal.test.tsx` | 6 | Test form validation logic, journey selection state, payload construction |
| `__tests__/components/onboarding/form-builder.test.tsx` | 5 | Test field reorder logic, add/delete state management |
| `__tests__/components/onboarding/active-onboardings.test.tsx` | 6 | Test DnD handler logic, stage grouping, days-in-stage calculation, notification dot logic |
| `__tests__/components/onboarding/client-journey-config.test.tsx` | 4 | Test journey selection, create journey validation |

**OOM prevention pattern:**
```typescript
// DON'T import the component
// import { TriggerOnboardingModal } from '@/components/onboarding/trigger-onboarding-modal'

// DO reproduce the logic
function validateTriggerPayload(payload: { clientId: string; journeyId?: string }) {
  if (!payload.clientId) return 'Client is required'
  return null
}
```

### 4C. E2E Tests (Critical Path Only)

**File:** `e2e/onboarding-portal.spec.ts`

The council agreed: one happy-path E2E test covering the full 4-step flow. Don't over-invest in E2E — they're expensive to maintain.

**Prerequisites:** Playwright installed (`npm run test:e2e`), test token in DB

**Test flow:**
1. Navigate to `/onboarding/start?token={test_token}`
2. Step 1: Verify welcome screen loads, provisioning completes (mock or use test Slack workspace)
3. Step 2: Fill form fields, verify validation errors, submit
4. Step 3: Check/N/A platforms, proceed
5. Step 4: Verify success screen shows submitted data

---

## 5. Priority 3: Mobile Responsiveness (Week 1)

**Time estimate:** 2-3 days
**Reasoning:** The council's designer (Aditi) made the sharpest call nobody else caught — clients open token-based portal links on their phones. If the form is cramped on mobile, trust is lost instantly. This is a constraint, not a nice-to-have.

### What to Audit

**Client Portal (highest priority — client-facing):**
- `app/onboarding/start/page.tsx` — Step layout, card sizing, button placement
- `components/onboarding/dynamic-form-fields.tsx` — Form field widths, select dropdowns, textarea sizing
- Video embed iframe — responsive aspect ratio
- Platform access cards in Step 3 — grid layout on narrow screens

**Admin Hub (secondary — internal tool):**
- Pipeline board columns — horizontal scroll or stack on mobile
- Form builder DnD — touch targets, drag handles
- Trigger modal — form layout in narrow viewports

### Implementation Approach

1. **Test with Chrome DevTools** device emulation (iPhone SE 375px, iPhone 14 390px, iPad 768px)
2. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) — the project already uses Tailwind
3. Key breakpoints to test:
   - 375px (small phone)
   - 390px (standard phone)
   - 768px (tablet)
   - 1024px+ (desktop — should already work)
4. Focus areas:
   - Form fields should be full-width on mobile
   - Buttons should be full-width on mobile with **minimum 44x44px touch targets** (WCAG 2.5.8 / Apple HIG)
   - Step progress indicator should condense (numbers only, no text)
   - Platform access cards should stack vertically
   - Video embed should maintain 16:9 aspect ratio
   - All interactive elements (checkboxes, toggles, links) must meet 44x44px minimum

### Verification
- Use Browser skill to screenshot at each breakpoint
- Test actual form interaction on a real phone if possible
- Verify session persistence works across mobile browsers

---

## 6. Priority 4: Supabase Realtime (Week 2)

**Time estimate:** 1-2 days
**Reasoning:** Universal council consensus. 30s polling is a crutch that creates unnecessary server load and a poor admin experience. Supabase Realtime is already in the stack — we just need to subscribe.

### What Changes

**Current:** `active-onboardings.tsx` polls via `setInterval(fetchInstances, 30000)` + `visibilitychange` handler

**Target:** Subscribe to Supabase Realtime channel for `onboarding_instance` and `onboarding_stage_status` changes, with polling as fallback

### Implementation

**File:** `components/onboarding/active-onboardings.tsx`

```typescript
// Subscribe to realtime changes
useEffect(() => {
  const supabase = createBrowserClient(...)

  const channel = supabase
    .channel('onboarding-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'onboarding_instance',
      filter: `agency_id=eq.${agencyId}`,
    }, (payload) => {
      // Refresh instances on any change
      fetchInstances()
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'onboarding_stage_status',
    }, (payload) => {
      fetchInstances()
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [agencyId])
```

### Prerequisites
- Supabase Realtime must be enabled for these tables (check Supabase dashboard → Database → Replication)
- RLS policies must allow the authenticated user to see changes (already in place via `agency_id` filtering)
- Keep 60s polling as fallback in case Realtime disconnects
- **`agencyId` source:** In the active-onboardings component, `agencyId` comes from the authenticated user context. Read the component's existing props and hooks to find the exact source before wiring the subscription — it may come from a parent layout, a context provider, or the store's user state. Verify by reading `components/onboarding/active-onboardings.tsx` at implementation time.

### Verification
- Open two browser tabs: admin hub + client portal
- Submit onboarding from client portal
- Admin hub should update within 1-2 seconds (not 30s)

---

## 7. Priority 5: Error State Design (Week 2)

**Time estimate:** 2 days
**Reasoning:** The council's designer (Aditi) identified this as the overlooked gap everyone else missed. What does the client see when provisioning fails? When a token expires mid-flow? The unhappy path is the real design problem.

### Error States to Design

| Scenario | Current Behavior | Target Behavior |
|----------|-----------------|-----------------|
| Slack provisioning fails | Amber warning, continues | Amber warning with retry button, "Contact your agency" fallback |
| Drive provisioning fails | Silent, continues | Same as Slack — independent, non-blocking |
| Token invalid/expired | 404 page | Friendly "Link expired" page with agency contact info |
| Token already completed | 410 page | "Already completed" with summary of what was submitted |
| Form submission fails | Generic error | Inline error toast with retry, data preserved in localStorage |
| Network offline mid-flow | Unhandled | Detect offline, show banner, auto-retry on reconnect |
| Session restore fails | Silent | Start fresh, no error (graceful degradation) |

### Implementation

**File:** `app/onboarding/start/page.tsx`

1. Add error boundary component wrapping the wizard
2. Add offline detection: `navigator.onLine` + `online`/`offline` event listeners
3. Add retry mechanism for provisioning failures
4. Improve 404/410 pages with agency branding and contact info
5. Add form submission retry with exponential backoff

**File:** `app/api/public/onboarding/[token]/route.ts`

1. Return `agency_name` and `agency_contact_email` in error responses so the error page can show them

---

## 8. Priority 6: Client Self-Service Status Page (Week 2)

**Time estimate:** 3 days
**Reasoning:** The council's researcher (Ava) cited that Vendasta's client transparency model reduces agency support load by 30-40%. A read-only status page transforms the portal from a one-time form into an ongoing relationship tool.

### What to Build

A new route: `/onboarding/status?token={link_token}`

After completing onboarding, clients can revisit their token link to see:
- Current onboarding stage and progress
- What they submitted (form responses)
- What platforms have been connected
- Any pending items or next steps from the agency
- Agency contact info

### Architecture

**New file:** `app/onboarding/status/page.tsx`

- Uses the same token-based auth as the portal (no login required)
- Reads from the same `GET /api/public/onboarding/[token]` endpoint
- Read-only — no mutations
- Mobile-first design (Aditi's recommendation)

**Modify:** `app/api/public/onboarding/[token]/route.ts`

- When `status === 'completed'`, instead of returning 410, return the full instance data with a `completed: true` flag
- Include `intake_response` data so the status page can show what was submitted
- **Important redirect decision:** The client portal (`/onboarding/start`) also hits this GET endpoint. When it sees `completed: true`, it should redirect the client to `/onboarding/status?token={token}` instead of showing the 410 "already completed" page. Implement this redirect in the portal page's data-loading logic, NOT in the API route.

**Loading and empty states for status page:**
- Show a skeleton loader (pulsing card placeholders) while data loads
- If client only completed Step 1 (no intake responses yet), show "Your information hasn't been submitted yet" in the form section
- If no platform access data, show "No platform connections recorded" instead of an empty section
- Each section should gracefully handle missing data — never show a blank card

**Modify:** `app/onboarding/start/page.tsx`

- After Step 4 completion, show a "Bookmark this page to check your status" message
- Link to `/onboarding/status?token={token}`

### Design

- Clean, read-only card layout
- Stage progress bar showing completed/current/pending stages
- Expandable sections for submitted data
- Agency branding (logo, name, contact)
- Mobile-first: full-width cards, large text, clear hierarchy

---

## 9. Priority 7: Onboarding State Machine (Week 3)

**Time estimate:** 3-4 days
**Reasoning:** The council's architect (Serena) argued this is the "load-bearing wall" — everything else (analytics, automations, real-time updates) leans on formalized state transitions. The council debated sequencing (state machine before or after analytics) — Trevor deprioritized analytics, making the state machine the clear next step after Realtime is in place.

### Current State Model

The existing `onboarding_status` enum: `"pending" | "in_progress" | "completed" | "cancelled"`

This is too coarse. The portal has 4 steps but the DB only knows 4 statuses.

### Proposed State Machine

```
                    ┌──────────────┐
                    │   CREATED    │  Trigger from admin hub
                    └──────┬───────┘
                           │ Client opens link
                           ▼
                    ┌──────────────┐
                    │ PROVISIONING │  Step 1: Slack + Drive
                    └──────┬───────┘
                           │ Provisioning complete (or skipped)
                           ▼
                    ┌──────────────┐
                    │  INTAKE      │  Step 2: Form fields
                    └──────┬───────┘
                           │ Form submitted
                           ▼
                    ┌──────────────┐
                    │   ACCESS     │  Step 3: Platform delegation
                    └──────┬───────┘
                           │ All required platforms granted/NA'd
                           ▼
                    ┌──────────────┐
                    │  COMPLETED   │  Step 4: Success
                    └──────────────┘

        Side transitions:
        Any state ──► STALLED (no activity for 24h+)
        Any state ──► CANCELLED (admin cancels)
        STALLED   ──► Previous state (client returns)
```

### Implementation

**Migration:** Add `detailed_status` column to `onboarding_instance` (or extend existing `status` enum)

**New file:** `lib/onboarding/state-machine.ts`
- Define valid transitions as a map
- Export `transition(instance, event)` function that validates and returns new state
- Side effects (email triggers, Slack notifications) attached to transitions
- This becomes the single source of truth for "what can happen next"

**Modify:** Portal and API routes to use state machine for transitions instead of ad-hoc status updates

**Key refactor target:** The `updateStageStatus()` call in `active-onboardings.tsx`'s DnD handler is the specific code path the state machine will replace. Currently it does a direct Supabase update — the state machine should validate the transition first, then execute it with side effects.

### Why This Enables Everything Else
- **Automated follow-ups:** Trigger on `STALLED` transition
- **Analytics:** Instrument each transition event
- **Realtime:** Subscribe to state changes, not raw table mutations
- **Status page:** Show progress based on state, not step number

---

## 10. Priority 8: Automated Follow-Up Sequences (Week 3)

**Time estimate:** 2 days
**Reasoning:** Incomplete onboardings are revenue leaks. The council's researcher (Ava) noted that DashClicks automates nudges at 24h, 72h, and 7d intervals. This directly depends on the state machine (Priority 7) — you need to know when a client stalls.

### Design

**Trigger:** When an onboarding instance has been in the same state for 24h without activity

**Sequence:**
| Delay | Action | Content |
|-------|--------|---------|
| 24h | Email nudge | "You're almost done — pick up where you left off" with portal link |
| 72h | Email + Slack notification to agency | "Client hasn't completed onboarding" |
| 7d | Final email to client + escalation to agency | "We noticed you haven't finished — need help?" |

### Implementation

**Option A: Supabase Edge Function (cron)**
- Supabase supports cron-triggered Edge Functions
- Query for instances where `updated_at < now() - interval '24 hours'` AND `status != 'completed'`
- Send emails via existing `sendOnboardingEmail()` function
- Log sent nudges to prevent duplicates

**Option B: Vercel Cron**
- `vercel.json` cron job hitting an API route
- Same logic as Option A but runs in the Next.js API layer

**Recommendation:** Option A (Supabase Edge Function) keeps the logic close to the data and avoids cold starts.

**New file:** `supabase/functions/onboarding-followup/index.ts`
**New migration:** Add `last_nudge_sent_at` and `nudge_count` columns to `onboarding_instance`

---

## 11. Deferred Items

These are explicitly out of scope for the 2-3 week timeline. Revisit after the above priorities are complete.

| Item | Why Deferred | Revisit When |
|------|-------------|--------------|
| **Analytics dashboard** | Trevor deprioritized; instrument after state machine is solid | After Priority 7 |
| **Template library** | Council agreed: premature — schema still iterating | After 10+ agencies use the system |
| **OAuth platform connections** | Good idea but large scope; current form-based approach works | Q2 2026 |
| **Google Drive provisioning** | Needs diiiploy-gateway credentials that aren't configured yet | When creds are available |
| **Stage editor component** | Journey stages are manageable via DB for now | When agencies need self-service stage config |
| **Comprehensive E2E suite** | One critical-path E2E is sufficient for now | After state machine stabilizes |
| **WebSocket custom layer** | Supabase Realtime covers the use case | Never (use Supabase Realtime) |

---

## 12. Environment & Configuration Reference

### Required Environment Variables

| Variable | Status | Value/Notes |
|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Set | `https://qzkirjjrcblkqvhvalue.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | In `.env.local` |
| `NEXT_PUBLIC_APP_URL` | ✅ Set | `https://v0-audience-os-command-center.vercel.app` |
| `RESEND_API_KEY` | ✅ Set | In `.env.local` |
| `RESEND_FROM_EMAIL` | ⚠️ Fix | Change `.com` → `.io` in `.env.local` |
| `DIIIPLOY_GATEWAY_URL` | ✅ Set | Existing (Slack integration) |
| `DIIIPLOY_GATEWAY_API_KEY` | ✅ Set | Existing |
| `DIIIPLOY_TENANT_ID` | ✅ Set | Existing |
| `GOOGLE_CLIENT_ID` | ✅ Set | For SSO login |
| `DIIIPLOY_GATEWAY_URL` | ✅ Set | `https://diiiploy-gateway.diiiploy.workers.dev` (also used for Slack + Drive) |
| `DIIIPLOY_GATEWAY_API_KEY` | ✅ Set | In `.env.local` and Vercel |

### Supabase Project
- **Project ID:** `qzkirjjrcblkqvhvalue`
- **Dashboard:** `https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue`
- **Auth:** Google OAuth only for trevor@diiiploy.io (no password)
- **Redirect URLs:** Must include `http://localhost:3000/**` for local dev

### Local Development
```bash
cd ~/audienceos-command-center
npm run dev          # Next.js dev server on :3000
npm test             # Vitest (50 tests)
npm run test:e2e     # Playwright
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

**Note:** The database is cloud-hosted on Supabase (not local). There is no local Supabase instance. The `supabase/` directory contains CLI scaffolding from a previous session (`config.toml`, `seeds/`) that is not used. Only `supabase/migrations/` is relevant — it holds reference copies of migration SQL files. Migrations are applied via the Supabase MCP or the Supabase Dashboard SQL Editor, NOT via `supabase db push` or `supabase migration up`.

---

## 13. Testing Infrastructure Reference

### Vitest Configuration (`vitest.config.ts`)
- Environment: jsdom
- Globals: enabled (describe, it, expect, vi, beforeEach available without import)
- Setup: `vitest.setup.ts`
- Include: `**/*.{test,spec}.{ts,tsx}`
- Exclude: node_modules, .next, e2e, infrastructure

### Mock Patterns

**Supabase mock** (`__tests__/helpers/mock-supabase.ts`):
- `createChainableMock()` — Proxy-based chainable query builder
- `createMockSupabase()` — Full Supabase client mock
- `mockCookies()` — Next.js cookies() mock
- `createMockNextRequest()` — NextRequest factory

**Supabase Proxy pattern** (for routes that `await supabase.from('x').upsert(...)` directly):
```typescript
function makeChain(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result)
  const proxy = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return resolved.then.bind(resolved) // Makes proxy thenable
      if (['single', 'maybeSingle'].includes(prop)) return vi.fn().mockResolvedValue(result)
      return vi.fn().mockReturnValue(proxy) // Everything else chains
    },
  })
  return proxy
}
```

**OOM prevention:** DO NOT import React components that use shadcn/Radix in jsdom tests. Extract logic into pure functions and test those instead. The `dynamic-form-fields.test.tsx` file demonstrates this pattern.

**Email mock:** Mock `global.fetch` for Resend API calls. Use dynamic imports (`await import(...)`) to pick up env changes between tests.

### CI Pipeline
Already configured in `.github/workflows/ci.yml`:
- **lint** → **typecheck** → **test** → **build** → **smoke-test** (Vercel deployment health check)
- No additional CI work needed — just ensure tests pass

---

## 14. File Reference Map

### Core Files (what to read first in a new session)

| File | Purpose | Lines |
|------|---------|-------|
| `stores/onboarding-store.ts` | Central state management — all actions and state shape | ~300 |
| `app/onboarding/start/page.tsx` | Client portal 4-step wizard | ~440 |
| `components/onboarding/dynamic-form-fields.tsx` | Form rendering + useDynamicFormState hook | ~300 |
| `components/onboarding/active-onboardings.tsx` | Admin pipeline board with DnD | ~700 |
| `app/api/public/onboarding/[token]/route.ts` | Public GET — token validation, data fetch | ~130 |
| `app/api/public/onboarding/[token]/submit/route.ts` | Public POST — form submission | ~120 |
| `app/api/public/onboarding/[token]/provision/route.ts` | Public POST — Slack + Drive provisioning | ~220 |
| `lib/email/onboarding.ts` | Email templates + Resend integration | ~420 |

### Admin Components

| File | Purpose |
|------|---------|
| `components/onboarding/trigger-onboarding-modal.tsx` | "Send Onboarding Invite" modal |
| `components/onboarding/client-journey-config.tsx` | Journey selector + config |
| `components/onboarding/form-builder.tsx` | DnD form field builder |
| `components/onboarding/field-row.tsx` | Individual field editor (debounce, delete, options, regex) |
| `components/onboarding/form-preview.tsx` | Dark-themed form preview |

### Test Files

| File | Tests | Status |
|------|-------|--------|
| `__tests__/api/onboarding-public-token.test.ts` | 6 | ✅ Passing |
| `__tests__/api/onboarding-public-submit.test.ts` | 8 | ✅ Passing |
| `__tests__/api/onboarding-instances.test.ts` | 10 | ✅ Passing |
| `__tests__/lib/email/onboarding-email.test.ts` | 8 | ✅ Passing |
| `__tests__/components/onboarding/dynamic-form-fields.test.tsx` | 18 | ✅ Passing |
| `__tests__/stores/onboarding-store.test.ts` | ? | Exists, needs expansion |
| `__tests__/helpers/mock-supabase.ts` | — | Shared mock factory |

### Database

| Table | Key Columns |
|-------|-------------|
| `onboarding_instance` | id, client_id, journey_id, agency_id, status, link_token, slack_channel_id, slack_channel_name, drive_folder_id, drive_folder_url, provisioning_data |
| `onboarding_journey` | id, agency_id, name, description, is_default, stages (JSONB), access_delegation_config (JSONB), welcome_video_url |
| `onboarding_stage_status` | id, instance_id, stage_id, status, platform_statuses (JSONB), updated_at |
| `intake_form_field` | id, agency_id, journey_id, field_label, field_type, is_required, is_active, sort_order, options, validation_regex |
| `intake_response` | id, instance_id, field_id, value, agency_id |

---

## Execution Checklist

Use this to track progress across sessions:

### Day 1 Housekeeping
- [ ] Regenerate Supabase types (`supabase gen types`)
- [ ] Remove all `(supabase as any)` casts
- [ ] Fix test file type error (email test `global.fetch` cast)
- [ ] Fix `.env.local` email domain (.com → .io)
- [ ] Verify: `tsc --noEmit` passes, `npm test` passes (50/50)

### Week 1: Tests + Mobile
- [ ] Store tests: journey CRUD (5 cases)
- [ ] Store tests: field CRUD (6 cases)
- [ ] Store tests: instance management (8 cases)
- [ ] Store tests: resend email (3 cases)
- [ ] Store tests: notifications (4 cases)
- [ ] Store tests: edge cases (4 cases)
- [ ] Component tests: trigger modal logic (6 cases)
- [ ] Component tests: form builder logic (5 cases)
- [ ] Component tests: active onboardings logic (6 cases)
- [ ] Component tests: journey config logic (4 cases)
- [ ] Mobile audit: client portal at 375px, 390px, 768px
- [ ] Mobile fixes: form fields, buttons, step indicator, platform cards
- [ ] Mobile fixes: video embed aspect ratio
- [ ] Accessibility: verify WCAG AA contrast ratios, focus indicators, and 44px touch targets
- [ ] E2E test: one critical-path happy flow

### Week 2: Realtime + Error States + Status Page
- [ ] Enable Supabase Realtime on onboarding tables
- [ ] Replace 30s polling with Realtime subscriptions
- [ ] Keep 60s polling as fallback
- [ ] Design error states: provisioning failure, token expired, network offline
- [ ] Implement error boundary in portal
- [ ] Add offline detection + auto-retry
- [ ] Improve 404/410 pages with agency branding
- [ ] Build `/onboarding/status` route (read-only progress page)
- [ ] Modify GET endpoint to return data for completed instances
- [ ] Mobile-first status page design

### Week 3: State Machine + Follow-Ups
- [ ] Design state machine transitions (CREATED → PROVISIONING → INTAKE → ACCESS → COMPLETED)
- [ ] Implement `lib/onboarding/state-machine.ts`
- [ ] Add `detailed_status` column migration
- [ ] Wire portal and API routes to state machine
- [ ] Implement stall detection (24h inactivity)
- [ ] Build follow-up email sequence (24h, 72h, 7d)
- [ ] Add `last_nudge_sent_at` column
- [ ] Deploy follow-up cron (Supabase Edge Function or Vercel Cron)

### Deferred
- [ ] Analytics instrumentation (after state machine)
- [ ] Template library (after 10+ agencies)
- [ ] OAuth platform connections (Q2 2026)
- [ ] Google Drive provisioning (when diiiploy-gateway creds available)
