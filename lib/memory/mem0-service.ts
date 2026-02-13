/**
 * Mem0 Service
 *
 * Integrates with Mem0 via diiiploy-gateway for cross-session memory.
 * Uses mem0's native entity model for multi-tenant isolation:
 *   - app_id  = agencyId (tenant isolation)
 *   - user_id = userId (person)
 *   - run_id  = sessionId (session scoping)
 *   - metadata.clientId = clientId (client-level filtering)
 *
 * Full CRUD: add, search, list, get, update, delete, history, entities, configure.
 */

import type {
  Memory,
  MemoryMetadata,
  MemoryType,
  MemorySearchRequest,
  MemorySearchResult,
  MemoryAddRequest,
  MemoryStats,
  MemoryListResponse,
  MemoryHistoryEntry,
  MemoryEntity,
} from './types';
import { EXPIRATION_DAYS } from './types';

/**
 * Mem0 MCP interface (matches diiiploy-gateway's 10 MCP tools)
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 */
interface Mem0MCPClient {
  addMemory: (params: {
    content?: string;
    messages?: Array<{ role: string; content: string; name?: string }>;
    userId: string;
    appId?: string;
    agentId?: string;
    runId?: string;
    metadata?: Record<string, unknown>;
    expirationDate?: string;
    categories?: string[];
    infer?: boolean;
  }) => Promise<{ id: string }>;

  searchMemories: (params: {
    query: string;
    userId?: string;
    appId?: string;
    agentId?: string;
    runId?: string;
    topK?: number;
    filters?: Record<string, unknown>;
    categories?: string[];
  }) => Promise<Array<{ id: string; memory: string; score?: number; metadata?: Record<string, unknown> }>>;

  getMemory: (params: { memoryId: string }) => Promise<{
    id: string; memory: string; user_id?: string; metadata?: Record<string, unknown>;
    created_at?: string; updated_at?: string;
  }>;

  listMemories: (params: {
    userId?: string; appId?: string; agentId?: string; runId?: string;
    page?: number; pageSize?: number;
  }) => Promise<{ results: Array<{
    id: string; memory: string; user_id?: string; metadata?: Record<string, unknown>;
    created_at?: string; updated_at?: string;
  }>; count?: number }>;

  updateMemory: (params: { memoryId: string; content: string }) => Promise<{
    id: string; memory: string;
  }>;

  deleteMemory: (params: { memoryId: string }) => Promise<{ success: boolean; deleted: string }>;

  deleteAllMemories: (params: {
    userId?: string; appId?: string; agentId?: string; runId?: string;
  }) => Promise<{ success: boolean }>;

  getMemoryHistory: (params: { memoryId: string }) => Promise<Array<{
    id: string; memory_id: string; old_memory?: string; new_memory?: string;
    event: string; created_at?: string;
  }>>;

  getEntities: () => Promise<Array<{ type: string; id: string; name?: string; count?: number }>>;

  configureProject: (params: {
    custom_categories?: Array<Record<string, string>>;
    custom_instructions?: string;
  }) => Promise<Record<string, unknown>>;
}

/**
 * Calculate expiration date based on memory type.
 * Returns ISO 8601 string or undefined (no expiration).
 */
function calculateExpiration(type: MemoryType): string | undefined {
  const ttlDays = EXPIRATION_DAYS[type];
  if (!ttlDays) return undefined;
  return new Date(Date.now() + ttlDays * 86400000).toISOString();
}

/**
 * Build native metadata object from MemoryAddRequest.
 * This metadata is stored directly in mem0 for native filtering.
 */
function buildNativeMetadata(request: {
  agencyId?: string;
  clientId?: string;
  userId?: string;
  sessionId?: string;
  type?: string;
  topic?: string;
  entities?: string[];
  importance?: string;
}): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  if (request.type) meta.type = request.type;
  if (request.clientId) meta.clientId = request.clientId;
  if (request.topic) meta.topic = request.topic;
  if (request.importance) meta.importance = request.importance;
  if (request.entities?.length) meta.entities = request.entities;
  if (request.sessionId) meta.sessionId = request.sessionId;
  return meta;
}

/**
 * Parse memory metadata from mem0 response (native metadata).
 */
function parseResponseMetadata(
  rawMetadata: Record<string, unknown> | undefined,
  defaults: { agencyId: string; userId: string; clientId?: string }
): MemoryMetadata {
  const meta = rawMetadata || {};
  return {
    agencyId: defaults.agencyId,
    clientId: (meta.clientId as string) || defaults.clientId,
    userId: defaults.userId,
    sessionId: meta.sessionId as string | undefined,
    type: (meta.type as MemoryType) || 'conversation',
    topic: meta.topic as string | undefined,
    entities: meta.entities as string[] | undefined,
    importance: (meta.importance as 'low' | 'medium' | 'high') || 'medium',
  };
}

