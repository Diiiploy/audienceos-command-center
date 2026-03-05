/**
 * Shared Supabase mock factory for tests
 *
 * Creates a chainable query builder that mimics Supabase's fluent API.
 * Terminal methods (.single(), .order(), etc.) resolve the configured data.
 */
import { vi } from 'vitest'

type MockData = { data: unknown; error: unknown }

/**
 * Create a chainable mock that returns data at any terminal point.
 * Methods like .select(), .eq(), .in() return `this` for chaining.
 * Terminal methods like .single(), .order() return the configured result.
 */
export function createChainableMock(result: MockData = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  const self = new Proxy(chain, {
    get(target, prop: string) {
      if (!target[prop]) {
        target[prop] = vi.fn().mockReturnValue(self)
      }
      return target[prop]
    },
  })

  // Terminal methods that resolve data
  const terminals = ['single', 'maybeSingle', 'order', 'limit', 'range', 'then']
  terminals.forEach((method) => {
    chain[method] = vi.fn().mockResolvedValue(result)
  })

  return self
}

/**
 * Create a mock Supabase client with configurable per-table responses.
 */
export function createMockSupabase(tableResponses: Record<string, MockData> = {}) {
  const client = {
    from: vi.fn((table: string) => {
      const response = tableResponses[table] || { data: null, error: null }
      return createChainableMock(response)
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  }
  return client
}

/**
 * Mock the cookies() function from next/headers
 */
export function mockCookies() {
  return {
    getAll: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }
}

/**
 * Create a mock NextRequest for route handler testing
 */
export function createMockNextRequest(options: {
  method?: string
  body?: unknown
  url?: string
  headers?: Record<string, string>
} = {}) {
  const url = options.url || 'http://localhost:3000/api/test'

  return {
    method: options.method || 'GET',
    url,
    json: vi.fn().mockResolvedValue(options.body || {}),
    headers: new Headers(options.headers || {}),
    nextUrl: new URL(url),
  }
}
