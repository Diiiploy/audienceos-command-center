-- =============================================================================
-- Onboarding & Intake Hub Migration
-- Created: 2026-01-09
-- Tables: onboarding_journey, intake_form_field, onboarding_instance,
--         intake_response, onboarding_stage_status
-- =============================================================================

-- =============================================================================
-- 1. CREATE ENUM TYPES
-- =============================================================================

-- Field types for intake form fields
CREATE TYPE field_type AS ENUM ('text', 'email', 'url', 'number', 'textarea', 'select');

-- Status for onboarding instances
CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Status for individual stages
CREATE TYPE stage_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');

-- =============================================================================
-- 2. CREATE TABLES (in dependency order)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2.1 ONBOARDING_JOURNEY (Journey Templates)
-- -----------------------------------------------------------------------------
CREATE TABLE onboarding_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  welcome_video_url VARCHAR(500),
  ai_analysis_prompt TEXT,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_journey_agency ON onboarding_journey(agency_id);

-- RLS Policy
ALTER TABLE onboarding_journey ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_journey_rls ON onboarding_journey FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

-- -----------------------------------------------------------------------------
-- 2.2 INTAKE_FORM_FIELD (Form Schema)
-- -----------------------------------------------------------------------------
CREATE TABLE intake_form_field (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES onboarding_journey(id) ON DELETE CASCADE,
  field_label VARCHAR(100) NOT NULL,
  field_type field_type NOT NULL DEFAULT 'text',
  placeholder VARCHAR(200),
  is_required BOOLEAN NOT NULL DEFAULT false,
  validation_regex VARCHAR(200),
  options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intake_form_field_agency ON intake_form_field(agency_id);
CREATE INDEX idx_intake_form_field_journey ON intake_form_field(journey_id);

-- RLS Policy
ALTER TABLE intake_form_field ENABLE ROW LEVEL SECURITY;
CREATE POLICY intake_form_field_rls ON intake_form_field FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

-- -----------------------------------------------------------------------------
-- 2.3 ONBOARDING_INSTANCE (Client-Journey Association)
-- -----------------------------------------------------------------------------
CREATE TABLE onboarding_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES onboarding_journey(id),
  link_token VARCHAR(64) NOT NULL UNIQUE,
  status onboarding_status NOT NULL DEFAULT 'pending',
  current_stage_id VARCHAR(50),
  triggered_by UUID NOT NULL REFERENCES "user"(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  seo_data JSONB,
  ai_analysis TEXT,
  ai_analysis_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_instance_agency ON onboarding_instance(agency_id);
CREATE INDEX idx_onboarding_instance_client ON onboarding_instance(client_id);
CREATE INDEX idx_onboarding_instance_token ON onboarding_instance(link_token);
CREATE INDEX idx_onboarding_instance_status ON onboarding_instance(status);

-- RLS Policy
ALTER TABLE onboarding_instance ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_instance_rls ON onboarding_instance FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

-- -----------------------------------------------------------------------------
-- 2.4 INTAKE_RESPONSE (Client Submissions)
-- -----------------------------------------------------------------------------
CREATE TABLE intake_response (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES onboarding_instance(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES intake_form_field(id),
  value TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(instance_id, field_id)
);

CREATE INDEX idx_intake_response_agency ON intake_response(agency_id);
CREATE INDEX idx_intake_response_instance ON intake_response(instance_id);

-- RLS Policy
ALTER TABLE intake_response ENABLE ROW LEVEL SECURITY;
CREATE POLICY intake_response_rls ON intake_response FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

-- -----------------------------------------------------------------------------
-- 2.5 ONBOARDING_STAGE_STATUS (Progress Tracking)
-- -----------------------------------------------------------------------------
CREATE TABLE onboarding_stage_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES onboarding_instance(id) ON DELETE CASCADE,
  stage_id VARCHAR(50) NOT NULL,
  status stage_status NOT NULL DEFAULT 'pending',
  blocked_reason VARCHAR(200),
  platform_statuses JSONB DEFAULT '{}'::jsonb,  -- {"FB": "verified", "GA": "pending", "SH": "blocked"}
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(instance_id, stage_id)
);

CREATE INDEX idx_onboarding_stage_status_agency ON onboarding_stage_status(agency_id);
CREATE INDEX idx_onboarding_stage_status_instance ON onboarding_stage_status(instance_id);

-- RLS Policy
ALTER TABLE onboarding_stage_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_stage_status_rls ON onboarding_stage_status FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);

-- =============================================================================
-- 3. ADD COLUMNS TO CLIENT TABLE (for website_url and seo_data)
-- =============================================================================

ALTER TABLE client ADD COLUMN IF NOT EXISTS website_url VARCHAR(255);
ALTER TABLE client ADD COLUMN IF NOT EXISTS seo_data JSONB;
ALTER TABLE client ADD COLUMN IF NOT EXISTS seo_last_refreshed TIMESTAMPTZ;

-- =============================================================================
-- 4. SEED DEFAULT JOURNEY FOR EXISTING AGENCIES
-- =============================================================================

INSERT INTO onboarding_journey (agency_id, name, description, stages, is_default, ai_analysis_prompt)
SELECT
  id,
  'Default Onboarding Journey',
  'Standard client onboarding flow for marketing agencies',
  '[
    {"id": "intake", "name": "Intake Received", "order": 1},
    {"id": "access", "name": "Access Verified", "order": 2, "platforms": ["FB", "GA", "SH"]},
    {"id": "pixel", "name": "Pixel Install", "order": 3},
    {"id": "audit", "name": "Audit Complete", "order": 4},
    {"id": "live", "name": "Live Support", "order": 5}
  ]'::jsonb,
  true,
  'Analyze this client''s tracking data and provide insights on pixel installation quality, event match quality, and recommended optimizations for their e-commerce conversion tracking.'
