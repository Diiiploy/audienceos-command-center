import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qzkirjjrcblkqvhvalue.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertAlerts() {
  const agencyId = '11111111-1111-1111-1111-111111111111';
  
  const alerts = [
    {
      agency_id: agencyId,
      client_id: 'e31041eb-dad4-4ef8-aead-fb2251997fd4',
      type: 'kpi_drop',
      severity: 'critical',
      title: 'ROAS dropped 38% week-over-week',
      description: 'Sunset Realty\'s return on ad spend fell from $3.85 to $2.38. Campaign performance has degraded significantly.',
      suggested_action: 'Review ad creatives, audience targeting, and bid strategy. Consider pausing underperforming ad sets.',
      confidence: 0.95,
      status: 'active'
    },
    {
      agency_id: agencyId,
      client_id: '896d2d4d-d547-41f7-b16e-c376380daeda',
      type: 'disconnect',
      severity: 'critical',
      title: 'Meta Ads integration disconnected',
      description: 'Coastal Coffee\'s Meta Ads connection has been lost. Real-time data sync has stopped since 6 hours ago.',
      suggested_action: 'Have Coastal Coffee reauthorize their Meta Ads account in integrations settings.',
      confidence: 1.0,
      status: 'active'
    },
    {
      agency_id: agencyId,
      client_id: '896d2d4d-d547-41f7-b16e-c376380daeda',
      type: 'inactivity',
      severity: 'high',
      title: 'No account activity for 8 days',
      description: 'Coastal Coffee has not logged in or made any changes since December 27. This is unusual for their account.',
      suggested_action: 'Schedule a check-in call to understand current status and needs.',
      confidence: 0.88,
      status: 'active'
    },
    {
      agency_id: agencyId,
      client_id: 'c87b5225-68c8-4623-86b4-4eae2de4f19b',
      type: 'risk_detected',
      severity: 'high',
      title: 'Budget pacing 22% ahead of schedule',
      description: 'TechCorp Solutions is spending faster than planned. At current pace, monthly budget will be exhausted by January 18 instead of January 31.',
      suggested_action: 'Review daily budget caps, bid adjustments, and dayparting settings. Consider reducing bid multipliers.',
      confidence: 0.92,
      status: 'active'
    },
    {
      agency_id: agencyId,
      client_id: 'e31041eb-dad4-4ef8-aead-fb2251997fd4',
      type: 'risk_detected',
      severity: 'medium',
      title: 'Conversion rate down 18% this month',
      description: 'Sunset Realty\'s conversion rate dropped from 3.2% to 2.6%. This suggests issues with landing page or post-click experience.',
      suggested_action: 'Audit landing page for UX issues, form friction, and page load times. Consider A/B testing new variations.',
      confidence: 0.85,
      status: 'active'
    },
    {
      agency_id: agencyId,
      client_id: 'c87b5225-68c8-4623-86b4-4eae2de4f19b',
      type: 'kpi_drop',
      severity: 'medium',
      title: 'Cost per acquisition increased 15%',
      description: 'TechCorp Solutions\' CPA rose from $47 to $54. This indicates reduced targeting efficiency.',
      suggested_action: 'Review audience overlap, expand exclusion lists, and optimize audience interest targeting.',
      confidence: 0.78,
      status: 'active'
    },
    {
      agency_id: agencyId,
      client_id: 'e31041eb-dad4-4ef8-aead-fb2251997fd4',
      type: 'risk_detected',
      severity: 'low',
      title: 'Ad impression volume down 12%',
      description: 'Sunset Realty\'s impressions are below daily average. Budget may be spread too thin across campaigns.',
      suggested_action: 'Check ad scheduling, audience size, and bid strategy. Consider consolidating budgets to top performers.',
      confidence: 0.65,
      status: 'active'
    }
  ];

  const { data, error } = await supabase
    .from('alert')
    .insert(alerts);

  if (error) {
    console.error('❌ Error inserting alerts:', error.message);
    process.exit(1);
  }

  console.log('✅ Successfully inserted 7 alerts to Supabase');
  console.log('   Distribution: 2 critical, 2 high, 2 medium, 1 low');
  console.log('   Clients: Sunset Realty, TechCorp Solutions, Coastal Coffee');
  process.exit(0);
}

insertAlerts();
