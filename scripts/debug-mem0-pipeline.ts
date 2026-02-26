#!/usr/bin/env npx tsx
/**
 * Mem0 Pipeline Debug Script
 *
 * Bypasses Next.js entirely to test the mem0 service layer directly.
 * Tests add→list round-trip with UUID-format entity params matching real app usage.
 *
 * Usage: npx tsx scripts/debug-mem0-pipeline.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

// ── Load .env.local ──────────────────────────────────────────────────────────
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

// Use UUID-format IDs matching real app usage (not simple strings like 'pipe-test')
const TEST_AGENCY_ID = randomUUID();  // Simulates real agencyId
const TEST_USER_ID = randomUUID();    // Simulates real userId
const TEST_SESSION_ID = `session-${Date.now()}`;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  Mem0 Pipeline Debug Script');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Gateway URL:  ${GATEWAY_URL}`);
console.log(`API Key:      ${API_KEY ? API_KEY.substring(0, 8) + '...' : 'MISSING!'}`);
console.log(`Agency ID:    ${TEST_AGENCY_ID}`);
console.log(`User ID:      ${TEST_USER_ID}`);
console.log(`Session ID:   ${TEST_SESSION_ID}`);
console.log('');

// ── Raw MCP call (no service layer abstraction) ─────────────────────────────

async function callMem0Raw(toolName: string, args: Record<string, unknown>): Promise<{
  httpStatus: number;
  rawBody: any;
  parsed: any;
  error?: string;
}> {
  const mcpUrl = GATEWAY_URL.replace(/\/$/, '') + '/mcp';
  console.log(`\n  → Calling ${toolName}`);
  console.log(`    URL: ${mcpUrl}`);
  console.log(`    Args: ${JSON.stringify(args, null, 2).substring(0, 500)}`);

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

  const rawBody = await response.json();

  // Log FULL raw response
  console.log(`    HTTP Status: ${response.status}`);
  console.log(`    Raw Response: ${JSON.stringify(rawBody, null, 2).substring(0, 2000)}`);

  if (!response.ok) {
    return { httpStatus: response.status, rawBody, parsed: null, error: `HTTP ${response.status}` };
  }

  // Check JSON-RPC error
  if (rawBody.error) {
    return { httpStatus: response.status, rawBody, parsed: null, error: `JSON-RPC: ${JSON.stringify(rawBody.error)}` };
  }

  // Check tool-level error
  if (rawBody.result?.isError) {
    const errorText = rawBody.result?.content?.[0]?.text || 'Unknown tool error';
    return { httpStatus: response.status, rawBody, parsed: null, error: `Tool error: ${errorText}` };
  }

  // Parse the response text (same way mem0-service.ts does it)
  const text = rawBody.result?.content?.[0]?.text;
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.log(`    ⚠️  Failed to JSON.parse text content: ${text.substring(0, 200)}`);
      parsed = text;
    }
  } else {
    console.log('    ⚠️  No text in result.content[0].text — falling through to result');
    parsed = rawBody.result || {};
  }

  console.log(`    Parsed: ${JSON.stringify(parsed, null, 2).substring(0, 1000)}`);
  return { httpStatus: response.status, rawBody, parsed, error: undefined };
}

// ── Test Steps ──────────────────────────────────────────────────────────────

async function main() {
  let allPassed = true;

  // ── Step 1: Add memory with content string + UUID entity params ──────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Step 1: Add memory (content string, UUID entity params)    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const addResult = await callMem0Raw('mem0_add', {
    content: `Debug test: User prefers dark mode dashboards (${Date.now()})`,
    userId: TEST_USER_ID,
    appId: TEST_AGENCY_ID,
    // NOTE: No runId — matches the fix (runId scopes memories and hides them from listing)
    metadata: {
      type: 'preference',
      sessionId: TEST_SESSION_ID,
      test: true,
    },
    infer: true,
  });

  if (addResult.error) {
    console.log(`\n  ❌ STEP 1 FAILED: ${addResult.error}`);
    allPassed = false;
  } else {
    // mem0 v2 returns async PENDING response — extract event_id
    const isPending = Array.isArray(addResult.parsed) && addResult.parsed[0]?.status === 'PENDING';
    const eventId = isPending ? addResult.parsed[0].event_id : undefined;
    const addId = addResult.parsed?.id || eventId || addResult.parsed?.results?.[0]?.id;
    console.log(`\n  ✅ STEP 1 PASSED: Memory ${isPending ? 'queued (PENDING)' : 'added'}, tracking ID: ${addId || 'NO ID'}`);
  }

  // ── Step 2: Wait for indexing ────────────────────────────────────────────
  console.log('\n⏳ Waiting 10s for mem0 async processing...');
  await new Promise(r => setTimeout(r, 10000));

  // ── Step 3: List memories for the same entity params ─────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Step 3: List memories (same UUID entity params)            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const listResult = await callMem0Raw('mem0_list', {
    userId: TEST_USER_ID,
    appId: TEST_AGENCY_ID,
    page: 1,
    pageSize: 50,
  });

  if (listResult.error) {
    console.log(`\n  ❌ STEP 3 FAILED: ${listResult.error}`);
    allPassed = false;
  } else {
    // Check different response shapes (what the service layer tries to parse)
    const results = listResult.parsed?.results;
    const isArray = Array.isArray(results);
    const isParsedArray = Array.isArray(listResult.parsed);
    const count = isArray ? results.length : isParsedArray ? listResult.parsed.length : 0;

    console.log(`\n  parsed.results is Array: ${isArray} (length: ${isArray ? results.length : 'N/A'})`);
    console.log(`  parsed itself is Array: ${isParsedArray} (length: ${isParsedArray ? listResult.parsed.length : 'N/A'})`);
    console.log(`  parsed.count: ${listResult.parsed?.count}`);

    if (count > 0) {
      console.log(`\n  ✅ STEP 3 PASSED: Found ${count} memories`);
      // Show first memory
      const first = isArray ? results[0] : listResult.parsed[0];
      console.log(`    First memory: ${JSON.stringify(first, null, 2).substring(0, 500)}`);
    } else {
      console.log(`\n  ❌ STEP 3 FAILED: List returned 0 memories (add succeeded but list is empty)`);
      console.log('    → This confirms the pipeline break: data goes in but doesn\'t come back');
      console.log('    → Possible causes: entity param mismatch, response parsing issue, or mem0 indexing delay');
      allPassed = false;
    }
  }

  // ── Step 4: Add memory with messages array format (how chat route sends) ─
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Step 4: Add memory (messages array format, like chat)      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const messagesAddResult = await callMem0Raw('mem0_add', {
    content: `User: "Tell me about my clients" → Assistant response about dashboard`,
    messages: [
      { role: 'user', content: 'Tell me about my clients' },
      { role: 'assistant', content: 'Here are your top clients based on recent activity...' },
    ],
    userId: TEST_USER_ID,
    appId: TEST_AGENCY_ID,
    // NOTE: No runId — matches the fix
    metadata: {
      type: 'conversation',
      topic: 'dashboard',
      sessionId: TEST_SESSION_ID,
      test: true,
    },
    infer: true,
  });

  if (messagesAddResult.error) {
    console.log(`\n  ❌ STEP 4 FAILED: ${messagesAddResult.error}`);
    allPassed = false;
  } else {
    const addId = messagesAddResult.parsed?.id || messagesAddResult.parsed?.results?.[0]?.id;
    console.log(`\n  ✅ STEP 4 PASSED: Memory added with ID: ${addId || 'NO ID IN RESPONSE'}`);
  }

  // ── Step 5: Wait and list again ──────────────────────────────────────────
  console.log('\n⏳ Waiting 10s for mem0 async processing...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Step 5: List all memories (should include both)            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const listResult2 = await callMem0Raw('mem0_list', {
    userId: TEST_USER_ID,
    appId: TEST_AGENCY_ID,
    page: 1,
    pageSize: 50,
  });

  if (listResult2.error) {
    console.log(`\n  ❌ STEP 5 FAILED: ${listResult2.error}`);
    allPassed = false;
  } else {
    const results = listResult2.parsed?.results;
    const isArray = Array.isArray(results);
    const isParsedArray = Array.isArray(listResult2.parsed);
    const count = isArray ? results.length : isParsedArray ? listResult2.parsed.length : 0;

    if (count >= 2) {
      console.log(`\n  ✅ STEP 5 PASSED: Found ${count} memories (expected ≥2)`);
    } else {
      console.log(`\n  ❌ STEP 5 FAILED: Found ${count} memories (expected ≥2)`);
      allPassed = false;
    }
  }

  // ── Step 6: Search memories ──────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Step 6: Search memories (keyword match)                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const searchResult = await callMem0Raw('mem0_search', {
    query: 'dark mode preferences',
    userId: TEST_USER_ID,
    appId: TEST_AGENCY_ID,
    topK: 10,
  });

  if (searchResult.error) {
    console.log(`\n  ❌ STEP 6 FAILED: ${searchResult.error}`);
    allPassed = false;
  } else {
    const results = searchResult.parsed?.results || (Array.isArray(searchResult.parsed) ? searchResult.parsed : []);
    console.log(`\n  ${results.length > 0 ? '✅' : '❌'} STEP 6: Search returned ${results.length} results`);
    if (results.length === 0) allPassed = false;
  }

  // ── Step 7: Cleanup ──────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Step 7: Cleanup test data                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const deleteResult = await callMem0Raw('mem0_delete_all', {
    userId: TEST_USER_ID,
    appId: TEST_AGENCY_ID,
  });

  if (deleteResult.error) {
    console.log(`\n  ⚠️  Cleanup warning: ${deleteResult.error}`);
  } else {
    console.log(`\n  ✅ Cleanup complete`);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('  🎉 ALL STEPS PASSED — Service layer pipeline is working');
    console.log('  → Issue is likely in Next.js API layer or auth context');
  } else {
    console.log('  ⚠️  SOME STEPS FAILED — Review raw responses above');
    console.log('  → Focus on the response shape/parsing at each step');
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
