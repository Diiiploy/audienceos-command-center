import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars. Run: source .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createUserRoleTestAccount() {
  const email = 'rodericandrews+usertest@gmail.com';
  const password = 'TestPassword123!';
  
  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (authError) {
    console.error('Auth error:', authError.message);
    return;
  }
  
  console.log('Auth user created:', authUser.user?.id);
  
  // Get the agency ID (use same as other users)
  const { data: existingUser } = await supabase
    .from('user')
    .select('agency_id')
    .limit(1)
    .single();
  
  const agencyId = existingUser?.agency_id;
  console.log('Using agency_id:', agencyId);
  
  // Create app user with "user" role (not admin!)
  const { data: appUser, error: appError } = await supabase
    .from('user')
    .insert({
      id: authUser.user!.id,
      email,
      first_name: 'RBAC',
      last_name: 'Test User',
      role: 'user',
      agency_id: agencyId,
      is_active: true
    })
    .select()
    .single();
  
  if (appError) {
    console.error('App user error:', appError.message);
    return;
  }
  
  console.log('App user created:', appUser);
  console.log('\n✅ Test account created!');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Role: user (hierarchy level 4)');
}

createUserRoleTestAccount();
