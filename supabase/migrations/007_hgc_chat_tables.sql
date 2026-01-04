-- Migration: HGC Chat Tables for INT-001
-- Created: 2026-01-04
-- Purpose: Add Holy Grail Chat tables to RevOS Supabase
--
-- DISCOVERY: The chat_session and chat_message tables don't exist in RevOS.
-- This migration creates them with RevOS-compatible schema (agencies, admin_users).
--
-- To apply: Run in Supabase SQL Editor (bravo-revos project)
-- URL: https://supabase.com/dashboard/project/trdoainmejxanrownbuz/sql/new

-- ============================================================================
-- ENUMS (with safe creation)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE chat_role AS ENUM ('user', 'assistant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE chat_route AS ENUM ('rag', 'web', 'memory', 'casual', 'dashboard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CHAT_SESSION
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title VARCHAR(200),
    context JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_session_agency_user ON chat_session(agency_id, user_id);
ALTER TABLE chat_session ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CHAT_MESSAGE
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_session(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    role chat_role NOT NULL,
    content TEXT NOT NULL,
    route_used chat_route,
    citations JSONB,
    tokens_used INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_message_session ON chat_message(session_id, created_at);
ALTER TABLE chat_message ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (RevOS pattern - admin_users table lookup)
-- ============================================================================
CREATE POLICY chat_session_agency_via_user ON chat_session
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM admin_users WHERE id = auth.uid()
        )
    );

CREATE POLICY chat_message_agency_via_user ON chat_message
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM admin_users WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After applying, verify with:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'chat%';
--
-- Expected: chat_session, chat_message
