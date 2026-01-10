-- Migration: Additional RLS policies for onboarding support
-- Created: 2026-01-10
-- Applied via Supabase SQL Editor (already executed)
--
-- These policies were added to fix API 500 errors when querying onboarding
-- instances with JOINs to user and client tables.

-- =============================================================================
-- 1. USER TABLE: Allow reading users within same agency
-- =============================================================================
-- Existing policy (user_self_read) only allowed reading your own row.
-- This blocked JOINs like triggered_by_user:triggered_by in queries.

CREATE POLICY IF NOT EXISTS user_agency_read ON "user"
    FOR SELECT
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- 2. CLIENT TABLE: Fallback agency-based SELECT policy
-- =============================================================================
-- The RBAC-based client policies (client_member_scoped_*) require complex
-- role/permission joins. This simpler fallback ensures basic JOINs work.

CREATE POLICY IF NOT EXISTS client_agency_read ON client
    FOR SELECT
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- =============================================================================
-- VERIFICATION (run to confirm policies exist)
-- =============================================================================
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public'
-- AND policyname IN ('user_agency_read', 'client_agency_read');
