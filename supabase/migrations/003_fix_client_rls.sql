-- Migration: Fix client and client_assignment RLS policies to use user table lookup
-- Applied: 2026-01-02 via Supabase SQL Editor
-- Reason: JWT claims (auth.jwt() ->> 'agency_id') are not set; user table lookup is authoritative
--
-- This follows the same pattern used for ticket table in 002_fix_rls_policies.sql

-- Fix client table RLS policy
DROP POLICY IF EXISTS client_rls ON client;
DROP POLICY IF EXISTS client_agency_via_user ON client;

CREATE POLICY client_agency_via_user ON client
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- Fix client_assignment table RLS policy
DROP POLICY IF EXISTS client_assignment_rls ON client_assignment;
DROP POLICY IF EXISTS client_assignment_agency_via_user ON client_assignment;

CREATE POLICY client_assignment_agency_via_user ON client_assignment
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- Note: Also fix stage_event, communication, and task tables for client detail view
DROP POLICY IF EXISTS stage_event_rls ON stage_event;
CREATE POLICY stage_event_agency_via_user ON stage_event
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS communication_rls ON communication;
CREATE POLICY communication_agency_via_user ON communication
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS task_rls ON task;
CREATE POLICY task_agency_via_user ON task
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );
