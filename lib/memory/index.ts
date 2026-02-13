/**
 * Memory System
 *
 * Cross-session memory using Mem0 integration.
 */

export {
  Mem0Service,
  createMem0Service,
  getMem0Service,
  resetMem0Service,
  initializeMem0Service,
} from './mem0-service';
export {
  MemoryInjector,
  getMemoryInjector,
  resetMemoryInjector,
} from './memory-injector';
export {
  summarizeConversation,
  shouldSummarize,
} from './conversation-summarizer';

export { EXPIRATION_DAYS } from './types';

export type {
  Memory,
  MemoryMetadata,
  MemoryType,
  Mem0EntityParams,
  MemorySearchRequest,
  MemorySearchResult,
  MemoryAddRequest,
  MemoryInjection,
  RecallDetection,
  MemoryStats,
  MemoryAction,
  MemoryUpdateRequest,
  MemoryHistoryEntry,
  MemoryEntity,
  MemoryListResponse,
} from './types';
