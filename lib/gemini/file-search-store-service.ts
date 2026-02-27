/**
 * Gemini File Search Store Service
 *
 * Unified service for document upload, semantic search, and management
 * using Gemini's persistent File Search Stores. Replaces both:
 * - file-service.ts (old @google/generative-ai SDK, files expire 48h)
 * - gemini-rag.ts (hydration from files.list(), manual file refs)
 *
 * Key differences from old approach:
 * - Documents are uploaded to a persistent File Search Store (no 48h expiry)
 * - Search uses the `fileSearch` tool — Gemini handles chunking, embeddings, retrieval
 * - Custom metadata per document enables filtering (agency, client, training status)
 * - No need to hydrate from files.list() on cold start
 */

import { GoogleGenAI } from '@google/genai'
import type { RAGResult, RAGCitation } from '../rag/types'

// CRITICAL: Gemini 3 ONLY per project requirements
const GEMINI_MODEL = 'gemini-3-flash-preview'

/** Circuit breaker to prevent hammering a failing API */
const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_RESET_MS = 60000 // 1 minute

/** Max time to wait for upload processing (ms) */
const UPLOAD_POLL_TIMEOUT_MS = 120000 // 2 minutes
const UPLOAD_POLL_INTERVAL_MS = 3000

interface ErrorState {
  consecutiveFailures: number
  lastFailureTime: number | null
  circuitOpen: boolean
  lastError: string | null
}

export interface FileSearchStoreInfo {
  name: string
  displayName: string
  activeDocumentsCount: number
  pendingDocumentsCount: number
  failedDocumentsCount: number
  sizeBytes: number
  createTime: string
  updateTime: string
}

export interface UploadDocumentResult {
  documentName: string
  status: 'active' | 'pending' | 'failed'
  processingTimeMs: number
  errorMessage?: string
}

export interface SearchOptions {
  agencyId: string
  clientId?: string
  useForTrainingOnly?: boolean
  topK?: number
  temperature?: number
}

export interface SearchResultCitation {
  documentName: string
  snippet: string
  confidence: number
}

/**
 * FileSearchStoreService — persistent document store with semantic search
 */
export class FileSearchStoreService {
  private genai: GoogleGenAI
  private errorState: ErrorState = {
    consecutiveFailures: 0,
    lastFailureTime: null,
    circuitOpen: false,
    lastError: null,
  }

  constructor(apiKey: string) {
    this.genai = new GoogleGenAI({ apiKey })
  }

  // ─── Circuit Breaker ────────────────────────────────────────────────

  private checkCircuitBreaker(): string | null {
    if (!this.errorState.circuitOpen) return null

    const elapsed = Date.now() - (this.errorState.lastFailureTime || 0)
    if (elapsed > CIRCUIT_BREAKER_RESET_MS) {
      this.errorState.circuitOpen = false
      this.errorState.consecutiveFailures = 0
      return null
    }

    return `File Search service temporarily unavailable (${Math.ceil((CIRCUIT_BREAKER_RESET_MS - elapsed) / 1000)}s until retry). Last error: ${this.errorState.lastError}`
  }

  private recordFailure(error: string): void {
    this.errorState.consecutiveFailures++
    this.errorState.lastFailureTime = Date.now()
    this.errorState.lastError = error
    if (this.errorState.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.errorState.circuitOpen = true
      console.error(`[FileSearchStore] Circuit breaker OPEN after ${this.errorState.consecutiveFailures} failures: ${error}`)
    }
  }

  private recordSuccess(): void {
    if (this.errorState.consecutiveFailures > 0) {
      console.log('[FileSearchStore] Success after failures, resetting error state')
    }
    this.errorState.consecutiveFailures = 0
    this.errorState.lastError = null
  }

  getHealthStatus() {
    return {
      healthy: !this.errorState.circuitOpen,
      circuitOpen: this.errorState.circuitOpen,
      consecutiveFailures: this.errorState.consecutiveFailures,
      lastError: this.errorState.lastError,
    }
  }

  // ─── Store CRUD ─────────────────────────────────────────────────────

