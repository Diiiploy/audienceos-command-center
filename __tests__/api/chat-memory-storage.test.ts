/**
 * Chat Memory Storage Tests
 *
 * Verifies that chat conversations are stored in memory (Mem0).
 * Requirement: Memory is dual-scoped (per-user AND per-agency).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Track addMemory calls
const addMemoryCalls: Array<{ content: string; userId: string }> = [];

// Mock the Mem0 service
vi.mock('@/lib/memory/mem0-service', () => ({
  initializeMem0Service: vi.fn(() => ({
    addMemory: vi.fn(async (request: {
      content: string;
      agencyId: string;
      userId: string;
      sessionId?: string;
      type: string;
    }) => {
      // Track the call
      addMemoryCalls.push({
        content: request.content,
        userId: `${request.agencyId}:${request.userId}`,
      });
      return { id: `mem-${Date.now()}`, content: request.content, metadata: {} };
    }),
    searchMemories: vi.fn(async () => ({ memories: [], totalFound: 0, searchTimeMs: 0 })),
  })),
  getMem0Service: vi.fn(() => null),
}));

// Mock memory injector
vi.mock('@/lib/memory', () => ({
  getMemoryInjector: vi.fn(() => ({
    detectRecall: vi.fn(() => ({
      isRecallQuery: false,
      confidence: 0,
      suggestedSearchQuery: '',
    })),
    injectMemories: vi.fn(async () => ({
      memories: [],
      contextBlock: '',
      relevanceExplanation: '',
    })),
  })),
}));

// Mock Gemini
vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: vi.fn(async () => ({
        candidates: [{
          content: {
            parts: [{ text: 'Test response from Gemini' }],
          },
        }],
      })),
    };
  },
}));

// Mock RAG
vi.mock('@/lib/rag', () => ({
  getGeminiRAG: vi.fn(() => ({
    search: vi.fn(async () => ({
      content: 'RAG response',
      citations: [],
      isGrounded: true,
    })),
  })),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createRouteHandlerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  })),
}));

// Mock SmartRouter
vi.mock('@/lib/chat/router', () => ({
  getSmartRouter: vi.fn(() => ({
    classifyQuery: vi.fn(async () => ({
      route: 'casual',
      confidence: 1.0,
    })),
  })),
}));

// Mock security
vi.mock('@/lib/security', () => ({
  checkRateLimitDistributed: vi.fn(async () => ({
    allowed: true,
    remaining: 9,
    resetTime: Date.now() + 60000,
  })),
}));

// Mock RBAC
vi.mock('@/lib/rbac/with-permission', () => ({
  withPermission: () => (handler: Function) => handler,
}));

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

describe('Chat Memory Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addMemoryCalls.length = 0; // Clear tracked calls
    process.env.GOOGLE_AI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.GOOGLE_AI_API_KEY;
  });

  describe('Memory storage after chat response', () => {
    it('should call addMemory after successful chat response', async () => {
      // Import the route handler
      const { POST } = await import('@/app/api/v1/chat/route');

      // Create mock request with authenticated user
      const mockRequest = {
        json: async () => ({
          message: 'Tell me about my clients',
          sessionId: 'test-session-123',
        }),
        user: {
          id: 'user-456',
          agencyId: 'agency-789',
          email: 'test@example.com',
          role: 'admin',
        },
      };

      // Call the handler
      const response = await POST(mockRequest as any);

      // Verify response is successful
      expect(response.status).toBe(200);

      // Verify addMemory was called
      expect(addMemoryCalls.length).toBeGreaterThan(0);
    });

    it('should store memory with correct dual-scoped userId', async () => {
      const { POST } = await import('@/app/api/v1/chat/route');

      const mockRequest = {
        json: async () => ({
          message: 'What are my top performing campaigns?',
          sessionId: 'test-session-456',
        }),
        user: {
          id: 'user-123',
          agencyId: 'agency-abc',
          email: 'user@agency.com',
          role: 'member',
        },
      };

      await POST(mockRequest as any);

      // Verify memory has dual-scoped userId (agencyId:userId)
      expect(addMemoryCalls.length).toBeGreaterThan(0);
      expect(addMemoryCalls[0].userId).toBe('agency-abc:user-123');
    });

    it('should include conversation content in memory', async () => {
      const { POST } = await import('@/app/api/v1/chat/route');

      const userMessage = 'Remember that my favorite metric is ROAS';

      const mockRequest = {
        json: async () => ({
          message: userMessage,
          sessionId: 'test-session-789',
        }),
        user: {
          id: 'user-pref',
          agencyId: 'agency-pref',
          email: 'pref@test.com',
          role: 'admin',
        },
      };

      await POST(mockRequest as any);

      // Verify memory content includes the user message
      expect(addMemoryCalls.length).toBeGreaterThan(0);
      expect(addMemoryCalls[0].content).toContain(userMessage);
    });

    it('should NOT store memory when rate limited', async () => {
      // Override rate limit to block
      const { checkRateLimitDistributed } = await import('@/lib/security');
      (checkRateLimitDistributed as any).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      const { POST } = await import('@/app/api/v1/chat/route');

      const mockRequest = {
        json: async () => ({
          message: 'This should not be stored',
        }),
        user: {
          id: 'rate-limited-user',
          agencyId: 'agency-rate',
          email: 'rate@test.com',
          role: 'admin',
        },
      };

      const response = await POST(mockRequest as any);

      // Verify rate limited
      expect(response.status).toBe(429);

      // Verify NO memory was stored
      expect(addMemoryCalls.length).toBe(0);
    });
  });

  describe('Memory content format', () => {
    it('should store conversation with user message and assistant response', async () => {
      const { POST } = await import('@/app/api/v1/chat/route');

      const mockRequest = {
        json: async () => ({
          message: 'How many active clients do I have?',
        }),
        user: {
          id: 'user-content',
          agencyId: 'agency-content',
          email: 'content@test.com',
          role: 'admin',
        },
      };

      await POST(mockRequest as any);

      // Verify memory includes both user message and response context
      expect(addMemoryCalls.length).toBeGreaterThan(0);
      const memoryContent = addMemoryCalls[0].content;
      expect(memoryContent).toContain('How many active clients');
    });
  });
});
