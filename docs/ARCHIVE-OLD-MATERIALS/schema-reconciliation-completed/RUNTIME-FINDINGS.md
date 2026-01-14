# Runtime Verification Findings

> **Date:** 2026-01-03
> **Status:** MAJOR SCHEMA CONFLICTS DISCOVERED
> **Action Required:** Update manifest before CC execution

---

## Executive Summary

Runtime verification of actual RevOS migration files revealed **critical discrepancies** between manifest assumptions and production schema. The CCs CANNOT execute as written.

---

## Finding 1: Root Tenant Entity Mismatch

**Manifest Assumed:** `tenants` table
**Actual RevOS:** `agencies` table

```sql
-- ACTUAL (001_initial_schema.sql)
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Impact:** All CC documents reference `tenants`. Must change to `agencies` OR create migration to rename.

**Decision Required:**
- [ ] Option A: Rename `agencies` → `tenants` (breaking change)
- [ ] Option B: Update all CCs to use `agencies` (safer)

---

## Finding 2: Users Table Structure Mismatch

**Manifest Assumed:** `users.id` is FK to `auth.users.id`
**Actual RevOS:** `users.id` is standalone UUID (no FK)

```sql
-- ACTUAL (001_initial_schema.sql)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- NOT a FK!
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'team_member',
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**However, RLS expects users.id = auth.uid():**
```sql
-- (009_add_rls_policies_all_tables.sql)
CREATE POLICY "Users can view own record"
  ON users FOR SELECT
  USING (auth.uid() = id);  -- Assumes manual sync!
```

**Impact:**
- No auto-sync trigger exists
- Manual coordination required between auth.users and users table
- Application code must ensure IDs match

**Decision Required:**
- [ ] Option A: Add FK constraint + migration (data risk)
- [ ] Option B: Keep current pattern + document requirement
- [ ] Option C: Add trigger for new users only (hybrid)

---

## Finding 3: RevOS Hierarchy is Different

**Manifest Assumed:** `tenants → users` (tenant-scoped users)
**Actual RevOS:** `agencies → clients → users` (client-scoped users)

```
agencies
    └── clients (FK: agency_id)
            └── users (FK: client_id, NOT agency_id!)
```

**Impact:**
- Users belong to CLIENTS, not directly to agencies
- AudienceOS tables (communications, alerts, etc.) should FK to clients, not tenants
- RLS needs to follow the hierarchy chain

---

## Finding 4: Cartridge Tables Use Different Scoping

**Manifest Assumed:** Cartridges scoped by `tenant_id`
**Actual RevOS (037_client_cartridges.sql):** Cartridges scoped by `user_id`

```sql
-- ACTUAL
CREATE TABLE style_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- USER scoped!
  name TEXT NOT NULL,
  tone TEXT,
  ...
);
```

**Impact:**
- Cartridges are per-user, NOT per-tenant
- RLS uses `auth.uid() = user_id`
- This is a DIFFERENT multi-tenancy model than proposed

---

## Finding 5: Wrong Supabase Project Reference

**Migration 037 header:**
```sql
-- Supabase Project: kvjcidxbyimoswntpjcp
```

**RevOS actual project:** `trdoainmejxanrownbuz`

**Impact:** Unclear if migration 037 was applied to correct database.

**Verification Needed:**
```sql
-- Run against RevOS Supabase
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%cartridge%';
```

---

## Revised Understanding

### Actual RevOS Data Model

```
auth.users (Supabase Auth)
    │
    │ (manual sync expected - id must match)
    │
┌───────────┐
│  users    │
└─────┬─────┘
      │ client_id
      ▼
┌───────────┐
│  clients  │
└─────┬─────┘
      │ agency_id
      ▼
┌───────────┐
│ agencies  │
└───────────┘

Cartridges: auth.users → *_cartridges (user_id FK)
```

### Proposed AudienceOS Addition

```
agencies (existing)
    │
    ├── clients (existing, agency_id FK)
    │       │
    │       ├── communications (NEW, client_id FK)
    │       ├── alerts (NEW, client_id FK)
    │       ├── tickets (NEW, client_id FK)
    │       └── documents (NEW, client_id FK)
    │
    └── cartridges (UNIFIED, agency_id FK + type discriminator)
```

---

## Required Manifest Updates

### Decision 1: Cartridge Schema
**CHANGE:** Keep 4 tables (user-scoped) OR unify to agency-scoped
**Recommendation:** Unify to agency-scoped for AudienceOS use case

### Decision 3: Root Tenant Entity
**CHANGE:** Use `agencies` (not `tenants`)

### Decision 4: User Mapping
**CHANGE:** Keep manual sync pattern (no FK migration)

### New Decision: Hierarchy
**ADD:** AudienceOS tables FK to `clients`, following existing hierarchy

---

## Blocker Status

| Blocker | Status | Finding |
|---------|--------|---------|
| RevOS schema query | ✅ Verified | Read migrations directly |
| Tenants table | ❌ Does not exist | Uses `agencies` instead |
| Users FK to auth.users | ❌ No FK | Standalone UUID, manual sync |
| Cartridges structure | ⚠️ Different | 4 tables, user-scoped |
| Migration project | ⚠️ Suspicious | Wrong project ID in header |

---

## Next Steps

1. [ ] Update manifest with actual RevOS structure
2. [ ] Decide on agencies vs tenants naming
3. [ ] Decide on cartridge scoping (user vs agency)
4. [ ] Update all 4 CC documents
5. [ ] Verify cartridge tables exist in production DB
6. [ ] Re-run confidence assessment

---

*Generated: 2026-01-03 | Runtime verification complete*
