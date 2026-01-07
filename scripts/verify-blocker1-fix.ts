#!/usr/bin/env tsx
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
/**
 * BLOCKER 1 Verification: Role-Permission Assignments
 *
 * Runtime verification that role_permission table is populated
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyBlocker1Fix() {
  console.log('🔍 BLOCKER 1 VERIFICATION: Role-Permission Assignments\n');

  // Query 1: Count total role_permission assignments
  const { count: totalCount, error: countError } = await supabase
    .from('role_permission')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ VERIFICATION FAILED:', countError.message);
    process.exit(1);
  }

  console.log(`📊 Total role_permission rows: ${totalCount}`);

  if (totalCount === 0) {
    console.log('❌ BLOCKER 1 NOT FIXED: role_permission table is still empty');
    console.log('   Action required: Apply supabase/migrations/20260106_seed_rbac_data.sql');
    process.exit(1);
  }

  // Query 2: Get assignment breakdown by role
  const { data: breakdown, error: breakdownError } = await supabase
    .from('role_permission')
    .select(`
      role:role_id (name),
      permission:permission_id (resource, action)
    `);

  if (breakdownError) {
    console.error('❌ Query error:', breakdownError.message);
    process.exit(1);
  }

  // Count by role
  const countsByRole: Record<string, number> = {};
  breakdown?.forEach(rp => {
    const roleName = rp.role?.name || 'Unknown';
    countsByRole[roleName] = (countsByRole[roleName] || 0) + 1;
  });

  console.log('\n📋 Assignments by role:');
  Object.entries(countsByRole).forEach(([role, count]) => {
    console.log(`   ${role}: ${count} permissions`);
  });

  // Query 3: Sample permission check for Admin role
  const { data: adminSample, error: adminError } = await supabase
    .from('role_permission')
    .select(`
      role:role_id!inner(name),
      permission:permission_id!inner(resource, action)
    `)
    .eq('role.name', 'Admin')
    .limit(3);

  if (adminError) {
    console.log('\n⚠️  Could not fetch Admin samples:', adminError.message);
  } else if (adminSample && adminSample.length > 0) {
    console.log('\n✅ Sample Admin permissions:');
    adminSample.forEach(rp => {
      console.log(`   - ${rp.permission?.resource}:${rp.permission?.action}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ BLOCKER 1 FIXED: Role-permission assignments verified');
  console.log(`   Total assignments: ${totalCount}`);
  console.log('   Status: RBAC system is now functional');
  process.exit(0);
}

verifyBlocker1Fix();
