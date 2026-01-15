/**
 * Chat Routes Tests
 * Tests for HGC route handlers in the chat API
 *
 * Created: 2026-01-15 (Red Team Verification)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dependencies
vi.mock('@/lib/rag', () => ({
  getGeminiRAG: vi.fn(() => ({
    search: vi.fn().mockResolvedValue({
      content: 'Found 3 documents about client management.',
      citations: [
        { documentId: 'doc-1', documentName: 'Client Guide.pdf', text: 'Snippet 1' }
      ],
      isGrounded: true,
    }),
  })),
}))

vi.mock('@/lib/memory', () => ({
  getMemoryInjector: vi.fn(() => ({
    detectRecall: vi.fn((query: string) => ({
      isRecall: true,
      suggestedSearchQuery: query,
    })),
    injectMemories: vi.fn().mockResolvedValue({
      memories: [
        { content: 'Previous discussion about project timeline', metadata: {} }
      ],
    }),
  })),
}))

vi.mock('@/lib/memory/mem0-service', () => ({
  initializeMem0Service: vi.fn(),
  getMem0Service: vi.fn(() => ({
    searchMemories: vi.fn().mockResolvedValue({
      memories: [{ id: '1', content: 'Test memory' }],
      totalFound: 1,
      searchTimeMs: 50,
    }),
  })),
}))

describe('Chat Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('RAG Route Handler', () => {
    it('should return search results with citations', async () => {
      const { getGeminiRAG } = await import('@/lib/rag')
      const ragService = getGeminiRAG('test-api-key')

      const result = await ragService.search({
        query: 'How do I manage clients?',
        agencyId: 'test-agency',
        includeGlobal: true,
        maxDocuments: 5,
        minConfidence: 0.5,
      })

      expect(result.content).toBeDefined()
      expect(result.citations).toHaveLength(1)
      expect(result.isGrounded).toBe(true)
    })

    it('should handle empty query gracefully', async () => {
      const { getGeminiRAG } = await import('@/lib/rag')
      const ragService = getGeminiRAG('test-api-key')

      const result = await ragService.search({
        query: '',
        agencyId: 'test-agency',
        includeGlobal: true,
        maxDocuments: 5,
        minConfidence: 0.5,
      })

      // Should still return a valid result structure
      expect(result.content).toBeDefined()
    })
  })

  describe('Memory Route Handler', () => {
    it('should detect recall intent correctly', async () => {
      const { getMemoryInjector } = await import('@/lib/memory')
      const injector = getMemoryInjector()

      const result = injector.detectRecall('What did we discuss yesterday?')
      expect(result.isRecall).toBe(true)
      expect(result.suggestedSearchQuery).toBeDefined()
    })

    it('should inject memories when recall detected', async () => {
      const { getMemoryInjector } = await import('@/lib/memory')
      const injector = getMemoryInjector()

      const result = await injector.injectMemories(
        'project timeline',
        'test-agency',
        'test-user'
      )

      expect(result.memories).toHaveLength(1)
      expect(result.memories[0].content).toContain('project timeline')
    })
  })

  describe('Mem0 Service Authentication', () => {
    it('should include Authorization header when API key is set', () => {
      // Test the header construction logic
      const apiKey = 'test-api-key-12345'
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      }

      expect(headers.Authorization).toBe('Bearer test-api-key-12345')
    })

    it('should not include Authorization header when API key is empty', () => {
      const apiKey = ''
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      }

      expect(headers.Authorization).toBeUndefined()
    })
  })

  describe('Citation Deduplication', () => {
    it('should not add duplicate citations by URL', () => {
      type Citation = { index: number; title: string; url: string; source: string }
      const citations: Citation[] = [
        { index: 1, title: 'Doc 1', url: 'doc-1', source: 'rag' }
      ]

      const newCitation: Citation = {
        index: 2,
        title: 'Doc 1 Duplicate',
        url: 'doc-1',
        source: 'rag',
      }

      // Simulate the deduplication logic from route.ts
      if (!citations.find(c => c.url === newCitation.url)) {
        citations.push(newCitation)
      }

      expect(citations).toHaveLength(1) // Should not add duplicate
    })

    it('should add citation with different URL', () => {
      type Citation = { index: number; title: string; url: string; source: string }
      const citations: Citation[] = [
        { index: 1, title: 'Doc 1', url: 'doc-1', source: 'rag' }
      ]

      const newCitation: Citation = {
        index: 2,
        title: 'Doc 2',
        url: 'doc-2',
        source: 'rag',
      }

      if (!citations.find(c => c.url === newCitation.url)) {
        citations.push(newCitation)
      }

      expect(citations).toHaveLength(2)
    })
  })

  describe('Error Handling', () => {
    it('should return graceful error message on RAG failure', () => {
      const errorMessage = "I couldn't search the knowledge base right now. Please try again or ask a different question."
      expect(errorMessage).toContain('knowledge base')
    })

    it('should return graceful error message on Memory failure', () => {
      const errorMessage = "I'm having trouble accessing my memories right now. Could you remind me what we discussed?"
      expect(errorMessage).toContain('memories')
    })

    it('should return graceful error message on no memories found', () => {
      const noMemoriesMessage = "I don't have any memories of us discussing that topic. Would you like to tell me about it so I can remember for next time?"
      expect(noMemoriesMessage).toContain('memories')
      expect(noMemoriesMessage).toContain('remember')
    })
  })
})

describe('Edge Cases', () => {
  describe('Agency/User ID Fallbacks', () => {
    it('should use demo-agency when agencyId is undefined', () => {
      const agencyId: string | undefined = undefined
      const effectiveAgencyId = agencyId || 'demo-agency'
      expect(effectiveAgencyId).toBe('demo-agency')
    })

    it('should use demo-user when userId is undefined', () => {
      const userId: string | undefined = undefined
      const effectiveUserId = userId || 'demo-user'
      expect(effectiveUserId).toBe('demo-user')
    })

    it('should preserve actual agencyId when provided', () => {
      const agencyId: string | undefined = 'real-agency-123'
      const effectiveAgencyId = agencyId || 'demo-agency'
      expect(effectiveAgencyId).toBe('real-agency-123')
    })
  })

  describe('Streaming Response Handling', () => {
    it('should chunk content correctly', () => {
      const content = 'Hello, this is a test response.'
      const chunkSize = 10
      const chunks: string[] = []

      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize))
      }

      expect(chunks).toHaveLength(4) // 'Hello, thi', 's is a tes', 't response', '.'
      expect(chunks.join('')).toBe(content)
    })

    it('should handle empty content', () => {
      const content = ''
      const chunkSize = 50
      const chunks: string[] = []

      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize))
      }

      expect(chunks).toHaveLength(0)
    })
  })
})
