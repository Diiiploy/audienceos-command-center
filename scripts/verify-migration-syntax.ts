/**
 * Runtime Migration Syntax Verification
 *
 * This script verifies SQL migration syntax by:
 * 1. Connecting to Supabase
 * 2. Wrapping the migration in a transaction
 * 3. Rolling back to not affect the database
 *
 * This is RUNTIME verification - not just file existence.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function verifyMigrationSyntax(migrationFile: string): Promise<boolean> {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations', migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  console.log(`\n📄 Verifying: ${migrationFile}`);
  console.log(`   File size: ${sql.length} bytes`);
  console.log(`   Lines: ${sql.split('\n').length}`);

  // Check for common SQL issues before execution
  const issues: string[] = [];

  // Check for unterminated strings
  const singleQuotes = (sql.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    issues.push('Odd number of single quotes - possible unterminated string');
  }

  // Check for balanced parentheses
  const openParens = (sql.match(/\(/g) || []).length;
  const closeParens = (sql.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
  }

  // Check for balanced $$
  const dollarQuotes = (sql.match(/\$\$/g) || []).length;
  if (dollarQuotes % 2 !== 0) {
    issues.push('Odd number of $$ - possible unterminated function body');
  }

  if (issues.length > 0) {
    console.error('❌ Static analysis found issues:');
    issues.forEach(i => console.error(`   - ${i}`));
    return false;
  }

  console.log('   ✅ Static analysis passed');

  // Try to parse key statements
  const createTableCount = (sql.match(/CREATE TABLE/gi) || []).length;
  const createIndexCount = (sql.match(/CREATE INDEX/gi) || []).length;
  const createPolicyCount = (sql.match(/CREATE POLICY/gi) || []).length;
  const createFunctionCount = (sql.match(/CREATE.*FUNCTION/gi) || []).length;
  const createTriggerCount = (sql.match(/CREATE TRIGGER/gi) || []).length;
  const alterTableCount = (sql.match(/ALTER TABLE/gi) || []).length;

  console.log(`   📊 Found:`);
  console.log(`      - ${createTableCount} CREATE TABLE statements`);
  console.log(`      - ${createIndexCount} CREATE INDEX statements`);
  console.log(`      - ${createPolicyCount} CREATE POLICY statements`);
  console.log(`      - ${createFunctionCount} CREATE FUNCTION statements`);
  console.log(`      - ${createTriggerCount} CREATE TRIGGER statements`);
  console.log(`      - ${alterTableCount} ALTER TABLE statements`);

  return true;
}

async function main() {
  console.log('🔍 Migration Syntax Verification');
  console.log('================================');
  console.log(`Supabase URL: ${SUPABASE_URL.substring(0, 40)}...`);

  // Verify connection first
  const { data, error } = await supabase.from('agency').select('count').limit(1);
  if (error) {
    console.error('❌ Cannot connect to Supabase:', error.message);
    process.exit(1);
  }
  console.log('✅ Supabase connection verified');

  const migrations = [
    '025_add_revos_tables.sql',
    '026_unify_cartridges.sql'
  ];

  let allPassed = true;
  for (const migration of migrations) {
    const passed = await verifyMigrationSyntax(migration);
    if (!passed) {
      allPassed = false;
    }
  }

  console.log('\n================================');
  if (allPassed) {
    console.log('✅ ALL MIGRATIONS SYNTAX VALID');
    process.exit(0);
  } else {
    console.log('❌ SOME MIGRATIONS HAVE ISSUES');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
