/**
 * Check if RBAC tables exist in database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkTables() {
  console.log('🔍 Checking for RBAC tables...\n');

  const tables = ['permission', 'role', 'role_permission', 'member_client_access'];
  let allExist = true;

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('count').limit(1);

      if (error) {
        console.log(`❌ ${table}: Does not exist (${error.code})`);
        allExist = false;
      } else {
        console.log(`✅ ${table}: Exists`);
      }
    } catch (e: any) {
      console.log(`❌ ${table}: ${e.message}`);
      allExist = false;
    }
  }

  console.log('\n🔍 Checking for new user columns...\n');

  try {
    const { data, error } = await supabase
      .from('user')
      .select('id, role_id, is_owner')
      .limit(1);

    if (error) {
      console.log(`❌ user.role_id / user.is_owner: ${error.message}`);
      allExist = false;
    } else {
      console.log(`✅ user.role_id and user.is_owner: Exist`);
    }
  } catch (e: any) {
    console.log(`❌ user columns: ${e.message}`);
    allExist = false;
  }

  console.log('\n' + (allExist ? '✅ All RBAC tables exist' : '❌ Some RBAC tables missing'));
  console.log('\n📋 Next steps:');
  if (!allExist) {
    console.log('  1. Open Supabase Dashboard SQL Editor');
    console.log('  2. Paste migrations from clipboard');
    console.log('  3. Run this script again to verify');
  } else {
    console.log('  1. Generate types: npx supabase gen types typescript --project-id ebxshdqfaqupnvpghodi > types/database.ts');
    console.log('  2. Run build: npm run build');
  }

  process.exit(allExist ? 0 : 1);
}

checkTables();
