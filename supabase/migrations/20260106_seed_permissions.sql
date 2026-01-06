-- =====================================================================
-- Seed Permissions (TASK-005)
-- =====================================================================
-- Creates all 48 permissions (12 resources × 4 actions)
-- Feature: features/multi-org-roles.md
-- Date: 2026-01-06
-- =====================================================================

-- Note: Permissions are system-wide (not tenant-scoped)
-- They define what CAN be done, not who can do it

-- =====================================================================
-- CLIENTS Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('clients', 'read', 'View client list and details'),
  ('clients', 'write', 'Create and edit clients'),
  ('clients', 'delete', 'Archive or delete clients'),
  ('clients', 'manage', 'Full control over clients including bulk operations')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- COMMUNICATIONS Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('communications', 'read', 'View email and Slack messages'),
  ('communications', 'write', 'Send emails and Slack messages'),
  ('communications', 'delete', 'Delete communication threads'),
  ('communications', 'manage', 'Full control over communications including settings')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- TICKETS Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('tickets', 'read', 'View support tickets'),
  ('tickets', 'write', 'Create, edit, and assign tickets'),
  ('tickets', 'delete', 'Close or delete tickets'),
  ('tickets', 'manage', 'Full control over tickets including workflows')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- KNOWLEDGE-BASE Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('knowledge-base', 'read', 'View knowledge base documents'),
  ('knowledge-base', 'write', 'Create and edit documents'),
  ('knowledge-base', 'delete', 'Delete documents'),
  ('knowledge-base', 'manage', 'Full control over knowledge base including organization')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- AUTOMATIONS Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('automations', 'read', 'View workflow automations'),
  ('automations', 'write', 'Create and edit workflows'),
  ('automations', 'delete', 'Delete workflows'),
  ('automations', 'manage', 'Full control over automations including execution')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- SETTINGS Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('settings', 'read', 'View agency settings'),
  ('settings', 'write', 'Edit agency settings'),
  ('settings', 'delete', 'Remove settings configurations'),
  ('settings', 'manage', 'Full control over all agency settings')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- USERS Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('users', 'read', 'View team members and their roles'),
  ('users', 'write', 'Invite and edit team members'),
  ('users', 'delete', 'Remove team members'),
  ('users', 'manage', 'Full control over users including role assignment')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- BILLING Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('billing', 'read', 'View billing information and invoices'),
  ('billing', 'write', 'Update billing details and payment methods'),
  ('billing', 'delete', 'Cancel subscriptions'),
  ('billing', 'manage', 'Full control over billing including plan changes')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- ROLES Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('roles', 'read', 'View roles and their permissions'),
  ('roles', 'write', 'Create and edit custom roles'),
  ('roles', 'delete', 'Delete custom roles'),
  ('roles', 'manage', 'Full control over role system including system roles')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- INTEGRATIONS Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('integrations', 'read', 'View connected integrations'),
  ('integrations', 'write', 'Connect and configure integrations'),
  ('integrations', 'delete', 'Disconnect integrations'),
  ('integrations', 'manage', 'Full control over integrations including OAuth')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- ANALYTICS Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('analytics', 'read', 'View analytics and reports'),
  ('analytics', 'write', 'Create custom reports and dashboards'),
  ('analytics', 'delete', 'Delete custom reports'),
  ('analytics', 'manage', 'Full control over analytics including exports')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- AI-FEATURES Permissions
-- =====================================================================

INSERT INTO permission (resource, action, description) VALUES
  ('ai-features', 'read', 'View AI features and chat history'),
  ('ai-features', 'write', 'Use AI features and chat'),
  ('ai-features', 'delete', 'Delete AI chat history'),
  ('ai-features', 'manage', 'Full control over AI features including training data')
ON CONFLICT (resource, action) DO NOTHING;

-- =====================================================================
-- Verification Query
-- =====================================================================
-- Run this to verify all 48 permissions exist:
-- SELECT resource, COUNT(*) as action_count
-- FROM permission
-- GROUP BY resource
-- ORDER BY resource;
--
-- Expected: 12 rows with count = 4 each
