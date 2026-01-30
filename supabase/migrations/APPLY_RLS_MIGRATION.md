# Apply Client-Scoped RLS Migration

## Migration File
`20260108_client_scoped_rls.sql`

## Purpose
Implements database-level client-scoped access restrictions for Member role users:
- Members see only assigned clients (via `member_client_access` table)
- Owners, Admins, Managers see all agency data
- Enforces at RLS level (cannot be bypassed by API)

## Tables Affected
- `client` - 4 policies (SELECT/INSERT/UPDATE/DELETE)
- `communication` - 4 policies (SELECT/INSERT/UPDATE/DELETE)
- `ticket` - 4 policies (SELECT/INSERT/UPDATE/DELETE)

## How to Apply

### Option 1: Supabase Dashboard (RECOMMENDED)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue)
2. Navigate to: **SQL Editor**
3. Click: **New Query**
4. Copy the entire contents of `20260108_client_scoped_rls.sql`
5. Paste into SQL Editor
6. Click: **Run**
7. Verify success (12 policies created)

### Option 2: Supabase CLI (if linked)

```bash
supabase db push
```

### Option 3: Direct psql (if you have DB password)

```bash
psql -h db.qzkirjjrcblkqvhvalue.supabase.co \
  -U postgres \
  -d postgres \
  -f supabase/migrations/20260108_client_scoped_rls.sql
```

## Verification

Run the verification script after applying:

```bash
cd /Users/rodericandrews/_PAI/projects/command_center_audience_OS
NEXT_PUBLIC_SUPABASE_URL="https://qzkirjjrcblkqvhvalue.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<key>" \
npx tsx scripts/verify-rls-policies-applied.ts
```

Or manually verify in Supabase Dashboard:
1. Go to: **Database → Policies**
2. Check tables: `client`, `communication`, `ticket`
3. Verify 4 policies per table (12 total)

Expected policy names:
- `client_member_scoped_select`
- `client_member_scoped_insert`
- `client_member_scoped_update`
- `client_member_scoped_delete`
- (same pattern for `communication` and `ticket`)

## What This Migration Does

### 1. Drops Old Policies
- `client_agency_via_user` (old agency-only policy)
- `communication_agency_via_user` (old agency-only policy)
- `ticket_rls` (old agency-only policy)

### 2. Creates Member-Scoped Policies

**SELECT policies:**
- Check role hierarchy: `r.hierarchy_level <= 3` → see all data
- Check member access: `EXISTS (member_client_access WHERE user_id = auth.uid() AND client_id = ...)` → see only assigned

**INSERT policies:**
- Verify permission in `role_permission` table
- Members must have 'write' access to specific client

**UPDATE policies:**
- Same as INSERT

**DELETE policies:**
- Require `manage` permission (typically Owner/Admin only)

### 3. Adds Performance Indexes
- `idx_member_access_user_client` on `member_client_access(user_id, client_id)`
- `idx_member_access_client` on `member_client_access(client_id)`
- `idx_member_access_user` on `member_client_access(user_id)`
- `idx_role_hierarchy` on `role(hierarchy_level)`
- `idx_user_role` on `user(role_id)`

## Next Steps After Applying

1. ✅ Verify policies applied (run verification script)
2. Continue with TASK-013 Part 2: Enhance middleware (`lib/rbac/with-permission.ts`)
3. Continue with TASK-013 Part 3: Create helper functions (`lib/rbac/client-access.ts`)
4. Continue with TASK-013 Part 4: Write tests

## Rollback

If needed, you can rollback by re-applying the old policies:
- Recreate `client_agency_via_user` policy (agency_id check only)
- Recreate `communication_agency_via_user` policy
- Recreate `ticket_rls` policy

However, this should NOT be necessary if preconditions were verified.

## Support

If migration fails, check:
1. All RBAC tables exist (`permission`, `role`, `role_permission`, `member_client_access`)
2. `role` table has `hierarchy_level` column
3. User running migration has superuser/admin privileges
