-- ============================================================================
-- COMPREHENSIVE RLS POLICY FIX
-- Date: 2026-02-03
-- Issue: New Supabase database missing corrected RLS policies
-- Symptoms: Sidebar shows "Loading...", clients page shows "Failed to load"
-- Root cause: Initial schema RLS uses JWT 'agency_id' which is never set
-- ============================================================================
-- This migration consolidates fixes from:
--   002_fix_rls_policies.sql
--   003_fix_client_rls.sql
--   013_fix_user_rls.sql
--   014_fix_agency_rls.sql
--   20260108_client_scoped_rls.sql
--   20260112_fix_rls_policy_conflict.sql
--   20260120_fix_user_rls_recursion.sql
-- ============================================================================

-- ============================================================================
-- STEP 0: DIAGNOSTIC - Check current state (results visible in SQL Editor)
-- ============================================================================
-- Uncomment this to see current policies before applying fixes:
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 1: USER TABLE RLS (Critical - all other policies depend on this)
-- ============================================================================
-- The user table policies must NOT do subqueries on the user table itself
-- (that causes infinite recursion). Use auth.uid() directly.

DROP POLICY IF EXISTS user_rls ON "user";
DROP POLICY IF EXISTS user_self_read ON "user";
DROP POLICY IF EXISTS user_same_agency ON "user";
DROP POLICY IF EXISTS user_agency_read ON "user";
DROP POLICY IF EXISTS user_agency_access ON "user";
DROP POLICY IF EXISTS user_self_update ON "user";

-- Policy 1: Users can read their own record (critical for profile loading)
CREATE POLICY user_self_read ON "user"
    FOR SELECT
    USING (id = auth.uid());

-- Policy 2: Users can read other users in their agency via JWT
-- If JWT doesn't have agency_id (common), this is harmless - user_self_read covers self
CREATE POLICY user_agency_access ON "user"
    FOR SELECT
    USING (
        agency_id = (
            COALESCE(
                (auth.jwt() -> 'app_metadata' ->> 'agency_id')::uuid,
                (auth.jwt() ->> 'agency_id')::uuid
            )
        )
    );

-- Policy 3: Users can update their own record
CREATE POLICY user_self_update ON "user"
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- STEP 2: AGENCY TABLE RLS
-- ============================================================================
DROP POLICY IF EXISTS agency_rls ON agency;
DROP POLICY IF EXISTS agency_via_user ON agency;

-- Users can access their own agency
CREATE POLICY agency_via_user ON agency
    FOR ALL
    USING (
        id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 3: CLIENT TABLE RLS (Member-scoped)
-- ============================================================================
DROP POLICY IF EXISTS client_rls ON client;
DROP POLICY IF EXISTS client_agency_via_user ON client;
DROP POLICY IF EXISTS client_agency_read ON client;
DROP POLICY IF EXISTS client_member_scoped_select ON client;
DROP POLICY IF EXISTS client_member_scoped_insert ON client;
DROP POLICY IF EXISTS client_member_scoped_update ON client;
DROP POLICY IF EXISTS client_member_scoped_delete ON client;

-- SELECT: Member-scoped (Owners/Admins/Managers see all, Members see assigned only)
CREATE POLICY client_member_scoped_select ON client
FOR SELECT
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND (
        -- Owners, Admins, Managers see ALL clients (hierarchy_level <= 3)
        EXISTS (
            SELECT 1 FROM "user" u
            JOIN role r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND u.agency_id = client.agency_id
            AND r.hierarchy_level <= 3
        )
        OR
        -- Members see ONLY assigned clients
        EXISTS (
            SELECT 1 FROM member_client_access mca
            WHERE mca.user_id = auth.uid()
            AND mca.client_id = client.id
            AND mca.agency_id = client.agency_id
        )
    )
);

-- INSERT: Only users with clients:write or clients:manage permission
CREATE POLICY client_member_scoped_insert ON client
FOR INSERT
WITH CHECK (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM "user" u
        JOIN role r ON u.role_id = r.id
        JOIN role_permission rp ON rp.role_id = r.id
        JOIN permission p ON p.id = rp.permission_id
        WHERE u.id = auth.uid()
        AND u.agency_id = client.agency_id
        AND p.resource = 'clients'
        AND p.action IN ('write', 'manage')
    )
);

