# DEFCON 1: AudienceOS "Failed to load clients" Investigation

**Date:** 2026-01-20
**Production URL:** https://v0-audience-os-command-center.vercel.app
**Production Supabase:** `qzkirjjrcblkqvhvalue` (command_center) - CONFIRMED BY USER
**Demo in:** < 1 hour
**Status:** ROOT CAUSE IDENTIFIED - READY TO FIX

---

## Executive Summary

**The API returns HTTP 403 Forbidden with error:**
```json
{
  "error": "Forbidden",
  "code": "PERMISSION_DENIED",
  "required": "clients:read",
  "message": "You do not have permission to read clients."
}
```

**User "Brent CEO" IS authenticated** (401 would mean auth failed) but **LACKS the `clients:read` permission** despite being labeled "Owner".

---

## Root Cause Analysis: 5 Potential Issues

### Issue #1: RBAC Seed Migration Not Applied (MOST LIKELY)

**Location:** `supabase/migrations/20260106_seed_rbac_data.sql`

The migration that creates:
- 48 permissions including `('clients', 'read', ...)`
- 4 system roles (Owner, Admin, Manager, Member) per agency
- `role_permission` records linking Owner to `manage` permissions

**If this migration wasn't applied to production:**
- `permission` table is empty → no permissions exist
- `role` table has no system roles → user has no role
- `role_permission` table is empty → even if role exists, it has no permissions

**Evidence:** Permission service query at `lib/rbac/permission-service.ts:86-111` fetches `user → role → role_permission → permission`. If any table is empty, user gets ZERO permissions.

### Issue #2: User Has `is_owner=true` But NULL `role_id`

**Location:** `lib/rbac/permission-service.ts:121-132`

```typescript
if (user.role?.role_permissions) {
  for (const rp of user.role.role_permissions) { ... }
}
```

**CRITICAL BUG:** If `user.role` is null (because `role_id` is NULL), the permission service returns an empty array. The `is_owner` flag is fetched but **NEVER USED** to grant permissions!

**Expected behavior:** Owners should get all permissions regardless of role_permission table state.

### Issue #3: RLS Blocking the Permission Lookup Query

**Location:** The complex join in `permission-service.ts:86-111`

```sql
SELECT user WITH role WITH role_permissions WITH permissions
```

If RLS policies on `role` or `role_permission` tables block access, the join returns incomplete data, resulting in empty permissions.

**Related:** There's a pending migration `supabase/migrations/20260120_fix_user_rls_recursion.sql` that fixes RLS infinite recursion - may not be applied.

### Issue #4: Wrong Supabase Project

**Evidence found:**
- **Local `.env.local`:** `qzkirjjrcblkqvhvalue` (audienceos-cc-fresh)
- **Vercel `.env.local.vercel`:** `qzkirjjrcblkqvhvalue` (command_center)
- **Session docs say:** "Use command_center, NOT qzkirjjrcblkqvhvalue"

If migrations were applied to one project but app points to another, the database state doesn't match expectations.

### Issue #5: Agency-Scoped Roles Not Created for This Agency

**Location:** `supabase/migrations/20260106_seed_rbac_data.sql:93-143`

The migration creates system roles FOR EACH EXISTING AGENCY at migration time. If:
- The agency was created AFTER the migration ran, OR
- The migration didn't complete successfully

Then this agency has NO ROLES, so users have no `role_id` to assign.

---

## Data Flow Trace (Why 403 Happens)

```
1. Frontend: fetch('/api/v1/clients', { credentials: 'include' })
   ↓
2. API Route: withPermission({ resource: 'clients', action: 'read' })
   File: app/api/v1/clients/route.ts:13
   ↓
3. Auth Check: authenticateUser() → SUCCESS (user is logged in)
   File: lib/rbac/with-permission.ts:124
   ↓
4. Permission Fetch: permissionService.getUserPermissions(userId, agencyId)
   File: lib/rbac/permission-service.ts:55-174
   ↓
5. Database Query: SELECT user JOIN role JOIN role_permission JOIN permission
   File: lib/rbac/permission-service.ts:86-111
   ↓
6. Result: user.role = null OR user.role.role_permissions = []
   → permissions array is EMPTY
   ↓
7. Permission Check: checkPermission([], 'clients', 'read') → FALSE
   File: lib/rbac/permission-service.ts:192-240
   ↓
8. Response: 403 { code: 'PERMISSION_DENIED', required: 'clients:read' }
   File: lib/rbac/with-permission.ts:179-187
```

