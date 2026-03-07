-- =============================================================================
-- Migration: Onboarding Provisioning & Access Delegation Config
-- Date: 2026-03-04
-- Description: Add provisioning columns to onboarding_instance for real
--   Slack channel and Google Drive folder creation. Add configurable
--   access delegation to onboarding_journey for Step 3 platform config.
-- =============================================================================

-- Add provisioning columns to onboarding_instance
ALTER TABLE onboarding_instance
  ADD COLUMN IF NOT EXISTS slack_channel_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS slack_channel_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS drive_folder_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS drive_folder_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS provisioning_data JSONB DEFAULT '{}'::jsonb;

-- Add configurable access delegation to journeys
ALTER TABLE onboarding_journey
  ADD COLUMN IF NOT EXISTS access_delegation_config JSONB DEFAULT '[]'::jsonb;

-- Seed default access delegation config for existing default journeys
UPDATE onboarding_journey
SET access_delegation_config = '[
  {
    "id": "meta",
    "name": "Meta Business Manager",
    "description": "Grant admin access for ad account management and pixel configuration",
    "email": "fulfillment@audienceos.io",
    "instructions_url": "https://www.facebook.com/business/help/2169003770027706",
    "required": true
  },
  {
    "id": "google",
    "name": "Google Ads & Tag Manager",
    "description": "Grant admin access for conversion tracking and analytics setup",
    "email": "tracking@audienceos.io",
    "instructions_url": "https://support.google.com/tagmanager/answer/6107011",
    "required": true
  },
  {
    "id": "shopify",
    "name": "Shopify Staff Account",
    "description": "Create a staff account for theme and script installation",
    "email": "dev@audienceos.io",
    "instructions_url": "https://help.shopify.com/en/manual/your-account/staff-accounts",
    "required": false
  }
]'::jsonb
WHERE is_default = true
  AND (access_delegation_config IS NULL OR access_delegation_config = '[]'::jsonb);

-- Index for provisioning lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_instance_slack_channel
  ON onboarding_instance (slack_channel_id)
  WHERE slack_channel_id IS NOT NULL;
