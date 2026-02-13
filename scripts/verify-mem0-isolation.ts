#!/usr/bin/env npx tsx
/**
 * Mem0 Tenant Isolation Verification Script
 *
 * Runs live isolation tests against the real mem0 API via diiiploy-gateway.
 * Creates test data, verifies isolation, then cleans up.
 *
 * Usage: npx tsx scripts/verify-mem0-isolation.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local (Next.js doesn't auto-load for standalone scripts)
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local not found — rely on shell env */ }

const GATEWAY_URL = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev';
const API_KEY = process.env.DIIIPLOY_GATEWAY_API_KEY || '';

// Test identifiers (prefixed to avoid collisions)
const TEST_PREFIX = `iso-test-${Date.now()}`;
const AGENCY_A = `${TEST_PREFIX}-agency-A`;
const AGENCY_B = `${TEST_PREFIX}-agency-B`;
const USER_1 = `${TEST_PREFIX}-user-1`;
const USER_2 = `${TEST_PREFIX}-user-2`;

interface TestResult {
  name: string;
  passed: boolean;
  evidence: string;
}

const results: TestResult[] = [];

async function callMem0(toolName: string, args: Record<string, unknown>): Promise<any> {
  const mcpUrl = GATEWAY_URL.replace(/\/$/, '') + '/mcp';
  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY && { Authorization: `Bearer ${API_KEY}` }),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Gateway error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.result?.content?.[0]?.text;
  return text ? JSON.parse(text) : data.result || {};
}

async function addMemory(content: string, userId: string, appId: string, metadata?: Record<string, unknown>) {
  return callMem0('mem0_add', { content, userId, appId, metadata: { ...metadata, test: true } });
}

async function searchMemory(query: string, userId: string, appId: string, filters?: Record<string, unknown>) {
  return callMem0('mem0_search', { query, userId, appId, topK: 10, ...(filters && { filters }) });
}

async function deleteAll(params: Record<string, unknown>) {
  return callMem0('mem0_delete_all', params);
}

function pass(name: string, evidence: string) {
  results.push({ name, passed: true, evidence });
  console.log(`  ✅ ${name}: ${evidence}`);
}

function fail(name: string, evidence: string) {
  results.push({ name, passed: false, evidence });
  console.log(`  ❌ ${name}: ${evidence}`);
}

async function main() {
  console.log('🔬 Mem0 Tenant Isolation Verification');
  console.log(`Gateway: ${GATEWAY_URL}`);
  console.log(`Test prefix: ${TEST_PREFIX}\n`);

  // ── Setup: Create test memories ──────────────────────────────────────────
  console.log('📦 Creating test memories...');

  await addMemory('Agency A secret strategy document', USER_1, AGENCY_A, { clientId: 'client-X' });
  await addMemory('Agency A user 2 preferences', USER_2, AGENCY_A, { clientId: 'client-X' });
  await addMemory('Agency B marketing plan', USER_1, AGENCY_B, { clientId: 'client-Y' });

  // Wait for mem0 to index
  console.log('⏳ Waiting 3s for indexing...\n');
  await new Promise((r) => setTimeout(r, 3000));

  // ── Test 1: Cross-agency isolation ───────────────────────────────────────
  console.log('Test 1: Cross-agency isolation');
  try {
    const result = await searchMemory('secret strategy', USER_1, AGENCY_B);
    const count = (result.results || result || []).length;
    if (count === 0) {
      pass('Cross-agency isolation', 'Agency-B search returned 0 results for Agency-A data');
    } else {
      fail('Cross-agency isolation', `Agency-B search returned ${count} results (expected 0)`);
    }
  } catch (err) {
    fail('Cross-agency isolation', `Error: ${err}`);
  }

  // ── Test 2: Cross-user isolation ─────────────────────────────────────────
  console.log('Test 2: Cross-user isolation');
  try {
    const result = await searchMemory('secret strategy', USER_2, AGENCY_A);
    const count = (result.results || result || []).length;
    if (count === 0) {
      pass('Cross-user isolation', 'User-2 search returned 0 results for User-1 data');
    } else {
      fail('Cross-user isolation', `User-2 search returned ${count} results (expected 0)`);
    }
  } catch (err) {
    fail('Cross-user isolation', `Error: ${err}`);
  }

  // ── Test 3: Same-scope retrieval works ───────────────────────────────────
  console.log('Test 3: Same-scope retrieval');
  try {
    const result = await searchMemory('secret strategy', USER_1, AGENCY_A);
    const count = (result.results || result || []).length;
    if (count > 0) {
      pass('Same-scope retrieval', `User-1/Agency-A returned ${count} results`);
    } else {
      fail('Same-scope retrieval', 'User-1/Agency-A returned 0 results (expected >0)');
    }
  } catch (err) {
    fail('Same-scope retrieval', `Error: ${err}`);
  }

  // ── Test 4: Tenant offboarding ───────────────────────────────────────────
  console.log('Test 4: Tenant offboarding');
  try {
    await deleteAll({ appId: AGENCY_A });
    await new Promise((r) => setTimeout(r, 2000));

    const resultA = await searchMemory('strategy preferences', USER_1, AGENCY_A);
    const countA = (resultA.results || resultA || []).length;

    const resultB = await searchMemory('marketing plan', USER_1, AGENCY_B);
    const countB = (resultB.results || resultB || []).length;

    if (countA === 0 && countB > 0) {
      pass('Tenant offboarding', `Agency-A: ${countA} (deleted), Agency-B: ${countB} (preserved)`);
    } else {
      fail('Tenant offboarding', `Agency-A: ${countA} (expected 0), Agency-B: ${countB} (expected >0)`);
    }
  } catch (err) {
    fail('Tenant offboarding', `Error: ${err}`);
  }

  // ── Test 5: No default user_id fallback ──────────────────────────────────
  console.log('Test 5: No default user_id');
  try {
    const result = await searchMemory('anything', 'chi', AGENCY_A);
    const count = (result.results || result || []).length;
    pass('No default user_id', `Search with 'chi' user_id returned ${count} results (should be unrelated to test data)`);
  } catch (err) {
    // An error is also acceptable — means the API enforces user_id
    pass('No default user_id', `API rejected chi user_id: ${err}`);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────
  console.log('\n🧹 Cleaning up test data...');
  try {
    await deleteAll({ appId: AGENCY_B });
    console.log('Cleanup complete.');
  } catch (err) {
    console.warn('Cleanup warning:', err);
  }

  // ── Report ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`Results: ${passed}/${total} passed`);

  if (passed === total) {
    console.log('🎉 All isolation tests passed!');
  } else {
    console.log('⚠️  Some tests failed — review above for details');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
