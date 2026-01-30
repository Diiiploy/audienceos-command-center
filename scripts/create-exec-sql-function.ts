#!/usr/bin/env tsx
/**
 * Create exec_sql RPC function in Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

async function createExecSqlFunction() {
  console.log('Creating exec_sql function...');

  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_string text)
    RETURNS json AS $$
    BEGIN
      EXECUTE sql_string;
      RETURN json_build_object('success', true);
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    // Use raw query since we can't use RPC yet
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: createFunctionSQL });

    if (error) {
      // Function doesn't exist, we need another approach
      console.log('❌ exec_sql function does not exist yet');
      console.log('We need to apply the migration using the Supabase SQL Editor');
      console.log('');
      console.log('Next steps:');
      console.log('1. Go to: https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue/sql/new');
      console.log('2. Paste the contents of: supabase/migrations/20260106_rbac_fixed.sql');
      console.log('3. Execute the SQL');
      process.exit(1);
    }

    console.log('✅ exec_sql function created');
  } catch (err) {
    console.log('Alternative approach needed - using direct SQL execution');
  }
}

createExecSqlFunction();
