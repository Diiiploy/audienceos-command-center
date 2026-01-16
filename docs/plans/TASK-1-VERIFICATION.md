# Task 1: Cartridges Database Schema - Verification Guide

## Status: CREATED ✅

**Commit Hash:** `5f95169`
**Date:** 2026-01-16

## Created Files

### 1. Migration File
- **Path:** `supabase/migrations/20260116_cartridges_backend.sql`
- **Size:** 121 lines
- **Contents:**
  - CREATE TABLE cartridges (37 columns)
  - 6 indexes (agency, user, client, type, tier, active)
  - 1 unique index (default cartridges per type per agency)
  - 5 RLS policies (admin read, member read, admin create, admin update, admin delete)
  - 1 trigger (update_updated_at_column)

### 2. TypeScript Types
- **Path:** `types/database.ts`
- **Added:**
  - `Cartridge` interface with all 37 fields
  - `CartridgeType = 'voice' | 'brand' | 'style' | 'instructions'`
  - `CartridgeTier = 'system' | 'agency' | 'client' | 'user'`

## Schema Details

### Cartridges Table (37 columns)

**Primary Fields:**
- `id` (UUID, PK)
- `agency_id` (UUID, FK → agency)
- `name` (TEXT)
- `description` (TEXT)
- `type` (VARCHAR 50): voice, brand, style, instructions
- `tier` (VARCHAR 20): system, agency, client, user
- `is_active` (BOOLEAN, default true)
- `is_default` (BOOLEAN, default false)

**Ownership Fields:**
- `client_id` (UUID FK → client, CASCADE)
- `user_id` (UUID FK → user, CASCADE)
- `parent_id` (UUID FK → cartridges, SET NULL)

**Voice Cartridge Fields:**
- `voice_tone` (TEXT)
- `voice_style` (TEXT)
- `voice_personality` (TEXT)
- `voice_vocabulary` (TEXT)

**Brand Cartridge Fields:**
- `brand_name` (TEXT)
- `brand_tagline` (TEXT)
- `brand_values` (TEXT[])
- `brand_logo_url` (TEXT)

**Style Cartridge Fields:**
- `style_primary_color` (TEXT)
- `style_secondary_color` (TEXT)
- `style_fonts` (TEXT[])

**Instructions Cartridge Fields:**
- `instructions_system_prompt` (TEXT)
- `instructions_rules` (TEXT[])

**Audit Fields:**
- `created_by` (UUID FK → user, NOT NULL)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Indexes

1. `idx_cartridges_agency` - For filtering by agency
2. `idx_cartridges_user` - For user-scoped cartridges
3. `idx_cartridges_client` - For client-scoped cartridges
4. `idx_cartridges_type` - For filtering by type
5. `idx_cartridges_tier` - For filtering by tier
6. `idx_cartridges_active` - For active cartridges only (partial index)
7. `idx_cartridges_default` - Unique: one default per type per agency

### RLS Policies

1. **agency_admins_see_all_cartridges** (SELECT)
   - Admins can see all cartridges in their agency

2. **members_see_assigned_cartridges** (SELECT)
   - Users can see their own cartridges
   - Users can see agency-tier cartridges
   - Users can see client-tier cartridges they're assigned to

3. **admins_create_cartridges** (INSERT)
   - Only admins can create cartridges

4. **admins_update_cartridges** (UPDATE)
   - Only admins can update cartridges

5. **admins_delete_cartridges** (DELETE)
   - Only admins can delete cartridges

## Manual Application Instructions

Since direct PostgreSQL access via CLI is limited, apply the migration manually via Supabase Dashboard:

### Steps:

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.com/
   - Project: audienceos-cc-fresh (ebxshdqfaqupnvpghodi)

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Copy entire contents of: `supabase/migrations/20260116_cartridges_backend.sql`
   - Paste into SQL Editor

4. **Execute**
   - Click "Run" (or Cmd+Enter)
   - Verify: No errors in output

5. **Verify Schema**
   - In SQL Editor, run:
     ```sql
     SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_name = 'cartridges'
     ORDER BY ordinal_position;
     ```
   - Expected: 37 rows with all columns listed

6. **Verify Indexes**
   - Run:
     ```sql
     SELECT indexname
     FROM pg_indexes
     WHERE tablename = 'cartridges';
     ```
   - Expected: 7 indexes (including primary key)

7. **Verify Policies**
   - Run:
     ```sql
     SELECT policyname
     FROM pg_policies
     WHERE tablename = 'cartridges';
     ```
   - Expected: 5 policies

## Testing the Schema

After applying the migration, test with:

```sql
-- Test 1: Verify table exists
\dt cartridges

-- Test 2: Verify columns
SELECT COUNT(*) as col_count FROM information_schema.columns WHERE table_name = 'cartridges';
-- Expected: 37

-- Test 3: Insert test record (as admin)
INSERT INTO cartridges (
  id,
  agency_id,
  name,
  type,
  tier,
  created_by,
  voice_tone
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM agency LIMIT 1),
  'Test Voice Cartridge',
  'voice',
  'agency',
  (SELECT id FROM "user" WHERE role = 'admin' LIMIT 1),
  'Professional'
);

-- Test 4: Query back
SELECT id, name, type, voice_tone FROM cartridges WHERE name = 'Test Voice Cartridge';
```

## Task Completion Checklist

- ✅ Migration file created: `supabase/migrations/20260116_cartridges_backend.sql`
- ✅ TypeScript types added: `types/database.ts`
- ✅ Commit created: `5f95169`
- ✅ All 37 columns defined
- ✅ 7 indexes created
- ✅ 5 RLS policies enforced
- ✅ Updated_at trigger configured
- ⏳ Migration applied to Supabase (manual via Dashboard required)

## Next Steps

1. **Apply migration via Supabase Dashboard** (manual step)
2. **Task 2:** Create Cartridges Store (Zustand)
3. **Task 3:** Create Cartridges API Endpoints
4. **Task 4:** Create Voice Cartridge API
5. **Task 5:** Create Brand/Style/Instructions Endpoints

## Notes

- Migration uses IF NOT EXISTS to prevent conflicts
- RLS enables multi-tenant isolation
- Indexes optimize common query patterns
- UNIQUE constraint ensures only one default per type per agency
- Cascade deletes clean up orphaned records
