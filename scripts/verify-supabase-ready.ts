/**
 * Runtime Supabase Readiness Verification
 *
 * Verifies:
 * 1. Supabase connection works
 * 2. New RevOS tables don't exist yet (safe to migrate)
 * 3. Required existing tables exist
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function checkTableExists(tableName: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  // If we get a specific "relation does not exist" error, table doesn't exist
  if (error && error.message.includes('does not exist')) {
    return false;
  }

  // If no error or any other error (like RLS), table exists
  return true;
}

async function main() {
  console.log('🔍 Supabase Readiness Verification');
  console.log('===================================\n');
  console.log(`Supabase URL: ${SUPABASE_URL.substring(0, 50)}...`);
  console.log('');

  // 1. Test basic connection
  console.log('1️⃣ Testing Supabase connection...');
  const { error: connError } = await supabase.from('agency').select('count').limit(1);
  if (connError && !connError.message.includes('Row Level Security')) {
    console.log(`❌ Connection failed: ${connError.message}`);
    process.exit(1);
  }
  console.log('✅ Supabase connection works\n');

  // 2. Check existing tables that should exist
  console.log('2️⃣ Checking existing tables...');
  const requiredTables = ['agency', 'user', 'client', 'voice_cartridge', 'brand_cartridge'];
  let existingOk = true;

  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    if (exists) {
      console.log(`   ✅ ${table} exists`);
    } else {
      console.log(`   ❌ ${table} NOT FOUND`);
      existingOk = false;
    }
  }

  if (!existingOk) {
    console.log('\n❌ Required tables missing - database may not be initialized');
    process.exit(1);
  }
  console.log('');

  // 3. Check that new RevOS tables DON'T exist yet
  console.log('3️⃣ Checking new tables (should NOT exist yet)...');
  const newTables = [
    'linkedin_account',
    'lead_magnet',
    'campaign',
    'post',
    'comment',
    'lead',
    'webhook_config',
    'webhook_delivery',
    'pod',
    'pod_member',
    'pod_activity',
    'cartridge'
  ];

  let allNew = true;
  const existingNew: string[] = [];

  for (const table of newTables) {
    const exists = await checkTableExists(table);
    if (exists) {
      console.log(`   ⚠️  ${table} ALREADY EXISTS`);
      existingNew.push(table);
      allNew = false;
    } else {
      console.log(`   ✅ ${table} does not exist (ready to create)`);
    }
  }

  console.log('\n===================================');

  if (allNew) {
    console.log('✅ DATABASE READY FOR MIGRATIONS');
    console.log('   All new tables are ready to be created');
    console.log('\nTo apply migrations:');
    console.log('   supabase link --project-ref ebxshdqfaqupnvpghodi');
    console.log('   supabase db push');
    process.exit(0);
  } else {
    console.log('⚠️  SOME TABLES ALREADY EXIST');
    console.log(`   Existing: ${existingNew.join(', ')}`);
    console.log('\nMigration may fail if tables already exist.');
    console.log('Consider using CREATE TABLE IF NOT EXISTS or dropping existing tables first.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
