-- ============================================================================
-- CLIENT_CONTACT: Multi-contact support for email-to-client matching
-- ============================================================================
-- Enables matching inbound emails to clients via multiple email addresses.
-- Each client can have many contacts (primary, billing, technical, etc.)
-- Contacts can be added manually, discovered via Gmail sync, or suggested by AI.

CREATE TABLE IF NOT EXISTS client_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'primary',  -- 'primary', 'billing', 'technical', 'assistant', 'other'
  is_primary BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'manual',  -- 'manual', 'gmail_sync', 'ai_suggested'
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate emails per agency+client
  UNIQUE(agency_id, client_id, email)
);

-- Indexes for matching queries
CREATE INDEX idx_client_contact_agency_email ON client_contact(agency_id, email);
CREATE INDEX idx_client_contact_client ON client_contact(client_id);

-- RLS: Agency-scoped access (same pattern as other tables)
ALTER TABLE client_contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_contact_select" ON client_contact
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid())
  );

CREATE POLICY "client_contact_insert" ON client_contact
  FOR INSERT WITH CHECK (
    agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid())
  );

CREATE POLICY "client_contact_update" ON client_contact
  FOR UPDATE USING (
    agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid())
  );

CREATE POLICY "client_contact_delete" ON client_contact
  FOR DELETE USING (
    agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid())
  );

-- ============================================================================
-- SEED: Populate from existing client.contact_email values
-- ============================================================================
-- Migrates the single contact_email from client table into client_contact
-- so existing data is immediately available for email matching.

INSERT INTO client_contact (agency_id, client_id, email, name, role, is_primary, source)
SELECT
  c.agency_id,
  c.id,
  LOWER(TRIM(c.contact_email)),
  c.contact_name,
  'primary',
  true,
  'manual'
FROM client c
WHERE c.contact_email IS NOT NULL
  AND TRIM(c.contact_email) != ''
ON CONFLICT (agency_id, client_id, email) DO NOTHING;
