/**
 * RAG System
 *
 * Document-based retrieval using Gemini File Search.
 *
 * Primary: FileSearchStoreService (persistent stores, semantic search)
 * Legacy: GeminiRAGService (hydration from files.list(), kept as fallback)
 */

// New: Persistent File Search Store service
export {
  FileSearchStoreService,
  getFileSearchStoreService,
  resetFileSearchStoreService,
} from '../gemini/file-search-store-service';
export { getOrCreateAgencyStore } from '../gemini/store-provisioner';

// Legacy: kept as fallback for agencies without a store yet
export { GeminiRAGService, getGeminiRAG, resetGeminiRAG } from './gemini-rag';
export {
  IndexingPipeline,
  getIndexingPipeline,
  resetIndexingPipeline,
} from './indexing-pipeline';
export {
  CitationExtractor,
  getCitationExtractor,
  resetCitationExtractor,
} from './citation-extractor';
export {
  DocumentManager,
  getDocumentManager,
  resetDocumentManager,
} from './document-manager';

export type {
  DocumentStatus,
  DocumentScope,
  DocumentMetadata,
  UploadProgress,
  DocumentUploadRequest,
  IndexResult,
  RAGCitation,
  RAGResult,
  RAGSearchRequest,
  DocumentCollection,
  SupportedMimeType,
} from './types';
export {
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  isSupportedMimeType,
} from './types';

export type {
  IndexingJob,
  PipelineConfig,
  ProgressListener,
} from './indexing-pipeline';

export type {
  FormattedCitation,
  CitationList,
  CitedText,
  GroundingChunk,
  GroundingMetadata,
} from './citation-extractor';

export type {
  DocumentFilter,
  DocumentSort,
  DocumentStats,
} from './document-manager';
