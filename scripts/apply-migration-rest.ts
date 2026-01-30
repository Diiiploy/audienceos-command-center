#!/usr/bin/env tsx
/**
 * Apply RBAC Migration via Supabase REST API
 *
 * Uses Management API to execute SQL
 */

import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

console.log('🚀 Applying RBAC Migration via Supabase REST API\n');
console.log(`📍 Database: ${SUPABASE_URL}\n`);

async function executeSqlViaRestApi(sql: string): Promise<boolean> {
  console.log('🔄 Executing SQL via REST API...');

  try {
    // Split into individual statements to execute separately
    // This is necessary because Supabase REST API may not support multi-statement queries
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim() === ';') {
        continue;
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({ query: statement }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.log(`   ❌ Statement ${i + 1} failed: ${error.substring(0, 100)}`);
          failCount++;
        } else {
          successCount++;
          if ((i + 1) % 10 === 0) {
            console.log(`   ✅ Executed ${i + 1}/${statements.length} statements`);
          }
        }
      } catch (err: any) {
        console.log(`   ❌ Statement ${i + 1} error: ${err.message}`);
        failCount++;
      }
    }

    console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`);
    return failCount === 0;

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function applyMigration() {
  // Read migration file
  const migrationFile = 'supabase/migrations/20260106_rbac_fixed.sql';
  const filePath = path.join(process.cwd(), migrationFile);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  console.log(`📄 Loaded migration: ${sql.length} characters\n`);

  console.log('⚠️  NOTE: This approach may not work with complex DO blocks and transactions.');
  console.log('If this fails, you will need to paste the SQL into Supabase SQL Editor manually.\n');

  const success = await executeSqlViaRestApi(sql);

  if (!success) {
    console.log('\n❌ Migration failed via REST API approach');
    console.log('\n📋 Manual Steps Required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue/sql/new');
    console.log('2. Paste the contents of: supabase/migrations/20260106_rbac_fixed.sql');
    console.log('3. Click "Run" to execute');
    console.log('\nThe SQL is already in your clipboard (from previous step).');
    process.exit(1);
  }

  console.log('\n✅ Migration may have succeeded - verify manually in Supabase dashboard');
}

applyMigration();
