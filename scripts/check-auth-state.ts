/**
 * Check the current state of auth users, app users, and agencies
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function check() {
  console.log('=== AGENCY TABLE ===')
  const { data: agencies, error: agencyErr } = await supabase.from('agency').select('id, name, slug')
  if (agencyErr) console.log('Error:', agencyErr.message)
  else console.log(JSON.stringify(agencies, null, 2))

  console.log('\n=== AUTH USERS (Supabase Auth) ===')
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers()
  if (authErr) console.log('Error:', authErr.message)
  else {
    authData?.users?.forEach(u => console.log(`  ${u.id} | ${u.email}`))
    console.log(`  Total: ${authData?.users?.length || 0}`)
  }

  console.log('\n=== APP USERS (user table) ===')
  const { data: users, error: userErr } = await supabase.from('user').select('id, email, agency_id')
  if (userErr) console.log('Error:', userErr.message)
  else console.log(JSON.stringify(users, null, 2))

  // Check for ID mismatches
  console.log('\n=== ID MISMATCH CHECK ===')
  const authEmails = new Map(authData?.users?.map(u => [u.email, u.id]) || [])
  users?.forEach(u => {
    const authId = authEmails.get(u.email)
    if (!authId) {
      console.log(`  ❌ ${u.email}: No auth user found`)
    } else if (authId !== u.id) {
      console.log(`  ❌ ${u.email}: ID MISMATCH`)
      console.log(`     App user: ${u.id}`)
      console.log(`     Auth user: ${authId}`)
    } else {
      console.log(`  ✅ ${u.email}: IDs match`)
    }
  })
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
