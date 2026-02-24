-- Add received_at column to user_communication
-- This stores the actual email timestamp (from Gmail internalDate)
-- Previously this was buried in the metadata JSONB, making it unqueryable.

ALTER TABLE user_communication
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

-- Backfill from metadata for any existing rows
UPDATE user_communication
SET received_at = (metadata->>'received_at')::timestamptz
WHERE received_at IS NULL
  AND metadata->>'received_at' IS NOT NULL;

-- For any remaining rows without received_at, use created_at
UPDATE user_communication
SET received_at = created_at
WHERE received_at IS NULL;

-- Now make it NOT NULL with a default
ALTER TABLE user_communication
  ALTER COLUMN received_at SET DEFAULT CURRENT_TIMESTAMP;

-- Index for ordering by received_at
CREATE INDEX IF NOT EXISTS idx_user_communication_received_at
  ON user_communication(user_id, received_at DESC);