-- UPDATE: Members with write access + higher roles with clients:write/manage
CREATE POLICY client_member_scoped_update ON client
FOR UPDATE
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND (
        EXISTS (
            SELECT 1 FROM "user" u
            JOIN role r ON u.role_id = r.id
            JOIN role_permission rp ON rp.role_id = r.id
            JOIN permission p ON p.id = rp.permission_id
            WHERE u.id = auth.uid()
            AND u.agency_id = client.agency_id
            AND p.resource = 'clients'
            AND p.action IN ('write', 'manage')
        )
        OR
        EXISTS (
            SELECT 1 FROM member_client_access mca
            WHERE mca.user_id = auth.uid()
            AND mca.client_id = client.id
            AND mca.agency_id = client.agency_id
            AND mca.permission = 'write'
        )
    )
);

-- DELETE: Only users with clients:manage
CREATE POLICY client_member_scoped_delete ON client
FOR DELETE
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM "user" u
        JOIN role r ON u.role_id = r.id
        JOIN role_permission rp ON rp.role_id = r.id
        JOIN permission p ON p.id = rp.permission_id
        WHERE u.id = auth.uid()
        AND u.agency_id = client.agency_id
        AND p.resource = 'clients'
        AND p.action = 'manage'
    )
);

-- ============================================================================
-- STEP 4: CLIENT_ASSIGNMENT TABLE RLS
-- ============================================================================
DROP POLICY IF EXISTS client_assignment_rls ON client_assignment;
DROP POLICY IF EXISTS client_assignment_agency_via_user ON client_assignment;

CREATE POLICY client_assignment_agency_via_user ON client_assignment
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 5: COMMUNICATION TABLE RLS (Member-scoped via client)
-- ============================================================================
DROP POLICY IF EXISTS communication_rls ON communication;
DROP POLICY IF EXISTS communication_agency_via_user ON communication;
DROP POLICY IF EXISTS communication_member_scoped_select ON communication;
DROP POLICY IF EXISTS communication_member_scoped_insert ON communication;
DROP POLICY IF EXISTS communication_member_scoped_update ON communication;
DROP POLICY IF EXISTS communication_member_scoped_delete ON communication;

CREATE POLICY communication_member_scoped_select ON communication
FOR SELECT
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND (
        EXISTS (
            SELECT 1 FROM "user" u
            JOIN role r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND u.agency_id = communication.agency_id
            AND r.hierarchy_level <= 3
        )
        OR
        EXISTS (
            SELECT 1 FROM member_client_access mca
            WHERE mca.user_id = auth.uid()
            AND mca.client_id = communication.client_id
            AND mca.agency_id = communication.agency_id
        )
    )
);

CREATE POLICY communication_member_scoped_insert ON communication
FOR INSERT
WITH CHECK (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND (
        EXISTS (
            SELECT 1 FROM "user" u
            JOIN role r ON u.role_id = r.id
            JOIN role_permission rp ON rp.role_id = r.id
            JOIN permission p ON p.id = rp.permission_id
            WHERE u.id = auth.uid()
            AND u.agency_id = communication.agency_id
            AND p.resource = 'communications'
            AND p.action IN ('write', 'manage')
        )
        OR
        EXISTS (
            SELECT 1 FROM member_client_access mca
            WHERE mca.user_id = auth.uid()
            AND mca.client_id = communication.client_id
            AND mca.agency_id = communication.agency_id
            AND mca.permission = 'write'
        )
    )
);

CREATE POLICY communication_member_scoped_update ON communication
FOR UPDATE
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND (
        EXISTS (
            SELECT 1 FROM "user" u
            JOIN role r ON u.role_id = r.id
            JOIN role_permission rp ON rp.role_id = r.id
            JOIN permission p ON p.id = rp.permission_id
            WHERE u.id = auth.uid()
            AND u.agency_id = communication.agency_id
            AND p.resource = 'communications'
            AND p.action IN ('write', 'manage')
        )
        OR
        EXISTS (
            SELECT 1 FROM member_client_access mca
            WHERE mca.user_id = auth.uid()
            AND mca.client_id = communication.client_id
            AND mca.agency_id = communication.agency_id
            AND mca.permission = 'write'
        )
    )
);

