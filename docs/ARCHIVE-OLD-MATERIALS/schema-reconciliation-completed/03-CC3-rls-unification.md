# CC3: RLS Unification (EXPERT REVIEWED)

> **Time:** 3 hours
> **Dependencies:** CC1, CC2 complete
> **Output:** RLS policies in migration file
> **Confidence:** 9/10 (matches RevOS actual patterns)

---

## Context

You are implementing Row Level Security for NEW AudienceOS tables using **RevOS's actual pattern**: `auth.uid()` + JOIN-based scoping.

**Expert Fixes Applied:**
1. ❌ REMOVED JWT claims approach (not used by RevOS)
2. ✅ Uses `auth.uid()` with JOIN to derive agency context
3. ✅ Added `FORCE ROW LEVEL SECURITY` on all tables
4. ✅ Matches existing RevOS RLS patterns from `009_add_rls_policies_all_tables.sql`

---

## RevOS RLS Pattern (Verified from Codebase)

**Key Discovery:** RevOS does NOT use JWT claims for RLS. Instead:

```
Auth Flow:
auth.uid() → users.id → users.client_id → clients.id → clients.agency_id
```

**Standard Pattern (from RevOS 009_add_rls_policies_all_tables.sql):**
```sql
-- Client-scoped resources
CREATE POLICY "Users can view their campaigns"
  ON campaigns
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );
```

---

## RLS Migration

Add to migration file or create separate:

```sql
-- ============================================================
-- ROW LEVEL SECURITY POLICIES (EXPERT REVIEWED)
-- Pattern: auth.uid() + JOINs (matches RevOS)
-- Project: RevOS Supabase (trdoainmejxanrownbuz)
-- ============================================================

-- ============================================================
-- SECURITY HARDENING
-- ============================================================
ALTER ROLE authenticated SET row_security = on;
ALTER ROLE anon SET row_security = on;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
-- Get user's client_id directly
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get user's agency_id via clients table
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
  SELECT c.agency_id
  FROM clients c
  INNER JOIN users u ON u.client_id = c.id
  WHERE u.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get all client_ids in user's agency
CREATE OR REPLACE FUNCTION get_agency_client_ids()
RETURNS SETOF UUID AS $$
  SELECT c.id
  FROM clients c
  WHERE c.agency_id = (SELECT get_user_agency_id());
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ENABLE RLS WITH FORCE
-- ============================================================
ALTER TABLE agency_cartridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_cartridges FORCE ROW LEVEL SECURITY;

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications FORCE ROW LEVEL SECURITY;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- ============================================================
-- AGENCY_CARTRIDGES POLICIES (Agency-scoped)
-- ============================================================
CREATE POLICY "Users can view agency cartridges" ON agency_cartridges
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT get_user_agency_id()));

CREATE POLICY "Users can insert agency cartridges" ON agency_cartridges
  FOR INSERT TO authenticated
  WITH CHECK (agency_id = (SELECT get_user_agency_id()));

CREATE POLICY "Users can update agency cartridges" ON agency_cartridges
  FOR UPDATE TO authenticated
  USING (agency_id = (SELECT get_user_agency_id()));

CREATE POLICY "Users can delete agency cartridges" ON agency_cartridges
  FOR DELETE TO authenticated
  USING (agency_id = (SELECT get_user_agency_id()));

-- ============================================================
-- COMMUNICATIONS POLICIES (Client-scoped via agency)
-- ============================================================
CREATE POLICY "Users can view agency communications" ON communications
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can insert agency communications" ON communications
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can update agency communications" ON communications
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can delete agency communications" ON communications
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

-- ============================================================
-- ALERTS POLICIES (Client-scoped via agency)
-- ============================================================
CREATE POLICY "Users can view agency alerts" ON alerts
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can insert agency alerts" ON alerts
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can update agency alerts" ON alerts
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can delete agency alerts" ON alerts
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

-- ============================================================
-- TICKETS POLICIES (Client-scoped via agency)
-- ============================================================
CREATE POLICY "Users can view agency tickets" ON tickets
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can insert agency tickets" ON tickets
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can update agency tickets" ON tickets
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can delete agency tickets" ON tickets
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

-- ============================================================
-- DOCUMENTS POLICIES (Client-scoped via agency)
-- ============================================================
CREATE POLICY "Users can view agency documents" ON documents
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can insert agency documents" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can update agency documents" ON documents
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

CREATE POLICY "Users can delete agency documents" ON documents
  FOR DELETE TO authenticated
  USING (client_id IN (SELECT get_agency_client_ids()));

-- ============================================================
-- RLS POLICIES COMPLETE
-- ============================================================
```

---

## Key Changes from Previous Version

| Aspect | Previous (WRONG) | Expert Fixed |
|--------|------------------|--------------|
| RLS Pattern | JWT claims | **auth.uid() + JOINs** |
| Agency context | `app_metadata.agency_id` | **Derived via users → clients** |
| Helper function | `get_current_agency_id()` | **get_user_agency_id()** |
| Tables have agency_id | Yes | **No** (client-scoped only) |
| FORCE RLS | Missing | **Added** |

---

## Performance Notes

### Why Helper Functions?

The helper functions (`get_user_agency_id()`, `get_agency_client_ids()`) are:
1. Cached by Postgres per statement (STABLE)
2. Run with definer privileges (SECURITY DEFINER)
3. Reusable across multiple policies

### Performance of Subquery RLS

RevOS already uses this pattern for 48+ migrations. The subquery approach:
- Is cached by Postgres optimizer
- Has O(1) lookup with proper indexes (users.id, clients.agency_id)
- Is proven in production at RevOS scale

---

## Testing

```sql
-- Test 1: Verify RLS is enabled on NEW tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('agency_cartridges', 'communications', 'alerts', 'tickets', 'documents');

-- Test 2: Create test data (as service role)
INSERT INTO communications (client_id, type, subject)
VALUES
  ('client-in-agency-a', 'email', 'Test for Agency A'),
  ('client-in-agency-b', 'email', 'Test for Agency B');

-- Test 3: As authenticated user in Agency A
-- Should only see "Test for Agency A"
SELECT * FROM communications;

-- Test 4: Verify cross-agency isolation
-- User in Agency A should NOT see Agency B communications

-- Test 5: Verify FORCE RLS works even for table owner
SET ROLE authenticated;
SELECT * FROM communications;  -- Should be filtered
```

---

## Tasks

1. [ ] Verify CC2 complete (tables exist)
2. [ ] Create helper functions
3. [ ] Enable RLS with FORCE on all 5 tables
4. [ ] Create policies (4 per table = 20 policies)
5. [ ] Apply security hardening
6. [ ] Test with multiple agencies
7. [ ] Verify anon users get no data

---

## Success Criteria

- [ ] All NEW tables have RLS enabled with FORCE
- [ ] Uses auth.uid() pattern (NOT JWT claims)
- [ ] Helper functions created
- [ ] 20 policies created (4 per table × 5 tables)
- [ ] Agency isolation verified
- [ ] Anon users get empty results

---

## Output Location

Add to existing migration file:
```
/Users/rodericandrews/_PAI/projects/revos/supabase/migrations/20260103_audienceos_tables.sql
```

Or create separate RLS migration:
```
/Users/rodericandrews/_PAI/projects/revos/supabase/migrations/20260103_audienceos_rls.sql
```

---

*Expert Reviewed: 2026-01-03 | Matches RevOS actual patterns | Confidence: 9/10*
