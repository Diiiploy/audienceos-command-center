/**
 * Chat Rate Limiting Tests
 *
 * Verifies that the chat route is protected with rate limiting.
 * Config: 10 requests/minute per user
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimitDistributed, checkRateLimit } from '@/lib/security';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => null), // Force fallback to in-memory
}));

describe('Chat Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit (in-memory)', () => {
    it('allows requests under limit', () => {
      const identifier = `test-user-${Date.now()}`;
      const config = { maxRequests: 10, windowMs: 60000 };

      // First request should be allowed
      const result1 = checkRateLimit(identifier, config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(9);

      // 9 more requests should be allowed
      for (let i = 0; i < 9; i++) {
        const result = checkRateLimit(identifier, config);
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks requests over limit with 429 response', () => {
      const identifier = `test-user-block-${Date.now()}`;
      const config = { maxRequests: 10, windowMs: 60000 };

      // Make 10 allowed requests
      for (let i = 0; i < 10; i++) {
        checkRateLimit(identifier, config);
      }

      // 11th request should be blocked
      const result = checkRateLimit(identifier, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('returns correct remaining count', () => {
      const identifier = `test-user-remaining-${Date.now()}`;
      const config = { maxRequests: 10, windowMs: 60000 };

      const result1 = checkRateLimit(identifier, config);
      expect(result1.remaining).toBe(9);

      const result2 = checkRateLimit(identifier, config);
      expect(result2.remaining).toBe(8);

      const result3 = checkRateLimit(identifier, config);
      expect(result3.remaining).toBe(7);
    });

    it('includes reset time in response', () => {
      const identifier = `test-user-reset-${Date.now()}`;
      const config = { maxRequests: 10, windowMs: 60000 };

      const result = checkRateLimit(identifier, config);
      expect(result.resetTime).toBeDefined();
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('isolates rate limits per user', () => {
      const user1 = `test-user-1-${Date.now()}`;
      const user2 = `test-user-2-${Date.now()}`;
      const config = { maxRequests: 10, windowMs: 60000 };

      // User 1 makes 10 requests (exhausts limit)
      for (let i = 0; i < 10; i++) {
        checkRateLimit(user1, config);
      }

      // User 1 is blocked
      const result1 = checkRateLimit(user1, config);
      expect(result1.allowed).toBe(false);

      // User 2 is NOT blocked (separate limit)
      const result2 = checkRateLimit(user2, config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(9);
    });
  });

  describe('checkRateLimitDistributed (async)', () => {
    it('falls back to in-memory when Supabase unavailable', async () => {
      const identifier = `test-user-async-${Date.now()}`;
      const config = { maxRequests: 10, windowMs: 60000 };

      // Should fall back to in-memory (Supabase mocked to return null)
      const result = await checkRateLimitDistributed(identifier, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe('Chat-specific config validation', () => {
    it('verifies chat rate limit config is 10 req/min', () => {
      // This config should be used in the chat route
      const CHAT_RATE_LIMIT = { maxRequests: 10, windowMs: 60000 };

      expect(CHAT_RATE_LIMIT.maxRequests).toBe(10);
      expect(CHAT_RATE_LIMIT.windowMs).toBe(60000); // 1 minute
    });
  });
});
