-- ============================================================================
-- Migration: 009_rbac_schema.sql
-- Purpose: Create RBAC (Role-Based Access Control) system tables
-- Date: 2026-01-08
-- Phase: Multi-Org Roles Implementation - Phase 1: Database & RLS
-- ============================================================================

-- 1. Create role table (4 system roles)
CREATE TABLE role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  hierarchy_level INTEGER NOT NULL CHECK (hierarchy_level BETWEEN 1 AND 4),
  description TEXT,
  is_system_role BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create permission table (resource × action matrix)
CREATE TABLE permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, resource, action)
);

-- 3. Create user_role table (user role assignments per agency)
CREATE TABLE user_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, agency_id)
);

-- 4. Create member_client_access table (client-scoped access for Members)
CREATE TABLE member_client_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, client_id)
);

-- 5. Create audit_log table (complete access trail)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  resource VARCHAR(50),
  resource_id UUID,
  permission_action VARCHAR(50),
  result VARCHAR(20) NOT NULL CHECK (result IN ('allowed', 'denied')),
  reason TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Add columns to existing user table
-- ============================================================================

ALTER TABLE "user" ADD COLUMN role_id UUID REFERENCES role(id) ON DELETE SET NULL;
ALTER TABLE "user" ADD COLUMN is_owner BOOLEAN DEFAULT false;

-- ============================================================================
-- Seed system roles (4 roles with hierarchy)
-- ============================================================================

INSERT INTO role (id, name, display_name, hierarchy_level, description, is_system_role) VALUES
('role_owner', 'owner', 'Owner', 1, 'Full agency control and administration', true),
('role_admin', 'admin', 'Admin', 2, 'Administrative access without billing', true),
('role_manager', 'manager', 'Manager', 3, 'Client management and team oversight', true),
('role_member', 'member', 'Member', 4, 'Client-scoped access to assigned accounts', true);

-- ============================================================================
-- Seed permissions (24 total: 8 resources × 3 actions)
-- Resources: clients, settings, users, roles, team_members, documents, workflows, tickets
-- Actions per resource: read, write, manage
-- ============================================================================

-- Owner (role_owner): All permissions (24)
INSERT INTO permission (role_id, resource, action) VALUES
('role_owner', 'clients', 'read'),
('role_owner', 'clients', 'write'),
('role_owner', 'clients', 'manage'),
('role_owner', 'settings', 'read'),
('role_owner', 'settings', 'write'),
('role_owner', 'settings', 'manage'),
('role_owner', 'users', 'read'),
('role_owner', 'users', 'write'),
('role_owner', 'users', 'manage'),
('role_owner', 'roles', 'read'),
('role_owner', 'roles', 'write'),
('role_owner', 'roles', 'manage'),
('role_owner', 'team_members', 'read'),
('role_owner', 'team_members', 'write'),
('role_owner', 'team_members', 'manage'),
('role_owner', 'documents', 'read'),
('role_owner', 'documents', 'write'),
('role_owner', 'documents', 'manage'),
('role_owner', 'workflows', 'read'),
('role_owner', 'workflows', 'write'),
('role_owner', 'workflows', 'manage'),
('role_owner', 'tickets', 'read'),
('role_owner', 'tickets', 'write'),
('role_owner', 'tickets', 'manage');

-- Admin (role_admin): All except role management (21)
INSERT INTO permission (role_id, resource, action) VALUES
('role_admin', 'clients', 'read'),
('role_admin', 'clients', 'write'),
('role_admin', 'clients', 'manage'),
('role_admin', 'settings', 'read'),
('role_admin', 'settings', 'write'),
('role_admin', 'settings', 'manage'),
('role_admin', 'users', 'read'),
('role_admin', 'users', 'write'),
('role_admin', 'users', 'manage'),
('role_admin', 'team_members', 'read'),
('role_admin', 'team_members', 'write'),
('role_admin', 'team_members', 'manage'),
('role_admin', 'documents', 'read'),
('role_admin', 'documents', 'write'),
('role_admin', 'documents', 'manage'),
('role_admin', 'workflows', 'read'),
('role_admin', 'workflows', 'write'),
('role_admin', 'workflows', 'manage'),
('role_admin', 'tickets', 'read'),
('role_admin', 'tickets', 'write'),
('role_admin', 'tickets', 'manage');

-- Manager (role_manager): Client/team focus (12)
INSERT INTO permission (role_id, resource, action) VALUES
('role_manager', 'clients', 'read'),
('role_manager', 'clients', 'write'),
('role_manager', 'team_members', 'read'),
('role_manager', 'team_members', 'write'),
('role_manager', 'documents', 'read'),
('role_manager', 'documents', 'write'),
('role_manager', 'workflows', 'read'),
('role_manager', 'workflows', 'write'),
('role_manager', 'tickets', 'read'),
('role_manager', 'tickets', 'write'),
('role_manager', 'settings', 'read'),
('role_manager', 'users', 'read');

