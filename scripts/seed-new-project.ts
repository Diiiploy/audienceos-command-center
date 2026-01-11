/**
 * Seed the new command_center Supabase project
 *
 * Creates:
 * 1. Diiiploy agency
 * 2. App user records linked to existing auth users
 *
 * Usage: npx tsx scripts/seed-new-project.ts
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

const DIIIPLOY_AGENCY_ID = '11111111-1111-1111-1111-111111111111'

async function seed() {
  console.log('🌱 Seeding new command_center project...\n')
  console.log(`📍 Project: ${SUPABASE_URL}\n`)

  // 1. Create Diiiploy agency
  console.log('1️⃣ Creating Diiiploy agency...')
  const { data: existingAgency } = await supabase
    .from('agency')
    .select('id')
    .eq('id', DIIIPLOY_AGENCY_ID)
    .single()

  if (existingAgency) {
    console.log('   ⚠️ Agency already exists')
  } else {
    const { error: agencyErr } = await supabase.from('agency').insert({
      id: DIIIPLOY_AGENCY_ID,
      name: 'Diiiploy',
      slug: 'diiiploy',
      timezone: 'America/New_York',
      pipeline_stages: ['Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding'],
      health_thresholds: { yellow: 7, red: 14 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (agencyErr) {
      console.error(`   ❌ Failed: ${agencyErr.message}`)
      process.exit(1)
    }
    console.log('   ✅ Agency created')
  }

  // 2. Get existing auth users
  console.log('\n2️⃣ Fetching auth users...')
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers()
  if (authErr || !authData?.users) {
    console.error('   ❌ Failed to fetch auth users')
    process.exit(1)
  }

  console.log(`   Found ${authData.users.length} auth users`)

  // 3. Create app user records
  console.log('\n3️⃣ Creating app user records...')

  // Map of emails to roles (admin for team, user for others)
  const roleMap: Record<string, 'admin' | 'user'> = {
    'roderic@diiiploy.io': 'admin',
    'brent@diiiploy.io': 'admin',
    'chase@diiiploy.io': 'admin',
    'trevor@diiiploy.io': 'admin',
    'rod@diiiploy.io': 'admin',
  }

  for (const authUser of authData.users) {
    if (!authUser.email) continue

    console.log(`   📝 Processing ${authUser.email}...`)

    // Check if app user already exists
    const { data: existing } = await supabase
      .from('user')
      .select('id')
      .eq('id', authUser.id)
      .single()

    if (existing) {
      console.log(`      ⚠️ Already exists`)
      continue
    }

    // Extract name from metadata or email
    const firstName = authUser.user_metadata?.first_name ||
                     authUser.email.split('@')[0].charAt(0).toUpperCase() +
                     authUser.email.split('@')[0].slice(1)
    const lastName = authUser.user_metadata?.last_name || 'User'
    const role = roleMap[authUser.email] || 'user'

    const { error: userErr } = await supabase.from('user').insert({
      id: authUser.id,
      agency_id: DIIIPLOY_AGENCY_ID,
      email: authUser.email,
      first_name: firstName,
      last_name: lastName,
      role: role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (userErr) {
      console.error(`      ❌ Failed: ${userErr.message}`)
    } else {
      console.log(`      ✅ Created (${role})`)
    }
  }

  // 4. Seed some test clients
  console.log('\n4️⃣ Creating test clients...')

  const testClients = [
    { name: 'Agro Bros', contact_email: 'chase@agrobros.com', stage: 'Live' },
    { name: 'TechCorp', contact_email: 'admin@techcorp.com', stage: 'Onboarding' },
    { name: 'Coastal Coffee', contact_email: 'hello@coastalcoffee.com', stage: 'Installation' },
  ]

  for (const client of testClients) {
    const { data: existingClient } = await supabase
      .from('client')
      .select('id')
      .eq('agency_id', DIIIPLOY_AGENCY_ID)
      .eq('name', client.name)
      .single()

    if (existingClient) {
      console.log(`   ⚠️ ${client.name} already exists`)
      continue
    }

    const { error: clientErr } = await supabase.from('client').insert({
      agency_id: DIIIPLOY_AGENCY_ID,
      name: client.name,
      contact_email: client.contact_email,
      stage: client.stage,
      health_status: 'green',
      days_in_stage: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (clientErr) {
      console.error(`   ❌ ${client.name}: ${clientErr.message}`)
    } else {
      console.log(`   ✅ ${client.name} created`)
    }
  }

  // 5. Verification
  console.log('\n📊 Verification...')

  const { data: agencies } = await supabase.from('agency').select('id, name, slug')
  console.log(`\n   Agencies: ${agencies?.length || 0}`)
  agencies?.forEach(a => console.log(`     - ${a.name} (${a.slug})`))

  const { data: users } = await supabase.from('user').select('id, email, role')
  console.log(`\n   Users: ${users?.length || 0}`)
  users?.forEach(u => console.log(`     - ${u.email} (${u.role})`))

  const { data: clients } = await supabase.from('client').select('id, name, stage')
  console.log(`\n   Clients: ${clients?.length || 0}`)
  clients?.forEach(c => console.log(`     - ${c.name} (${c.stage})`))

  console.log('\n🎉 Seeding complete!')
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
