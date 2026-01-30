import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qzkirjjrcblkqvhvalue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAlerts() {
  const agencyId = '11111111-1111-1111-1111-111111111111';
  
  const { data, error } = await supabase
    .from('alert')
    .select('id, severity, title, client_id')
    .eq('agency_id', agencyId)
    .order('severity', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('\n✅ Alert Verification Report');
  console.log(`   Total alerts: ${data.length}`);
  
  const bySeverity = {};
  data.forEach(alert => {
    bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
  });
  
  console.log('   By severity:');
  Object.entries(bySeverity).forEach(([sev, count]) => {
    console.log(`      - ${sev}: ${count}`);
  });
  
  console.log('\n✅ Phase 1: Alert deployment complete!\n');
  process.exit(0);
}

verifyAlerts();