  /**
   * Create a new File Search Store
   */
  async createStore(displayName: string): Promise<string> {
    try {
      const store = await this.genai.fileSearchStores.create({
        config: { displayName },
      })

      if (!store.name) {
        throw new Error('Store creation returned no name')
      }

      this.recordSuccess()
      console.log(`[FileSearchStore] Created store: ${store.name} (${displayName})`)
      return store.name
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      this.recordFailure(msg)
      throw new Error(`Failed to create File Search Store: ${msg}`)
    }
  }

  /**
   * Get store info (document counts, size)
   */
  async getStoreInfo(storeName: string): Promise<FileSearchStoreInfo> {
    const store = await this.genai.fileSearchStores.get({ name: storeName })
    return {
      name: store.name || storeName,
      displayName: store.displayName || '',
      activeDocumentsCount: parseInt(store.activeDocumentsCount || '0', 10),
      pendingDocumentsCount: parseInt(store.pendingDocumentsCount || '0', 10),
      failedDocumentsCount: parseInt(store.failedDocumentsCount || '0', 10),
      sizeBytes: parseInt(store.sizeBytes || '0', 10),
      createTime: store.createTime || '',
      updateTime: store.updateTime || '',
    }
  }

  // ─── Document Upload ────────────────────────────────────────────────

  /**
   * Upload a document directly to a File Search Store
   *
   * Custom metadata fields stored per document:
   * - agency_id: tenant isolation
   * - scope: "global" or "client"
   * - client_id: client-specific filtering
   * - category: document category
   * - document_title: human-readable name
   * - use_for_training: "true"/"false" for AI training filter
   */
  async uploadDocument(
    storeName: string,
    fileBlob: Blob,
    metadata: {
      displayName: string
      mimeType: string
      agencyId: string
      scope: 'global' | 'client'
      clientId?: string
      category?: string
      useForTraining?: boolean
    }
  ): Promise<UploadDocumentResult> {
    const startTime = Date.now()

    const circuitError = this.checkCircuitBreaker()
    if (circuitError) {
      return {
        documentName: '',
        status: 'failed',
        processingTimeMs: Date.now() - startTime,
        errorMessage: circuitError,
      }
    }

    try {
      // Build custom metadata for filtering during search
      const customMetadata = [
        { key: 'agency_id', stringValue: metadata.agencyId },
        { key: 'scope', stringValue: metadata.scope },
        { key: 'document_title', stringValue: metadata.displayName },
        { key: 'use_for_training', stringValue: metadata.useForTraining !== false ? 'true' : 'false' },
      ]

      if (metadata.clientId) {
        customMetadata.push({ key: 'client_id', stringValue: metadata.clientId })
      }
      if (metadata.category) {
        customMetadata.push({ key: 'category', stringValue: metadata.category })
      }

      let operation = await this.genai.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: storeName,
        file: fileBlob,
        config: {
          displayName: metadata.displayName,
          mimeType: metadata.mimeType,
          customMetadata,
        },
      })

