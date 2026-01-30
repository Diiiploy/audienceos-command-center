/**
 * Force apply RBAC migrations using Supabase Admin API
 *
 * This script creates the tables/functions via admin operations
 * since we cannot execute raw DDL via REST API.
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('⚠️  LIMITATION: Supabase REST API cannot execute DDL (CREATE TABLE, etc.)');
console.log('⚠️  Migrations MUST be applied via:');
console.log('   1. Supabase Dashboard SQL Editor (RECOMMENDED)');
console.log('   2. psql with database password');
console.log('   3. Supabase Management API (requires personal access token)');
console.log('');
console.log('📋 To apply via Dashboard:');
console.log('   1. Open: https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue/sql/new');
console.log('   2. Paste SQL from /tmp/rbac_migrations.sql');
console.log('   3. Click "Run"');
console.log('');
console.log('💡 SQL file location: /tmp/rbac_migrations.sql (938 lines)');
console.log('');

// Open the dashboard
console.log('🌐 Opening Supabase Dashboard...');
const { spawn } = require('child_process');
spawn('open', ['https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue/sql/new']);

// Also copy SQL to clipboard again
const { execSync } = require('child_process');
try {
  execSync('cat /tmp/rbac_migrations.sql | pbcopy');
  console.log('📋 SQL copied to clipboard - paste into SQL Editor');
} catch (e) {
  console.log('⚠️  Could not copy to clipboard');
}

console.log('');
console.log('✅ After applying, run: npx tsx scripts/check-rbac-tables.ts');
