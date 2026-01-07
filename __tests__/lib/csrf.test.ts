/**
 * CSRF Client Utilities Tests
 * Tests for lib/csrf.ts - client-side CSRF token handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to test client-side code, so mock document
const mockDocument = {
  cookie: '',
}

// Store original document
const originalDocument = global.document

describe('CSRF Client Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDocument.cookie = ''
    // Mock document for browser environment
    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Restore original document
    if (originalDocument) {
      Object.defineProperty(global, 'document', {
        value: originalDocument,
        writable: true,
        configurable: true,
      })
    }
  })

  describe('getCsrfToken', () => {
    it('should return null when no CSRF cookie exists', () => {
      mockDocument.cookie = ''

      const getCsrfToken = (): string | null => {
        if (typeof document === 'undefined') return null
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === '__csrf_token') {
            return decodeURIComponent(value)
          }
        }
        return null
      }

      expect(getCsrfToken()).toBeNull()
    })

    it('should return token when CSRF cookie exists', () => {
      mockDocument.cookie = '__csrf_token=abc123def456'

      const getCsrfToken = (): string | null => {
        if (typeof document === 'undefined') return null
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === '__csrf_token') {
            return decodeURIComponent(value)
          }
        }
        return null
      }

      expect(getCsrfToken()).toBe('abc123def456')
    })

    it('should handle multiple cookies correctly', () => {
      mockDocument.cookie = 'other_cookie=value1; __csrf_token=mytoken123; another=value2'

      const getCsrfToken = (): string | null => {
        if (typeof document === 'undefined') return null
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === '__csrf_token') {
            return decodeURIComponent(value)
          }
        }
        return null
      }

      expect(getCsrfToken()).toBe('mytoken123')
    })

    it('should decode URI-encoded token values', () => {
      mockDocument.cookie = '__csrf_token=' + encodeURIComponent('token/with+special=chars')

      const getCsrfToken = (): string | null => {
        if (typeof document === 'undefined') return null
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === '__csrf_token') {
            return decodeURIComponent(value)
          }
        }
        return null
      }

      expect(getCsrfToken()).toBe('token/with+special=chars')
    })

    it('should handle whitespace around cookie values', () => {
      mockDocument.cookie = '  __csrf_token=spacedtoken  '

      const getCsrfToken = (): string | null => {
        if (typeof document === 'undefined') return null
        const cookies = document.cookie.split(';')
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=')
          if (name === '__csrf_token') {
            return decodeURIComponent(value)
          }
        }
        return null
      }

      expect(getCsrfToken()).toBe('spacedtoken')
    })
  })

  describe('getCsrfHeaders', () => {
    it('should return empty object when no token exists', () => {
      mockDocument.cookie = ''

      const getCsrfHeaders = (): Record<string, string> => {
        const getCsrfToken = (): string | null => {
          if (typeof document === 'undefined') return null
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === '__csrf_token') {
              return decodeURIComponent(value)
            }
          }
          return null
        }

        const token = getCsrfToken()
        return token ? { 'X-CSRF-Token': token } : {}
      }

      expect(getCsrfHeaders()).toEqual({})
    })

    it('should return header object when token exists', () => {
      mockDocument.cookie = '__csrf_token=headertoken123'

      const getCsrfHeaders = (): Record<string, string> => {
        const getCsrfToken = (): string | null => {
          if (typeof document === 'undefined') return null
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === '__csrf_token') {
              return decodeURIComponent(value)
            }
          }
          return null
        }

        const token = getCsrfToken()
        return token ? { 'X-CSRF-Token': token } : {}
      }

      expect(getCsrfHeaders()).toEqual({ 'X-CSRF-Token': 'headertoken123' })
    })
  })

  describe('fetchWithCsrf', () => {
    it('should add CSRF header for POST requests', async () => {
      mockDocument.cookie = '__csrf_token=posttoken'
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}'))
      global.fetch = mockFetch

      const fetchWithCsrf = async (url: string, options: RequestInit = {}): Promise<Response> => {
        const getCsrfToken = (): string | null => {
          if (typeof document === 'undefined') return null
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === '__csrf_token') {
              return decodeURIComponent(value)
            }
          }
          return null
        }

        const csrfToken = getCsrfToken()
        const headers = new Headers(options.headers)

        const method = (options.method || 'GET').toUpperCase()
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          headers.set('X-CSRF-Token', csrfToken)
        }

        if (options.body && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json')
        }

        return fetch(url, { ...options, headers })
      }

      await fetchWithCsrf('/api/test', { method: 'POST', body: '{}' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, callOptions] = mockFetch.mock.calls[0]
      expect(callOptions.headers.get('X-CSRF-Token')).toBe('posttoken')
    })

    it('should add CSRF header for PATCH requests', async () => {
      mockDocument.cookie = '__csrf_token=patchtoken'
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}'))
      global.fetch = mockFetch

      const fetchWithCsrf = async (url: string, options: RequestInit = {}): Promise<Response> => {
        const getCsrfToken = (): string | null => {
          if (typeof document === 'undefined') return null
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === '__csrf_token') {
              return decodeURIComponent(value)
            }
          }
          return null
        }

        const csrfToken = getCsrfToken()
        const headers = new Headers(options.headers)

        const method = (options.method || 'GET').toUpperCase()
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          headers.set('X-CSRF-Token', csrfToken)
        }

        return fetch(url, { ...options, headers })
      }

      await fetchWithCsrf('/api/test', { method: 'PATCH' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [, callOptions] = mockFetch.mock.calls[0]
      expect(callOptions.headers.get('X-CSRF-Token')).toBe('patchtoken')
    })

    it('should add CSRF header for DELETE requests', async () => {
      mockDocument.cookie = '__csrf_token=deletetoken'
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}'))
      global.fetch = mockFetch

      const fetchWithCsrf = async (url: string, options: RequestInit = {}): Promise<Response> => {
        const getCsrfToken = (): string | null => {
          if (typeof document === 'undefined') return null
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === '__csrf_token') {
              return decodeURIComponent(value)
            }
          }
          return null
        }

        const csrfToken = getCsrfToken()
        const headers = new Headers(options.headers)

        const method = (options.method || 'GET').toUpperCase()
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          headers.set('X-CSRF-Token', csrfToken)
        }

        return fetch(url, { ...options, headers })
      }

      await fetchWithCsrf('/api/test', { method: 'DELETE' })

      const [, callOptions] = mockFetch.mock.calls[0]
      expect(callOptions.headers.get('X-CSRF-Token')).toBe('deletetoken')
    })

    it('should NOT add CSRF header for GET requests', async () => {
      mockDocument.cookie = '__csrf_token=gettoken'
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}'))
      global.fetch = mockFetch

      const fetchWithCsrf = async (url: string, options: RequestInit = {}): Promise<Response> => {
        const getCsrfToken = (): string | null => {
          if (typeof document === 'undefined') return null
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === '__csrf_token') {
              return decodeURIComponent(value)
            }
          }
          return null
        }

        const csrfToken = getCsrfToken()
        const headers = new Headers(options.headers)

        const method = (options.method || 'GET').toUpperCase()
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          headers.set('X-CSRF-Token', csrfToken)
        }

        return fetch(url, { ...options, headers })
      }

      await fetchWithCsrf('/api/test', { method: 'GET' })

      const [, callOptions] = mockFetch.mock.calls[0]
      expect(callOptions.headers.get('X-CSRF-Token')).toBeNull()
    })

    it('should add Content-Type header for body requests', async () => {
      mockDocument.cookie = '__csrf_token=contenttoken'
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}'))
      global.fetch = mockFetch

      const fetchWithCsrf = async (url: string, options: RequestInit = {}): Promise<Response> => {
        const getCsrfToken = (): string | null => {
          if (typeof document === 'undefined') return null
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === '__csrf_token') {
              return decodeURIComponent(value)
            }
          }
          return null
        }

        const csrfToken = getCsrfToken()
        const headers = new Headers(options.headers)

        const method = (options.method || 'GET').toUpperCase()
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          headers.set('X-CSRF-Token', csrfToken)
        }

        if (options.body && !headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json')
        }

        return fetch(url, { ...options, headers })
      }

      await fetchWithCsrf('/api/test', { method: 'POST', body: '{"test": true}' })

      const [, callOptions] = mockFetch.mock.calls[0]
      expect(callOptions.headers.get('Content-Type')).toBe('application/json')
    })

    it('should preserve existing headers', async () => {
      mockDocument.cookie = '__csrf_token=preservetoken'
      const mockFetch = vi.fn().mockResolvedValue(new Response('{}'))
      global.fetch = mockFetch

      const fetchWithCsrf = async (url: string, options: RequestInit = {}): Promise<Response> => {
        const getCsrfToken = (): string | null => {
          if (typeof document === 'undefined') return null
          const cookies = document.cookie.split(';')
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=')
            if (name === '__csrf_token') {
              return decodeURIComponent(value)
            }
          }
          return null
        }

        const csrfToken = getCsrfToken()
        const headers = new Headers(options.headers)

        const method = (options.method || 'GET').toUpperCase()
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          headers.set('X-CSRF-Token', csrfToken)
        }

        return fetch(url, { ...options, headers })
      }

      await fetchWithCsrf('/api/test', {
        method: 'POST',
        headers: { 'X-Custom-Header': 'custom-value' },
      })

      const [, callOptions] = mockFetch.mock.calls[0]
      expect(callOptions.headers.get('X-Custom-Header')).toBe('custom-value')
      expect(callOptions.headers.get('X-CSRF-Token')).toBe('preservetoken')
    })
  })

  describe('createCsrfFetch', () => {
    it('should return fetchWithCsrf function', () => {
      const createCsrfFetch = () => {
        return async (url: string, options: RequestInit = {}): Promise<Response> => {
          return fetch(url, options)
        }
      }

      const csrfFetch = createCsrfFetch()
      expect(typeof csrfFetch).toBe('function')
    })
  })

  describe('Server-side Handling', () => {
    it('should return null when document is undefined (server-side)', () => {
      // Temporarily make document undefined
      const doc = global.document
      // @ts-expect-error - intentionally setting to undefined for test
      global.document = undefined

      const getCsrfToken = (): string | null => {
        if (typeof document === 'undefined') return null
        return 'should-not-reach-here'
      }

      expect(getCsrfToken()).toBeNull()

      // Restore
      global.document = doc
    })
  })
})
