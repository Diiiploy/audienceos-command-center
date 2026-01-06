/**
 * Script to add Diiiploy team members to the database
 *
 * This script uses Supabase Admin API to create auth users and
 * corresponding user records in the app database.
 *
 * Usage:
 *   npx tsx scripts/add-diiiploy-team.ts
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DIIIPLOY_AGENCY_ID = '11111111-1111-1111-1111-111111111111'

// Team members to add
const TEAM_MEMBERS = [
  {
    email: 'roderic@diiiploy.io',
    firstName: 'Roderic',
    lastName: 'Andrews',
    role: 'owner' as const,
    password: 'Diiiploy2026!', // Temporary password
  },
  {
    email: 'brent@diiiploy.io',
    firstName: 'Brent',
    lastName: 'CEO',
    role: 'admin' as const,
    password: 'Diiiploy2026!',
  },
  {
    email: 'chase@diiiploy.io',
    firstName: 'Chase',
    lastName: 'Dimond',
    role: 'admin' as const,
    password: 'Diiiploy2026!',
  },
  {
    email: 'rod@diiiploy.io',
    firstName: 'Rod',
    lastName: 'Khleif',
    role: 'admin' as const,
    password: 'Diiiploy2026!',
  },
  {
    email: 'trevor@diiiploy.io',
    firstName: 'Trevor',
    lastName: 'Developer',
    role: 'admin' as const,
    password: 'Diiiploy2026!',
  },
]

async function addTeamMembers() {
  console.log('[Diiiploy Team Setup] Starting...\n')

  // Validate environment
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:')
    console.error('  - NEXT_PUBLIC_SUPABASE_URL')
    console.error('  - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Create admin client (bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('✅ Connected to Supabase with service role key\n')

  // Process each team member
  for (const member of TEAM_MEMBERS) {
    console.log(`📝 Processing ${member.email}...`)

    try {
      // Check if user already exists in auth
      const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
      const existingAuthUser = existingAuthUsers?.users?.find(
        (u) => u.email === member.email
      )

      let authUserId: string

      if (existingAuthUser) {
        console.log(`   ⚠️  Auth user already exists: ${existingAuthUser.id}`)
        authUserId = existingAuthUser.id
      } else {
        // Create auth user with Admin API (auto-confirmed email)
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: member.email,
          password: member.password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            first_name: member.firstName,
            last_name: member.lastName,
          },
        })

        if (authError || !authUser.user) {
          console.error(`   ❌ Failed to create auth user: ${authError?.message}`)
          continue
        }

        authUserId = authUser.user.id
        console.log(`   ✅ Auth user created: ${authUserId}`)
      }

      // Check if app user record already exists
      const { data: existingAppUser } = await supabase
        .from('user')
        .select('id')
        .eq('id', authUserId)
        .eq('agency_id', DIIIPLOY_AGENCY_ID)
        .single()

      if (existingAppUser) {
        console.log(`   ⚠️  App user record already exists`)
        continue
      }

      // Create app user record
      const { error: userError } = await supabase.from('user').insert({
        id: authUserId,
        email: member.email,
        first_name: member.firstName,
        last_name: member.lastName,
        role: member.role,
        agency_id: DIIIPLOY_AGENCY_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (userError) {
        console.error(`   ❌ Failed to create app user: ${userError.message}`)
        continue
      }

      console.log(`   ✅ App user record created\n`)
    } catch (error) {
      console.error(`   ❌ Error processing ${member.email}:`, error)
    }
  }

  console.log('🎉 Diiiploy team setup complete!\n')

  // Verify all team members
  console.log('📊 Verifying team members...\n')
  const { data: teamMembers, error } = await supabase
    .from('user')
    .select('id, email, first_name, last_name, role')
    .eq('agency_id', DIIIPLOY_AGENCY_ID)
    .like('email', '%@diiiploy.io')
    .order('email')

  if (error) {
    console.error('❌ Failed to verify team members:', error)
    process.exit(1)
  }

  console.log('✅ Team members in database:')
  teamMembers?.forEach((member) => {
    console.log(`   • ${member.email} (${member.first_name} ${member.last_name}) - ${member.role}`)
  })

  console.log(`\n📧 Temporary password for all accounts: Diiiploy2026!`)
  console.log('   (Users should change this on first login)\n')
}

// Run the script
addTeamMembers()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
