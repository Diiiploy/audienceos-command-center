-- Add view_count and download_count to document table for usage tracking
ALTER TABLE document ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE document ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0;
