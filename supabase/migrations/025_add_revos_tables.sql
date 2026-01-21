-- ============================================================================
-- Migration: 025_add_revos_tables.sql
-- Purpose: Add RevOS tables to AudienceOS for unified platform
-- Date: 2026-01-21
-- Phase: Phase 0 - Database Schema Prep (RevOS Integration)
--
-- Tables added:
--   - linkedin_account (social account connections via UniPile)
--   - lead_magnet (downloadable content for campaigns)
--   - campaign (marketing campaigns with trigger words)
--   - post (LinkedIn posts)
--   - comment (post engagements)
--   - lead (captured leads from campaigns)
--   - webhook_config (outbound webhook configurations)
--   - webhook_delivery (webhook delivery tracking)
--   - pod (engagement pods)
--   - pod_member (pod membership)
--   - pod_activity (scheduled engagement activities)
-- ============================================================================

-- ============================================================================
-- ENUMS for RevOS tables
-- ============================================================================

-- LinkedIn account status
DO $$ BEGIN
  CREATE TYPE linkedin_account_status AS ENUM ('active', 'expired', 'error', 'disconnected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Campaign status
DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Post status
DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'published', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lead source
DO $$ BEGIN
  CREATE TYPE lead_source AS ENUM ('comment', 'dm', 'manual', 'webhook');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Lead status (funnel stages)
DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'comment_detected',
    'dm_sent',
    'email_captured',
    'webhook_sent',
    'completed',
    'unsubscribed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Webhook delivery status
DO $$ BEGIN
  CREATE TYPE webhook_delivery_status AS ENUM ('pending', 'success', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Pod status
DO $$ BEGIN
  CREATE TYPE pod_status AS ENUM ('active', 'paused');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Pod member role
DO $$ BEGIN
  CREATE TYPE pod_member_role AS ENUM ('owner', 'member');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Engagement type
DO $$ BEGIN
  CREATE TYPE engagement_type AS ENUM ('like', 'comment', 'repost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Pod activity status
DO $$ BEGIN
  CREATE TYPE pod_activity_status AS ENUM ('pending', 'completed', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ============================================================================
-- 1. LINKEDIN_ACCOUNT (UniPile-connected LinkedIn accounts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS linkedin_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_name VARCHAR(100) NOT NULL,

  -- UniPile connection data
  unipile_account_id VARCHAR(100) UNIQUE,
  unipile_session JSONB,
  session_expires_at TIMESTAMPTZ,

  -- LinkedIn profile data (cached)
  profile_data JSONB DEFAULT '{}',
  profile_url VARCHAR(500),

  -- Status tracking
  status linkedin_account_status NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,

  -- Rate limiting
  rate_limit_reset_at TIMESTAMPTZ,
  daily_dm_count INTEGER NOT NULL DEFAULT 0,
  daily_post_count INTEGER NOT NULL DEFAULT 0,
  daily_comment_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agency_id, user_id, account_name)
);

CREATE INDEX IF NOT EXISTS idx_linkedin_account_agency ON linkedin_account(agency_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_account_user ON linkedin_account(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_account_status ON linkedin_account(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_account_unipile ON linkedin_account(unipile_account_id);

ALTER TABLE linkedin_account ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "linkedin_account_rls" ON linkedin_account;
CREATE POLICY "linkedin_account_rls" ON linkedin_account FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 2. LEAD_MAGNET (Downloadable content for campaigns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_magnet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,

  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- File info
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  thumbnail_url VARCHAR(500),

  -- Tracking
  download_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_magnet_agency ON lead_magnet(agency_id);
CREATE INDEX IF NOT EXISTS idx_lead_magnet_client ON lead_magnet(client_id);

ALTER TABLE lead_magnet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_magnet_rls" ON lead_magnet;
CREATE POLICY "lead_magnet_rls" ON lead_magnet FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 3. CAMPAIGN (Marketing campaigns with trigger words)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,

  name VARCHAR(200) NOT NULL,
  description TEXT,

  -- Content references
  lead_magnet_id UUID REFERENCES lead_magnet(id) ON DELETE SET NULL,

  -- Trigger word detection
  trigger_word VARCHAR(100) NOT NULL,

  -- Templates
  post_template TEXT,
  dm_template_step1 TEXT,
  dm_template_step2 TEXT,
  dm_template_step3 TEXT,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Status and scheduling
  status campaign_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  -- Metrics (denormalized for quick access)
  metrics JSONB DEFAULT '{
    "posts": 0,
    "comments": 0,
    "leads": 0,
    "dms_sent": 0,
    "conversions": 0
  }',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agency_id, name)
);

CREATE INDEX IF NOT EXISTS idx_campaign_agency ON campaign(agency_id);
CREATE INDEX IF NOT EXISTS idx_campaign_client ON campaign(client_id);
CREATE INDEX IF NOT EXISTS idx_campaign_status ON campaign(status);
CREATE INDEX IF NOT EXISTS idx_campaign_trigger ON campaign(trigger_word);

ALTER TABLE campaign ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_rls" ON campaign;
CREATE POLICY "campaign_rls" ON campaign FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 4. POST (LinkedIn posts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS post (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaign(id) ON DELETE SET NULL,
  linkedin_account_id UUID REFERENCES linkedin_account(id) ON DELETE SET NULL,

  -- UniPile identifiers
  unipile_post_id VARCHAR(100) UNIQUE,
  post_url VARCHAR(500),

  -- Content
  content TEXT NOT NULL,
  trigger_word VARCHAR(100),
  media_urls JSONB DEFAULT '[]',

  -- Status and scheduling
  status post_status NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  -- Metrics (synced from LinkedIn via UniPile)
  metrics JSONB DEFAULT '{
    "likes": 0,
    "comments": 0,
    "reposts": 0,
    "impressions": 0
  }',
  last_polled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_agency ON post(agency_id);
CREATE INDEX IF NOT EXISTS idx_post_campaign ON post(campaign_id);
CREATE INDEX IF NOT EXISTS idx_post_linkedin_account ON post(linkedin_account_id);
CREATE INDEX IF NOT EXISTS idx_post_status ON post(status);
CREATE INDEX IF NOT EXISTS idx_post_scheduled ON post(scheduled_for) WHERE status = 'scheduled';

ALTER TABLE post ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_rls" ON post;
CREATE POLICY "post_rls" ON post FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 5. COMMENT (Post comments for trigger word detection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS comment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,

  -- UniPile identifier
  unipile_comment_id VARCHAR(100) UNIQUE,

  -- Author info (from LinkedIn)
  author_name VARCHAR(200) NOT NULL,
  author_linkedin_id VARCHAR(100) NOT NULL,
  author_profile_url VARCHAR(500),
  author_headline VARCHAR(500),

  -- Content
  content TEXT NOT NULL,

  -- Trigger detection
  has_trigger_word BOOLEAN NOT NULL DEFAULT false,

  -- DM sequence tracking
  dm_sent BOOLEAN NOT NULL DEFAULT false,
  dm_sent_at TIMESTAMPTZ,
  dm_step INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_agency ON comment(agency_id);
CREATE INDEX IF NOT EXISTS idx_comment_post ON comment(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_trigger ON comment(has_trigger_word) WHERE has_trigger_word = true;
CREATE INDEX IF NOT EXISTS idx_comment_author ON comment(author_linkedin_id);

ALTER TABLE comment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_rls" ON comment;
CREATE POLICY "comment_rls" ON comment FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 6. LEAD (Captured leads from campaigns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaign(id) ON DELETE SET NULL,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,

  -- Contact info
  email VARCHAR(200),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),

  -- LinkedIn info
  linkedin_id VARCHAR(100) NOT NULL,
  linkedin_url VARCHAR(500),
  company VARCHAR(200),
  title VARCHAR(200),

  -- Tracking
  source lead_source NOT NULL DEFAULT 'comment',
  status lead_status NOT NULL DEFAULT 'comment_detected',

  -- Reference to original comment
  comment_id UUID REFERENCES comment(id) ON DELETE SET NULL,

  -- Extensible fields
  custom_fields JSONB DEFAULT '{}',

  -- Lead score (0-100)
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agency_id, campaign_id, linkedin_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_agency ON lead(agency_id);
CREATE INDEX IF NOT EXISTS idx_lead_campaign ON lead(campaign_id);
CREATE INDEX IF NOT EXISTS idx_lead_client ON lead(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_status ON lead(status);
CREATE INDEX IF NOT EXISTS idx_lead_linkedin ON lead(linkedin_id);
CREATE INDEX IF NOT EXISTS idx_lead_email ON lead(email) WHERE email IS NOT NULL;

ALTER TABLE lead ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_rls" ON lead;
CREATE POLICY "lead_rls" ON lead FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 7. WEBHOOK_CONFIG (Outbound webhook configurations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,

  name VARCHAR(100) NOT NULL,
  url VARCHAR(500) NOT NULL,

  -- Headers (for auth, etc.)
  headers JSONB DEFAULT '{}',

  -- ESP type (for specific integrations)
  esp_type VARCHAR(50),

  -- Retry config
  retry_enabled BOOLEAN NOT NULL DEFAULT true,
  max_retries INTEGER NOT NULL DEFAULT 3,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,

  -- Events to trigger on
  trigger_events TEXT[] DEFAULT ARRAY['lead_created', 'email_captured'],

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agency_id, name)
);

CREATE INDEX IF NOT EXISTS idx_webhook_config_agency ON webhook_config(agency_id);
CREATE INDEX IF NOT EXISTS idx_webhook_config_client ON webhook_config(client_id);
CREATE INDEX IF NOT EXISTS idx_webhook_config_active ON webhook_config(is_active) WHERE is_active = true;

ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_config_rls" ON webhook_config;
CREATE POLICY "webhook_config_rls" ON webhook_config FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 8. WEBHOOK_DELIVERY (Webhook delivery tracking and retry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  webhook_config_id UUID NOT NULL REFERENCES webhook_config(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES lead(id) ON DELETE SET NULL,

  -- Event type
  event_type VARCHAR(50) NOT NULL,

  -- Payload
  payload JSONB NOT NULL,

  -- Delivery status
  status webhook_delivery_status NOT NULL DEFAULT 'pending',
  status_code INTEGER,
  response_body JSONB,
  error_message TEXT,

  -- Retry tracking
  attempt_count INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_agency ON webhook_delivery(agency_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_config ON webhook_delivery(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_status ON webhook_delivery(status);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_retry ON webhook_delivery(next_retry_at) WHERE status = 'pending';

ALTER TABLE webhook_delivery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_delivery_rls" ON webhook_delivery;
CREATE POLICY "webhook_delivery_rls" ON webhook_delivery FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 9. POD (Engagement pods)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pod (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID REFERENCES client(id) ON DELETE SET NULL,

  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Pod config
  min_members INTEGER NOT NULL DEFAULT 3,
  auto_engage BOOLEAN NOT NULL DEFAULT true,

  -- Settings
  settings JSONB DEFAULT '{
    "engage_on_like": true,
    "engage_on_comment": true,
    "engage_on_repost": false,
    "delay_minutes_min": 5,
    "delay_minutes_max": 30
  }',

  status pod_status NOT NULL DEFAULT 'active',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(agency_id, name)
);

CREATE INDEX IF NOT EXISTS idx_pod_agency ON pod(agency_id);
CREATE INDEX IF NOT EXISTS idx_pod_client ON pod(client_id);
CREATE INDEX IF NOT EXISTS idx_pod_status ON pod(status);

ALTER TABLE pod ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pod_rls" ON pod;
CREATE POLICY "pod_rls" ON pod FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 10. POD_MEMBER (Pod membership)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pod_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  pod_id UUID NOT NULL REFERENCES pod(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  linkedin_account_id UUID REFERENCES linkedin_account(id) ON DELETE SET NULL,

  role pod_member_role NOT NULL DEFAULT 'member',

  -- Participation tracking
  participation_score DECIMAL(3,2) DEFAULT 1.00 CHECK (participation_score >= 0 AND participation_score <= 1),

  status pod_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(pod_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pod_member_agency ON pod_member(agency_id);
CREATE INDEX IF NOT EXISTS idx_pod_member_pod ON pod_member(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_member_user ON pod_member(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_member_linkedin ON pod_member(linkedin_account_id);

ALTER TABLE pod_member ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pod_member_rls" ON pod_member;
CREATE POLICY "pod_member_rls" ON pod_member FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- 11. POD_ACTIVITY (Scheduled pod engagements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pod_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  pod_id UUID NOT NULL REFERENCES pod(id) ON DELETE CASCADE,
  post_id UUID REFERENCES post(id) ON DELETE SET NULL,
  member_id UUID NOT NULL REFERENCES pod_member(id) ON DELETE CASCADE,

  -- Target post (can be external URL)
  post_url VARCHAR(500) NOT NULL,

  -- Activity type
  engagement_type engagement_type NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,

  -- Status
  status pod_activity_status NOT NULL DEFAULT 'pending',
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pod_activity_agency ON pod_activity(agency_id);
CREATE INDEX IF NOT EXISTS idx_pod_activity_pod ON pod_activity(pod_id);
CREATE INDEX IF NOT EXISTS idx_pod_activity_member ON pod_activity(member_id);
CREATE INDEX IF NOT EXISTS idx_pod_activity_scheduled ON pod_activity(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pod_activity_status ON pod_activity(status);

ALTER TABLE pod_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pod_activity_rls" ON pod_activity;
CREATE POLICY "pod_activity_rls" ON pod_activity FOR ALL
  TO authenticated
  USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);


-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

DROP TRIGGER IF EXISTS update_linkedin_account_updated_at ON linkedin_account;
CREATE TRIGGER update_linkedin_account_updated_at BEFORE UPDATE ON linkedin_account
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_magnet_updated_at ON lead_magnet;
CREATE TRIGGER update_lead_magnet_updated_at BEFORE UPDATE ON lead_magnet
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaign_updated_at ON campaign;
CREATE TRIGGER update_campaign_updated_at BEFORE UPDATE ON campaign
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_updated_at ON post;
CREATE TRIGGER update_post_updated_at BEFORE UPDATE ON post
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_updated_at ON lead;
CREATE TRIGGER update_lead_updated_at BEFORE UPDATE ON lead
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhook_config_updated_at ON webhook_config;
CREATE TRIGGER update_webhook_config_updated_at BEFORE UPDATE ON webhook_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pod_updated_at ON pod;
CREATE TRIGGER update_pod_updated_at BEFORE UPDATE ON pod
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON linkedin_account TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lead_magnet TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON post TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lead TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_delivery TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pod TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pod_member TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pod_activity TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
