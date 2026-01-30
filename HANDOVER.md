# SITREP: RevOS + AudienceOS Integration

**Date:** 2026-01-22
**Project:** command_center_audience_OS
**Repo:** `agro-bros/audienceos-command-center`
**Branch:** `main` (clean, pushed)

---

## CURRENT STATE

### What Just Completed: Phase 0 - Database Schema Prep

| Task | Status | Commit |
|------|--------|--------|
| Create RevOS tables SQL (025) | Done | `fa7f40d` |
| Create unified cartridge SQL (026) | Done | `fa7f40d` |
| Add RLS policies to all new tables | Done | `fa7f40d` |
| Create TypeScript types (`lib/revos/types.ts`) | Done | `fa7f40d` |
| **Make migrations idempotent** | Done | `15f9b8b` |
| Add verification scripts | Done | `15f9b8b` |

**Critical Discovery:** Runtime verification found all 12 RevOS tables **already exist** in production Supabase. Migrations were made idempotent with `IF NOT EXISTS` and `DROP ... IF EXISTS` patterns to handle this.

### Week 1 Security Hardening: COMPLETE

| Fix | Commit |
|-----|--------|
| Remove crypto.ts fallbacks | `10851f7` |
| Add structured logging (Pino) | `73cb652` |
| Replace console statements in OAuth | `ee6066d` |
| Add rate limiting to OAuth endpoints | `af0f68c` |
| Add OAuth token refresh utilities | `39133bf` |

---

## WHAT'S NEXT: Phase 1 - Integration (Week 2)

### Day 1: Apply Migrations + Verify (NEXT)

```bash
# 1. Apply migrations to production Supabase
supabase link --project-ref qzkirjjrcblkqvhvalue
supabase db push

# 2. Verify RLS policies work
npx ts-node scripts/verify-supabase-ready.ts

# 3. Create /api/health endpoint (optional but recommended)
```

### Days 2-4: Feature Port

| Day | Task | Source |
|-----|------|--------|
| 2 | Port 11 chips | From RevOS `lib/chips/` |
| 3 | Port MarketingConsole + WorkflowExecutor | From RevOS `lib/console/` |
| 4 | Port LinkedIn cartridge + update Mem0 | From RevOS |

**Target File Structure After Port:**
```
lib/
├── chips/                    # FROM RevOS (11 files)
│   ├── base-chip.ts
│   ├── write-chip.ts
│   ├── dm-chip.ts
│   └── ...
├── console/                  # FROM RevOS
│   ├── marketing-console.ts
│   └── workflow-executor.ts
├── cartridges/               # MERGED
│   └── unified-cartridge.ts
├── memory/                   # UPDATE to 3-part format
│   └── mem0-service.ts
└── revos/                    # ALREADY EXISTS
    └── types.ts              # TypeScript types (done)
```

### Day 5: Integration Testing

- Unit tests for all ported features
- Integration tests with Supabase
- Build must pass, lint clean

---

## KEY FILES

| Purpose | Path |
|---------|------|
| Project context | `CLAUDE.md` |
| Session handover | `HANDOVER.md` |
| Master plan | `docs/05-planning/UNIFIED-EXECUTION-PLAN.md` |
| Migration 025 (RevOS tables) | `supabase/migrations/025_add_revos_tables.sql` |
| Migration 026 (unified cartridge) | `supabase/migrations/026_unify_cartridges.sql` |
| TypeScript types | `lib/revos/types.ts` |
| Verification scripts | `scripts/verify-*.ts` |

---

## VERIFICATION SCRIPTS (Use These!)

```bash
# Check migration SQL syntax
npx ts-node scripts/verify-migration-syntax.ts

# Check Mem0 3-part format
npx ts-node scripts/verify-mem0-format.ts

# Check TypeScript types compile
npx ts-node scripts/verify-revos-types.ts

# Check Supabase readiness (what tables exist)
npx ts-node scripts/verify-supabase-ready.ts

# Full build verification
npm run build
```

---

## CRITICAL CONTEXT

### 1. Tables Already Exist
All 12 RevOS tables already exist in Supabase (from a previous session). Migrations are now idempotent and will not fail.

### 2. Mem0 3-Part Format
Memory keys must use: `agencyId::clientId::userId` (not 2-part)

```typescript
function buildScopedUserId(agencyId: string, userId: string, clientId?: string | null): string {
  const client = clientId || '_';
  const user = userId || '_';
  return `${agencyId}::${client}::${user}`;
}
```

### 3. Supabase Credentials
- **Project Ref:** `qzkirjjrcblkqvhvalue`
- **Production:** Uses env vars `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### 4. Deployment
Vercel webhooks broken after repo transfer. Deploy manually:
```bash
npx vercel --prod
```

---

## RECENT COMMITS (for context)

```
15f9b8b fix: make RevOS migrations idempotent + add verification scripts
fa7f40d feat: Phase 0 - Database schema prep for RevOS integration
2dcc635 docs: update active-tasks.md - Week 1 Security complete
39133bf feat: add OAuth token refresh utilities
af0f68c security: add rate limiting to OAuth endpoints
ee6066d security: replace console statements with structured logger
73cb652 feat(security): add structured logging with Pino
10851f7 security: remove crypto.ts fallbacks
```

---

## COMMANDS

```bash
# Dev server
npm run dev

# Build (ALWAYS run before committing)
npm run build

# Tests
npm test

# Link Supabase
supabase link --project-ref qzkirjjrcblkqvhvalue

# Push migrations
supabase db push

# Deploy to production
npx vercel --prod
```

---

## EXIT CRITERIA FOR PHASE 1

- [ ] Migrations applied to production Supabase (or verified already applied)
- [ ] RLS policies verified working
- [ ] All 11 chips ported and callable
- [ ] WorkflowExecutor loads from `console_workflow` table
- [ ] MarketingConsole generates content
- [ ] Mem0 uses 3-part format throughout
- [ ] Build passes, lint clean

---

## RISKS

| Risk | Mitigation |
|------|------------|
| RevOS source code location unknown | Ask user where RevOS codebase is |
| Chip dependencies missing | Check RevOS package.json |
| Supabase migration conflicts | Migrations are now idempotent |

---

**Ready for handover.** Start with `supabase db push` to apply migrations, then verify with `scripts/verify-supabase-ready.ts`.

---

*Last Updated: 2026-01-22*
