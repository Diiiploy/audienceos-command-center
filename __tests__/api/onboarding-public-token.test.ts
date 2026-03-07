/**
 * Tests for GET /api/public/onboarding/[token]
 * Public endpoint — validates token, returns instance + journey + form fields
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track what the mock returns per-table
const mockTableData: Record<string, { data: unknown; error: unknown }> = {}

// Create a chainable mock for each table
function makeChain(result: { data: unknown; error: unknown }) {
  const handler: Record<string, unknown> = {}
  const proxy: unknown = new Proxy(handler, {
    get(_t, prop: string) {
      if (prop === 'then') return undefined // not thenable until terminal
      if (['single', 'maybeSingle'].includes(prop)) {
        return vi.fn().mockResolvedValue(result)
      }
      if (prop === 'order') {
        return vi.fn().mockResolvedValue(result)
      }
      return vi.fn().mockReturnValue(proxy)
    },
  })
  return proxy
}

const mockSupabase = {
  from: vi.fn((table: string) => makeChain(mockTableData[table] || { data: null, error: null })),
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [] }),
}))

// Import after mocks
import { GET } from '@/app/api/public/onboarding/[token]/route'
import { NextRequest } from 'next/server'

function makeRequest(token: string) {
  const url = `http://localhost:3000/api/public/onboarding/${token}`
  return new NextRequest(url) as unknown as NextRequest
}

function makeContext(token: string) {
  return { params: Promise.resolve({ token }) }
}

describe('GET /api/public/onboarding/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockTableData).forEach((k) => delete mockTableData[k])
  })

  it('rejects tokens shorter than 32 chars', async () => {
    const res = await GET(makeRequest('short'), makeContext('short'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('Invalid')
  })

  it('returns 404 for non-existent token', async () => {
    const token = 'a'.repeat(64)
    mockTableData['onboarding_instance'] = { data: null, error: { code: 'PGRST116' } }

    const res = await GET(makeRequest(token), makeContext(token))
    expect(res.status).toBe(404)
  })

  it('returns 410 for completed onboarding', async () => {
    const token = 'b'.repeat(64)
    mockTableData['onboarding_instance'] = {
      data: {
        id: 'inst-1',
        status: 'completed',
        agency_id: 'ag-1',
        journey_id: 'j-1',
        client: { id: 'c1', name: 'Test Client' },
        journey: { id: 'j-1', name: 'Default', stages: [] },
      },
      error: null,
    }

    const res = await GET(makeRequest(token), makeContext(token))
    expect(res.status).toBe(410)
    const body = await res.json()
    expect(body.completed).toBe(true)
  })

  it('returns instance, journey, agency_name, and fields for valid token', async () => {
    const token = 'c'.repeat(64)
    mockTableData['onboarding_instance'] = {
      data: {
        id: 'inst-2',
        status: 'pending',
        agency_id: 'ag-1',
        journey_id: 'j-1',
        slack_channel_id: 'C123',
        slack_channel_name: 'test-client',
        drive_folder_id: 'folder-1',
        drive_folder_url: 'https://drive.google.com/folder-1',
        provisioning_data: { provisioned_at: '2026-01-01' },
        client: { id: 'c1', name: 'Test Corp' },
        journey: {
          id: 'j-1',
          name: 'Default Journey',
          description: 'Onboard new clients',
          welcome_video_url: 'https://youtube.com/watch?v=abc123',
          stages: [{ id: 's1', name: 'Intake' }],
          access_delegation_config: [
            { id: 'meta', name: 'Meta', email: 'meta@test.io', required: true },
          ],
        },
      },
      error: null,
    }
    mockTableData['agency'] = { data: { name: 'Test Agency' }, error: null }
    mockTableData['intake_form_field'] = {
      data: [
        { id: 'f1', field_label: 'Company', field_type: 'text', is_required: true, journey_id: 'j-1', is_active: true, sort_order: 0 },
      ],
      error: null,
    }

    const res = await GET(makeRequest(token), makeContext(token))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.instance.client_name).toBe('Test Corp')
    expect(body.data.instance.slack_channel_id).toBe('C123')
    expect(body.data.instance.drive_folder_url).toBe('https://drive.google.com/folder-1')
    expect(body.data.agency_name).toBe('Test Agency')
    expect(body.data.journey.access_delegation_config).toHaveLength(1)
    expect(body.data.journey.welcome_video_url).toContain('youtube')
  })

  it('returns empty token error for missing token', async () => {
    const res = await GET(makeRequest(''), makeContext(''))
    expect(res.status).toBe(400)
  })

  it('prefers journey-specific fields over default fields', async () => {
    const token = 'd'.repeat(64)
    mockTableData['onboarding_instance'] = {
      data: {
        id: 'inst-3',
        status: 'pending',
        agency_id: 'ag-1',
        journey_id: 'j-2',
        client: { id: 'c1', name: 'Client' },
        journey: { id: 'j-2', name: 'Custom', stages: [] },
      },
      error: null,
    }
    mockTableData['agency'] = { data: { name: 'Agency' }, error: null }
    mockTableData['intake_form_field'] = {
      data: [
        { id: 'default-1', field_label: 'Default Field', journey_id: null, is_active: true, sort_order: 0 },
        { id: 'custom-1', field_label: 'Custom Field', journey_id: 'j-2', is_active: true, sort_order: 0 },
      ],
      error: null,
    }

    const res = await GET(makeRequest(token), makeContext(token))
    const body = await res.json()
    // Should return journey-specific fields, not defaults
    expect(body.data.fields).toHaveLength(1)
    expect(body.data.fields[0].id).toBe('custom-1')
  })
})
