# Expert Review Fixes - Schema Reconciliation

> **Date:** 2026-01-03
> **Status:** CRITICAL FIXES REQUIRED
> **Previous Confidence:** 8/10 → **Revised:** 6/10 → **Target:** 9/10
> **Blockers:** 17 issues found, 2 CRITICAL

---

## Executive Summary

Expert review with codebase-analyst, explore, and validator agents discovered:

1. **RevOS uses JOIN-based RLS, NOT JWT claims** - Major architectural mismatch
2. **Denormalized agency_id creates data integrity risks** - Must remove
3. **RLS can be bypassed via client_id enumeration** - Security hole
4. **Three competing cartridge systems** - Needs reconciliation

---

## CRITICAL FIX 1: Remove Denormalized agency_id

**Problem:** Having both `agency_id` AND `client_id` on tables creates:
- Data integrity risk (no constraint ensures client belongs to agency)
- RLS bypass potential
- Source of truth ambiguity
- Update anomalies

**Solution:** Remove `agency_id` from new tables. Use `client_id` only.

### Before (WRONG):
```sql
CREATE TABLE communications (
  agency_id UUID NOT NULL REFERENCES agencies(id),  -- REMOVE
  client_id UUID REFERENCES clients(id),
  ...
);
```

### After (CORRECT):
```sql
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,  -- Required, not optional
  type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'note')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Why client_id is NOT NULL:** All AudienceOS entities are client-scoped. Agency-wide entities should use a different table or pattern.

---

## CRITICAL FIX 2: RLS Pattern - Match RevOS

**Problem:** Manifest proposed JWT claims pattern, but RevOS uses `auth.uid()` + JOINs.

**RevOS Actual Pattern (from 009_add_rls_policies_all_tables.sql):**
```sql
-- Client-scoped resources via users table join
CREATE POLICY "Users can view their campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );
```

**Solution:** Use same pattern for new tables:

```sql
-- ============================================================
-- ROW LEVEL SECURITY (Match RevOS Pattern)
-- ============================================================

-- Helper: Get user's client_id
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: Get user's agency_id (via clients)
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
  SELECT c.agency_id
  FROM clients c
  INNER JOIN users u ON u.client_id = c.id
  WHERE u.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ENABLE RLS WITH FORCE
-- ============================================================
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications FORCE ROW LEVEL SECURITY;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

ALTER TABLE agency_cartridges ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_cartridges FORCE ROW LEVEL SECURITY;

-- ============================================================
-- CLIENT-SCOPED TABLES (communications, alerts, tickets, documents)
-- ============================================================
-- Users can access data for clients in their agency

CREATE POLICY "Users can view agency communications" ON communications
  FOR SELECT TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE agency_id = (SELECT get_user_agency_id())
    )
  );

CREATE POLICY "Users can insert agency communications" ON communications
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE agency_id = (SELECT get_user_agency_id())
    )
  );

CREATE POLICY "Users can update agency communications" ON communications
  FOR UPDATE TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE agency_id = (SELECT get_user_agency_id())
    )
  );

CREATE POLICY "Users can delete agency communications" ON communications
  FOR DELETE TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE agency_id = (SELECT get_user_agency_id())
    )
  );

-- Repeat for alerts, tickets, documents...

-- ============================================================
-- AGENCY-SCOPED TABLE (agency_cartridges)
-- ============================================================
CREATE POLICY "Users can view agency cartridges" ON agency_cartridges
  FOR SELECT TO authenticated
  USING (agency_id = (SELECT get_user_agency_id()));

CREATE POLICY "Users can manage agency cartridges" ON agency_cartridges
  FOR ALL TO authenticated
  USING (agency_id = (SELECT get_user_agency_id()));
```

---

## HIGH FIX 3: Cartridge Architecture Reconciliation

**Three Systems Found:**
1. **Original `cartridges` table** (001_initial_schema.sql) - Legacy, `client_id` + `user_id` + `tier`
2. **4 User cartridge tables** (037_client_cartridges.sql) - Current, `user_id` FK to auth.users
3. **Proposed `agency_cartridges`** - New, `agency_id` FK

**Decision:**
- **Deprecate** original `cartridges` table (don't use or modify)
- **Keep** 4 user cartridge tables for personal settings
- **Add** `agency_cartridges` for team/agency defaults

**Fallback Chain (must document):**
```
1. User's personal cartridge (style_cartridges, etc.)
   ↓ if not found
