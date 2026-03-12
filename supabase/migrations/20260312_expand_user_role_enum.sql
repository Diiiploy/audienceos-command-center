-- Expand user_role enum to match RBAC role table values
-- The enum originally only had 'admin' and 'user', but the RBAC system
-- introduced 'owner', 'manager', and 'member' via the role table.
-- The user_invitations.role column uses this enum, so it needs all values.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'member';
