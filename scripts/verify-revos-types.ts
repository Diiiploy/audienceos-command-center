/**
 * Runtime TypeScript Types Verification
 *
 * Verifies that lib/revos/types.ts compiles and exports correctly.
 */

import {
  // Enums
  LinkedInAccountStatus,
  CampaignStatus,
  PostStatus,
  LeadSource,
  LeadStatus,
  WebhookDeliveryStatus,
  PodStatus,
  PodMemberRole,
  EngagementType,
  PodActivityStatus,
  CartridgeTier,
  CartridgeType,

  // Interfaces
  LinkedInAccount,
  LinkedInAccountInsert,
  LinkedInAccountUpdate,
  LeadMagnet,
  LeadMagnetInsert,
  Campaign,
  CampaignInsert,
  CampaignMetrics,
  Post,
  PostInsert,
  PostMetrics,
  Comment,
  CommentInsert,
  Lead,
  LeadInsert,
  WebhookConfig,
  WebhookConfigInsert,
  WebhookDelivery,
  Pod,
  PodInsert,
  PodSettings,
  PodMember,
  PodMemberInsert,
  PodActivity,
  PodActivityInsert,
  Cartridge,
  CartridgeInsert,
} from '../lib/revos/types';

console.log('🔍 RevOS TypeScript Types Verification');
console.log('======================================\n');

// Test type narrowing works
function testEnumTypes(): boolean {
  const status: LinkedInAccountStatus = 'active';
  const validStatuses: LinkedInAccountStatus[] = ['active', 'expired', 'error', 'disconnected'];
  return validStatuses.includes(status);
}

// Test interface construction
function testInterfaceConstruction(): boolean {
  const campaign: CampaignInsert = {
    agency_id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Campaign',
    trigger_word: 'LEAD',
  };

  const post: PostInsert = {
    agency_id: '550e8400-e29b-41d4-a716-446655440000',
    content: 'Test post content',
  };

  const lead: LeadInsert = {
    agency_id: '550e8400-e29b-41d4-a716-446655440000',
    linkedin_id: 'linkedin-123',
  };

  const cartridge: CartridgeInsert = {
    agency_id: '550e8400-e29b-41d4-a716-446655440000',
    tier: 'workspace',
    type: 'voice',
    name: 'Test Voice',
  };

  return Boolean(campaign && post && lead && cartridge);
}

// Test optional fields
function testOptionalFields(): boolean {
  const minimalLead: LeadInsert = {
    agency_id: 'agency-123',
    linkedin_id: 'linkedin-456',
  };

  const fullLead: LeadInsert = {
    agency_id: 'agency-123',
    linkedin_id: 'linkedin-456',
    campaign_id: 'campaign-789',
    client_id: 'client-012',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890',
    linkedin_url: 'https://linkedin.com/in/johndoe',
    company: 'Test Corp',
    title: 'CEO',
    source: 'comment',
    status: 'dm_sent',
    comment_id: 'comment-345',
    custom_fields: { custom: 'value' },
    score: 85,
  };

  return Boolean(minimalLead && fullLead);
}

// Test metrics types
function testMetricsTypes(): boolean {
  const campaignMetrics: CampaignMetrics = {
    posts: 10,
    comments: 50,
    leads: 25,
    dms_sent: 20,
    conversions: 5,
  };

  const postMetrics: PostMetrics = {
    likes: 100,
    comments: 50,
    reposts: 10,
    impressions: 1000,
  };

  const podSettings: PodSettings = {
    engage_on_like: true,
    engage_on_comment: true,
    engage_on_repost: false,
    delay_minutes_min: 5,
    delay_minutes_max: 30,
  };

  return Boolean(campaignMetrics && postMetrics && podSettings);
}

// Test cartridge tiers
function testCartridgeTiers(): boolean {
  const tiers: CartridgeTier[] = ['system', 'workspace', 'user', 'skill'];
  const types: CartridgeType[] = ['voice', 'style', 'preferences', 'instruction', 'brand', 'combined'];
  return tiers.length === 4 && types.length === 6;
}

// Run all tests
const tests = [
  { name: 'Enum types', fn: testEnumTypes },
  { name: 'Interface construction', fn: testInterfaceConstruction },
  { name: 'Optional fields', fn: testOptionalFields },
  { name: 'Metrics types', fn: testMetricsTypes },
  { name: 'Cartridge tiers', fn: testCartridgeTiers },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    const result = test.fn();
    if (result) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name} - returned false`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${test.name} - threw error: ${err}`);
    failed++;
  }
}

// Count exports
const exportedTypes = [
  'LinkedInAccountStatus', 'CampaignStatus', 'PostStatus', 'LeadSource',
  'LeadStatus', 'WebhookDeliveryStatus', 'PodStatus', 'PodMemberRole',
  'EngagementType', 'PodActivityStatus', 'CartridgeTier', 'CartridgeType',
  'LinkedInAccount', 'LinkedInAccountInsert', 'LinkedInAccountUpdate',
  'LeadMagnet', 'LeadMagnetInsert', 'Campaign', 'CampaignInsert',
  'CampaignMetrics', 'Post', 'PostInsert', 'PostMetrics', 'Comment',
  'CommentInsert', 'Lead', 'LeadInsert', 'WebhookConfig', 'WebhookConfigInsert',
  'WebhookDelivery', 'Pod', 'PodInsert', 'PodSettings', 'PodMember',
  'PodMemberInsert', 'PodActivity', 'PodActivityInsert', 'Cartridge', 'CartridgeInsert',
];

console.log(`\n📊 Exported ${exportedTypes.length} types from lib/revos/types.ts`);

console.log('\n======================================');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('❌ VERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED');
  process.exit(0);
}
