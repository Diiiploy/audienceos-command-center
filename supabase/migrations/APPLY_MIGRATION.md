# RBAC Migration - Application Instructions

## Status: ⚠️ READY TO APPLY (Not Yet Applied)

The RBAC migration file has been **fixed and validated**, addressing all 4 critical blockers identified in red team analysis:

✅ **Fixed:** CREATE TYPE idempotency (DO blocks)
✅ **Fixed:** CREATE POLICY idempotency (DROP IF EXISTS)
✅ **Fixed:** User data migration (assigns role_id to existing users)
✅ **Fixed:** Owner assignment (first user per agency)

**Migration File:** `supabase/migrations/20260106_rbac_fixed.sql` (517 lines)

---

## Why Manual Application Is Required

Attempted automated methods:
- ❌ **RPC Function (`exec_sql`)**: Does not exist in database
- ❌ **Direct PostgreSQL Connection**: Requires database password (not service role JWT)
- ❌ **Supabase REST API**: Does not support arbitrary SQL execution
- ❌ **Management API**: Requires additional authentication beyond service role key

**Conclusion:** Manual application via Supabase SQL Editor is the most reliable method.

---

## Application Steps (2 minutes)

### Option 1: Browser (Recommended)

The migration SQL is already in your clipboard and the browser was opened to:
https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue/sql/new

**Steps:**
1. **Paste** the SQL from clipboard (Cmd+V)
2. **Click "Run"** button
3. **Wait** for "Success" message (~5-10 seconds)
4. **Verify** by running: `npm run verify-migration`

### Option 2: Command Line (If you need to re-copy)

```bash
# Copy SQL to clipboard
cat supabase/migrations/20260106_rbac_fixed.sql | pbcopy

# Open browser
open "https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue/sql/new"

# Paste and run
```

---

## Verification

After applying, run this command to verify success:

```bash
npm run verify-migration
```

**Expected Output:**
```
✅ Role table: 4 system roles found
   - Owner (level 1)
   - Admin (level 2)
   - Manager (level 3)
   - Member (level 4)
✅ Permission table: 5+ permissions exist
✅ User table: X/X users have role_id
✅ User table: 1 owner(s) found
✅ Role_permission table: X permission assignments exist
✅ Member_client_access table exists (0 assignments)

🎉 All RBAC migration checks passed!
```

---

## What This Migration Does

### Tables Created (4)
- `role` - Agency-specific roles (system + custom)
- `permission` - System-wide permission definitions (48 total)
- `role_permission` - Role-to-permission assignments
- `member_client_access` - Client-level access for Member role

### User Table Modified
- Adds `role_id UUID` column (foreign key to role table)
- Adds `is_owner BOOLEAN` column (one per agency)
- **Migrates existing users**: All assigned to Admin role by default
- **Designates owner**: First user per agency marked as Owner

### System Roles Seeded (Per Agency)
1. **Owner** (level 1) - Full access, immutable
2. **Admin** (level 2) - Full access except billing changes
3. **Manager** (level 3) - Manage clients, communications, tickets
4. **Member** (level 4) - Read-only + assigned client access

### Permissions Seeded (48 total)
12 resources × 4 actions = 48 permissions:
- `clients`, `communications`, `tickets`, `knowledge-base`
- `automations`, `settings`, `users`, `billing`
- `roles`, `integrations`, `analytics`, `ai-features`

Actions: `read`, `write`, `delete`, `manage`

### Security
- ✅ RLS policies enabled on all new tables
- ✅ Agency-scoped isolation
- ✅ Permission hierarchy (manage > write > read)
- ✅ Helper functions for permission checking

---

## After Migration

Once verified, the next steps are:

1. **Build Application**:
   ```bash
   npm run build
   ```
   Should complete without TypeScript errors about missing `role_id` or `is_owner` columns.

2. **Continue to TASK-011**: API Middleware (Permission Guard)
   - Integrate permission service into API routes
   - Add permission checking to protected endpoints
   - Implement error handling for unauthorized access

---

## Troubleshooting

### If verification fails:
1. Check Supabase SQL Editor for error messages
2. Ensure you're logged into the correct project (qzkirjjrcblkqvhvalue)
3. Try running individual sections of the migration file
4. Check for conflicts with existing tables/policies

### If you see "already exists" errors:
This is OK - the migration is idempotent and will skip existing objects.

### If user data migration doesn't work:
Check that users exist with the correct `agency_id`:
```sql
SELECT id, email, agency_id FROM "user" LIMIT 5;
```

---

*Created: 2026-01-06*
*Status: Ready for manual application*
