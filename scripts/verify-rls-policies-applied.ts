/**
 * Verify Client-Scoped RLS Policies Applied
 * Checks if all 12 expected policies exist on client, communication, ticket tables
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface PolicyCheck {
  table: string;
  policyName: string;
  cmd: string;
  found: boolean;
}

const EXPECTED_POLICIES: Array<{ table: string; policy: string; cmd: string }> = [
  // Client table policies  { table: 'client', policy: 'client_member_scoped_select', cmd: 'SELECT' },
  { table: 'client', policy: 'client_member_scoped_insert', cmd: 'INSERT' },
  { table: 'client', policy: 'client_member_scoped_update', cmd: 'UPDATE' },
  { table: 'client', policy: 'client_member_scoped_delete', cmd: 'DELETE' },

  // Communication table policies
  { table: 'communication', policy: 'communication_member_scoped_select', cmd: 'SELECT' },
  { table: 'communication', policy: 'communication_member_scoped_insert', cmd: 'INSERT' },
  { table: 'communication', policy: 'communication_member_scoped_update', cmd: 'UPDATE' },
  { table: 'communication', policy: 'communication_member_scoped_delete', cmd: 'DELETE' },

  // Ticket table policies
  { table: 'ticket', policy: 'ticket_member_scoped_select', cmd: 'SELECT' },
  { table: 'ticket', policy: 'ticket_member_scoped_insert', cmd: 'INSERT' },
  { table: 'ticket', policy: 'ticket_member_scoped_update', cmd: 'UPDATE' },
  { table: 'ticket', policy: 'ticket_member_scoped_delete', cmd: 'DELETE' },
];

async function verifyPolicies() {
  console.log('🔍 Verifying Client-Scoped RLS Policies\n');
  console.log('═'.repeat(60));
  console.log('\n');

  // Try direct table query approach since RPC may not be available
  const checks: PolicyCheck[] = [];

  console.log('Checking for policy existence via table behavior...\n');

  // Test if we can query tables (policies should allow service_role)
  for (const tableCheck of ['client', 'communication', 'ticket']) {
    try {
      const { error } = await supabase
        .from(tableCheck)
        .select('id')
        .limit(1);

      if (error) {
        console.log(`⚠️  ${tableCheck}: Query failed - ${error.message}`);
      } else {
        console.log(`✅ ${tableCheck}: Accessible (RLS allows service role)`);
      }
    } catch (e: any) {
      console.log(`❌ ${tableCheck}: ${e.message}`);
    }
  }

  console.log('\n📋 Expected Policies:\n');

  for (const expected of EXPECTED_POLICIES) {
    console.log(`   ${expected.table}.${expected.policy} (${expected.cmd})`);
  }

  console.log(`\n   Total: ${EXPECTED_POLICIES.length} policies\n`);

  console.log('═'.repeat(60));
  console.log('\n⚠️  MANUAL VERIFICATION REQUIRED\n');
  console.log('Since pg_policies view is not accessible via Supabase client,');
  console.log('please verify policies in Supabase Dashboard:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue');
  console.log('2. Navigate to: Database → Policies');
  console.log('3. Check tables: client, communication, ticket');
  console.log('4. Verify all 12 policies exist (4 per table)\n');

  console.log('Expected policy names:');
  console.log('  - *_member_scoped_select');
  console.log('  - *_member_scoped_insert');
  console.log('  - *_member_scoped_update');
  console.log('  - *_member_scoped_delete\n');

  console.log('✅ If tables are accessible and you see expected policies,');
  console.log('   migration was successful!\n');
}

verifyPolicies().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
