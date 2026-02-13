#!/usr/bin/env npx tsx
/**
 * Configure Mem0 Project — Custom Categories + Instructions
 *
 * One-time setup script to configure mem0 project-level settings.
 * Run after initial setup or when updating memory extraction rules.
 *
 * Usage: npx tsx scripts/configure-mem0-project.ts
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

const CUSTOM_CATEGORIES = [
  { conversation_summary: 'Summaries of chat sessions and conversation context' },
  { user_preference: 'User preferences, settings, and workflow choices' },
  { decision: 'Decisions made during conversations with context and reasoning' },
  { client_context: 'Client-specific information, notes, and requirements' },
  { task: 'Action items, tasks, and follow-ups' },
  { insight: 'Extracted insights about users, clients, or patterns' },
];

const CUSTOM_INSTRUCTIONS = `Extract and store:
- Confirmed client preferences and requirements
- Decisions made with context and reasoning
- Action items and task assignments
- Client-specific facts (industry, company size, goals)
- User workflow preferences
- Key metrics or KPIs mentioned

Do NOT store:
- Greetings, filler, casual acknowledgments
- Speculative or hypothetical statements (words like "might", "maybe", "could be")
- System error messages or technical debug output
- Repeated information already in memory
- Personally identifiable information (SSN, credit cards, full addresses)
- Raw data dumps or large JSON payloads`;

async function main() {
  console.log('Configuring Mem0 project via diiiploy-gateway...');
  console.log(`Gateway: ${GATEWAY_URL}`);

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
      params: {
        name: 'mem0_configure',
        arguments: {
          custom_categories: CUSTOM_CATEGORIES,
          custom_instructions: CUSTOM_INSTRUCTIONS,
        },
      },
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    console.error(`Failed: HTTP ${response.status}`);
    const text = await response.text();
    console.error(text);
    process.exit(1);
  }

  const data = await response.json();
  console.log('Result:', JSON.stringify(data, null, 2));

  // Check for MCP-level errors (isError flag or error in response text)
  const isError = data.result?.isError === true;
  const textContent = data.result?.content?.[0]?.text;
  let parsedText: any = null;
  try { parsedText = textContent ? JSON.parse(textContent) : null; } catch { /* not JSON */ }
  const hasErrorInText = parsedText?.error === true || parsedText?.error;

  if (isError || hasErrorInText) {
    console.error('\nConfiguration FAILED — mem0 returned an error.');
    if (parsedText?.message) console.error('Message:', parsedText.message);
    process.exit(1);
  }

  console.log('\nMem0 project configured successfully!');
  console.log(`Categories: ${CUSTOM_CATEGORIES.length}`);
  console.log(`Instructions: ${CUSTOM_INSTRUCTIONS.split('\n').length} rules`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
