-- =====================================================================
-- Multi-Org Roles (RBAC) Migration - FIXED VERSION
-- =====================================================================
-- Feature: Role-based access control with granular permissions
-- Spec: features/multi-org-roles.md
-- Date: 2026-01-06
-- Fixed: Idempotent operations + user data migration
-- =====================================================================

-- =====================================================================
-- 1. CREATE ENUMS (Idempotent)
-- =====================================================================

-- Resource enum (all protected resources in the app)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_type') THEN
        CREATE TYPE resource_type AS ENUM (
          'clients',
          'communications',
          'tickets',
          'knowledge-base',
          'automations',
          'settings',
          'users',
          'billing',
          'roles',
          'integrations',
          'analytics',
          'ai-features'
        );
    END IF;
END $$;

-- Action enum (permission actions)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_action') THEN
        CREATE TYPE permission_action AS ENUM (
          'read',    -- View data
          'write',   -- Create/edit data
          'delete',  -- Remove data
          'manage'   -- Full control (includes all above + admin actions)
        );
    END IF;
END $$;

-- Client access permission enum (for Members)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_access_permission') THEN
        CREATE TYPE client_access_permission AS ENUM (
          'read',
          'write'
        );
    END IF;
END $$;

-- =====================================================================
-- 2. CREATE TABLES
-- =====================================================================

-- ---------------------------------------------------------------------
-- PERMISSION Table (System-wide permission definitions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource resource_type NOT NULL,
  action permission_action NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: each resource+action combination exists once
  CONSTRAINT permission_resource_action_unique UNIQUE (resource, action)
);

COMMENT ON TABLE permission IS 'System-wide permission definitions (not tenant-scoped)';
COMMENT ON COLUMN permission.resource IS 'Protected resource (clients, users, etc.)';
COMMENT ON COLUMN permission.action IS 'Permission action (read, write, delete, manage)';

-- ---------------------------------------------------------------------
-- ROLE Table (Agency-specific roles)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(200),
  is_system BOOLEAN NOT NULL DEFAULT FALSE, -- Built-in roles (Owner, Admin, Manager, Member)
  hierarchy_level INTEGER, -- 1=Owner, 2=Admin, 3=Manager, 4=Member, NULL=custom
  created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: role names unique per agency
  CONSTRAINT role_agency_name_unique UNIQUE (agency_id, name),

  -- Check constraints
  CONSTRAINT role_hierarchy_valid CHECK (hierarchy_level BETWEEN 1 AND 4 OR hierarchy_level IS NULL),
  CONSTRAINT role_system_hierarchy CHECK (
    (is_system = TRUE AND hierarchy_level IS NOT NULL) OR
    (is_system = FALSE AND hierarchy_level IS NULL)
  )
);

COMMENT ON TABLE role IS 'Agency-specific roles (both system and custom)';
COMMENT ON COLUMN role.is_system IS 'System roles (Owner, Admin, Manager, Member) cannot be deleted';
COMMENT ON COLUMN role.hierarchy_level IS 'Role level: 1=highest (Owner), 4=lowest (Member), NULL=custom';

-- ---------------------------------------------------------------------
-- ROLE_PERMISSION Table (Many-to-many: roles ↔ permissions)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE, -- Denormalized for RLS
  granted_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: each permission assigned once per role
  CONSTRAINT role_permission_unique UNIQUE (role_id, permission_id)
);

COMMENT ON TABLE role_permission IS 'Permissions assigned to roles';
COMMENT ON COLUMN role_permission.agency_id IS 'Denormalized from role for RLS performance';

-- ---------------------------------------------------------------------
-- MEMBER_CLIENT_ACCESS Table (Client-level access for Members)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_client_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  permission client_access_permission NOT NULL,
  assigned_by UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: each client assigned once per user
  CONSTRAINT member_client_access_unique UNIQUE (user_id, client_id)
);

COMMENT ON TABLE member_client_access IS 'Client-level access restrictions for Members';
COMMENT ON COLUMN member_client_access.permission IS 'read or write access to client';

-- =====================================================================
-- 3. USER TABLE MODIFICATIONS
-- =====================================================================

-- Add new columns to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES role(id) ON DELETE SET NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN "user".role_id IS 'User role (replaces old role enum)';
COMMENT ON COLUMN "user".is_owner IS 'Agency owner (immutable, one per agency)';

-- =====================================================================
-- 4. CREATE INDEXES
-- =====================================================================

-- Permission indexes
CREATE INDEX IF NOT EXISTS idx_permission_resource ON permission(resource);
CREATE INDEX IF NOT EXISTS idx_permission_action ON permission(action);

