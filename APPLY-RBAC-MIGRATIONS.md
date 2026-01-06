# Apply RBAC Migrations

## Status: ⏳ MANUAL STEP REQUIRED

**Blocker:** Database migrations created but not applied to Supabase.

**Evidence:**
```bash
$ npx tsx scripts/check-rbac-tables.ts
❌ permission: Does not exist (PGRST205)
❌ role: Does not exist (PGRST205)
❌ role_permission: Does not exist (PGRST205)
❌ member_client_access: Does not exist (PGRST205)
❌ user.role_id / user.is_owner: column user.role_id does not exist
```

## Steps to Apply (READY TO EXECUTE)

### Option 1: Supabase Dashboard (RECOMMENDED)

1. **Open SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ebxshdqfaqupnvpghodi/sql/new
   ```

2. **Paste SQL from clipboard:**
   - Combined migration SQL is already in your clipboard (938 lines)
   - Contains all 4 migrations:
     - 20260106_multi_org_roles.sql
     - 20260106_seed_permissions.sql
     - 20260106_seed_system_roles.sql
     - 20260106_seed_rbac_data.sql

3. **Click "Run"**

4. **Verify:**
   ```bash
   npx tsx scripts/check-rbac-tables.ts
   ```

### Option 2: psql (if available)

```bash
# Install psql if needed
brew install postgresql

# Apply migrations
psql "postgresql://postgres:[PASSWORD]@db.ebxshdqfaqupnvpghodi.supabase.co:5432/postgres" \
  -f /tmp/rbac_migrations.sql
```

## After Migrations Applied

### Step 1: Regenerate Types

```bash
npx supabase gen types typescript --project-id ebxshdqfaqupnvpghodi > types/database.ts
```

### Step 2: Verify Build

```bash
npm run build
```

**Expected:** Build should pass without TypeScript errors.

## Files Created

- `/tmp/rbac_migrations.sql` - Combined migration (938 lines)
- `scripts/check-rbac-tables.ts` - Verification script
- `scripts/apply-migrations.ts` - Attempted programmatic approach (not viable)

## Why Manual Step Required

- Supabase doesn't allow raw SQL execution via JavaScript client (security)
- psql not installed on this machine
- Management API requires personal access token (not service role key)

**Recommendation:** Apply via Supabase Dashboard (30 seconds).
