-- Migration 017: User OAuth Credentials Table
-- Purpose: Store per-user OAuth tokens for Gmail, Slack, Meta, Stripe integration
-- Created: 2026-01-17
-- Note: Separate from agency-level "integration" table (which uses agency_id)
-- This table is for per-user OAuth credentials with individual token encryption
-- RLS: Enabled - users can only see their own credentials

CREATE TABLE IF NOT EXISTS user_oauth_credential (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  is_connected BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, type)
);

-- Indexes for efficient queries
CREATE INDEX idx_user_oauth_credential_user_type ON user_oauth_credential(user_id, type);
CREATE INDEX idx_user_oauth_credential_connected ON user_oauth_credential(is_connected) WHERE is_connected = true;
CREATE INDEX idx_user_oauth_credential_last_sync ON user_oauth_credential(last_sync_at) WHERE is_connected = true;

-- Enable Row Level Security
ALTER TABLE user_oauth_credential ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only select their own credentials
CREATE POLICY "users_select_own_oauth_credentials"
  ON user_oauth_credential FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can update their own credentials
CREATE POLICY "users_update_own_oauth_credentials"
  ON user_oauth_credential FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policy: Users can insert credentials for themselves
CREATE POLICY "users_insert_own_oauth_credentials"
  ON user_oauth_credential FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can delete their own credentials
CREATE POLICY "users_delete_own_oauth_credentials"
  ON user_oauth_credential FOR DELETE
  USING (user_id = auth.uid());

-- Comment for documentation
COMMENT ON TABLE user_oauth_credential IS 'Per-user OAuth token storage for third-party service integrations (Gmail, Slack, Meta, Stripe). Tokens are stored encrypted. Separate from agency-level integration table.';
COMMENT ON COLUMN user_oauth_credential.type IS 'Integration type: gmail, slack, meta, stripe';
COMMENT ON COLUMN user_oauth_credential.is_connected IS 'Whether the integration is currently active';
COMMENT ON COLUMN user_oauth_credential.last_sync_at IS 'Timestamp of last successful sync';