      // Poll for completion with timeout
      const deadline = Date.now() + UPLOAD_POLL_TIMEOUT_MS
      while (!operation.done && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, UPLOAD_POLL_INTERVAL_MS))
        try {
          operation = await this.genai.operations.get({ operation })
        } catch (pollError) {
          // Polling can fail transiently — continue until timeout
          console.warn('[FileSearchStore] Poll error (will retry):', pollError instanceof Error ? pollError.message : pollError)
        }
      }

      if (operation.error) {
        this.recordFailure(JSON.stringify(operation.error))
        return {
          documentName: '',
          status: 'failed',
          processingTimeMs: Date.now() - startTime,
          errorMessage: `Upload processing failed: ${JSON.stringify(operation.error)}`,
        }
      }

      const documentName = operation.response?.documentName || ''

      if (!operation.done) {
        // Timed out but not failed — document may still be processing
        console.warn(`[FileSearchStore] Upload timed out after ${UPLOAD_POLL_TIMEOUT_MS}ms, document may still be processing`)
        this.recordSuccess() // Don't trip circuit breaker for slow processing
        return {
          documentName,
          status: 'pending',
          processingTimeMs: Date.now() - startTime,
        }
      }

      this.recordSuccess()
      console.log(`[FileSearchStore] Document uploaded: ${documentName} (${Date.now() - startTime}ms)`)

      return {
        documentName,
        status: 'active',
        processingTimeMs: Date.now() - startTime,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      this.recordFailure(msg)
      return {
        documentName: '',
        status: 'failed',
        processingTimeMs: Date.now() - startTime,
        errorMessage: `Upload failed: ${msg}`,
      }
    }
  }

  // ─── Semantic Search ────────────────────────────────────────────────

  /**
   * Search a File Search Store using Gemini's fileSearch tool
   *
   * Instead of manually passing file references to generateContent,
   * we pass a `fileSearch` tool that lets Gemini automatically
   * search the store semantically with metadata filtering.
   */
  async search(
    storeName: string,
    query: string,
    options: SearchOptions
  ): Promise<RAGResult> {
    const startTime = Date.now()

    const circuitError = this.checkCircuitBreaker()
    if (circuitError) {
      return {
        content: circuitError,
        citations: [],
        documentsUsed: [],
        searchTimeMs: Date.now() - startTime,
        isGrounded: false,
        error: true,
      }
    }

    try {
      // Build metadata filter for agency scoping and training status
      const filterParts: string[] = []
      filterParts.push(`agency_id="${options.agencyId}"`)

      if (options.useForTrainingOnly) {
        filterParts.push('use_for_training="true"')
      }
      if (options.clientId) {
        // Include both client-specific docs AND global docs
        filterParts.push(`(scope="global" OR client_id="${options.clientId}")`)
      }

      const metadataFilter = filterParts.join(' AND ')

      const response = await this.genai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Based on the documents in the knowledge base, answer this question: ${query}

If the answer is not found in the documents, say so clearly.
When citing information, reference the specific document by name.`,
        config: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: 2048,
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [storeName],
                topK: options.topK ?? 10,
                metadataFilter,
              },
            },
          ],
        },
      })

      const responseText = response.text || ''
      const citations = this.extractCitations(response)

      this.recordSuccess()

      return {
        content: responseText,
        citations,
        documentsUsed: citations.map(c => c.documentId),
        searchTimeMs: Date.now() - startTime,
        isGrounded: citations.length > 0,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Search failed'
      this.recordFailure(msg)

      return {
        content: `Search error: ${msg}. If this persists, please try again in a minute.`,
        citations: [],
        documentsUsed: [],
        searchTimeMs: Date.now() - startTime,
        isGrounded: false,
        error: true,
      }
    }
  }

  /**
   * Extract citations from Gemini response grounding metadata
   */
  private extractCitations(
    result: { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ retrievedContext?: { uri?: string; title?: string; text?: string } }> } }> }
  ): RAGCitation[] {
    const citations: RAGCitation[] = []
    const candidate = result.candidates?.[0]
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || []

    for (const chunk of groundingChunks) {
      const ctx = chunk.retrievedContext
      if (ctx) {
        citations.push({
          documentId: ctx.uri || 'unknown',
          documentName: ctx.title || 'Unknown Document',
          text: ctx.text || '',
          confidence: 0.8, // Gemini doesn't provide per-chunk confidence
        })
      }
    }

    return citations
  }

  // ─── Document Deletion ──────────────────────────────────────────────

  /**
   * Delete a document from its File Search Store
   */
  async deleteDocument(documentName: string): Promise<void> {
    try {
      await this.genai.fileSearchStores.documents.delete({
        name: documentName,
        config: { force: true },
      })
      console.log(`[FileSearchStore] Deleted document: ${documentName}`)
    } catch (error) {
      console.error(`[FileSearchStore] Failed to delete document ${documentName}:`, error)
      throw error
    }
  }

  /**
   * Delete an entire File Search Store
   */
  async deleteStore(storeName: string): Promise<void> {
    try {
      await this.genai.fileSearchStores.delete({
        name: storeName,
        config: { force: true },
      })
      console.log(`[FileSearchStore] Deleted store: ${storeName}`)
    } catch (error) {
      console.error(`[FileSearchStore] Failed to delete store ${storeName}:`, error)
      throw error
    }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

let instance: FileSearchStoreService | null = null

export function getFileSearchStoreService(apiKey?: string): FileSearchStoreService {
  if (!instance) {
    const key = apiKey || process.env.GOOGLE_AI_API_KEY
    if (!key) {
      throw new Error('GOOGLE_AI_API_KEY required for FileSearchStoreService initialization')
    }
    instance = new FileSearchStoreService(key)
  }
  return instance
}

export function resetFileSearchStoreService(): void {
  instance = null
}
