-- Migration: client_slack_channel
-- Purpose: Map sub-clients to their dedicated Slack channels for auto-creation and message sync
-- Date: 2026-02-08

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_slack_channel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  slack_channel_id VARCHAR(20) NOT NULL,
  slack_channel_name VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each client gets exactly one channel per agency
  UNIQUE(agency_id, client_id),
  -- Each Slack channel ID is unique per agency (no double-mapping)
  UNIQUE(agency_id, slack_channel_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_client_slack_channel_agency ON client_slack_channel(agency_id);
CREATE INDEX idx_client_slack_channel_client ON client_slack_channel(client_id);
CREATE INDEX idx_client_slack_channel_active ON client_slack_channel(agency_id, is_active) WHERE is_active = true;

-- ── Updated At Trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_client_slack_channel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_client_slack_channel_updated_at
  BEFORE UPDATE ON client_slack_channel
  FOR EACH ROW
  EXECUTE FUNCTION update_client_slack_channel_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE client_slack_channel ENABLE ROW LEVEL SECURITY;

-- Agency members can read their own channels
CREATE POLICY "client_slack_channel_select" ON client_slack_channel
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
  );

-- Agency members can insert channels for their agency
CREATE POLICY "client_slack_channel_insert" ON client_slack_channel
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
  );

-- Agency members can update their own channels
CREATE POLICY "client_slack_channel_update" ON client_slack_channel
  FOR UPDATE USING (
    agency_id IN (
      SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
  );

-- Service role bypass for server-side operations
CREATE POLICY "client_slack_channel_service" ON client_slack_channel
  FOR ALL USING (auth.role() = 'service_role');
