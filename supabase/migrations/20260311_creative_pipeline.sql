-- Creative Pipeline: Tracks ad creative concepts through production stages
-- campaign_id is VARCHAR (not UUID FK) because campaigns are mock-data only for now.
-- When campaigns get DB-backed, a migration will ALTER COLUMN to UUID and add the FK.

CREATE TYPE creative_status AS ENUM ('concept', 'in_production', 'review', 'approved', 'live');
CREATE TYPE creative_format AS ENUM ('image', 'video', 'carousel', 'collection');

CREATE TABLE creative (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  campaign_id VARCHAR(100),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  format creative_format NOT NULL DEFAULT 'image',
  status creative_status NOT NULL DEFAULT 'concept',
  hook TEXT,
  body_copy TEXT,
  cta_text VARCHAR(100),
  target_audience TEXT,
  platform VARCHAR(20),
  placement VARCHAR(50),
  asset_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_generation_data JSONB,
  source_onboarding_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creative_agency ON creative(agency_id);
CREATE INDEX idx_creative_client ON creative(client_id);
CREATE INDEX idx_creative_campaign ON creative(campaign_id);
CREATE INDEX idx_creative_status ON creative(status);

ALTER TABLE creative ENABLE ROW LEVEL SECURITY;

CREATE POLICY creative_select ON creative FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()));
CREATE POLICY creative_insert ON creative FOR INSERT
  WITH CHECK (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()));
CREATE POLICY creative_update ON creative FOR UPDATE
  USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()));
CREATE POLICY creative_delete ON creative FOR DELETE
  USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()));