FROM agency
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 5. SEED DEFAULT FORM FIELDS FOR EXISTING AGENCIES
-- =============================================================================

-- Get agency IDs that have a journey but no form fields
INSERT INTO intake_form_field (agency_id, field_label, field_type, placeholder, is_required, sort_order)
SELECT
  a.id,
  unnest(ARRAY['Business Name', 'Shopify Store URL', 'Primary Contact Email', 'Monthly Ad Budget',
               'Facebook Ad Account ID', 'Google Ads Customer ID', 'GTM Container ID',
               'Meta Pixel ID', 'Klaviyo API Key', 'Target Audience Description']),
  unnest(ARRAY['text'::field_type, 'url'::field_type, 'email'::field_type, 'text'::field_type,
               'text'::field_type, 'text'::field_type, 'text'::field_type,
               'text'::field_type, 'text'::field_type, 'textarea'::field_type]),
  unnest(ARRAY['Your company or brand name', 'yourstore.myshopify.com', 'contact@yourbrand.com',
               'e.g., $10,000 - $50,000', 'act_123456789', '123-456-7890',
               'GTM-XXXXX', '1234567890123456', 'pk_xxxxxxxxxxxx',
               'Describe your ideal customer demographics, interests, and buying behaviors...']),
  unnest(ARRAY[true, true, true, true, true, false, false, false, false, false]),
  unnest(ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
FROM agency a
WHERE NOT EXISTS (
  SELECT 1 FROM intake_form_field iff WHERE iff.agency_id = a.id
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 6. CREATE UPDATED_AT TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all onboarding tables
CREATE TRIGGER update_onboarding_journey_updated_at
    BEFORE UPDATE ON onboarding_journey
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intake_form_field_updated_at
    BEFORE UPDATE ON intake_form_field
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_instance_updated_at
    BEFORE UPDATE ON onboarding_instance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_stage_status_updated_at
    BEFORE UPDATE ON onboarding_stage_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VERIFICATION QUERIES (run manually after migration)
-- =============================================================================
--
-- Check tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('onboarding_journey', 'intake_form_field', 'onboarding_instance',
--                    'intake_response', 'onboarding_stage_status');
--
-- Check RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- AND (tablename LIKE 'onboarding%' OR tablename LIKE 'intake%');
--
-- Check seed data:
-- SELECT COUNT(*) as journey_count FROM onboarding_journey;
-- SELECT COUNT(*) as field_count FROM intake_form_field;
-- =============================================================================
