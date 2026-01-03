-- Migration: 005_rate_limit_table.sql
-- Purpose: Create distributed rate limiting table (TD-004 fix)
-- Date: 2026-01-02

-- Rate limit entries table
CREATE TABLE IF NOT EXISTS rate_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint on identifier within active window
  CONSTRAINT rate_limit_identifier_unique UNIQUE (identifier, window_start)
);

-- Index for fast lookups by identifier
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit(identifier);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires_at ON rate_limit(expires_at);

-- Automatic cleanup of expired entries (runs every 5 minutes)
-- This is a scheduled job that Supabase can run via pg_cron
-- For now, we'll clean up in the application code

-- RLS: Rate limit table is accessed via service role only
ALTER TABLE rate_limit ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - we use service role for rate limiting
-- This ensures rate limits work even for unauthenticated requests

COMMENT ON TABLE rate_limit IS 'Distributed rate limiting storage for API protection';
COMMENT ON COLUMN rate_limit.identifier IS 'Client identifier (IP address or user ID)';
COMMENT ON COLUMN rate_limit.count IS 'Request count in current window';
COMMENT ON COLUMN rate_limit.window_start IS 'Start of current rate limit window';
COMMENT ON COLUMN rate_limit.expires_at IS 'When this entry expires and can be cleaned up';

-- Atomic increment function for rate limiting
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_identifier TEXT,
  p_window_start TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS TABLE(count INTEGER, allowed BOOLEAN) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Try to increment existing entry
  UPDATE rate_limit
  SET count = rate_limit.count + 1
  WHERE identifier = p_identifier
    AND window_start = p_window_start
  RETURNING rate_limit.count INTO v_count;

  -- If no row updated, insert new entry
  IF NOT FOUND THEN
    INSERT INTO rate_limit (identifier, count, window_start, expires_at)
    VALUES (p_identifier, 1, p_window_start, p_expires_at)
    ON CONFLICT (identifier, window_start)
    DO UPDATE SET count = rate_limit.count + 1
    RETURNING rate_limit.count INTO v_count;
  END IF;

  RETURN QUERY SELECT v_count, v_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION increment_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_rate_limits TO service_role;