2. Agency default cartridge (agency_cartridges WHERE is_default=true)
   ↓ if not found
3. System defaults (hardcoded in application)
```

**Add unique constraint for is_default:**
```sql
CREATE UNIQUE INDEX idx_agency_cartridges_default
ON agency_cartridges(agency_id, type)
WHERE is_default = true;
```

---

## HIGH FIX 4: Source of Truth = clients.agency_id

**Decision:** `clients.agency_id` is the ONLY source of truth for client-agency relationship.

**Implications:**
- New tables don't have `agency_id` column
- RLS JOINs through `clients` table to get `agency_id`
- Changing a client's agency only requires updating `clients.agency_id`

---

## MEDIUM FIX 5: Add updated_at Triggers

```sql
-- Use existing function if available, or create
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_communications_updated_at
  BEFORE UPDATE ON communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_cartridges_updated_at
  BEFORE UPDATE ON agency_cartridges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## REVISED SCHEMA (All Fixes Applied)

```sql
-- ============================================================
-- AUDIENCEOS TABLES MIGRATION (FIXED)
-- Project: RevOS Supabase (trdoainmejxanrownbuz)
-- Date: 2026-01-03
-- Fixes: Removed agency_id, added constraints, RevOS RLS pattern
-- ============================================================

-- 1. AGENCY CARTRIDGES (Agency-scoped)
CREATE TABLE IF NOT EXISTS agency_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('style', 'preference', 'instruction', 'brand')),
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only one default per type per agency
CREATE UNIQUE INDEX idx_agency_cartridges_default
ON agency_cartridges(agency_id, type) WHERE is_default = true;

CREATE INDEX idx_agency_cartridges_agency ON agency_cartridges(agency_id);
CREATE INDEX idx_agency_cartridges_type ON agency_cartridges(type);

-- 2. COMMUNICATIONS (Client-scoped, NO agency_id)
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'note')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_communications_client ON communications(client_id);
CREATE INDEX idx_communications_timestamp ON communications(timestamp DESC);

-- 3. ALERTS (Client-scoped, NO agency_id)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_alerts_client ON alerts(client_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- 4. TICKETS (Client-scoped, NO agency_id)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tickets_client ON tickets(client_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);

-- 5. DOCUMENTS (Client-scoped, NO agency_id)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_client ON documents(client_id);
```

---

## REVISED CC4: HGC Integration (Match RevOS Pattern)

**Key Change:** Use RevOS `auth.uid()` pattern, not JWT claims.

```typescript
// src/lib/functions/clients.ts
export async function get_clients(
  supabase: SupabaseClient,  // Pass authenticated client
  filters?: { health_status?: string; industry?: string }
): Promise<ClientSummary[]> {
  // RLS automatically filters via JOIN-based policy
  // No manual agency_id needed - auth.uid() handles it

  let query = supabase
    .from('clients')
    .select('id, name, industry, health_status, stage');

  if (filters?.health_status) {
    query = query.eq('health_status', filters.health_status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// src/lib/functions/communications.ts
export async function get_recent_communications(
  supabase: SupabaseClient,
  clientId?: string,
  limit: number = 10
): Promise<Communication[]> {
  // RLS ensures user can only see communications for clients in their agency

  let query = supabase
    .from('communications')
    .select(`
      id, type, direction, subject, body, timestamp,
      client:clients(id, name)
    `)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
```

---

## Confidence Score After Fixes

| Component | Before | After | Reason |
|-----------|--------|-------|--------|
| Schema Understanding | 7/10 | 9/10 | Matches RevOS patterns |
| RLS Pattern | 5/10 | 9/10 | Consistent with RevOS |
| Data Integrity | 5/10 | 9/10 | No denormalized agency_id |
| Security | 5/10 | 9/10 | FORCE RLS, proper constraints |
| Performance | 6/10 | 8/10 | JOIN pattern proven in RevOS |
| Complexity | 5/10 | 8/10 | Simpler (one less column) |
| **Overall** | **6/10** | **9/10** | All critical issues fixed |

---

## Files to Update

1. `00-MANIFEST.md` - Update RLS pattern to JOIN-based
2. `01-CC1-schema-design.md` - Remove agency_id from new tables
3. `02-CC2-migration-scripts.md` - Full rewrite with fixes
4. `03-CC3-rls-unification.md` - Use RevOS pattern
5. `04-CC4-hgc-integration.md` - Remove JWT claims references

---

*Created: 2026-01-03 | Expert review fixes | Target confidence: 9/10*
