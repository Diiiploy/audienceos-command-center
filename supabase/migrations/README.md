# Supabase Migrations

This directory contains database migrations for the AudienceOS Command Center.

## Multi-Org Roles (RBAC) - 2026-01-06

### Overview

Implements role-based access control (RBAC) with:
- 4 system roles (Owner, Admin, Manager, Member)
- Custom role creation support
- Granular permissions (48 total: 12 resources × 4 actions)
- Client-level access control for Members
- Permission inheritance and hierarchy

**Spec:** `features/multi-org-roles.md`

### Migration Files

| File | Purpose |
|------|---------|
| `20260106_multi_org_roles.sql` | Schema migration (tables, indexes, RLS, functions) |
| `20260106_seed_rbac_data.sql` | Data seeding (permissions, roles, user migration) |

### What Gets Created

#### Database Schema

**New Tables:**
- `permission` - 48 system-wide permission definitions
- `role` - Agency-specific roles (system + custom)
- `role_permission` - Many-to-many: roles ↔ permissions
- `member_client_access` - Client-level access for Members

**User Table Changes:**
- Added `role_id` UUID → references role table
- Added `is_owner` BOOLEAN → identifies agency owner
- Old `role` enum column preserved for safety (can be dropped later)

**New Enums:**
- `resource_type` - clients, communications, tickets, etc.
- `permission_action` - read, write, delete, manage
- `client_access_permission` - read, write (for Members)

**Indexes:**
- 15 indexes for optimal permission lookup performance

**RLS Policies:**
- All new tables have tenant-scoped RLS
- Helper functions: `has_permission()`, `get_user_permissions()`

#### Data Seeding

**Permissions (48 total):**
```
12 resources × 4 actions:
- clients, communications, tickets, knowledge-base
- automations, settings, users, billing
- roles, integrations, analytics, ai-features

× read, write, delete, manage
```

**System Roles (4 per agency):**
- **Owner** (hierarchy 1) - Full access, cannot be removed
- **Admin** (hierarchy 2) - Full access except billing
- **Manager** (hierarchy 3) - Client management, read-only settings
- **Member** (hierarchy 4) - Read-only + assigned clients

**Role Permissions:**
- Default permissions assigned based on permission matrix
- Owner: `manage` on everything
- Admin: `manage` on most (read billing)
- Manager: `write` on clients/comms/tickets, `read` on rest
- Member: `read` on clients/comms/tickets (further restricted by assignments)

### User Migration Strategy

The migration automatically converts existing users:

1. **Map old roles:**
   - Old `role = 'admin'` → `Admin` role
   - Old `role = 'user'` → `Member` role

2. **Identify owners:**
   - First admin per agency (prioritizing @diiiploy.io emails)
   - Sets `is_owner = TRUE` and assigns `Owner` role

3. **Safety:**
   - Old `role` enum column preserved (not dropped)
   - All users get a `role_id` assignment
   - Validation queries run after migration

### How to Apply

#### Option 1: Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /Users/rodericandrews/_PAI/projects/command_center_audience_OS

# Apply migrations in order
supabase db push

# Or run manually:
psql -h <host> -U postgres -d postgres -f supabase/migrations/20260106_multi_org_roles.sql
psql -h <host> -U postgres -d postgres -f supabase/migrations/20260106_seed_rbac_data.sql
```

#### Option 2: Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select project: `qzkirjjrcblkqvhvalue` (AudienceOS)
3. Go to SQL Editor
4. Copy/paste `20260106_multi_org_roles.sql` → Run
5. Copy/paste `20260106_seed_rbac_data.sql` → Run

### Validation

After migration, check the logs for validation output:

```
NOTICE:  Permissions seeded: 48
NOTICE:  Agencies: 1, System roles: 4
NOTICE:  Total users: 12, Migrated: 12, Owners: 1
```

**Expected results:**
- 48 permissions created
- 4 system roles per agency
- All users have `role_id` assigned
- One owner per agency

### Testing Queries

```sql
-- Check permission count
SELECT COUNT(*) FROM permission; -- Should be 48

-- Check roles per agency
SELECT a.name AS agency, COUNT(r.*) AS role_count
FROM agency a
LEFT JOIN role r ON r.agency_id = a.id
WHERE r.is_system = TRUE
GROUP BY a.id, a.name;
-- Should show 4 roles per agency

-- Check users migrated
SELECT
  COUNT(*) AS total_users,
  COUNT(role_id) AS migrated_users,
  COUNT(CASE WHEN is_owner THEN 1 END) AS owner_count
FROM "user";

-- Check role permission assignments
SELECT r.name, COUNT(rp.*) AS permission_count
FROM role r
LEFT JOIN role_permission rp ON rp.role_id = r.id
WHERE r.agency_id = '11111111-1111-1111-1111-111111111111'
GROUP BY r.id, r.name
ORDER BY r.hierarchy_level;

-- Test has_permission function
SELECT has_permission(
  '<user-id>'::UUID,
  'clients'::resource_type,
  'read'::permission_action
); -- Should return TRUE if user can read clients
```

### Rollback (If Needed)

⚠️ **Use with caution** - only if migration fails mid-way

```sql
-- Drop new tables
DROP TABLE IF EXISTS member_client_access CASCADE;
DROP TABLE IF EXISTS role_permission CASCADE;
DROP TABLE IF EXISTS role CASCADE;
DROP TABLE IF EXISTS permission CASCADE;

-- Drop new columns from user
ALTER TABLE "user" DROP COLUMN IF EXISTS role_id;
ALTER TABLE "user" DROP COLUMN IF EXISTS is_owner;

-- Drop enums
DROP TYPE IF EXISTS resource_type CASCADE;
DROP TYPE IF EXISTS permission_action CASCADE;
DROP TYPE IF EXISTS client_access_permission CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS has_permission(UUID, resource_type, permission_action);
DROP FUNCTION IF EXISTS get_user_permissions(UUID);
DROP FUNCTION IF EXISTS update_role_timestamp();
```

### Next Steps

After applying migrations:

1. ✅ Test permission checks via API
2. ✅ Verify RLS policies with different user roles
3. ✅ Implement API middleware (TASK-011)
4. ✅ Build frontend role management UI (TASK-031-035)
5. (Optional) Drop old `user.role` column after validation

---

## Notes

- **Old role column preserved:** The original `user.role` enum is not dropped for safety. You can drop it after validating the migration works correctly.
- **Agency-scoped:** All roles and permissions are tenant-scoped via `agency_id`.
- **Performance:** 15 indexes ensure fast permission lookups.
- **Security:** RLS policies enforce tenant isolation automatically.

---

*Created: 2026-01-06*
*Feature: Multi-Org Roles (RBAC)*
*Spec: features/multi-org-roles.md*
