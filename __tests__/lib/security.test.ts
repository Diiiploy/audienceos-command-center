/**
 * Security Utilities Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  sanitizeString,
  sanitizeHtml,
  sanitizeEmail,
  isValidUUID,
  sanitizeObject,
  checkRateLimit,
  sanitizeErrorMessage,
  generateCsrfToken,
  getClientIp,
  validateCsrfToken,
  requiresCsrfValidation,
  parseJsonBody,
  withTimeout,
  createErrorResponse,
} from '@/lib/security'
import { NextRequest } from 'next/server'

describe('Security Utilities', () => {
  describe('sanitizeString', () => {
    it('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>'
      const result = sanitizeString(input)
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;')
    })

    it('should escape single quotes', () => {
      const result = sanitizeString("O'Neil")
      expect(result).toBe('O&#x27;Neil')
    })

    it('should trim whitespace', () => {
      const result = sanitizeString('  hello world  ')
      expect(result).toBe('hello world')
    })

    it('should return empty string for non-string input', () => {
      expect(sanitizeString(null)).toBe('')
      expect(sanitizeString(undefined)).toBe('')
      expect(sanitizeString(123)).toBe('')
      expect(sanitizeString({})).toBe('')
    })

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('')
    })
  })

  describe('sanitizeHtml', () => {
    it('should remove script tags', async () => {
      const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>'
      const result = await sanitizeHtml(input)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
    })

    it('should remove inline event handlers', async () => {
      const input = '<img src="x" onerror="alert(1)">'
      const result = await sanitizeHtml(input)
      expect(result).not.toContain('onerror')
    })

    it('should remove javascript: URLs', async () => {
      const input = '<a href="javascript:alert(1)">Click me</a>'
      const result = await sanitizeHtml(input)
      expect(result).not.toContain('javascript:')
    })

    it('should return empty string for non-string input', async () => {
      expect(await sanitizeHtml(null)).toBe('')
      expect(await sanitizeHtml(undefined)).toBe('')
    })
  })

  describe('sanitizeEmail', () => {
    it('should return valid email in lowercase', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com')
    })

    it('should return null for invalid email', () => {
      expect(sanitizeEmail('not-an-email')).toBe(null)
      expect(sanitizeEmail('missing@')).toBe(null)
      expect(sanitizeEmail('@missing.com')).toBe(null)
      expect(sanitizeEmail('')).toBe(null)
    })

    it('should return null for non-string input', () => {
      expect(sanitizeEmail(null)).toBe(null)
      expect(sanitizeEmail(123)).toBe(null)
    })

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  valid@email.com  ')).toBe('valid@email.com')
    })

    it('should handle complex valid emails', () => {
      expect(sanitizeEmail('user+tag@example.co.uk')).toBe('user+tag@example.co.uk')
    })
  })

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false)
      expect(isValidUUID('')).toBe(false)
      expect(isValidUUID('123e4567-e89b-62d3-a456-426614174000')).toBe(false) // invalid version
    })

    it('should return false for non-string input', () => {
      expect(isValidUUID(null)).toBe(false)
      expect(isValidUUID(undefined)).toBe(false)
      expect(isValidUUID(123)).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(isValidUUID('123E4567-E89B-12D3-A456-426614174000')).toBe(true)
    })
  })

  describe('sanitizeObject', () => {
    it('should sanitize string values in object', () => {
      const input = {
        name: '<script>alert(1)</script>',
        count: 5,
        active: true,
      }
      const result = sanitizeObject(input)
      expect(result.name).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;')
      expect(result.count).toBe(5)
      expect(result.active).toBe(true)
    })

    it('should recursively sanitize nested objects', () => {
      const input = {
        user: {
          name: '<b>Test</b>',
        },
      }
      const result = sanitizeObject(input)
      expect(result.user.name).toBe('&lt;b&gt;Test&lt;&#x2F;b&gt;')
    })

    it('should preserve arrays', () => {
      const input = {
        tags: ['tag1', 'tag2'],
      }
      const result = sanitizeObject(input)
      expect(result.tags).toEqual(['tag1', 'tag2'])
    })
  })

  describe('checkRateLimit', () => {
    beforeEach(() => {
      // Clear rate limit store between tests
      // Note: In actual implementation, we'd need to expose a reset function
    })

    it('should allow first request', () => {
      const result = checkRateLimit('test-unique-id-1')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(99) // Default is 100 max
    })

    it('should track request count', () => {
      const id = 'test-unique-id-2'
      checkRateLimit(id)
      checkRateLimit(id)
      const result = checkRateLimit(id)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(97)
    })

    it('should respect custom limits', () => {
      const id = 'test-unique-id-3'
      const config = { maxRequests: 2, windowMs: 60000 }
      checkRateLimit(id, config)
      checkRateLimit(id, config)
      const result = checkRateLimit(id, config)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })
  })

  describe('sanitizeErrorMessage', () => {
    it('should return generic message for database errors', () => {
      const error = new Error('supabase connection timeout')
      expect(sanitizeErrorMessage(error)).toBe('A database error occurred. Please try again.')
    })

    it('should return auth message for auth errors', () => {
      const error = new Error('unauthorized access')
      expect(sanitizeErrorMessage(error)).toBe('Authentication required.')
    })

    it('should return permission message for permission errors', () => {
      const error = new Error('forbidden action')
      expect(sanitizeErrorMessage(error)).toBe('You do not have permission to perform this action.')
    })

    it('should return not found message for 404 errors', () => {
      const error = new Error('resource not found')
      expect(sanitizeErrorMessage(error)).toBe('The requested resource was not found.')
    })

    it('should return generic message for unknown errors', () => {
      const error = new Error('something unexpected happened')
      expect(sanitizeErrorMessage(error)).toBe('An unexpected error occurred. Please try again.')
    })

    it('should handle non-Error objects', () => {
      expect(sanitizeErrorMessage('string error')).toBe('An unexpected error occurred. Please try again.')
      expect(sanitizeErrorMessage(null)).toBe('An unexpected error occurred. Please try again.')
    })
  })

  describe('generateCsrfToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateCsrfToken()
      expect(token).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(token)).toBe(true)
    })

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('getClientIp', () => {
    const createRequest = (headers: Record<string, string>) => {
      return new NextRequest('https://example.com/api/test', {
        headers: new Headers(headers),
      })
    }

    it('should prioritize cf-connecting-ip header', () => {
      const request = createRequest({
        'cf-connecting-ip': '203.0.113.50',
        'x-real-ip': '192.168.1.1',
        'x-forwarded-for': '10.0.0.1',
      })
      expect(getClientIp(request)).toBe('203.0.113.50')
    })

    it('should use x-real-ip if cf-connecting-ip is missing', () => {
      const request = createRequest({
        'x-real-ip': '203.0.113.50',
        'x-forwarded-for': '10.0.0.1',
      })
      expect(getClientIp(request)).toBe('203.0.113.50')
    })

    it('should use rightmost valid IP from x-forwarded-for', () => {
      const request = createRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1, 203.0.113.50',
      })
      expect(getClientIp(request)).toBe('203.0.113.50')
    })

    it('should return unknown if no valid IP found', () => {
      const request = createRequest({})
      expect(getClientIp(request)).toBe('unknown')
    })

    it('should reject invalid IP addresses', () => {
      const request = createRequest({
        'cf-connecting-ip': 'invalid-ip',
        'x-real-ip': 'also-invalid',
      })
      expect(getClientIp(request)).toBe('unknown')
    })
  })

  describe('validateCsrfToken', () => {
    it('should return true for matching tokens', () => {
      const token = generateCsrfToken()
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: new Headers({
          'x-csrf-token': token,
        }),
      })
      expect(validateCsrfToken(request, token)).toBe(true)
    })

    it('should return false for mismatched tokens', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: new Headers({
          'x-csrf-token': 'wrong-token',
        }),
      })
      expect(validateCsrfToken(request, 'correct-token')).toBe(false)
    })

    it('should return false if header token is missing', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })
      expect(validateCsrfToken(request, 'any-token')).toBe(false)
    })

    it('should return false if expected token is empty', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: new Headers({
          'x-csrf-token': 'some-token',
        }),
      })
      expect(validateCsrfToken(request, '')).toBe(false)
    })
  })

  describe('requiresCsrfValidation', () => {
    it('should return true for POST requests', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
      })
      expect(requiresCsrfValidation(request)).toBe(true)
    })

    it('should return true for PUT requests', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'PUT',
      })
      expect(requiresCsrfValidation(request)).toBe(true)
    })

    it('should return true for PATCH requests', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'PATCH',
      })
      expect(requiresCsrfValidation(request)).toBe(true)
    })

    it('should return true for DELETE requests', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'DELETE',
      })
      expect(requiresCsrfValidation(request)).toBe(true)
    })

    it('should return false for GET requests', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'GET',
      })
      expect(requiresCsrfValidation(request)).toBe(false)
    })

    it('should return false for HEAD requests', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'HEAD',
      })
      expect(requiresCsrfValidation(request)).toBe(false)
    })

    it('should return false for OPTIONS requests', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'OPTIONS',
      })
      expect(requiresCsrfValidation(request)).toBe(false)
    })
  })

  describe('parseJsonBody', () => {
    it('should parse valid JSON body', async () => {
      const body = { name: 'Test', value: 123 }
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: JSON.stringify(body),
      })
      const result = await parseJsonBody(request)
      expect(result.error).toBe(null)
      expect(result.data).toEqual(body)
    })

    it('should reject non-JSON content type', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: new Headers({
          'content-type': 'text/plain',
        }),
        body: '{"name": "test"}',
      })
      const result = await parseJsonBody(request)
      expect(result.error).toBe('Content-Type must be application/json')
      expect(result.data).toBe(null)
    })

    it('should reject request body exceeding max size', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: new Headers({
          'content-type': 'application/json',
          'content-length': '2097152', // 2MB
        }),
        body: JSON.stringify({ large: 'x'.repeat(100) }),
      })
      const result = await parseJsonBody(request, 1024 * 1024) // 1MB max
      expect(result.error).toContain('too large')
      expect(result.data).toBe(null)
    })

    it('should reject invalid JSON', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: 'not-valid-json',
      })
      const result = await parseJsonBody(request)
      expect(result.error).toBe('Invalid JSON in request body')
      expect(result.data).toBe(null)
    })
  })

  describe('withTimeout', () => {
    it('should resolve if promise completes before timeout', async () => {
      const result = await withTimeout(
        Promise.resolve('success'),
        1000
      )
      expect(result).toBe('success')
    })

    it('should reject if timeout expires', async () => {
      await expect(
        withTimeout(
          new Promise(resolve => setTimeout(resolve, 1000)),
          50,
          'Timed out!'
        )
      ).rejects.toThrow('Timed out!')
    })

    it('should preserve error from original promise', async () => {
      await expect(
        withTimeout(
          Promise.reject(new Error('Original error')),
          1000
        )
      ).rejects.toThrow('Original error')
    })
  })

  describe('createErrorResponse', () => {
    it('should create error response with correct status', () => {
      const response = createErrorResponse(400, 'Bad Request')
      expect(response.status).toBe(400)
    })

    it('should create error response with correct status for 401', () => {
      const response = createErrorResponse(401, 'Unauthorized')
      expect(response.status).toBe(401)
    })

    it('should create error response with correct status for 500', () => {
      const response = createErrorResponse(500, 'Internal Server Error')
      expect(response.status).toBe(500)
    })
  })

  describe('XSS Attack Vectors', () => {
    it('should escape HTML tags containing event handlers', () => {
      const input = '<img src=x onerror=alert(1)>'
      const result = sanitizeString(input)
      // sanitizeString escapes the tags - the content becomes harmless text
      expect(result).toContain('&lt;img')
      expect(result).toContain('&gt;')
      // The browser won't execute this as HTML
      expect(result).not.toContain('<img')
    })

    it('sanitizeHtml should remove event handlers', async () => {
      const input = '<img src=x onerror=alert(1)>'
      const result = await sanitizeHtml(input)
      // DOMPurify removes the dangerous img tag entirely
      expect(result).not.toContain('onerror')
    })

    it('should escape javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">click</a>'
      const result = sanitizeString(input)
      expect(result).not.toContain('<a')
    })

    it('should escape data: URLs', () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">click</a>'
      const result = sanitizeString(input)
      expect(result).not.toContain('<a')
    })

    it('should escape nested tags', () => {
      const input = '<<script>script>alert(1)</script>'
      const result = sanitizeString(input)
      expect(result).not.toContain('<script>')
    })

    it('should escape unicode-encoded scripts', () => {
      const input = '\u003cscript\u003ealert(1)\u003c/script\u003e'
      const result = sanitizeString(input)
      expect(result).not.toContain('<script>')
    })
  })

  describe('SQL Injection Prevention', () => {
    it('should escape single quotes', () => {
      const result = sanitizeString("'; DROP TABLE users; --")
      expect(result).toContain('&#x27;')
      expect(result).not.toContain("'")
    })

    it('should handle UNION attacks', () => {
      const result = sanitizeString("' UNION SELECT * FROM users --")
      expect(result).toContain('&#x27;')
    })

    it('should handle OR attacks', () => {
      const result = sanitizeString("' OR '1'='1")
      expect(result).not.toContain("'")
    })
  })
})
