-- Migration: Add is_starred and use_for_training columns to document table
-- Purpose: Enable Knowledge Base starring and AI training toggles

-- Add is_starred column with default false
ALTER TABLE document ADD COLUMN IF NOT EXISTS is_starred BOOLEAN NOT NULL DEFAULT false;

-- Add use_for_training column with default false
ALTER TABLE document ADD COLUMN IF NOT EXISTS use_for_training BOOLEAN NOT NULL DEFAULT false;

-- Add drive_url for tracking Google Drive source
ALTER TABLE document ADD COLUMN IF NOT EXISTS drive_url TEXT;

-- Add drive_file_id for tracking Google Drive file ID
ALTER TABLE document ADD COLUMN IF NOT EXISTS drive_file_id TEXT;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_document_starred ON document(agency_id, is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_document_training ON document(agency_id, use_for_training) WHERE use_for_training = true;

-- Comment on columns for documentation
COMMENT ON COLUMN document.is_starred IS 'Whether the document is starred/favorited by agency users';
COMMENT ON COLUMN document.use_for_training IS 'Whether the document should be used for AI training/RAG';
COMMENT ON COLUMN document.drive_url IS 'Original Google Drive URL if imported from Drive';
COMMENT ON COLUMN document.drive_file_id IS 'Google Drive file ID if imported from Drive';
