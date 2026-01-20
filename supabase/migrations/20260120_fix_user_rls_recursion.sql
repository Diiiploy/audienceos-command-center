-- ============================================================================
-- Migration: Fix User RLS Infinite Recursion
-- Date: 2026-01-20
-- Issue: user_same_agency and user_agency_read policies query "user" table
--        while being policies ON the "user" table = infinite recursion
-- ============================================================================

-- Problem:
-- When any query touches the "user" table, RLS policies fire.
-- The user_same_agency policy does: SELECT agency_id FROM "user" WHERE id = auth.uid()
-- This query ALSO triggers RLS on "user", which fires the same policy again = infinite loop
--
-- Error: "infinite recursion detected in policy for relation \"user\""

-- Fix: Use auth.jwt() to get agency_id without querying the user table

-- Step 1: Drop problematic policies
DROP POLICY IF EXISTS user_same_agency ON "user";
DROP POLICY IF EXISTS user_agency_read ON "user";
DROP POLICY IF EXISTS user_rls ON "user";

-- Step 2: Create safe policies that don't query "user" table

-- Policy 1: Users can always read their own record
CREATE POLICY user_self_read ON "user"
    FOR SELECT
    USING (id = auth.uid());

-- Policy 2: Users can read other users in their agency
-- Uses auth.jwt() instead of querying the user table
CREATE POLICY user_agency_access ON "user"
    FOR SELECT
    USING (
        agency_id = (
            -- Get agency_id from JWT claims, not from user table
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

-- Policy 4: Admins/Owners can manage users in their agency (for INSERT/DELETE)
-- This needs service_role for now since we can't safely check hierarchy without recursion
-- INSERT/DELETE operations should go through API routes with service_role

-- ============================================================================
-- Verification: Run this query to check policies
-- ============================================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'user';
--
-- Expected: user_self_read, user_agency_access, user_self_update
-- ============================================================================
