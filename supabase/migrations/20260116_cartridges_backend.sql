-- Create cartridges table (main storage)
CREATE TABLE IF NOT EXISTS cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'voice', 'brand', 'style', 'instructions'
  tier VARCHAR(20) NOT NULL DEFAULT 'agency', -- 'system', 'agency', 'client', 'user'
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Ownership fields (one is set based on tier)
  client_id UUID REFERENCES client(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES cartridges(id) ON DELETE SET NULL,

  -- Voice cartridge fields
  voice_tone TEXT,
  voice_style TEXT,
  voice_personality TEXT,
  voice_vocabulary TEXT,

  -- Brand cartridge fields
  brand_name TEXT,
  brand_tagline TEXT,
  brand_values TEXT[],
  brand_logo_url TEXT,

  -- Style cartridge fields
  style_primary_color TEXT,
  style_secondary_color TEXT,
  style_fonts TEXT[],

  -- Instructions cartridge fields
  instructions_system_prompt TEXT,
  instructions_rules TEXT[],

  created_by UUID NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_cartridges_agency ON cartridges(agency_id);
CREATE INDEX idx_cartridges_user ON cartridges(user_id);
CREATE INDEX idx_cartridges_client ON cartridges(client_id);
CREATE INDEX idx_cartridges_type ON cartridges(type);
CREATE INDEX idx_cartridges_tier ON cartridges(tier);
CREATE INDEX idx_cartridges_active ON cartridges(is_active) WHERE is_active = true;

-- Create unique constraint for default cartridges per type per agency
CREATE UNIQUE INDEX idx_cartridges_default
ON cartridges(agency_id, type)
WHERE is_default = true AND is_active = true;

-- Enable RLS
ALTER TABLE cartridges ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Admins/Managers can see all cartridges in their agency
CREATE POLICY "agency_admins_see_all_cartridges"
  ON cartridges FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM "user"
      WHERE id = auth.uid()
        AND role IN ('admin')
    )
  );

-- RLS Policy 2: Members see only assigned client cartridges + user cartridges
CREATE POLICY "members_see_assigned_cartridges"
  ON cartridges FOR SELECT
  USING (
    (user_id = auth.uid()) OR
    (tier = 'agency' AND agency_id IN (
      SELECT agency_id FROM "user" WHERE id = auth.uid()
    )) OR
    (tier = 'client' AND client_id IN (
      SELECT id FROM client
      WHERE id IN (
        SELECT client_id FROM member_client_access
        WHERE user_id = auth.uid()
      )
    ))
  );

-- RLS Policy 3: Insert - only admins can create cartridges
CREATE POLICY "admins_create_cartridges"
  ON cartridges FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM "user"
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy 4: Update - only admins can update
CREATE POLICY "admins_update_cartridges"
  ON cartridges FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM "user"
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy 5: Delete - only admins can delete
CREATE POLICY "admins_delete_cartridges"
  ON cartridges FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM "user"
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_cartridges_updated_at
  BEFORE UPDATE ON cartridges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
