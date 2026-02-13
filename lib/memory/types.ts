/**
 * Memory System Types
 *
 * Types for cross-session memory using Mem0.
 * Uses mem0's native entity model: app_id (tenant), user_id, agent_id, run_id.
 */

/**
 * Mem0 entity parameters for scoping.
 * Maps to mem0's native entity model:
 *   - appId → app_id (tenant/agency isolation)
 *   - userId → user_id (person)
 *   - agentId → agent_id (AI role)
 *   - runId → run_id (session)
 */
export interface Mem0EntityParams {
  userId: string;       // Required — the actual user ID
  appId?: string;       // Agency ID for tenant isolation
  agentId?: string;     // AI role identifier
  runId?: string;       // Session/thread ID
}

/**
 * Memory entry from Mem0
 */
export interface Memory {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Memory metadata — stored natively in mem0 (not encoded in content)
 */
export interface MemoryMetadata {
  agencyId: string;
  clientId?: string;
  userId: string;
  sessionId?: string;
  type: MemoryType;
  topic?: string;
  entities?: string[];
  importance?: 'low' | 'medium' | 'high';
}

/**
 * Memory types
 */
export type MemoryType =
  | 'conversation' // General conversation context
  | 'decision'     // Decisions made
  | 'preference'   // User preferences
  | 'project'      // Ongoing project context
  | 'insight'      // Learned insights about the user/agency
  | 'task';        // Tasks or action items

/**
 * Memory expiration days by type.
 * null = never expires (permanent).
 */
export const EXPIRATION_DAYS: Record<MemoryType, number | null> = {
  conversation: 30,   // Chat summaries expire after 30 days
  decision: null,      // Decisions persist permanently
  preference: null,    // Preferences persist permanently
  project: 90,         // Project context expires after 90 days
  insight: null,       // Insights persist permanently
  task: 14,            // Tasks expire after 14 days
};

/**
 * Memory search request
 */
export interface MemorySearchRequest {
  query: string;
  agencyId: string;
  clientId?: string;
  userId: string;
  limit?: number;
  minScore?: number;
  types?: MemoryType[];
  categories?: string[];
  filters?: Record<string, unknown>;
}

/**
 * Memory search result
 */
export interface MemorySearchResult {
  memories: Memory[];
  totalFound: number;
  searchTimeMs: number;
}

/**
 * Memory add request
 */
export interface MemoryAddRequest {
  content: string;
  messages?: Array<{ role: string; content: string; name?: string }>;
  agencyId: string;
  clientId?: string;
  userId: string;
  sessionId?: string;
  type: MemoryType;
  topic?: string;
  entities?: string[];
  importance?: 'low' | 'medium' | 'high';
}

/**
 * Memory injection for system prompt
 */
export interface MemoryInjection {
  contextBlock: string;
  memories: Memory[];
  relevanceExplanation: string;
}

/**
 * Memory recall detection result
 */
export interface RecallDetection {
  isRecallQuery: boolean;
  confidence: number;
  extractedTopic?: string;
  timeReference?: string;
  suggestedSearchQuery: string;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  byImportance: Record<string, number>;
  oldestMemory?: Date;
  newestMemory?: Date;
}

/**
 * Memory management action
 */
export type MemoryAction = 'delete' | 'archive' | 'update_importance';

/**
 * Memory update request
 */
export interface MemoryUpdateRequest {
  memoryId: string;
  content: string;
  metadata?: Partial<MemoryMetadata>;
}

/**
 * Memory history entry — tracks how a memory evolved over time
 */
export interface MemoryHistoryEntry {
  id: string;
  memoryId: string;
  oldContent: string;
  newContent: string;
  event: 'created' | 'updated' | 'deleted';
  timestamp: Date;
}

/**
 * Mem0 entity (user, agent, app)
 */
export interface MemoryEntity {
  type: 'user' | 'agent' | 'app';
  id: string;
  name?: string;
  memoryCount?: number;
}

/**
 * Paginated memory list response
 */
export interface MemoryListResponse {
  memories: Memory[];
  page: number;
  pageSize: number;
  total: number;
}