CREATE POLICY communication_member_scoped_delete ON communication
FOR DELETE
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM "user" u
        JOIN role r ON u.role_id = r.id
        JOIN role_permission rp ON rp.role_id = r.id
        JOIN permission p ON p.id = rp.permission_id
        WHERE u.id = auth.uid()
        AND u.agency_id = communication.agency_id
        AND p.resource = 'communications'
        AND p.action = 'manage'
    )
);

-- ============================================================================
-- STEP 6: TICKET TABLE RLS (Member-scoped via client)
-- ============================================================================
DROP POLICY IF EXISTS ticket_rls ON ticket;
DROP POLICY IF EXISTS ticket_agency_via_user ON ticket;
DROP POLICY IF EXISTS ticket_member_scoped_select ON ticket;
DROP POLICY IF EXISTS ticket_member_scoped_insert ON ticket;
DROP POLICY IF EXISTS ticket_member_scoped_update ON ticket;
DROP POLICY IF EXISTS ticket_member_scoped_delete ON ticket;

CREATE POLICY ticket_member_scoped_select ON ticket
FOR SELECT
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND (
        EXISTS (
            SELECT 1 FROM "user" u
            JOIN role r ON u.role_id = r.id
            WHERE u.id = auth.uid()
            AND u.agency_id = ticket.agency_id
            AND r.hierarchy_level <= 3
        )
        OR
        EXISTS (
            SELECT 1 FROM member_client_access mca
            WHERE mca.user_id = auth.uid()
            AND mca.client_id = ticket.client_id
            AND mca.agency_id = ticket.agency_id
        )
    )
);

CREATE POLICY ticket_member_scoped_insert ON ticket
FOR INSERT
WITH CHECK (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND (
        EXISTS (
            SELECT 1 FROM "user" u
            JOIN role r ON u.role_id = r.id
            JOIN role_permission rp ON rp.role_id = r.id
            JOIN permission p ON p.id = rp.permission_id
            WHERE u.id = auth.uid()
            AND u.agency_id = ticket.agency_id
            AND p.resource = 'tickets'
            AND p.action IN ('write', 'manage')
        )
        OR
        EXISTS (
            SELECT 1 FROM member_client_access mca
            WHERE mca.user_id = auth.uid()
            AND mca.client_id = ticket.client_id
            AND mca.agency_id = ticket.agency_id
            AND mca.permission = 'write'
        )
    )
);

CREATE POLICY ticket_member_scoped_update ON ticket
FOR UPDATE
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND (
        EXISTS (
            SELECT 1 FROM "user" u
            JOIN role r ON u.role_id = r.id
            JOIN role_permission rp ON rp.role_id = r.id
            JOIN permission p ON p.id = rp.permission_id
            WHERE u.id = auth.uid()
            AND u.agency_id = ticket.agency_id
            AND p.resource = 'tickets'
            AND p.action IN ('write', 'manage')
        )
        OR
        EXISTS (
            SELECT 1 FROM member_client_access mca
            WHERE mca.user_id = auth.uid()
            AND mca.client_id = ticket.client_id
            AND mca.agency_id = ticket.agency_id
            AND mca.permission = 'write'
        )
    )
);

CREATE POLICY ticket_member_scoped_delete ON ticket
FOR DELETE
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM "user" u
        JOIN role r ON u.role_id = r.id
        JOIN role_permission rp ON rp.role_id = r.id
        JOIN permission p ON p.id = rp.permission_id
        WHERE u.id = auth.uid()
        AND u.agency_id = ticket.agency_id
        AND p.resource = 'tickets'
        AND p.action = 'manage'
    )
);

-- ============================================================================
-- STEP 7: STAGE_EVENT TABLE RLS
-- ============================================================================
DROP POLICY IF EXISTS stage_event_rls ON stage_event;
DROP POLICY IF EXISTS stage_event_agency_via_user ON stage_event;

