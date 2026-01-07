#!/usr/bin/env tsx
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
/**
 * Deep RBAC Verification - Red Team Analysis
 *
 * Verifies ALL claims made about the migration with actual queries
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deepVerification() {
  console.log('🔴 RED TEAM VERIFICATION: RBAC Migration\n');
  
  const results: Record<string, { status: '✅' | '⚠️' | '❌', details: string }> = {};

  // CLAIM 1: Role table exists with 4 system roles
  try {
    const { data: roles, error } = await supabase
      .from('role')
      .select('*')
      .eq('is_system', true)
      .order('hierarchy_level');
    
    if (error) throw error;
    
    const expectedRoles = ['Owner', 'Admin', 'Manager', 'Member'];
    const actualRoles = roles?.map(r => r.name) || [];
    const missing = expectedRoles.filter(r => !actualRoles.includes(r));
    
    if (missing.length > 0) {
      results.role_table = { status: '❌', details: `Missing roles: ${missing.join(', ')}` };
    } else {
      results.role_table = { status: '✅', details: `4 system roles found: ${actualRoles.join(', ')}` };
      console.log('✅ CLAIM 1: Role table verified');
      console.log('   Roles:', roles?.map(r => `${r.name} (level ${r.hierarchy_level})`).join(', '));
    }
  } catch (err: any) {
    results.role_table = { status: '❌', details: err.message };
    console.log('❌ CLAIM 1: Role table FAILED -', err.message);
  }

  // CLAIM 2: Permission table has 48 permissions
  try {
    const { count, error } = await supabase
      .from('permission')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    if (count === 48) {
      results.permission_table = { status: '✅', details: `Exactly 48 permissions seeded` };
      console.log('✅ CLAIM 2: Permission table verified - 48 permissions');
    } else {
      results.permission_table = { status: '⚠️', details: `Expected 48, found ${count}` };
      console.log(`⚠️  CLAIM 2: Permission count mismatch - Expected 48, got ${count}`);
    }
  } catch (err: any) {
    results.permission_table = { status: '❌', details: err.message };
    console.log('❌ CLAIM 2: Permission table FAILED -', err.message);
  }

  // CLAIM 3: Users have role_id populated
  try {
    const { data: users, error } = await supabase
      .from('user')
      .select('id, email, role_id, is_owner');
    
    if (error) throw error;
    
    const usersWithRoles = users?.filter(u => u.role_id) || [];
    const usersWithoutRoles = users?.filter(u => !u.role_id) || [];
    
    if (usersWithoutRoles.length > 0) {
      results.user_migration = { status: '❌', details: `${usersWithoutRoles.length} users missing role_id` };
      console.log(`❌ CLAIM 3: User migration INCOMPLETE - ${usersWithoutRoles.length}/${users?.length} missing role_id`);
      console.log('   Users without roles:', usersWithoutRoles.map(u => u.email).join(', '));
    } else {
      results.user_migration = { status: '✅', details: `All ${users?.length} users have role_id` };
      console.log(`✅ CLAIM 3: User migration verified - ${users?.length}/${users?.length} users have role_id`);
    }
  } catch (err: any) {
    results.user_migration = { status: '❌', details: err.message };
    console.log('❌ CLAIM 3: User migration FAILED -', err.message);
  }

  // CLAIM 4: At least one Owner exists
  try {
    const { data: owners, error } = await supabase
      .from('user')
      .select('email, is_owner')
      .eq('is_owner', true);
    
    if (error) throw error;
    
    if (!owners || owners.length === 0) {
      results.owner_assignment = { status: '❌', details: 'No owners found' };
      console.log('❌ CLAIM 4: Owner assignment FAILED - No owners found');
    } else {
      results.owner_assignment = { status: '✅', details: `${owners.length} owner(s): ${owners.map(o => o.email).join(', ')}` };
      console.log(`✅ CLAIM 4: Owner assignment verified - ${owners.length} owner(s)`);
      console.log('   Owners:', owners.map(o => o.email).join(', '));
    }
  } catch (err: any) {
    results.owner_assignment = { status: '❌', details: err.message };
    console.log('❌ CLAIM 4: Owner assignment FAILED -', err.message);
  }

  // CLAIM 5: Role-permission relationships exist
  try {
    const { count, error } = await supabase
      .from('role_permission')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    if (count === 0) {
      results.role_permissions = { status: '⚠️', details: 'No role-permission assignments found' };
      console.log('⚠️  CLAIM 5: Role-permission table EMPTY - Permissions not assigned to roles');
    } else {
      results.role_permissions = { status: '✅', details: `${count} role-permission assignments` };
      console.log(`✅ CLAIM 5: Role-permission assignments exist - ${count} assignments`);
    }
  } catch (err: any) {
    results.role_permissions = { status: '❌', details: err.message };
    console.log('❌ CLAIM 5: Role-permission table FAILED -', err.message);
  }

  // CLAIM 6: Users can be queried with role relationships
  try {
    const { data: userWithRole, error } = await supabase
      .from('user')
      .select(`
        id,
        email,
        role_id,
        role:role_id (
          id,
          name,
          hierarchy_level
        )
      `)
      .not('role_id', 'is', null)
      .limit(1)
      .single();
    
    if (error) throw error;
    
    if (userWithRole?.role) {
      results.role_relationship = { status: '✅', details: `Foreign key relationship works - ${userWithRole.email} → ${userWithRole.role.name}` };
      console.log('✅ CLAIM 6: User-role relationship verified');
      console.log(`   Sample: ${userWithRole.email} → ${userWithRole.role.name} (level ${userWithRole.role.hierarchy_level})`);
    } else {
      results.role_relationship = { status: '❌', details: 'Role relationship returned null' };
      console.log('❌ CLAIM 6: User-role relationship BROKEN');
    }
  } catch (err: any) {
    results.role_relationship = { status: '❌', details: err.message };
    console.log('❌ CLAIM 6: User-role relationship FAILED -', err.message);
  }

  // CLAIM 7: RLS policies are active
  try {
    // This will fail if RLS is enabled but no policy matches
    const { data, error } = await supabase
      .from('role')
      .select('count')
      .limit(1);
    
    // If we get here, either RLS is disabled or policies are working
    results.rls_policies = { status: '⚠️', details: 'RLS status unclear - need authenticated query' };
    console.log('⚠️  CLAIM 7: RLS policies cannot be verified with service role key');
  } catch (err: any) {
    results.rls_policies = { status: '⚠️', details: 'RLS verification inconclusive' };
    console.log('⚠️  CLAIM 7: RLS verification inconclusive');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY\n');
  
  const passed = Object.values(results).filter(r => r.status === '✅').length;
  const warnings = Object.values(results).filter(r => r.status === '⚠️').length;
  const failed = Object.values(results).filter(r => r.status === '❌').length;
  
  console.log(`✅ Passed:   ${passed}/7`);
  console.log(`⚠️  Warnings: ${warnings}/7`);
  console.log(`❌ Failed:   ${failed}/7`);
  
  console.log('\n📋 DETAILED RESULTS:\n');
  Object.entries(results).forEach(([claim, result]) => {
    console.log(`${result.status} ${claim}: ${result.details}`);
  });

  // Confidence score
  const score = (passed * 10 + warnings * 5) / 70 * 10;
  console.log(`\n🎯 CONFIDENCE SCORE: ${score.toFixed(1)}/10`);
  
  if (score < 9) {
    console.log('\n⚠️  RECOMMENDATION: Address issues before proceeding');
    process.exit(1);
  } else {
    console.log('\n✅ RECOMMENDATION: Safe to proceed');
    process.exit(0);
  }
}

deepVerification();