-- Role indexes
CREATE INDEX IF NOT EXISTS idx_role_agency ON role(agency_id);
CREATE INDEX IF NOT EXISTS idx_role_is_system ON role(is_system);
CREATE INDEX IF NOT EXISTS idx_role_hierarchy ON role(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_role_agency_system ON role(agency_id, is_system);

-- Role_permission indexes
CREATE INDEX IF NOT EXISTS idx_role_permission_role ON role_permission(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_permission ON role_permission(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_agency ON role_permission(agency_id);
CREATE INDEX IF NOT EXISTS idx_role_perm_lookup ON role_permission(role_id, permission_id);

-- Member_client_access indexes
CREATE INDEX IF NOT EXISTS idx_member_access_user ON member_client_access(user_id);
CREATE INDEX IF NOT EXISTS idx_member_access_client ON member_client_access(client_id);
CREATE INDEX IF NOT EXISTS idx_member_access_agency ON member_client_access(agency_id);
CREATE INDEX IF NOT EXISTS idx_member_access_user_client ON member_client_access(user_id, client_id);

-- User table indexes for RBAC
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role_id);
CREATE INDEX IF NOT EXISTS idx_user_is_owner ON "user"(is_owner);
CREATE INDEX IF NOT EXISTS idx_user_agency_owner ON "user"(agency_id, is_owner);

-- =====================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES (Idempotent)
-- =====================================================================

-- Enable RLS on new tables
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_client_access ENABLE ROW LEVEL SECURITY;

-- Note: permission table is system-wide, no RLS needed (read-only for all authenticated users)

-- ---------------------------------------------------------------------
-- RLS: ROLE table (Drop existing first)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS role_rls ON role;
CREATE POLICY role_rls ON role FOR ALL
USING (
  agency_id = (
    SELECT agency_id FROM "user"
    WHERE id = auth.uid()
  )
);

-- ---------------------------------------------------------------------
-- RLS: ROLE_PERMISSION table (Drop existing first)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS role_permission_rls ON role_permission;
CREATE POLICY role_permission_rls ON role_permission FOR ALL
USING (
  agency_id = (
    SELECT agency_id FROM "user"
    WHERE id = auth.uid()
  )
);

-- ---------------------------------------------------------------------
-- RLS: MEMBER_CLIENT_ACCESS table (Drop existing first)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS member_access_rls ON member_client_access;
CREATE POLICY member_access_rls ON member_client_access FOR ALL
USING (
  agency_id = (
    SELECT agency_id FROM "user"
    WHERE id = auth.uid()
  )
);

-- =====================================================================
-- 6. HELPER FUNCTIONS
-- =====================================================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_resource resource_type,
  p_action permission_action
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- Check if user's role has the permission
  SELECT EXISTS (
    SELECT 1
    FROM "user" u
    JOIN role r ON u.role_id = r.id
    JOIN role_permission rp ON rp.role_id = r.id
    JOIN permission p ON p.id = rp.permission_id
    WHERE u.id = p_user_id
    AND p.resource = p_resource
    AND (
      p.action = p_action
      OR p.action = 'manage' -- manage implies all actions
      OR (p_action = 'read' AND p.action = 'write') -- write implies read
    )
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_permission IS 'Check if user has specific permission (considers action hierarchy)';

-- Function to get user's effective permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  resource resource_type,
  action permission_action,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.resource,
    p.action,
    'role' AS source
  FROM "user" u
  JOIN role r ON u.role_id = r.id
  JOIN role_permission rp ON rp.role_id = r.id
  JOIN permission p ON p.id = rp.permission_id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_permissions IS 'Get all effective permissions for a user from their role';

-- =====================================================================
-- 7. TRIGGERS
-- =====================================================================

-- Update updated_at timestamp on role changes
CREATE OR REPLACE FUNCTION update_role_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS role_updated_at ON role;
CREATE TRIGGER role_updated_at
  BEFORE UPDATE ON role
  FOR EACH ROW
  EXECUTE FUNCTION update_role_timestamp();

-- =====================================================================
-- 8. SEED SYSTEM ROLES
-- =====================================================================

DO $$
DECLARE
  agency_record RECORD;
BEGIN
  -- Loop through all agencies
  FOR agency_record IN SELECT id FROM agency LOOP

    -- Owner role (hierarchy_level = 1)
    INSERT INTO role (
      agency_id,
      name,
      description,
      is_system,
      hierarchy_level
    ) VALUES (
      agency_record.id,
      'Owner',
      'Agency creator with full access. Cannot be removed or modified.',
      true,
      1
    ) ON CONFLICT (agency_id, name) DO NOTHING;

    -- Admin role (hierarchy_level = 2)
    INSERT INTO role (
      agency_id,
      name,
      description,
      is_system,
      hierarchy_level
    ) VALUES (
      agency_record.id,
      'Admin',
      'Full access to all features except billing modification. Can manage users and settings.',
      true,
      2
    ) ON CONFLICT (agency_id, name) DO NOTHING;

    -- Manager role (hierarchy_level = 3)
    INSERT INTO role (
      agency_id,
      name,
      description,
      is_system,
      hierarchy_level
    ) VALUES (
      agency_record.id,
      'Manager',
      'Can manage clients, communications, and tickets. No access to settings or user management.',
      true,
      3
    ) ON CONFLICT (agency_id, name) DO NOTHING;

    -- Member role (hierarchy_level = 4)
    INSERT INTO role (
      agency_id,
      name,
      description,
      is_system,
      hierarchy_level
    ) VALUES (
      agency_record.id,
      'Member',
      'Read-only access with write permissions for assigned clients only.',
      true,
      4
    ) ON CONFLICT (agency_id, name) DO NOTHING;

  END LOOP;

  RAISE NOTICE 'System roles seeded for all agencies';
END $$;

-- =====================================================================
-- 9. SEED PERMISSIONS
-- =====================================================================

-- CLIENTS Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('clients', 'read', 'View client list and details'),
  ('clients', 'write', 'Create and edit clients'),
  ('clients', 'delete', 'Archive or delete clients'),
  ('clients', 'manage', 'Full control over clients including bulk operations')
ON CONFLICT (resource, action) DO NOTHING;

-- COMMUNICATIONS Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('communications', 'read', 'View email and Slack messages'),
  ('communications', 'write', 'Send emails and Slack messages'),
  ('communications', 'delete', 'Delete communication threads'),
  ('communications', 'manage', 'Full control over communications including settings')
ON CONFLICT (resource, action) DO NOTHING;

-- TICKETS Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('tickets', 'read', 'View support tickets'),
  ('tickets', 'write', 'Create, edit, and assign tickets'),
  ('tickets', 'delete', 'Close or delete tickets'),
  ('tickets', 'manage', 'Full control over tickets including workflows')
ON CONFLICT (resource, action) DO NOTHING;

-- KNOWLEDGE-BASE Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('knowledge-base', 'read', 'View knowledge base documents'),
  ('knowledge-base', 'write', 'Create and edit documents'),
  ('knowledge-base', 'delete', 'Delete documents'),
  ('knowledge-base', 'manage', 'Full control over knowledge base including organization')
ON CONFLICT (resource, action) DO NOTHING;

-- AUTOMATIONS Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('automations', 'read', 'View workflow automations'),
  ('automations', 'write', 'Create and edit workflows'),
  ('automations', 'delete', 'Delete workflows'),
  ('automations', 'manage', 'Full control over automations including execution')
ON CONFLICT (resource, action) DO NOTHING;

-- SETTINGS Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('settings', 'read', 'View agency settings'),
  ('settings', 'write', 'Edit agency settings'),
  ('settings', 'delete', 'Remove settings configurations'),
  ('settings', 'manage', 'Full control over all agency settings')
ON CONFLICT (resource, action) DO NOTHING;

-- USERS Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('users', 'read', 'View team members and their roles'),
  ('users', 'write', 'Invite and edit team members'),
  ('users', 'delete', 'Remove team members'),
  ('users', 'manage', 'Full control over users including role assignment')
ON CONFLICT (resource, action) DO NOTHING;

-- BILLING Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('billing', 'read', 'View billing information and invoices'),
  ('billing', 'write', 'Update billing details and payment methods'),
  ('billing', 'delete', 'Cancel subscriptions'),
  ('billing', 'manage', 'Full control over billing including plan changes')
ON CONFLICT (resource, action) DO NOTHING;

-- ROLES Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('roles', 'read', 'View roles and their permissions'),
  ('roles', 'write', 'Create and edit custom roles'),
  ('roles', 'delete', 'Delete custom roles'),
  ('roles', 'manage', 'Full control over role system including system roles')
ON CONFLICT (resource, action) DO NOTHING;

-- INTEGRATIONS Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('integrations', 'read', 'View connected integrations'),
  ('integrations', 'write', 'Connect and configure integrations'),
  ('integrations', 'delete', 'Disconnect integrations'),
  ('integrations', 'manage', 'Full control over integrations including OAuth')
ON CONFLICT (resource, action) DO NOTHING;

-- ANALYTICS Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('analytics', 'read', 'View analytics and reports'),
  ('analytics', 'write', 'Create custom reports and dashboards'),
  ('analytics', 'delete', 'Delete custom reports'),
  ('analytics', 'manage', 'Full control over analytics including exports')
ON CONFLICT (resource, action) DO NOTHING;

-- AI-FEATURES Permissions
INSERT INTO permission (resource, action, description) VALUES
  ('ai-features', 'read', 'View AI features and chat history'),
  ('ai-features', 'write', 'Use AI features and chat'),
  ('ai-features', 'delete', 'Delete AI chat history'),
  ('ai-features', 'manage', 'Full control over AI features including training data')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- 10. USER DATA MIGRATION (NEW - FIXES BLOCKER 3)
-- =====================================================================

-- Assign all existing users to Admin role by default
UPDATE "user" u
SET role_id = r.id
FROM role r
WHERE r.agency_id = u.agency_id
AND r.name = 'Admin'
AND u.role_id IS NULL;

-- Set first user in each agency as Owner (by created_at timestamp)
UPDATE "user" u
SET role_id = r.id, is_owner = true
FROM role r
WHERE r.agency_id = u.agency_id
AND r.name = 'Owner'
AND u.id = (
  SELECT id FROM "user" u2
  WHERE u2.agency_id = u.agency_id
  ORDER BY created_at ASC
  LIMIT 1
)
AND NOT u.is_owner;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
