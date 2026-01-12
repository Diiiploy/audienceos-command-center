-- ============================================================================
-- Migration: Fix RLS Policy Conflict
-- Date: 2026-01-12
-- Issue: Duplicate SELECT policies on client table caused member-scoped filtering to be bypassed
-- ============================================================================

-- Problem:
-- The client table had TWO SELECT policies:
--   1. client_agency_read (old): Allows all agency members to see all agency clients
--   2. client_member_scoped_select (new): Filters clients based on member_client_access
--
-- PostgreSQL RLS combines multiple SELECT policies with OR logic, so the old
-- permissive policy bypassed the new restrictive policy.
--
-- Bug discovered during E2E testing on 2026-01-12:
--   - Member user (hierarchy_level=4) assigned to 3 clients
--   - Member could see all 20 clients instead of just 3
--   - Root cause: old client_agency_read policy was still active

-- Fix: Drop old conflicting policies that bypass member-scoped filtering

-- 1. Drop old client SELECT policy (allows all agency members)
DROP POLICY IF EXISTS client_agency_read ON client;

-- 2. Drop old communication policy (if exists - may conflict with member-scoped policies)
DROP POLICY IF EXISTS communication_rls ON communication;

-- 3. Drop old ticket policy (if exists - may conflict with member-scoped policies)
DROP POLICY IF EXISTS ticket_agency_via_user ON ticket;

-- ============================================================================
-- Verification: After running this migration, only member-scoped policies should remain
-- ============================================================================
-- Run this query to verify correct policies are in place:
--
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('client', 'communication', 'ticket')
-- ORDER BY tablename, cmd, policyname;
--
-- Expected result for client table:
-- - client_member_scoped_select (SELECT)
-- - client_member_scoped_insert (INSERT)
-- - client_member_scoped_update (UPDATE)
-- - client_member_scoped_delete (DELETE)
-- ============================================================================

-- Note: The member-scoped policies use this logic:
-- - Users with hierarchy_level <= 3 (Owner, Admin, Manager) see all agency clients
-- - Users with hierarchy_level = 4 (Member) only see clients in member_client_access table
