/**
 * Test if anon key can read user table (RLS test)
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const anonClient = createClient(SUPABASE_URL, ANON_KEY)

async function testAnonRead() {
  console.log('=== ANON KEY READ TEST ===')
  console.log('Testing if anon key can read user table...\n')

  const { data, error } = await anonClient
    .from('user')
    .select('id, email, agency_id')
    .limit(5)

  if (error) {
    console.log('❌ Error:', error.message)
  } else {
    console.log('✅ Can read:', data?.length || 0, 'rows')
    console.log(JSON.stringify(data, null, 2))
  }
}

testAnonRead()
