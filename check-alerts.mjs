import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qzkirjjrcblkqvhvalue.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('alert')
  .select('id, title, severity, confidence, created_at')
  .eq('agency_id', '11111111-1111-1111-1111-111111111111')
  .limit(10);

if (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}

console.log('');
console.log('ACTUAL ALERTS IN SUPABASE:');
console.log('Total: ' + data.length + ' alerts');
console.log('');
data.forEach(a => {
  console.log('  - [' + a.severity + '] ' + a.title);
  console.log('    Confidence: ' + a.confidence);
});
process.exit(0);
