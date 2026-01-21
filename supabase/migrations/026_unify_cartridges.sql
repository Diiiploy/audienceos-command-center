-- ============================================================================
-- Migration: 026_unify_cartridges.sql
-- Purpose: Unify cartridge system with RevOS 4-tier architecture
-- Date: 2026-01-21
-- Phase: Phase 0 - Database Schema Prep (RevOS Integration)
--
-- Strategy:
--   AudienceOS has 5 specialized cartridge tables (voice, style, preferences,
--   instruction, brand). RevOS has 1 unified cartridge with 4 tiers.
--
--   Solution: Add a master `cartridge` table for tier/inheritance management
--   while keeping specialized tables for domain-specific data.
--
-- Tier Hierarchy (lower overrides higher):
--   1. system   - Platform defaults (read-only for users)
--   2. workspace - Agency-level settings
--   3. user     - User-specific customizations
--   4. skill    - Context-specific overrides (per-campaign, per-task)
-- ============================================================================

-- ============================================================================
-- CARTRIDGE TIER ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE cartridge_tier AS ENUM ('system', 'workspace', 'user', 'skill');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE cartridge_type AS ENUM ('voice', 'style', 'preferences', 'instruction', 'brand', 'combined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ============================================================================
-- MASTER CARTRIDGE TABLE
-- ============================================================================
-- This table provides:
--   1. Tier-based precedence for all cartridge types
--   2. Inheritance (parent_cartridge_id)
--   3. Unified querying across cartridge types
--   4. Client-level scoping (optional)

CREATE TABLE IF NOT EXISTS cartridge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,
  user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,

  -- Tier and type
  tier cartridge_tier NOT NULL DEFAULT 'workspace',
  type cartridge_type NOT NULL,

  -- Identity
  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Inheritance
  parent_cartridge_id UUID REFERENCES cartridge(id) ON DELETE SET NULL,

  -- References to specialized cartridges (one will be set based on type)
  voice_cartridge_id UUID REFERENCES voice_cartridge(id) ON DELETE SET NULL,
  style_cartridge_id UUID REFERENCES style_cartridge(id) ON DELETE SET NULL,
  preferences_cartridge_id UUID REFERENCES preferences_cartridge(id) ON DELETE SET NULL,
  instruction_cartridge_id UUID REFERENCES instruction_cartridge(id) ON DELETE SET NULL,
  brand_cartridge_id UUID REFERENCES brand_cartridge(id) ON DELETE SET NULL,

  -- Combined/custom cartridge data (when type='combined' or for extension)
  custom_data JSONB DEFAULT '{}',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT cartridge_tier_scope CHECK (
    -- System tier: no user/client scope
    (tier = 'system' AND user_id IS NULL AND client_id IS NULL)
    -- Workspace tier: agency-wide, no user scope
    OR (tier = 'workspace' AND user_id IS NULL)
    -- User tier: user-specific
    OR (tier = 'user' AND user_id IS NOT NULL)
    -- Skill tier: can be any scope
    OR (tier = 'skill')
  ),

  -- One specialized cartridge ref per type
  CONSTRAINT cartridge_type_ref CHECK (
    (type = 'voice' AND voice_cartridge_id IS NOT NULL)
    OR (type = 'style' AND style_cartridge_id IS NOT NULL)
    OR (type = 'preferences' AND preferences_cartridge_id IS NOT NULL)
    OR (type = 'instruction' AND instruction_cartridge_id IS NOT NULL)
    OR (type = 'brand' AND brand_cartridge_id IS NOT NULL)
    OR (type = 'combined')
  )
);

CREATE INDEX IF NOT EXISTS idx_cartridge_agency ON cartridge(agency_id);
CREATE INDEX IF NOT EXISTS idx_cartridge_client ON cartridge(client_id);
CREATE INDEX IF NOT EXISTS idx_cartridge_user ON cartridge(user_id);
CREATE INDEX IF NOT EXISTS idx_cartridge_tier ON cartridge(tier);
CREATE INDEX IF NOT EXISTS idx_cartridge_type ON cartridge(type);
CREATE INDEX IF NOT EXISTS idx_cartridge_active ON cartridge(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cartridge_parent ON cartridge(parent_cartridge_id);

-- Unique name per scope
CREATE UNIQUE INDEX IF NOT EXISTS idx_cartridge_unique_name ON cartridge(
  agency_id,
  COALESCE(client_id, '00000000-0000-0000-0000-000000000000'),
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'),
  tier,
  type,
  name
);

ALTER TABLE cartridge ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "cartridge_select" ON cartridge;
CREATE POLICY "cartridge_select" ON cartridge FOR SELECT
  TO authenticated
  USING (
    -- Can read system cartridges
    tier = 'system'
    -- Can read agency cartridges
    OR agency_id = (auth.jwt() ->> 'agency_id')::uuid
  );

DROP POLICY IF EXISTS "cartridge_insert" ON cartridge;
CREATE POLICY "cartridge_insert" ON cartridge FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Cannot insert system tier (admin only via service role)
    tier != 'system'
    AND agency_id = (auth.jwt() ->> 'agency_id')::uuid
  );

