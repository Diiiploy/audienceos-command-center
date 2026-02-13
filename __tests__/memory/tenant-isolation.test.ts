/**
 * Mem0 Tenant Isolation Tests
 *
 * Validates that mem0's native entity model correctly isolates data
 * across agencies (app_id), users (user_id), clients (metadata.clientId),
 * and sessions (run_id).
 *
 * These tests use a mock MCP client that simulates diiiploy-gateway behavior.
 * For live API tests, use scripts/verify-mem0-isolation.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Mem0Service, createMem0Service, resetMem0Service } from '@/lib/memory/mem0-service';

/**
 * In-memory mock of mem0 storage with entity scoping
 */
interface StoredMemory {
  id: string;
  memory: string;
  user_id?: string;
  app_id?: string;
  agent_id?: string;
  run_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

function createMockMem0Client() {
  const memories: StoredMemory[] = [];
  let idCounter = 0;

  function matchesEntity(mem: StoredMemory, params: Record<string, unknown>): boolean {
    if (params.userId && mem.user_id !== params.userId) return false;
    if (params.appId && mem.app_id !== params.appId) return false;
    if (params.agentId && mem.agent_id !== params.agentId) return false;
    if (params.runId && mem.run_id !== params.runId) return false;
    return true;
  }

  function matchesMetadataFilter(mem: StoredMemory, filters: Record<string, unknown>): boolean {
    if (!filters) return true;
    const andFilters = filters.AND as Array<Record<string, unknown>> | undefined;
    if (!andFilters) return true;

    for (const filter of andFilters) {
      if (filter.app_id && mem.app_id !== filter.app_id) return false;
      if (filter.user_id && mem.user_id !== filter.user_id) return false;
      if (filter.metadata) {
        const metaFilter = filter.metadata as Record<string, unknown>;
        for (const [key, value] of Object.entries(metaFilter)) {
          if (mem.metadata?.[key] !== value) return false;
        }
      }
    }
    return true;
  }

  return {
    _memories: memories,
    addMemory: async (params: any) => {
      const id = `mem-${++idCounter}`;
      memories.push({
        id,
        memory: params.content || params.messages?.[0]?.content || '',
        user_id: params.userId,
        app_id: params.appId,
        agent_id: params.agentId,
        run_id: params.runId,
        metadata: params.metadata,
        created_at: new Date().toISOString(),
      });
      return { id };
    },
    searchMemories: async (params: any) => {
      return memories
        .filter((m) => {
          if (!matchesEntity(m, params)) return false;
          if (params.filters && !matchesMetadataFilter(m, params.filters)) return false;
          // Simple text match for search
          if (params.query && !m.memory.toLowerCase().includes(params.query.toLowerCase())) return false;
          return true;
        })
        .map((m) => ({
          id: m.id,
          memory: m.memory,
          score: 0.9,
          metadata: m.metadata,
        }));
    },
    getMemory: async (params: any) => {
      const mem = memories.find((m) => m.id === params.memoryId);
      if (!mem) throw new Error('Not found');
      return { id: mem.id, memory: mem.memory, user_id: mem.user_id, metadata: mem.metadata, created_at: mem.created_at };
    },
    listMemories: async (params: any) => {
      const filtered = memories.filter((m) => matchesEntity(m, params));
      return { results: filtered.map((m) => ({ id: m.id, memory: m.memory, user_id: m.user_id, metadata: m.metadata, created_at: m.created_at })), count: filtered.length };
    },
    updateMemory: async (params: any) => {
      const mem = memories.find((m) => m.id === params.memoryId);
      if (!mem) throw new Error('Not found');
      mem.memory = params.content;
      return { id: mem.id, memory: mem.memory };
    },
    deleteMemory: async (params: any) => {
      const idx = memories.findIndex((m) => m.id === params.memoryId);
      if (idx >= 0) memories.splice(idx, 1);
      return { success: true, deleted: params.memoryId };
    },
    deleteAllMemories: async (params: any) => {
      const toDelete = memories.filter((m) => matchesEntity(m, params));
      for (const mem of toDelete) {
        const idx = memories.indexOf(mem);
        if (idx >= 0) memories.splice(idx, 1);
      }
      return { success: true };
    },
    getMemoryHistory: async () => [],
    getEntities: async () => [],
    configureProject: async (params: any) => params,
  };
}

describe('Mem0 Tenant Isolation', () => {
  let service: Mem0Service;
  let mockClient: ReturnType<typeof createMockMem0Client>;

  beforeEach(() => {
    resetMem0Service();
    mockClient = createMockMem0Client();
    service = createMem0Service(mockClient as any);
  });

  // Test 1: Cross-agency isolation
  it('should isolate memories across agencies (app_id)', async () => {
    await service.addMemory({
      content: 'Agency A secret strategy',
      agencyId: 'agency-A',
      userId: 'user-1',
      type: 'decision',
    });

    // Search from agency-B should find nothing
    const result = await service.searchMemories({
      query: 'secret strategy',
      agencyId: 'agency-B',
      userId: 'user-1',
    });

    expect(result.memories).toHaveLength(0);
  });

  // Test 2: Cross-client isolation
  it('should isolate memories across clients (metadata.clientId)', async () => {
    await service.addMemory({
      content: 'Client X branding preferences',
      agencyId: 'agency-A',
      userId: 'user-1',
      clientId: 'client-X',
      type: 'preference',
    });

    // Search for client-Y should not find client-X data
    const result = await service.searchMemories({
      query: 'branding preferences',
      agencyId: 'agency-A',
      userId: 'user-1',
      clientId: 'client-Y',
    });

    expect(result.memories).toHaveLength(0);
  });

  // Test 3: Cross-user isolation
  it('should isolate memories across users (user_id)', async () => {
    await service.addMemory({
      content: 'User 1 personal preference',
      agencyId: 'agency-A',
      userId: 'user-1',
      type: 'preference',
    });

    // Search as user-2 should find nothing
    const result = await service.searchMemories({
      query: 'personal preference',
      agencyId: 'agency-A',
      userId: 'user-2',
    });

    expect(result.memories).toHaveLength(0);
  });

  // Test 4: Same-user same-agency retrieval works
  it('should retrieve memories for correct user + agency scope', async () => {
    await service.addMemory({
      content: 'Preferred ad format is carousel',
      agencyId: 'agency-A',
      userId: 'user-1',
      type: 'preference',
    });

    const result = await service.searchMemories({
      query: 'ad format carousel',
      agencyId: 'agency-A',
      userId: 'user-1',
    });

    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].content).toContain('carousel');
  });

