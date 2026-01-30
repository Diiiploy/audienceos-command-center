#!/usr/bin/env tsx
/**
 * Verify RBAC Migration
 *
 * Checks if all RBAC tables and data exist
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyMigration() {
  console.log('🔍 Verifying RBAC Migration\n');
  console.log(`📍 Database: ${SUPABASE_URL}\n`);

  let allChecksPassed = true;

  // Check 1: Role table exists and has system roles
  try {
    const { data: roles, error } = await supabase
      .from('role')
      .select('id, name, hierarchy_level, is_system')
      .eq('is_system', true)
      .order('hierarchy_level');

    if (error) {
      console.log('❌ Role table check failed:', error.message);
      allChecksPassed = false;
    } else if (!roles || roles.length === 0) {
      console.log('❌ No system roles found');
      allChecksPassed = false;
    } else {
      console.log(`✅ Role table: ${roles.length} system roles found`);
      roles.forEach(r => console.log(`   - ${r.name} (level ${r.hierarchy_level})`));
    }
  } catch (err: any) {
    console.log('❌ Role table does not exist:', err.message);
    allChecksPassed = false;
  }

  // Check 2: Permission table exists and has permissions
  try {
    const { data: permissions, error } = await supabase
      .from('permission')
      .select('resource, action')
      .limit(5);

    if (error) {
      console.log('❌ Permission table check failed:', error.message);
      allChecksPassed = false;
    } else if (!permissions || permissions.length === 0) {
      console.log('❌ No permissions found');
      allChecksPassed = false;
    } else {
      console.log(`✅ Permission table: ${permissions.length}+ permissions exist`);
    }
  } catch (err: any) {
    console.log('❌ Permission table does not exist:', err.message);
    allChecksPassed = false;
  }

  // Check 3: Users have role_id assigned
  try {
    const { data: users, error } = await supabase
      .from('user')
      .select('id, email, role_id, is_owner')
      .limit(5);

    if (error) {
      console.log('❌ User table check failed:', error.message);
      allChecksPassed = false;
    } else {
      const usersWithRoles = users?.filter(u => u.role_id) || [];
      const owners = users?.filter(u => u.is_owner) || [];

      if (usersWithRoles.length === 0) {
        console.log('⚠️  WARNING: No users have role_id assigned');
        allChecksPassed = false;
      } else {
        console.log(`✅ User table: ${usersWithRoles.length}/${users?.length} users have role_id`);
      }

      if (owners.length === 0) {
        console.log('⚠️  WARNING: No owners found');
      } else {
        console.log(`✅ User table: ${owners.length} owner(s) found`);
        console.log(`   - ${owners[0].email}`);
      }
    }
  } catch (err: any) {
    console.log('❌ User columns not found:', err.message);
    allChecksPassed = false;
  }

  // Check 4: Role_permission table exists
  try {
    const { count, error } = await supabase
      .from('role_permission')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Role_permission table check failed:', error.message);
      allChecksPassed = false;
    } else {
      console.log(`✅ Role_permission table: ${count} permission assignments exist`);
    }
  } catch (err: any) {
    console.log('❌ Role_permission table does not exist:', err.message);
    allChecksPassed = false;
  }

  // Check 5: Member_client_access table exists
  try {
    const { count, error } = await supabase
      .from('member_client_access')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Member_client_access table check failed:', error.message);
      allChecksPassed = false;
    } else {
      console.log(`✅ Member_client_access table exists (${count} assignments)`);
    }
  } catch (err: any) {
    console.log('❌ Member_client_access table does not exist:', err.message);
    allChecksPassed = false;
  }

  console.log('\n' + '='.repeat(60));

  if (allChecksPassed) {
    console.log('\n🎉 All RBAC migration checks passed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run: npm run build');
    console.log('   2. Verify TypeScript compilation succeeds');
    console.log('   3. Test permission service functionality');
    process.exit(0);
  } else {
    console.log('\n❌ Migration verification failed');
    console.log('\nThe migration needs to be applied. Please:');
    console.log('1. Go to: https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue/sql/new');
    console.log('2. Paste the contents of: supabase/migrations/20260106_rbac_fixed.sql');
    console.log('3. Execute the SQL');
    console.log('4. Run this verification script again');
    process.exit(1);
  }
}

verifyMigration();
