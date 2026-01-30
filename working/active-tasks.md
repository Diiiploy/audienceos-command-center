# Active Tasks

## 🎯 CURRENT PRIORITY: RevOS Integration into AudienceOS

**Goal:** Unify RevOS + AudienceOS into single platform
**Plan:** `audienceos-unified-platform/docs/05-planning/CTO-DECISION-2026-01-20.md`
**Worktree:** `/Users/rodericandrews/_PAI/projects/audienceos-unified-platform`
**Branch:** `feature/unified-platform`
**Confidence:** 8/10 (Week 1 Security + Phase 0 complete, ready for Phase 1)
**Foundation:** AudienceOS codebase + Supabase

---

## ✅ Week 1 Security - COMPLETE (2026-01-21)

**Status:** 6/6 EXIT CRITERIA MET

Per CTO Decision 2026-01-20: "Week 1 is security hardening. No exceptions."

| Exit Criteria | Required | Actual | Status |
|---------------|----------|--------|--------|
| `lib/env.ts` with validation | Yes | EXISTS | ✅ |
| `lib/logger.ts` structured logging | Yes | EXISTS (Pino) | ✅ |
| Console statements in critical OAuth paths | 0 | 0 | ✅ |
| crypto.ts fallbacks removed | Yes | Uses lib/env.ts | ✅ |
| Rate limiting on chat/sync/OAuth | Yes | withRateLimit applied | ✅ |
| Token refresh (oauth-utils.ts) | Yes | EXISTS | ✅ |

**Commits:**
- `10851f7` - FIX-1: Remove crypto.ts fallbacks
- `73cb652` - FIX-2: Create lib/logger.ts with Pino
- `ee6066d` - FIX-3: Replace console statements in OAuth paths
- `af0f68c` - FIX-4: Add rate limiting to OAuth endpoints
- `39133bf` - FIX-5: Create oauth-utils.ts token refresh

**Note:** 231 console statements remain across 59 files. Critical OAuth/auth paths are secured. Remaining can be addressed incrementally.

---

### Phase 0: Database Schema Prep (1-2 days) ✅ COMPLETE

**Status:** DONE (2026-01-21)

**Tasks:**
- [x] Create migration: `supabase/migrations/025_add_revos_tables.sql`
  - 11 new tables: linkedin_account, lead_magnet, campaign, post, comment, lead, webhook_config, webhook_delivery, pod, pod_member, pod_activity
  - 10 new enums for status tracking
  - Full RLS policies with agency_id scoping
- [x] Create migration: `supabase/migrations/026_unify_cartridges.sql`
  - Master `cartridge` table with 4-tier system (system/workspace/user/skill)
  - `get_effective_cartridges()` function for tier-based precedence
  - `get_merged_cartridge()` function for merging cartridge data
  - Bidirectional links to specialized cartridge tables
- [x] Update `lib/memory/mem0-service.ts` to 3-part format
  - New format: `agencyId::clientId::userId`
  - Supports agency-wide, client-level, and user-level scoping
  - All methods updated with optional clientId parameter
- [x] Generate TypeScript types: `lib/revos/types.ts`
  - 370+ lines of type definitions
  - Insert/Update variants for all tables

**Migration Instructions:**
```bash
# Link project (if not already linked)
supabase link --project-ref qzkirjjrcblkqvhvalue

# Push migrations
supabase db push

# Or apply manually in Supabase Dashboard SQL Editor:
# 1. Run supabase/migrations/025_add_revos_tables.sql
# 2. Run supabase/migrations/026_unify_cartridges.sql
```

### Phase 1: Core Integration (2-3 days)

**Status:** READY TO START (Phase 0 complete)

**Tasks:**
- [ ] Port `lib/chips/` (11 chip implementations)
- [ ] Port `lib/console/marketing-console.ts`
- [ ] Port `lib/console/workflow-executor.ts`
- [ ] Port `lib/cartridges/linkedin-cartridge.ts`

### Phase 2: HGC AgentKit Adapter (1-2 days)

**Status:** BLOCKED on Phase 1

- [ ] Create `agentkit-adapter.ts` in HGC monorepo
- [ ] Add `aiProvider` parameter to HGC instance

### Phase 3: App Switcher (1 day) ✅ COMPLETE

**Status:** DONE (2026-01-21)
**Branch:** `feature/unified-platform`
**Preview:** https://v0-audience-os-command-center-3ljtuj9jf.vercel.app

- [x] Create `components/app-switcher.tsx` (142 lines)
- [x] Create `stores/app-store.ts` with Zustand persist
- [x] Add to layout with hydration fix

### Phase 4: Route Structure (1 day)

**Status:** BLOCKED on Phase 2

- [ ] Implement query param routing (`?app=revos` / `?app=audiences`)

### Phase 5: Sidebar Conditional Rendering (1 day) ✅ COMPLETE

**Status:** DONE (2026-01-21)

- [x] Update `components/linear/sidebar.tsx` for app context
- [x] AudienceOS nav: Dashboard, Pipeline, Clients, Onboarding, Support, Intelligence
- [x] RevOS nav: Dashboard, Campaigns, Content, Outreach, Cartridges, Analytics

---

## Outstanding Issues

### Vercel Git Connection (Low Priority)

**Problem:** Auto-deploy broken after repo transfer from `growthpigs/` to `agro-bros/`
**Workaround:** Manual deploy via `npx vercel --prod`

---

## ✅ Completed (Archived)

<details>
<summary>App Switcher + Sidebar (2026-01-21)</summary>

- ✅ `components/app-switcher.tsx` - Dropdown with gradient branding
- ✅ `stores/app-store.ts` - Zustand with localStorage persist
- ✅ `components/linear/sidebar.tsx` - Conditional nav based on app
- ✅ Preview deployment working
- Commits: `6e7ade3`, `a890082`, `71fdeda`
</details>

<details>
<summary>Week 1 Security Hardening - Phase 1 PARTIAL (2026-01-20)</summary>

- ✅ `lib/env.ts` - Centralized env validation
- ⚠️ `lib/crypto.ts` - Still has fallbacks (needs fix)
- ⚠️ Console logs reduced (43 → 19 in some files, but 266 total remain)
- ✅ Unit tests for lib/env.ts
- ✅ Lint passes
- Commits: `86f5c08`, `b2002b1`, `1cacc4d`, `8e75d20`, `435a8c7`
</details>

<details>
<summary>Gmail/Slack Integration Fix (2026-01-20)</summary>

- ✅ Rewrote `integrations-hub.tsx` to use Supabase
- ✅ Fixed "0 connected" display issue
- ✅ Deployed to production
- Commits: `9e87678`, `579daf8`
</details>

<details>
<summary>RBAC 403 Fix (2026-01-20)</summary>

- ✅ Fixed RLS blocking permission queries
- ✅ Used service_role client for RBAC lookups
- Commit: `553179c`
</details>

<details>
<summary>Knowledge Base Fix (2026-01-20)</summary>

- ✅ Auto-upload to Gemini File API on document creation
- ✅ Fixed "No documents found" error
</details>

---

**Last Updated:** 2026-01-21 (Week 1 Security + Phase 0 Complete)
