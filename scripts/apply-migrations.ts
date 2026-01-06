/**
 * Apply RBAC Migrations to Supabase
 *
 * This script applies the multi-org roles migrations to the remote Supabase database.
 * Uses service role key to bypass RLS.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Migrations to apply (in order)
const migrations = [
  '20260106_multi_org_roles.sql',
  '20260106_seed_permissions.sql',
  '20260106_seed_system_roles.sql',
  '20260106_seed_rbac_data.sql',
];

async function applyMigration(filename: string): Promise<void> {
  console.log(`\n📄 Applying: ${filename}`);

  try {
    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', filename);
    const sql = readFileSync(migrationPath, 'utf-8');

    // Execute SQL
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // Try direct execution if exec_sql doesn't exist
      console.log('  ⚠️  exec_sql not available, trying direct execution...');

      // For Supabase, we'll need to use the REST API directly
      // This is a workaround since Supabase client doesn't have direct SQL execution
      throw new Error('Cannot execute raw SQL via client. Use Supabase Dashboard SQL Editor or pgAdmin.');
    }

    console.log(`  ✅ Applied: ${filename}`);
  } catch (error) {
    console.error(`  ❌ Failed: ${filename}`);
    console.error('  Error:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting RBAC Migration Application');
  console.log(`📍 Target: ${SUPABASE_URL}`);

  // Check connection
  console.log('\n🔍 Testing connection...');
  const { data: testData, error: testError } = await supabase
    .from('user')
    .select('count')
    .limit(1)
    .single();

  if (testError) {
    console.error('❌ Connection failed:', testError);
    process.exit(1);
  }

  console.log('✅ Connected to Supabase');

  // Apply each migration
  for (const migration of migrations) {
    await applyMigration(migration);
  }

  console.log('\n✅ All migrations applied successfully');
  console.log('\n📊 Next steps:');
  console.log('  1. Verify tables exist in Supabase Dashboard');
  console.log('  2. Run: npx supabase gen types typescript > types/database.ts');
  console.log('  3. Run: npm run build (verify TypeScript compilation)');
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