CREATE POLICY stage_event_agency_via_user ON stage_event
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 8: TASK TABLE RLS
-- ============================================================================
DROP POLICY IF EXISTS task_rls ON task;
DROP POLICY IF EXISTS task_agency_via_user ON task;

CREATE POLICY task_agency_via_user ON task
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 9: INTEGRATION TABLE RLS
-- ============================================================================
DROP POLICY IF EXISTS integration_rls ON integration;
DROP POLICY IF EXISTS integration_agency_via_user ON integration;

CREATE POLICY integration_agency_via_user ON integration
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- STEP 10: ROLE TABLE RLS
-- ============================================================================
DROP POLICY IF EXISTS role_rls ON role;

-- Keep existing or create correct policy
CREATE POLICY IF NOT EXISTS role_rls ON role
FOR ALL
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
);

-- ============================================================================
-- STEP 11: ROLE_PERMISSION TABLE RLS
-- ============================================================================
DROP POLICY IF EXISTS role_permission_rls ON role_permission;

CREATE POLICY IF NOT EXISTS role_permission_rls ON role_permission
FOR ALL
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
);

-- ============================================================================
-- STEP 12: MEMBER_CLIENT_ACCESS TABLE RLS
-- ============================================================================
DROP POLICY IF EXISTS member_access_rls ON member_client_access;

CREATE POLICY IF NOT EXISTS member_access_rls ON member_client_access
FOR ALL
USING (
    agency_id IN (
        SELECT agency_id FROM "user" WHERE id = auth.uid()
    )
);

-- ============================================================================
-- STEP 13: OTHER TABLES (alert, workflow, kb_document, etc.)
-- ============================================================================

-- Alert table
DROP POLICY IF EXISTS alert_rls ON alert;
CREATE POLICY IF NOT EXISTS alert_agency_via_user ON alert
    FOR ALL
    USING (
        agency_id IN (
            SELECT agency_id FROM "user" WHERE id = auth.uid()
        )
    );

-- Workflow table (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'workflow' AND schemaname = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS workflow_rls ON workflow';
        BEGIN
            EXECUTE 'CREATE POLICY workflow_agency_via_user ON workflow FOR ALL USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()))';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- KB Document table (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'kb_document' AND schemaname = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS kb_document_rls ON kb_document';
        BEGIN
            EXECUTE 'CREATE POLICY kb_document_agency_via_user ON kb_document FOR ALL USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()))';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- Activity Log table (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'activity_log' AND schemaname = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS activity_log_rls ON activity_log';
        BEGIN
            EXECUTE 'CREATE POLICY activity_log_agency_via_user ON activity_log FOR ALL USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()))';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- Ad Performance table (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ad_performance' AND schemaname = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS ad_performance_rls ON ad_performance';
        BEGIN
            EXECUTE 'CREATE POLICY ad_performance_agency_via_user ON ad_performance FOR ALL USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()))';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query after the migration to verify all policies are correct:

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- EXPECTED RESULT (key tables):
-- ============================================================================
-- user          | user_self_read              | SELECT
-- user          | user_agency_access          | SELECT
-- user          | user_self_update            | UPDATE
-- agency        | agency_via_user             | ALL
-- client        | client_member_scoped_select | SELECT
-- client        | client_member_scoped_insert | INSERT
-- client        | client_member_scoped_update | UPDATE
-- client        | client_member_scoped_delete | DELETE
-- client_assignment | client_assignment_agency_via_user | ALL
-- communication | communication_member_scoped_*  | SELECT/INSERT/UPDATE/DELETE
-- ticket        | ticket_member_scoped_*         | SELECT/INSERT/UPDATE/DELETE
-- stage_event   | stage_event_agency_via_user    | ALL
-- task          | task_agency_via_user           | ALL
-- integration   | integration_agency_via_user    | ALL
-- role          | role_rls                       | ALL
-- role_permission | role_permission_rls          | ALL
-- member_client_access | member_access_rls       | ALL
-- ============================================================================