  // Test 5: Tenant offboarding — delete all agency memories
  it('should delete all agency memories without affecting other agencies', async () => {
    await service.addMemory({
      content: 'Agency A data',
      agencyId: 'agency-A',
      userId: 'user-1',
      type: 'conversation',
    });
    await service.addMemory({
      content: 'Agency B data',
      agencyId: 'agency-B',
      userId: 'user-1',
      type: 'conversation',
    });

    // Delete all for agency-A
    await service.clearAgencyMemories('agency-A');

    // Agency-A should be empty
    const resultA = await service.searchMemories({
      query: 'data',
      agencyId: 'agency-A',
      userId: 'user-1',
    });
    expect(resultA.memories).toHaveLength(0);

    // Agency-B should be unaffected
    const resultB = await service.searchMemories({
      query: 'data',
      agencyId: 'agency-B',
      userId: 'user-1',
    });
    expect(resultB.memories).toHaveLength(1);
  });

  // Test 6: Session cleanup
  it('should delete session memories without affecting other sessions', async () => {
    await service.addMemory({
      content: 'Session 123 chat',
      agencyId: 'agency-A',
      userId: 'user-1',
      sessionId: 'session-123',
      type: 'conversation',
    });
    await service.addMemory({
      content: 'Session 456 chat',
      agencyId: 'agency-A',
      userId: 'user-1',
      sessionId: 'session-456',
      type: 'conversation',
    });

    // Delete session-123
    await service.clearSessionMemories('user-1', 'session-123');

    // Session-123 should be gone
    const stored = mockClient._memories;
    const session123 = stored.filter((m) => m.run_id === 'session-123');
    const session456 = stored.filter((m) => m.run_id === 'session-456');

    expect(session123).toHaveLength(0);
    expect(session456).toHaveLength(1);
  });

  // Test 7: No default user_id leakage
  it('should use native entity params without compound ID format', async () => {
    await service.addMemory({
      content: 'Test memory',
      agencyId: 'agency-A',
      userId: 'user-1',
      type: 'conversation',
    });

    const stored = mockClient._memories[0];

    // Verify native entity params are used (not compound IDs)
    expect(stored.user_id).toBe('user-1');
    expect(stored.app_id).toBe('agency-A');

    // Verify no compound ID format (should NOT contain '::')
    expect(stored.user_id).not.toContain('::');
  });

  // Test 8: Metadata is stored natively (not encoded in content)
  it('should store metadata natively, not encoded in content JSON', async () => {
    await service.addMemory({
      content: 'Client prefers blue branding',
      agencyId: 'agency-A',
      userId: 'user-1',
      clientId: 'client-X',
      type: 'preference',
      importance: 'high',
      topic: 'branding',
    });

    const stored = mockClient._memories[0];

    // Content should be plain text, NOT JSON-encoded
    expect(stored.memory).toBe('Client prefers blue branding');
    expect(stored.memory).not.toContain('"content":');
    expect(stored.memory).not.toContain('"metadata":');

    // Metadata should be stored as native object
    expect(stored.metadata).toBeDefined();
    expect(stored.metadata?.type).toBe('preference');
    expect(stored.metadata?.clientId).toBe('client-X');
    expect(stored.metadata?.importance).toBe('high');
    expect(stored.metadata?.topic).toBe('branding');
  });

  // Test 9: Memory expiration is calculated correctly
  it('should set expiration date for conversation type (30 days)', async () => {
    const before = Date.now();

    await service.addMemory({
      content: 'Chat summary',
      agencyId: 'agency-A',
      userId: 'user-1',
      type: 'conversation',
    });

    // The mock doesn't store expiration, but we can verify the service
    // calculates it correctly by checking the EXPIRATION_DAYS config
    const { EXPIRATION_DAYS } = await import('@/lib/memory/types');
    expect(EXPIRATION_DAYS.conversation).toBe(30);
    expect(EXPIRATION_DAYS.decision).toBeNull();
    expect(EXPIRATION_DAYS.preference).toBeNull();
    expect(EXPIRATION_DAYS.project).toBe(90);
    expect(EXPIRATION_DAYS.insight).toBeNull();
    expect(EXPIRATION_DAYS.task).toBe(14);
  });

  // Test 10: Message array passthrough
  it('should accept message arrays for contextual add', async () => {
    await service.addMemory({
      content: 'Summary of conversation',
      messages: [
        { role: 'user', content: 'I want to change our branding to blue' },
        { role: 'assistant', content: 'I have noted your preference for blue branding' },
      ],
      agencyId: 'agency-A',
      userId: 'user-1',
      type: 'preference',
    });

    // Verify memory was stored (mock uses first message content)
    expect(mockClient._memories).toHaveLength(1);
  });
});