/**
 * Mem0Service - Cross-session memory with native entity scoping
 *
 * Entity mapping:
 *   app_id  = agencyId (tenant isolation — every query scoped by this)
 *   user_id = userId (person attribution)
 *   run_id  = sessionId (session/thread scoping)
 *   metadata.clientId = clientId (client-level filtering via metadata)
 */
export class Mem0Service {
  private mcpClient: Mem0MCPClient;

  constructor(mcpClient: Mem0MCPClient) {
    this.mcpClient = mcpClient;
  }

  /**
   * Add a memory with native entity scoping + metadata
   */
  async addMemory(request: MemoryAddRequest): Promise<Memory> {
    const metadata = buildNativeMetadata(request);
    const expirationDate = calculateExpiration(request.type);

    const result = await this.mcpClient.addMemory({
      content: request.content,
      messages: request.messages,
      userId: request.userId,
      appId: request.agencyId,
      runId: request.sessionId,
      metadata,
      expirationDate,
      infer: true,
    });

    return {
      id: result.id,
      content: request.content,
      metadata: {
        agencyId: request.agencyId,
        clientId: request.clientId,
        userId: request.userId,
        sessionId: request.sessionId,
        type: request.type,
        topic: request.topic,
        entities: request.entities,
        importance: request.importance || 'medium',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Search memories with native entity + metadata filtering
   */
  async searchMemories(request: MemorySearchRequest): Promise<MemorySearchResult> {
    const startTime = Date.now();

    // Build search params using native entity scoping
    const searchParams: Parameters<Mem0MCPClient['searchMemories']>[0] = {
      query: request.query,
      userId: request.userId,
      appId: request.agencyId,
    };

    // Client-scoped search uses metadata filter
    if (request.clientId) {
      searchParams.filters = {
        AND: [
          { app_id: request.agencyId },
          { user_id: request.userId },
          { metadata: { clientId: request.clientId } },
        ],
      };
    }

    // Category filter
    if (request.categories?.length) {
      searchParams.categories = request.categories;
    }

    // Custom filters override
    if (request.filters) {
      searchParams.filters = request.filters;
    }

    const results = await this.mcpClient.searchMemories(searchParams);

    // Map results to Memory objects
    let memories: Memory[] = results.map((result) => ({
      id: result.id,
      content: result.memory,
      metadata: parseResponseMetadata(result.metadata, {
        agencyId: request.agencyId,
        userId: request.userId,
        clientId: request.clientId,
      }),
      score: result.score,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Apply client-side filters (minScore, types) as fallback
    if (request.minScore !== undefined) {
      memories = memories.filter((m) => (m.score ?? 0) >= request.minScore!);
    }

    if (request.types && request.types.length > 0) {
      memories = memories.filter((m) => request.types!.includes(m.metadata.type));
    }

    // Limit results
    const limit = request.limit || 5;
    memories = memories.slice(0, limit);

    return {
      memories,
      totalFound: results.length,
      searchTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get a single memory by ID
   */
  async getMemory(memoryId: string): Promise<Memory | null> {
    try {
      const result = await this.mcpClient.getMemory({ memoryId });
      return {
        id: result.id,
        content: result.memory,
        metadata: parseResponseMetadata(result.metadata, {
          agencyId: '',
          userId: result.user_id || '',
        }),
        createdAt: result.created_at ? new Date(result.created_at) : new Date(),
        updatedAt: result.updated_at ? new Date(result.updated_at) : new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * List all memories for a user (paginated, entity-scoped)
   */
  async listMemories(
    agencyId: string,
    userId: string,
    page: number = 1,
    pageSize: number = 50,
    clientId?: string
  ): Promise<MemoryListResponse> {
    const result = await this.mcpClient.listMemories({
      userId,
      appId: agencyId,
      page,
      pageSize,
    });

    const results = result.results || [];
    let memories: Memory[] = results.map((r) => ({
      id: r.id,
      content: r.memory,
      metadata: parseResponseMetadata(r.metadata, {
        agencyId,
        userId,
        clientId,
      }),
      createdAt: r.created_at ? new Date(r.created_at) : new Date(),
      updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
    }));

    // Client-side filter for clientId if specified
    if (clientId) {
      memories = memories.filter((m) => m.metadata.clientId === clientId);
    }

    return {
      memories,
      page,
      pageSize,
      total: result.count || memories.length,
    };
  }

  /**
   * Update a memory's content
   */
  async updateMemory(memoryId: string, content: string, metadata?: Partial<MemoryMetadata>): Promise<Memory | null> {
    try {
      const result = await this.mcpClient.updateMemory({ memoryId, content });
      return {
        id: result.id,
        content: result.memory || content,
        metadata: {
          agencyId: metadata?.agencyId || '',
          userId: metadata?.userId || '',
          type: metadata?.type || 'conversation',
          ...metadata,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Delete a single memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      const result = await this.mcpClient.deleteMemory({ memoryId });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Delete all memories for a scope using native entity params
   */
  async clearMemories(agencyId: string, userId: string, clientId?: string): Promise<boolean> {
    try {
      // Use native entity scoping for deletion
      const result = await this.mcpClient.deleteAllMemories({
        userId,
        appId: agencyId,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Delete all memories for an agency (admin offboarding)
   */
  async clearAgencyMemories(agencyId: string): Promise<boolean> {
    try {
      const result = await this.mcpClient.deleteAllMemories({ appId: agencyId });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Delete session-scoped memories
   */
  async clearSessionMemories(userId: string, sessionId: string): Promise<boolean> {
    try {
      const result = await this.mcpClient.deleteAllMemories({
        userId,
        runId: sessionId,
      });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get memory change history
   */
  async getMemoryHistory(memoryId: string): Promise<MemoryHistoryEntry[]> {
    try {
      const results = await this.mcpClient.getMemoryHistory({ memoryId });
      return results.map((r) => ({
        id: r.id,
        memoryId: r.memory_id,
        oldContent: r.old_memory || '',
        newContent: r.new_memory || '',
        event: r.event as 'created' | 'updated' | 'deleted',
        timestamp: r.created_at ? new Date(r.created_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * List Mem0 entities
   */
  async getEntities(): Promise<MemoryEntity[]> {
    try {
      const results = await this.mcpClient.getEntities();
      return results.map((r) => ({
        type: r.type as 'user' | 'agent' | 'app',
        id: r.id,
        name: r.name,
        memoryCount: r.count,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Configure mem0 project (custom categories + instructions)
   */
  async configureProject(params: {
    custom_categories?: Array<Record<string, string>>;
    custom_instructions?: string;
  }): Promise<Record<string, unknown>> {
    return this.mcpClient.configureProject(params);
  }

  /**
   * Get recent memories for a user
   */
  async getRecentMemories(
    agencyId: string,
    userId: string,
    limit: number = 10,
    clientId?: string
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      query: 'recent conversations and decisions',
      agencyId,
      clientId,
      userId,
      limit,
    });
    return result.memories;
  }

  /**
   * Get memories by type
   */
  async getMemoriesByType(
    agencyId: string,
    userId: string,
    type: MemoryType,
    limit: number = 10,
    clientId?: string
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      query: `${type} memory`,
      agencyId,
      clientId,
      userId,
      limit,
      types: [type],
    });
    return result.memories;
  }

  /**
   * Get high importance memories
   */
  async getImportantMemories(
    agencyId: string,
    userId: string,
    limit: number = 5,
    clientId?: string
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      query: 'important decisions and preferences',
      agencyId,
      clientId,
      userId,
      limit,
    });
    return result.memories.filter(
      (m) => m.metadata.importance === 'high'
    );
  }

  /**
   * Store a conversation summary with message context
   */
  async storeConversationSummary(
    agencyId: string,
    userId: string,
    sessionId: string,
    summary: string,
    topics: string[],
    clientId?: string,
    messages?: Array<{ role: string; content: string }>
  ): Promise<Memory> {
    return this.addMemory({
      content: summary,
      messages,
      agencyId,
      clientId,
      userId,
      sessionId,
      type: 'conversation',
      topic: topics.join(', '),
      entities: topics,
      importance: 'medium',
    });
  }

  /**
   * Store a decision
   */
  async storeDecision(
    agencyId: string,
    userId: string,
    decision: string,
    context: string,
    clientId?: string
  ): Promise<Memory> {
    return this.addMemory({
      content: `Decision: ${decision}. Context: ${context}`,
      agencyId,
      clientId,
      userId,
      type: 'decision',
      importance: 'high',
    });
  }

  /**
   * Store a user preference
   */
  async storePreference(
    agencyId: string,
    userId: string,
    preference: string,
    clientId?: string
  ): Promise<Memory> {
    return this.addMemory({
      content: `Preference: ${preference}`,
      agencyId,
      clientId,
      userId,
      type: 'preference',
      importance: 'high',
    });
  }

  /**
   * Store a task/action item
   */
  async storeTask(
    agencyId: string,
    userId: string,
    task: string,
    dueContext?: string,
    clientId?: string
  ): Promise<Memory> {
    return this.addMemory({
      content: `Task: ${task}${dueContext ? `. Due: ${dueContext}` : ''}`,
      agencyId,
      clientId,
      userId,
      type: 'task',
      importance: 'medium',
    });
  }

  /**
   * Get memory statistics (estimate)
   */
  async getStats(agencyId: string, userId: string, clientId?: string): Promise<MemoryStats> {
    const types: MemoryType[] = ['conversation', 'decision', 'preference', 'project', 'insight', 'task'];
    const byType: Record<MemoryType, number> = {
      conversation: 0, decision: 0, preference: 0, project: 0, insight: 0, task: 0,
    };
    let totalMemories = 0;

    for (const type of types) {
      const result = await this.searchMemories({
        query: type,
        agencyId,
        clientId,
        userId,
        limit: 100,
        types: [type],
      });
      byType[type] = result.memories.length;
      totalMemories += result.memories.length;
    }

    return {
      totalMemories,
      byType,
      byImportance: { low: 0, medium: 0, high: 0 },
    };
  }
}

// Factory for creating Mem0Service
let mem0ServiceInstance: Mem0Service | null = null;

/**
 * Create Mem0Service with MCP client
 */
export function createMem0Service(mcpClient: Mem0MCPClient): Mem0Service {
  mem0ServiceInstance = new Mem0Service(mcpClient);
  return mem0ServiceInstance;
}

/**
 * Get existing Mem0Service instance
 */
export function getMem0Service(): Mem0Service | null {
  return mem0ServiceInstance;
}

/**
 * Reset the service (for testing)
 */
export function resetMem0Service(): void {
  mem0ServiceInstance = null;
}

/**
 * Diiiploy-gateway HTTP client for Mem0
 * Calls diiiploy-gateway's 10 mem0_* MCP tools via JSON-RPC
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 */
function createDiiiplopyGatewayMem0Client(): Mem0MCPClient {
  const gatewayUrl = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev';
  const apiKey = process.env.DIIIPLOY_GATEWAY_API_KEY || '';

  async function callTool(toolName: string, args: Record<string, unknown>): Promise<any> {
    const mcpUrl = gatewayUrl.replace(/\/$/, '') + '/mcp';
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: toolName, arguments: args },
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Diiiploy-gateway error: ${response.status}`);
    }

    const data = await response.json();

    // Check for JSON-RPC error
    if (data.error) {
      throw new Error(`Gateway MCP error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    // Check for tool-level error
    if (data.result?.isError) {
      const errorText = data.result?.content?.[0]?.text || 'Unknown tool error';
      throw new Error(`Mem0 tool error: ${errorText}`);
    }

    const text = data.result?.content?.[0]?.text;
    if (text) {
      return JSON.parse(text);
    }
    return data.result || {};
  }

  return {
    addMemory: async (params) => {
      const result = await callTool('mem0_add', params);
      return { id: result.id || crypto.randomUUID() };
    },

    searchMemories: async (params) => {
      const result = await callTool('mem0_search', params);
      const results = Array.isArray(result.results) ? result.results : Array.isArray(result) ? result : [];
      return results.map((r: any) => ({
        id: r.id || r.memory_id || crypto.randomUUID(),
        memory: r.memory || r.content || '',
        score: r.score,
        metadata: r.metadata,
      }));
    },

    getMemory: async (params) => {
      return callTool('mem0_get', params);
    },

    listMemories: async (params) => {
      const result = await callTool('mem0_list', params);
      const items = Array.isArray(result.results) ? result.results : Array.isArray(result) ? result : [];
      return { results: items, count: result.count || items.length };
    },

    updateMemory: async (params) => {
      return callTool('mem0_update', params);
    },

    deleteMemory: async (params) => {
      return callTool('mem0_delete', params);
    },

    deleteAllMemories: async (params) => {
      return callTool('mem0_delete_all', params);
    },

    getMemoryHistory: async (params) => {
      const result = await callTool('mem0_history', params);
      return result || [];
    },

    getEntities: async () => {
      const result = await callTool('mem0_entities', {});
      return result.results || result || [];
    },

    configureProject: async (params) => {
      return callTool('mem0_configure', params);
    },
  };
}

/**
 * Initialize Mem0Service with diiiploy-gateway (lazy init)
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 */
export function initializeMem0Service(): Mem0Service {
  if (!mem0ServiceInstance) {
    const client = createDiiiplopyGatewayMem0Client();
    mem0ServiceInstance = new Mem0Service(client);
  }
  return mem0ServiceInstance;
}
