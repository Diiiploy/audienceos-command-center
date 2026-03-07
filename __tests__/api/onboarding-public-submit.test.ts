/**
 * Tests for POST /api/public/onboarding/[token]/submit
 * Public endpoint — submits intake form responses, auto-advances stage
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockTableData: Record<string, { data: unknown; error: unknown }> = {}

// Supabase mock that handles chained calls and resolves correctly when awaited.
// Key: upsert/update are "terminal-ish" — they return a thenable that resolves to { data, error }.
function makeChain(result: { data: unknown; error: unknown }) {
  const resolved = Promise.resolve(result)
  const handler: Record<string, unknown> = {}
  const proxy: unknown = new Proxy(handler, {
    get(_t, prop: string) {
      // Make the proxy thenable so `await supabase.from('x').upsert(...)` works
      if (prop === 'then') return resolved.then.bind(resolved)
      if (['single', 'maybeSingle'].includes(prop)) {
        return vi.fn().mockResolvedValue(result)
      }
      if (prop === 'order') return vi.fn().mockResolvedValue(result)
      // Everything else chains
      return vi.fn().mockReturnValue(proxy)
    },
  })
  return proxy
}

const mockSupabase = {
  from: vi.fn((table: string) => {
    const chain = makeChain(mockTableData[table] || { data: null, error: null })
    return chain
  }),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}))

import { POST } from '@/app/api/public/onboarding/[token]/submit/route'
import { NextRequest } from 'next/server'

function makeRequest(token: string, body: unknown) {
  return new NextRequest(`http://localhost:3000/api/public/onboarding/${token}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeContext(token: string) {
  return { params: Promise.resolve({ token }) }
}

describe('POST /api/public/onboarding/[token]/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockTableData).forEach((k) => delete mockTableData[k])
  })

  it('rejects short tokens', async () => {
    const res = await POST(makeRequest('short', {}), makeContext('short'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid')
  })

  it('rejects missing responses array', async () => {
    const token = 'a'.repeat(64)
    mockTableData['onboarding_instance'] = {
      data: { id: 'i1', agency_id: 'a1', status: 'pending', journey_id: 'j1' },
      error: null,
    }

    const res = await POST(makeRequest(token, { data: 'wrong' }), makeContext(token))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Responses')
  })

  it('rejects non-array responses', async () => {
    const token = 'b'.repeat(64)
    const res = await POST(makeRequest(token, { responses: 'not-array' }), makeContext(token))
    expect(res.status).toBe(400)
  })

  it('returns 404 for invalid token', async () => {
    const token = 'c'.repeat(64)
    mockTableData['onboarding_instance'] = { data: null, error: { code: 'PGRST116' } }

    const res = await POST(
      makeRequest(token, { responses: [{ field_id: 'f1', value: 'test' }] }),
      makeContext(token),
    )
    expect(res.status).toBe(404)
  })

  it('returns 410 for completed onboarding', async () => {
    const token = 'd'.repeat(64)
    mockTableData['onboarding_instance'] = {
      data: { id: 'i1', agency_id: 'a1', status: 'completed', journey_id: 'j1' },
      error: null,
    }

    const res = await POST(
      makeRequest(token, { responses: [{ field_id: 'f1', value: 'test' }] }),
      makeContext(token),
    )
    expect(res.status).toBe(410)
  })

  it('successfully submits responses', async () => {
    const token = 'e'.repeat(64)
    mockTableData['onboarding_instance'] = {
      data: { id: 'inst-1', agency_id: 'ag-1', status: 'pending', journey_id: 'j-1' },
      error: null,
    }
    mockTableData['intake_response'] = { data: null, error: null }
    mockTableData['onboarding_journey'] = {
      data: { stages: [{ id: 's1', name: 'Intake' }, { id: 's2', name: 'Access' }] },
      error: null,
    }
    mockTableData['onboarding_stage_status'] = { data: null, error: null }

    const res = await POST(
      makeRequest(token, {
        responses: [
          { field_id: 'company', value: 'Test Corp' },
          { field_id: 'email', value: 'test@example.com' },
        ],
      }),
      makeContext(token),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('handles invalid JSON body gracefully', async () => {
    const token = 'f'.repeat(64)
    // NextRequest with invalid JSON
    const req = new NextRequest(`http://localhost:3000/api/public/onboarding/${token}/submit`, {
      method: 'POST',
      body: 'not json{{{',
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req, makeContext(token))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid JSON')
  })

  it('stringifies response values', async () => {
    const token = 'g'.repeat(64)
    mockTableData['onboarding_instance'] = {
      data: { id: 'i1', agency_id: 'a1', status: 'pending', journey_id: 'j1' },
      error: null,
    }
    mockTableData['intake_response'] = { data: null, error: null }
    mockTableData['onboarding_journey'] = { data: { stages: [] }, error: null }

    // Value with null should become empty string
    const res = await POST(
      makeRequest(token, {
        responses: [
          { field_id: 'field1', value: null },
          { field_id: 'field2', value: 42 },
        ],
      }),
      makeContext(token),
    )

    expect(res.status).toBe(200)
  })
})
