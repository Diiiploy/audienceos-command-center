-- ============================================================================
-- Migration: 010_cartridge_tables.sql
-- Purpose: Create cartridge system tables for multi-tenant support
-- Date: 2026-01-15
-- Phase: W1 Cartridge Backend - Ported from RevOS with security hardening
-- ============================================================================

-- ============================================================================
-- 1. Voice Cartridge Table
-- ============================================================================

CREATE TABLE voice_cartridge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  system_instructions TEXT,
  tier VARCHAR(20) NOT NULL DEFAULT 'default' CHECK (tier IN ('user', 'campaign', 'request', 'default')),
  is_active BOOLEAN DEFAULT true,
  voice_params JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, name)
);

CREATE INDEX idx_voice_cartridge_agency ON voice_cartridge(agency_id, is_active);
CREATE INDEX idx_voice_cartridge_tier ON voice_cartridge(agency_id, tier);

-- ============================================================================
-- 2. Style Cartridge Table
-- ============================================================================

CREATE TABLE style_cartridge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  source_files JSONB DEFAULT '[]'::jsonb,
  learned_style JSONB DEFAULT NULL,
  mem0_namespace VARCHAR(255),
  analysis_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id)
);

CREATE INDEX idx_style_cartridge_agency ON style_cartridge(agency_id);
CREATE INDEX idx_style_cartridge_status ON style_cartridge(agency_id, analysis_status);

-- ============================================================================
-- 3. Preferences Cartridge Table
-- ============================================================================

CREATE TABLE preferences_cartridge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  language VARCHAR(50) NOT NULL DEFAULT 'English',
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('LinkedIn', 'Twitter', 'Facebook', 'Instagram')),
  tone VARCHAR(50) NOT NULL CHECK (tone IN ('Professional', 'Casual', 'Friendly', 'Formal', 'Humorous')),
  content_length VARCHAR(50) NOT NULL CHECK (content_length IN ('Short', 'Medium', 'Long', 'Very Long')),
  hashtag_count INTEGER DEFAULT 3,
  emoji_usage VARCHAR(50) NOT NULL CHECK (emoji_usage IN ('None', 'Minimal', 'Moderate', 'Frequent')),
  call_to_action VARCHAR(50) NOT NULL CHECK (call_to_action IN ('None', 'Subtle', 'Clear', 'Strong')),
  personalization_level VARCHAR(50) NOT NULL CHECK (personalization_level IN ('Low', 'Medium', 'High')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, platform)
);

CREATE INDEX idx_preferences_cartridge_agency ON preferences_cartridge(agency_id);
CREATE INDEX idx_preferences_cartridge_platform ON preferences_cartridge(agency_id, platform);

-- ============================================================================
-- 4. Instruction Cartridge Table
-- ============================================================================

CREATE TABLE instruction_cartridge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  training_docs JSONB DEFAULT '[]'::jsonb,
  extracted_knowledge JSONB DEFAULT NULL,
  mem0_namespace VARCHAR(255),
  process_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (process_status IN ('pending', 'processing', 'completed', 'failed')),
  last_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, name)
);

CREATE INDEX idx_instruction_cartridge_agency ON instruction_cartridge(agency_id);
CREATE INDEX idx_instruction_cartridge_status ON instruction_cartridge(agency_id, process_status);
CREATE INDEX idx_instruction_cartridge_mem0 ON instruction_cartridge(mem0_namespace);

-- ============================================================================
-- 5. Brand Cartridge Table
-- ============================================================================

CREATE TABLE brand_cartridge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  company_description TEXT,
  company_tagline VARCHAR(255),
  industry VARCHAR(100),
  target_audience TEXT,
  core_values TEXT[] DEFAULT ARRAY[]::TEXT[],
  brand_voice TEXT,
  brand_personality TEXT[] DEFAULT ARRAY[]::TEXT[],
  logo_url VARCHAR(512),
  brand_colors JSONB DEFAULT '{}'::jsonb,
  social_links JSONB DEFAULT '{}'::jsonb,
  core_messaging TEXT,
  benson_blueprint JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, name)
);

CREATE INDEX idx_brand_cartridge_agency ON brand_cartridge(agency_id);
CREATE INDEX idx_brand_cartridge_name ON brand_cartridge(agency_id, name);

-- ============================================================================
-- Enable Row-Level Security
-- ============================================================================

ALTER TABLE voice_cartridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_cartridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences_cartridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_cartridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_cartridge ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies - Agency Isolation for All Cartridge Tables
-- ============================================================================

-- Voice Cartridge Policies
CREATE POLICY "voice_cartridge_read" ON voice_cartridge
FOR SELECT
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "voice_cartridge_insert" ON voice_cartridge
FOR INSERT
TO authenticated
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.is_active = true
  )
);

CREATE POLICY "voice_cartridge_update" ON voice_cartridge
FOR UPDATE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.is_active = true
  )
)
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "voice_cartridge_delete" ON voice_cartridge
FOR DELETE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.role_id IN (SELECT id FROM role WHERE hierarchy_level <= 2)
    AND ur.is_active = true
  )
);

-- Style Cartridge Policies
CREATE POLICY "style_cartridge_read" ON style_cartridge
FOR SELECT
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "style_cartridge_insert" ON style_cartridge
FOR INSERT
TO authenticated
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "style_cartridge_update" ON style_cartridge
FOR UPDATE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
)
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "style_cartridge_delete" ON style_cartridge
FOR DELETE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.role_id IN (SELECT id FROM role WHERE hierarchy_level <= 2)
    AND ur.is_active = true
  )
);

-- Preferences Cartridge Policies
CREATE POLICY "preferences_cartridge_read" ON preferences_cartridge
FOR SELECT
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "preferences_cartridge_insert" ON preferences_cartridge
FOR INSERT
TO authenticated
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "preferences_cartridge_update" ON preferences_cartridge
FOR UPDATE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
)
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "preferences_cartridge_delete" ON preferences_cartridge
FOR DELETE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.role_id IN (SELECT id FROM role WHERE hierarchy_level <= 2)
    AND ur.is_active = true
  )
);

-- Instruction Cartridge Policies
CREATE POLICY "instruction_cartridge_read" ON instruction_cartridge
FOR SELECT
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "instruction_cartridge_insert" ON instruction_cartridge
FOR INSERT
TO authenticated
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "instruction_cartridge_update" ON instruction_cartridge
FOR UPDATE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
)
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "instruction_cartridge_delete" ON instruction_cartridge
FOR DELETE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.role_id IN (SELECT id FROM role WHERE hierarchy_level <= 2)
    AND ur.is_active = true
  )
);

-- Brand Cartridge Policies
CREATE POLICY "brand_cartridge_read" ON brand_cartridge
FOR SELECT
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "brand_cartridge_insert" ON brand_cartridge
FOR INSERT
TO authenticated
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "brand_cartridge_update" ON brand_cartridge
FOR UPDATE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
)
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "brand_cartridge_delete" ON brand_cartridge
FOR DELETE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.role_id IN (SELECT id FROM role WHERE hierarchy_level <= 2)
    AND ur.is_active = true
  )
);

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT SELECT ON voice_cartridge TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON voice_cartridge TO authenticated;

GRANT SELECT ON style_cartridge TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON style_cartridge TO authenticated;

GRANT SELECT ON preferences_cartridge TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON preferences_cartridge TO authenticated;

GRANT SELECT ON instruction_cartridge TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON instruction_cartridge TO authenticated;

GRANT SELECT ON brand_cartridge TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON brand_cartridge TO authenticated;