DROP POLICY IF EXISTS "cartridge_update" ON cartridge;
CREATE POLICY "cartridge_update" ON cartridge FOR UPDATE
  TO authenticated
  USING (
    tier != 'system'
    AND agency_id = (auth.jwt() ->> 'agency_id')::uuid
  )
  WITH CHECK (
    tier != 'system'
    AND agency_id = (auth.jwt() ->> 'agency_id')::uuid
  );

DROP POLICY IF EXISTS "cartridge_delete" ON cartridge;
CREATE POLICY "cartridge_delete" ON cartridge FOR DELETE
  TO authenticated
  USING (
    tier != 'system'
    AND agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND EXISTS (
      SELECT 1 FROM user_role ur
      WHERE ur.user_id = auth.uid()
      AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
      AND ur.role_id IN (SELECT id FROM role WHERE hierarchy_level <= 2)
      AND ur.is_active = true
    )
  );


-- ============================================================================
-- ADD CARTRIDGE_ID TO SPECIALIZED TABLES
-- ============================================================================
-- This creates a bidirectional link: master <-> specialized

ALTER TABLE voice_cartridge
  ADD COLUMN IF NOT EXISTS cartridge_id UUID REFERENCES cartridge(id) ON DELETE SET NULL;

ALTER TABLE style_cartridge
  ADD COLUMN IF NOT EXISTS cartridge_id UUID REFERENCES cartridge(id) ON DELETE SET NULL;

ALTER TABLE preferences_cartridge
  ADD COLUMN IF NOT EXISTS cartridge_id UUID REFERENCES cartridge(id) ON DELETE SET NULL;

ALTER TABLE instruction_cartridge
  ADD COLUMN IF NOT EXISTS cartridge_id UUID REFERENCES cartridge(id) ON DELETE SET NULL;

ALTER TABLE brand_cartridge
  ADD COLUMN IF NOT EXISTS cartridge_id UUID REFERENCES cartridge(id) ON DELETE SET NULL;


-- ============================================================================
-- FUNCTION: Get effective cartridges for a context
-- ============================================================================
-- Returns cartridges in tier order (system -> workspace -> user -> skill)
-- Later tiers override earlier tiers

CREATE OR REPLACE FUNCTION get_effective_cartridges(
  p_agency_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_type cartridge_type DEFAULT NULL
)
RETURNS TABLE (
  cartridge_id UUID,
  tier cartridge_tier,
  type cartridge_type,
  name VARCHAR,
  priority INTEGER,
  voice_cartridge_id UUID,
  style_cartridge_id UUID,
  preferences_cartridge_id UUID,
  instruction_cartridge_id UUID,
  brand_cartridge_id UUID,
  custom_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as cartridge_id,
    c.tier,
    c.type,
    c.name,
    c.priority,
    c.voice_cartridge_id,
    c.style_cartridge_id,
    c.preferences_cartridge_id,
    c.instruction_cartridge_id,
    c.brand_cartridge_id,
    c.custom_data
  FROM cartridge c
  WHERE c.is_active = true
    AND (
      -- System tier (always included)
      c.tier = 'system'
      -- Workspace tier (agency match)
      OR (c.tier = 'workspace' AND c.agency_id = p_agency_id AND c.client_id IS NULL)
      -- Client-scoped workspace (if client provided)
      OR (c.tier = 'workspace' AND c.agency_id = p_agency_id AND c.client_id = p_client_id)
      -- User tier
      OR (c.tier = 'user' AND c.user_id = p_user_id)
      -- Skill tier (all matching scopes)
      OR (c.tier = 'skill' AND c.agency_id = p_agency_id
          AND (c.client_id IS NULL OR c.client_id = p_client_id)
          AND (c.user_id IS NULL OR c.user_id = p_user_id))
    )
    AND (p_type IS NULL OR c.type = p_type)
  ORDER BY
    CASE c.tier
      WHEN 'system' THEN 1
      WHEN 'workspace' THEN 2
      WHEN 'user' THEN 3
      WHEN 'skill' THEN 4
    END,
    c.priority DESC,
    c.created_at ASC;
END;
$$;


-- ============================================================================
-- FUNCTION: Get merged cartridge data
-- ============================================================================
-- Merges all cartridge data with tier precedence

CREATE OR REPLACE FUNCTION get_merged_cartridge(
  p_agency_id UUID,
  p_client_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_type cartridge_type DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB := '{}';
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT * FROM get_effective_cartridges(p_agency_id, p_client_id, p_user_id, p_type)
  LOOP
    -- Merge custom_data (later tiers override earlier)
    IF v_row.custom_data IS NOT NULL AND v_row.custom_data != '{}' THEN
      v_result := v_result || v_row.custom_data;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;


-- ============================================================================
-- TRIGGER: Auto-update timestamps
-- ============================================================================

DROP TRIGGER IF EXISTS update_cartridge_updated_at ON cartridge;
CREATE TRIGGER update_cartridge_updated_at BEFORE UPDATE ON cartridge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON cartridge TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_cartridges TO authenticated;
GRANT EXECUTE ON FUNCTION get_merged_cartridge TO authenticated;


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
