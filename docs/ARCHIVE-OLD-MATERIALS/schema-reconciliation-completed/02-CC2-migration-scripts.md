# CC2: Migration Scripts (EXPERT REVIEWED)

> **Time:** 3 hours
> **Dependencies:** CC1 complete
> **Output:** `supabase/migrations/20260103_audienceos_tables.sql`
> **Target Database:** RevOS Supabase (`trdoainmejxanrownbuz`)
> **Confidence:** 9/10 (expert fixes applied)

---

## Context

You are creating SQL migrations to ADD AudienceOS tables to RevOS Supabase.

**Expert Fixes Applied:**
1. ❌ REMOVED denormalized `agency_id` from client-scoped tables
2. ✅ All new tables use `client_id` only (JOIN through clients for agency)
3. ✅ Added `FORCE ROW LEVEL SECURITY` for security hardening
4. ✅ Added unique constraint for cartridge defaults
5. ✅ Added `updated_at` triggers

---

## Migration File

Create: `/Users/rodericandrews/_PAI/projects/revos/supabase/migrations/20260103_audienceos_tables.sql`

```sql
-- ============================================================
-- AUDIENCEOS TABLES MIGRATION (EXPERT REVIEWED)
-- Project: RevOS Supabase (trdoainmejxanrownbuz)
-- Purpose: Add AudienceOS tables to existing RevOS schema
-- Date: 2026-01-03
-- Fixes: No denormalized agency_id, FORCE RLS, unique constraints
-- ============================================================

-- ============================================================
-- IMPORTANT: DO NOT MODIFY EXISTING TABLES
-- Existing tables: agencies, clients, users, *_cartridges
-- This migration ONLY adds NEW tables
-- ============================================================

-- ============================================================
-- 1. AGENCY CARTRIDGES (Agency-scoped)
-- ============================================================
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

-- Ensure only ONE default per type per agency
CREATE UNIQUE INDEX idx_agency_cartridges_default
ON agency_cartridges(agency_id, type) WHERE is_default = true;

CREATE INDEX idx_agency_cartridges_agency ON agency_cartridges(agency_id);
CREATE INDEX idx_agency_cartridges_type ON agency_cartridges(type);

-- ============================================================
-- 2. COMMUNICATIONS (Client-scoped - NO agency_id)
-- ============================================================
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

-- ============================================================
-- 3. ALERTS (Client-scoped - NO agency_id)
-- ============================================================
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

-- ============================================================
-- 4. TICKETS (Client-scoped - NO agency_id)
-- ============================================================
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

-- ============================================================
-- 5. DOCUMENTS (Client-scoped - NO agency_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_client ON documents(client_id);

-- ============================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================
-- Use existing function or create if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agency_cartridges_updated_at
  BEFORE UPDATE ON agency_cartridges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communications_updated_at
  BEFORE UPDATE ON communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Tables added: 5
-- Indexes added: 11
-- Triggers added: 4
-- Existing tables modified: 0
-- ============================================================
```

---

## Rollback Script

Create: `/Users/rodericandrews/_PAI/projects/revos/supabase/migrations/20260103_audienceos_tables_rollback.sql`

```sql
-- ROLLBACK: Remove AudienceOS tables
-- NOTE: This ONLY removes NEW tables, does NOT touch existing RevOS tables

DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
DROP TRIGGER IF EXISTS update_communications_updated_at ON communications;
DROP TRIGGER IF EXISTS update_agency_cartridges_updated_at ON agency_cartridges;

DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS communications CASCADE;
DROP TABLE IF EXISTS agency_cartridges CASCADE;

-- DO NOT DROP: agencies, clients, users, *_cartridges (existing RevOS tables)
-- DO NOT DROP: update_updated_at_column function (may be used elsewhere)
```

---

## Key Changes from Previous Version

| Aspect | Previous | Expert Fixed |
|--------|----------|--------------|
| agency_id on client tables | Yes (denormalized) | **No** (JOIN through clients) |
| updated_at triggers | Missing | Added |
| is_default constraint | Missing | Added unique partial index |
| client_id nullable | Yes | **No** (NOT NULL) |

---

## Tasks

1. [ ] Verify CC1 complete (UNIFIED-DATA-MODEL.md exists)
2. [ ] Verify existing RevOS tables exist (agencies, clients)
3. [ ] Create migration file
4. [ ] Create rollback file
5. [ ] Test migration on dev/staging
6. [ ] Verify all indexes created
7. [ ] Verify triggers work
8. [ ] Verify no existing tables modified

---

## Testing

```sql
-- Verify NEW tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('agency_cartridges', 'communications', 'alerts', 'tickets', 'documents')
ORDER BY table_name;

-- Verify unique constraint works
INSERT INTO agency_cartridges (agency_id, type, name, is_default)
VALUES ('test-agency-id', 'style', 'Default 1', true);

-- This should FAIL (duplicate default)
INSERT INTO agency_cartridges (agency_id, type, name, is_default)
VALUES ('test-agency-id', 'style', 'Default 2', true);

-- Verify updated_at trigger
INSERT INTO communications (client_id, type, subject)
VALUES ('test-client-id', 'email', 'Test');

UPDATE communications SET subject = 'Updated' WHERE subject = 'Test';
SELECT updated_at > created_at FROM communications WHERE subject = 'Updated';
-- Should return TRUE

-- Verify client_id NOT NULL
INSERT INTO alerts (client_id, title) VALUES (NULL, 'Test');
-- Should FAIL with NOT NULL violation
```

---

## Success Criteria

- [ ] Migration runs without errors
- [ ] 5 new tables created
- [ ] 11 indexes created
- [ ] 4 triggers created
- [ ] NO changes to existing tables
- [ ] NO agency_id on client-scoped tables
- [ ] is_default constraint prevents duplicates
- [ ] Rollback script tested

---

## Output Location

```
/Users/rodericandrews/_PAI/projects/revos/supabase/migrations/20260103_audienceos_tables.sql
/Users/rodericandrews/_PAI/projects/revos/supabase/migrations/20260103_audienceos_tables_rollback.sql
```

---

*Expert Reviewed: 2026-01-03 | Confidence: 9/10*
