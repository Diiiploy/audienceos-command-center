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
} from '@/lib/security'

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
})