-- Member (role_member): Read-only client-scoped (4)
INSERT INTO permission (role_id, resource, action) VALUES
('role_member', 'clients', 'read'),
('role_member', 'documents', 'read'),
('role_member', 'workflows', 'read'),
('role_member', 'tickets', 'read');

-- Owner (role_owner): Cartridge permissions (3)
INSERT INTO permission (role_id, resource, action) VALUES
('role_owner', 'cartridges', 'read'),
('role_owner', 'cartridges', 'write'),
('role_owner', 'cartridges', 'manage');

-- Admin (role_admin): Cartridge permissions (3)
INSERT INTO permission (role_id, resource, action) VALUES
('role_admin', 'cartridges', 'read'),
('role_admin', 'cartridges', 'write'),
('role_admin', 'cartridges', 'manage');

-- Manager (role_manager): Cartridge read-only (1)
INSERT INTO permission (role_id, resource, action) VALUES
('role_manager', 'cartridges', 'read');

-- Member (role_member): Cartridge read-only (1)
INSERT INTO permission (role_id, resource, action) VALUES
('role_member', 'cartridges', 'read');

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

-- Permission lookups
CREATE INDEX idx_permission_role_resource ON permission(role_id, resource, action);

-- User role lookups (most critical path)
CREATE INDEX idx_user_role_lookup ON user_role(user_id, agency_id) WHERE is_active = true;
CREATE INDEX idx_user_role_by_agency ON user_role(agency_id, is_active);

-- Member client access (critical for member queries)
CREATE INDEX idx_member_client_access ON member_client_access(user_id, client_id) WHERE is_active = true;
CREATE INDEX idx_member_client_by_user ON member_client_access(user_id, is_active);
CREATE INDEX idx_member_client_by_client ON member_client_access(client_id, is_active);

-- Audit log queries
CREATE INDEX idx_audit_log_agency_time ON audit_log(agency_id, timestamp DESC);
CREATE INDEX idx_audit_log_user_time ON audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_log_result ON audit_log(result, timestamp DESC);

-- ============================================================================
-- Enable Row-Level Security
-- ============================================================================

ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_client_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies - role table (public read, no write)
-- ============================================================================

CREATE POLICY "role_read" ON role
FOR SELECT
USING (true);  -- All authenticated users can read roles

-- ============================================================================
-- RLS Policies - permission table (agency isolation)
-- ============================================================================

CREATE POLICY "permission_read" ON permission
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.is_active = true
  )
);

-- ============================================================================
-- RLS Policies - user_role table (agency isolation)
-- ============================================================================

CREATE POLICY "user_role_read" ON user_role
FOR SELECT
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "user_role_insert_admin" ON user_role
FOR INSERT
TO authenticated
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.role_id IN (
      SELECT id FROM role WHERE hierarchy_level <= 2  -- Owner or Admin
    )
    AND ur.is_active = true
  )
);

CREATE POLICY "user_role_update_admin" ON user_role
FOR UPDATE
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.role_id IN (
      SELECT id FROM role WHERE hierarchy_level <= 2  -- Owner or Admin
    )
    AND ur.is_active = true
  )
);

-- ============================================================================
-- RLS Policies - member_client_access table (agency isolation)
-- ============================================================================

CREATE POLICY "member_client_access_read" ON member_client_access
FOR SELECT
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

CREATE POLICY "member_client_access_insert_manager" ON member_client_access
FOR INSERT
TO authenticated
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.role_id IN (
      SELECT id FROM role WHERE hierarchy_level <= 3  -- Owner, Admin, or Manager
    )
    AND ur.is_active = true
  )
);

-- ============================================================================
-- RLS Policies - audit_log table (agency isolation, read-only)
-- ============================================================================

CREATE POLICY "audit_log_read" ON audit_log
FOR SELECT
TO authenticated
USING (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
  AND EXISTS (
    SELECT 1 FROM user_role ur
    WHERE ur.user_id = auth.uid()
    AND ur.agency_id = (auth.jwt() ->> 'agency_id')::uuid
    AND ur.role_id IN (
      SELECT id FROM role WHERE hierarchy_level <= 2  -- Owner or Admin
    )
    AND ur.is_active = true
  )
);

CREATE POLICY "audit_log_insert" ON audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  agency_id = (auth.jwt() ->> 'agency_id')::uuid
);

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT ON role TO anon, authenticated;
GRANT SELECT ON permission TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_role TO authenticated;
GRANT SELECT, INSERT, UPDATE ON member_client_access TO authenticated;
GRANT SELECT, INSERT ON audit_log TO authenticated;
