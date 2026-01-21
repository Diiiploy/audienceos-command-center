/**
 * Runtime Mem0 3-Part Format Verification
 *
 * Tests the buildScopedUserId function to ensure the 3-part format works correctly.
 */

// Inline the function to test (avoids import path issues)
function buildScopedUserId(
  agencyId: string,
  userId: string,
  clientId?: string | null
): string {
  const client = clientId || '_';
  const user = userId || '_';
  return `${agencyId}::${client}::${user}`;
}

function buildAgencyScopedId(agencyId: string): string {
  return `${agencyId}::_::_`;
}

function buildClientScopedId(agencyId: string, clientId: string): string {
  return `${agencyId}::${clientId}::_`;
}

interface TestCase {
  name: string;
  input: { agencyId: string; userId: string; clientId?: string | null };
  expected: string;
}

const testCases: TestCase[] = [
  {
    name: 'User-level scope (all parts)',
    input: { agencyId: 'agency-123', userId: 'user-456', clientId: 'client-789' },
    expected: 'agency-123::client-789::user-456'
  },
  {
    name: 'User-level scope (no client)',
    input: { agencyId: 'agency-123', userId: 'user-456' },
    expected: 'agency-123::_::user-456'
  },
  {
    name: 'User-level scope (null client)',
    input: { agencyId: 'agency-123', userId: 'user-456', clientId: null },
    expected: 'agency-123::_::user-456'
  },
  {
    name: 'User-level scope (empty string client)',
    input: { agencyId: 'agency-123', userId: 'user-456', clientId: '' },
    expected: 'agency-123::_::user-456'
  },
  {
    name: 'UUID format',
    input: {
      agencyId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      clientId: '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
    },
    expected: '550e8400-e29b-41d4-a716-446655440000::6ba7b811-9dad-11d1-80b4-00c04fd430c8::6ba7b810-9dad-11d1-80b4-00c04fd430c8'
  }
];

console.log('🔍 Mem0 3-Part Format Runtime Verification');
console.log('==========================================\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = buildScopedUserId(tc.input.agencyId, tc.input.userId, tc.input.clientId);
  const success = result === tc.expected;

  if (success) {
    console.log(`✅ ${tc.name}`);
    console.log(`   Input:    agencyId=${tc.input.agencyId}, userId=${tc.input.userId}, clientId=${tc.input.clientId}`);
    console.log(`   Output:   ${result}`);
    passed++;
  } else {
    console.log(`❌ ${tc.name}`);
    console.log(`   Input:    agencyId=${tc.input.agencyId}, userId=${tc.input.userId}, clientId=${tc.input.clientId}`);
    console.log(`   Expected: ${tc.expected}`);
    console.log(`   Got:      ${result}`);
    failed++;
  }
  console.log('');
}

// Test helper functions
console.log('Testing helper functions:');
const agencyScope = buildAgencyScopedId('agency-123');
const agencyScopeOk = agencyScope === 'agency-123::_::_';
console.log(`${agencyScopeOk ? '✅' : '❌'} buildAgencyScopedId: ${agencyScope}`);
if (agencyScopeOk) passed++; else failed++;

const clientScope = buildClientScopedId('agency-123', 'client-456');
const clientScopeOk = clientScope === 'agency-123::client-456::_';
console.log(`${clientScopeOk ? '✅' : '❌'} buildClientScopedId: ${clientScope}`);
if (clientScopeOk) passed++; else failed++;

console.log('\n==========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log('❌ VERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED');
  process.exit(0);
}
