#!/usr/bin/env tsx
/**
 * Apply RBAC Migration Directly via PostgreSQL Client
 *
 * Uses pg library to connect directly and execute SQL
 */

import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

// Supabase connection details
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

// Extract project ref from URL (qzkirjjrcblkqvhvalue)
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Could not extract project ref from URL');
  process.exit(1);
}

// Construct PostgreSQL connection string
// Supabase uses port 5432 for direct connections with pooler disabled
// Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const connectionString = `postgresql://postgres.${projectRef}:${SUPABASE_SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

console.log('🚀 Applying RBAC Migration via Direct PostgreSQL Connection\n');
console.log(`📍 Project: ${projectRef}`);

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false, // Supabase uses SSL
    },
  });

  try {
    console.log('\n🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected');

    // Read migration file
    const migrationFile = 'supabase/migrations/20260106_rbac_fixed.sql';
    const filePath = path.join(process.cwd(), migrationFile);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log('\n🔄 Executing migration...');
    console.log(`   File: ${migrationFile}`);
    console.log(`   Size: ${sql.length} characters`);

    // Execute the SQL
    await client.query(sql);

    console.log('✅ Migration executed successfully');

    // Verify migration
    console.log('\n🔍 Verifying migration...');

    const rolesResult = await client.query(
      `SELECT name, hierarchy_level, is_system FROM role WHERE is_system = true ORDER BY hierarchy_level`
    );
    console.log(`✅ Found ${rolesResult.rows.length} system roles:`);
    rolesResult.rows.forEach(r => {
      console.log(`   - ${r.name} (level ${r.hierarchy_level})`);
    });

    const usersResult = await client.query(
      `SELECT email, role_id, is_owner FROM "user" LIMIT 5`
    );
    const usersWithRoles = usersResult.rows.filter(u => u.role_id);
    const owners = usersResult.rows.filter(u => u.is_owner);

    console.log(`✅ Found ${usersWithRoles.length}/${usersResult.rows.length} users with role_id`);
    console.log(`✅ Found ${owners.length} owner(s)`);

    if (owners.length > 0) {
      console.log(`   - Owner: ${owners[0].email}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 Migration completed and verified!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run: npm run build');
    console.log('   2. Verify TypeScript compilation passes');
    console.log('   3. Test permission service');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
