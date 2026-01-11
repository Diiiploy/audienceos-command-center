/**
 * Auth Callback Handler Tests
 * Tests the OAuth callback route handler at /auth/callback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}))

// Mock createRouteHandlerClient
const mockExchangeCodeForSession = vi.fn()
vi.mock('@/lib/supabase', () => ({
  createRouteHandlerClient: vi.fn(() => Promise.resolve({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}))

// Import after mocks
import { GET } from '@/app/auth/callback/route'

describe('Auth Callback Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Error Handling', () => {
    it('should redirect to login with error when OAuth provider returns error', async () => {
      const request = new Request(
        'http://localhost:3000/auth/callback?error=access_denied&error_description=User%20denied%20access'
      )

      const response = await GET(request)

      expect(response.status).toBe(307) // Redirect
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=access_denied')
      // URL encoding may use + or %20 for spaces, check for either
      expect(location).toMatch(/error_description=User[+%20]denied[+%20]access/)
    })

    it('should redirect to login when no code is provided', async () => {
      const request = new Request('http://localhost:3000/auth/callback')

      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=no_code')
    })

    it('should redirect to login when code exchange fails', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: 'Invalid code' },
      })

      const request = new Request(
        'http://localhost:3000/auth/callback?code=invalid_code'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=auth_callback_error')
      // Note: We no longer expose error messages for security
      expect(location).not.toContain('message=')
    })

    it('should handle unexpected errors gracefully', async () => {
      mockExchangeCodeForSession.mockRejectedValue(new Error('Network error'))

      const request = new Request(
        'http://localhost:3000/auth/callback?code=valid_code'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toContain('/login')
      expect(location).toContain('error=unexpected_error')
    })
  })

  describe('Successful Authentication', () => {
    it('should redirect to dashboard on successful code exchange', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null })

      const request = new Request(
        'http://localhost:3000/auth/callback?code=valid_code'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toBe('http://localhost:3000/')
    })

    it('should redirect to specified next URL on success', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null })

      const request = new Request(
        'http://localhost:3000/auth/callback?code=valid_code&next=/client/dashboard'
      )

      const response = await GET(request)

      expect(response.status).toBe(307)
      const location = response.headers.get('location')
      expect(location).toBe('http://localhost:3000/client/dashboard')
    })

    it('should call exchangeCodeForSession with the provided code', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null })

      const request = new Request(
        'http://localhost:3000/auth/callback?code=test_code_123'
      )

      await GET(request)

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test_code_123')
    })
  })

  describe('Security', () => {
    it('should not expose internal error details in redirect URL', async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: 'Internal database connection failed at row 123' },
      })

      const request = new Request(
        'http://localhost:3000/auth/callback?code=some_code'
      )

      const response = await GET(request)
      const location = response.headers.get('location')

      // Should only contain generic error, not internal details
      expect(location).toContain('error=auth_callback_error')
      expect(location).not.toContain('database')
      expect(location).not.toContain('row 123')
      expect(location).not.toContain('message=')
    })

    it('should only redirect to same origin (prevent open redirect)', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null })

      // Try to inject external URL
      const request = new Request(
        'http://localhost:3000/auth/callback?code=valid_code&next=https://evil.com/steal'
      )

      const response = await GET(request)
      const location = response.headers.get('location')

      // Should redirect to root, not the malicious URL
      expect(location).toBe('http://localhost:3000/')
      expect(location).not.toContain('evil.com')
    })

    it('should block protocol-relative URLs', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null })

      const request = new Request(
        'http://localhost:3000/auth/callback?code=valid_code&next=//evil.com/steal'
      )

      const response = await GET(request)
      const location = response.headers.get('location')

      expect(location).toBe('http://localhost:3000/')
    })

    it('should allow valid relative paths', async () => {
      mockExchangeCodeForSession.mockResolvedValue({ error: null })

      const request = new Request(
        'http://localhost:3000/auth/callback?code=valid_code&next=/client/settings'
      )

      const response = await GET(request)
      const location = response.headers.get('location')

      expect(location).toBe('http://localhost:3000/client/settings')
    })
  })
})