---

## Diagnostic Queries to Run on Production Supabase

### Query 1: Check if permissions exist
```sql
SELECT COUNT(*) as count FROM permission;
-- Expected: 48 (12 resources × 4 actions)
-- If 0: Migration 20260106_seed_rbac_data.sql not applied
```

### Query 2: Check if system roles exist
```sql
SELECT COUNT(*) as count FROM role WHERE is_system = true;
-- Expected: 4 per agency (Owner, Admin, Manager, Member)
-- If 0: Roles not seeded
```

### Query 3: Check Brent CEO's user record
```sql
SELECT
  id, email, is_owner, role_id, agency_id,
  (SELECT name FROM role WHERE id = role_id) as role_name
FROM "user"
WHERE email ILIKE '%brent%' OR is_owner = true
LIMIT 5;
-- Check: Does Brent have role_id set? Is is_owner true?
```

### Query 4: Check role_permission records for Owner
```sql
SELECT r.name, p.resource, p.action
FROM role_permission rp
JOIN role r ON rp.role_id = r.id
JOIN permission p ON rp.permission_id = p.id
WHERE r.hierarchy_level = 1  -- Owner
LIMIT 20;
-- Expected: Owner should have ~12 rows (all 'manage' permissions)
-- If 0: role_permission not seeded
```

### Query 5: Check which Supabase project this is
```sql
SELECT current_database(), current_schema();
```

---

## Immediate Fix Options (Demo in < 1 hour)

### Option A: Run RBAC Seed Migration (5 min)
Apply `supabase/migrations/20260106_seed_rbac_data.sql` to production.

### Option B: Direct SQL Insert (2 min)
If Option A has issues, directly insert permission records for Brent:

```sql
-- Find Brent's user ID and agency
WITH brent AS (
  SELECT id, agency_id FROM "user" WHERE email ILIKE '%brent%' LIMIT 1
),
owner_role AS (
  SELECT r.id FROM role r, brent b WHERE r.agency_id = b.agency_id AND r.name = 'Owner'
)
UPDATE "user" SET role_id = (SELECT id FROM owner_role), is_owner = true
WHERE id = (SELECT id FROM brent);
```

### Option C: Bypass RBAC (Last Resort)
Temporarily modify `lib/rbac/with-permission.ts` to return true for `is_owner` users:

```typescript
// In authenticateUser() at line 97, add:
if (appUser.is_owner) {
  // Owner bypass - temporary fix
  return { success: true, ..., permissions: [{ resource: '*', action: 'manage', source: 'owner_bypass' }] };
}
```

**DO NOT deploy Option C without understanding the security implications.**

---

## Critical Files

| File | Purpose |
|------|---------|
| `lib/rbac/permission-service.ts` | Permission fetching and checking |
| `lib/rbac/with-permission.ts` | API middleware that returns 403 |
| `supabase/migrations/20260106_seed_rbac_data.sql` | Seeds permissions, roles, role_permission |
| `stores/pipeline-store.ts:131-172` | Frontend fetch that shows error |
| `app/page.tsx:446-458` | Error UI display |

---

## Next Steps (After Demo)

1. **Verify which Supabase project is canonical**
2. **Apply ALL pending migrations** including `20260120_fix_user_rls_recursion.sql`
3. **Add `is_owner` permission bypass** in permission-service.ts as permanent fix
4. **Add better error logging** to show WHY permission check failed (role missing? permissions empty?)
5. **Create onboarding flow** that seeds roles/permissions for new agencies
