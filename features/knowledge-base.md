# FEATURE SPEC: Knowledge Base

**What:** Document management system with RAG-powered semantic search for agency SOPs and client documentation
**Who:** Agency Account Managers accessing institutional knowledge and AI-powered document retrieval
**Why:** Enable AI-assisted responses by indexing institutional knowledge, accelerate onboarding, reduce knowledge silos
**Status:** 📝 Specced

---

## User Stories

**US-025: Browse Knowledge Base**
As an Account Manager, I want to browse and search documents, so I can find relevant SOPs.

Acceptance Criteria:
- [ ] Category navigation: Installation, Tech, Support, Process, Client-Specific
- [ ] Full-text search with highlighting
- [ ] Filter by: category, client/global, date, file type
- [ ] Document cards show: title, category, upload date, word count

**US-026: Upload Documents**
As an Admin, I want to upload documents for AI reference, so the team has centralized knowledge.

Acceptance Criteria:
- [ ] Supported formats: PDF, DOCX, TXT, MD
- [ ] Drag-and-drop upload with progress
- [ ] Set category and client association (or global)
- [ ] Maximum file size: 10MB
- [ ] Auto-extract metadata (pages, words)

**US-027: RAG Document Indexing**
As a System, I want documents indexed for semantic search, so AI can find relevant content.

Acceptance Criteria:
- [ ] Documents indexed to Gemini File Search on upload
- [ ] Multi-tenant isolation: `audienceos-${agencyId}` per agency
- [ ] Chunking for large documents
- [ ] Index status visible: pending, indexing, indexed, failed
- [ ] Re-index button for failed documents

**US-028: View Documents Inline**
As an Account Manager, I want to view documents without downloading, so I stay in the app.

Acceptance Criteria:
- [ ] Modal viewer for PDF, DOCX preview
- [ ] Markdown/TXT rendered with syntax highlighting
- [ ] Jump to specific section from AI citations
- [ ] Download original file button

---

## Functional Requirements

What this feature DOES:
- [ ] Store and organize agency documentation with hierarchical categorization
- [ ] Index documents for RAG-based AI queries with semantic search capabilities
- [ ] Provide full-text and semantic search with highlighting and relevance scoring
- [ ] Link documents to specific clients or mark as agency-wide resources
- [ ] Display documents inline with citation navigation and jump-to-section
- [ ] Track document usage analytics in AI responses for optimization
- [ ] Support multi-format document preview without external dependencies
- [ ] Enable bulk upload operations with batch processing
- [ ] Maintain document versioning and update history
- [ ] Provide usage analytics for document effectiveness

What this feature does NOT do:
- ❌ Provide collaborative editing capabilities (read-only after upload)
- ❌ Support version control with diff tracking
- ❌ Integrate with external document systems (Google Drive, Dropbox)
- ❌ Offer client-facing document sharing portals
- ❌ Support real-time document collaboration

---

## Data Model

Entities involved:
- DOCUMENT - Core document storage with metadata and indexing status
- CLIENT - Document association for client-specific knowledge
- USER - Upload authorship and access control
- CHAT_MESSAGE - Citation tracking for AI responses

New fields needed:
| Entity | Field | Type | Description |
|--------|-------|------|-------------|
| DOCUMENT | tags | Text[] | Searchable document tags |
| DOCUMENT | description | Text | Optional document description |
| DOCUMENT | usage_count | Integer | AI citation frequency tracking |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|------------|
| `/api/v1/documents` | GET | List documents with filtering and pagination |
| `/api/v1/documents` | POST | Upload new document with metadata |
| `/api/v1/documents/{id}` | GET | Get document metadata and preview info |
| `/api/v1/documents/{id}` | PATCH | Update title, category, tags, description |
| `/api/v1/documents/{id}` | DELETE | Soft-delete document and remove from index |
| `/api/v1/documents/{id}/content` | GET | Get document content for preview |
| `/api/v1/documents/{id}/download` | GET | Download original file |
| `/api/v1/documents/{id}/index` | POST | Trigger manual re-indexing |
| `/api/v1/documents/{id}/usage` | GET | Document usage analytics |
| `/api/v1/documents/search` | GET | Full-text and semantic search |
| `/api/v1/documents/categories` | GET | Category list with document counts |
| `/api/v1/documents/bulk-upload` | POST | Bulk document upload endpoint |

---

## UI Components

| Component | Purpose |
|-----------|---------|
| KnowledgeBaseDashboard | Main knowledge base interface with sidebar navigation |
| CategoryNavigation | Hierarchical category tree with document counts |
| DocumentGrid | Responsive grid layout for document cards |
| DocumentCard | Document preview with metadata and actions |
| DocumentUploadModal | Multi-file upload with drag-drop and progress |
| DocumentPreviewModal | In-app document viewer with navigation |
| DocumentSearchInput | Search with autocomplete and filter suggestions |
| BulkUploadInterface | Batch upload with category assignment |
| IndexingStatusIndicator | Real-time indexing progress display |
| DocumentAnalytics | Usage statistics and citation tracking |
| CategoryManager | Admin interface for category management |
| DocumentTagEditor | Tag management with autocomplete |
| CitationNavigator | Jump-to-section from AI chat citations |
| FileTypeIcon | Visual file type indicators with status |

---

## Implementation Tasks

### Document Storage Infrastructure
- [ ] TASK-001: Configure Supabase Storage bucket with RLS policies
- [ ] TASK-002: Set up file type validation and size limits
- [ ] TASK-003: Implement virus scanning for uploaded documents
- [ ] TASK-004: Create document metadata extraction pipeline
- [ ] TASK-005: Build file deduplication system

### Upload System
- [ ] TASK-006: Create DocumentUploadModal with drag-drop interface
- [ ] TASK-007: Implement multi-file upload with progress tracking
- [ ] TASK-008: Build bulk upload interface with CSV mapping
- [ ] TASK-009: Add upload queue management for large batches
- [ ] TASK-010: Create upload error handling and retry mechanisms

### Gemini File Search Integration
- [ ] TASK-011: Set up Gemini File Search API integration
- [ ] TASK-012: Implement multi-tenant store creation (`audienceos-${agencyId}`)
- [ ] TASK-013: Build document chunking algorithm for optimal retrieval
- [ ] TASK-014: Create indexing queue with background processing
- [ ] TASK-015: Implement index status tracking and failure recovery

### Document Browser
- [ ] TASK-016: Build KnowledgeBaseDashboard with responsive layout
- [ ] TASK-017: Create CategoryNavigation with document counts
- [ ] TASK-018: Implement DocumentGrid with infinite scrolling
- [ ] TASK-019: Build DocumentCard with preview and metadata
- [ ] TASK-020: Add document sorting and filtering system

### Search & Discovery
- [ ] TASK-021: Implement full-text search with PostgreSQL
- [ ] TASK-022: Integrate semantic search via Gemini File Search
- [ ] TASK-023: Build search result highlighting and ranking
- [ ] TASK-024: Create search autocomplete and suggestions
- [ ] TASK-025: Add saved search functionality

### Document Viewer
- [ ] TASK-026: Build DocumentPreviewModal with PDF.js integration
- [ ] TASK-027: Implement DOCX preview with office-viewer
- [ ] TASK-028: Create Markdown/TXT renderer with syntax highlighting
- [ ] TASK-029: Add CitationNavigator for AI chat integration
- [ ] TASK-030: Implement document annotation and bookmarking

### AI Integration
- [ ] TASK-031: Connect knowledge base to Chi Intelligent Chat RAG
- [ ] TASK-032: Build citation tracking for document usage analytics
- [ ] TASK-033: Implement context-aware document recommendations
- [ ] TASK-034: Create document relevance scoring algorithm
- [ ] TASK-035: Add AI-powered document tagging suggestions

### Analytics & Management
- [ ] TASK-036: Build document usage analytics dashboard
- [ ] TASK-037: Implement category management interface
- [ ] TASK-038: Create document lifecycle management
- [ ] TASK-039: Add automated document archival policies
- [ ] TASK-040: Build document health monitoring and alerts

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Upload 50MB file | Reject with clear size limit message, suggest compression |
| Corrupt PDF upload | Detect corruption, show error, prevent indexing |
| Network interruption during upload | Resume upload from last chunk, show progress |
| Gemini indexing timeout | Retry with exponential backoff, mark failed after 3 attempts |
| Duplicate document upload | Detect via hash, offer to update existing or create new |
| Document deleted while being viewed | Show "Document no longer available", close viewer |
| Search query returns 1000+ results | Implement pagination, show "Showing top 100" |
| Client-specific doc accessed by wrong user | Show permission denied, suggest contacting admin |
| Category with 0 documents | Show empty state with "Upload first document" CTA |
| Malware detected in upload | Quarantine file, alert admin, block indexing |

---

## Technical Implementation

### Multi-Tenant Document Storage
```typescript
interface DocumentStorageConfig {
  agencyId: string;
  bucket: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
}

class DocumentStorageService {
  private getStoragePath(agencyId: string, fileName: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const uuid = crypto.randomUUID();
    return `agencies/${agencyId}/documents/${timestamp}/${uuid}-${fileName}`;
  }

  async uploadDocument(file: File, metadata: DocumentMetadata): Promise<UploadResult> {
    // Validate file type and size
    if (file.size > this.config.maxFileSize) {
      throw new Error(`File size ${file.size} exceeds limit ${this.config.maxFileSize}`);
    }

    if (!this.config.allowedMimeTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not supported`);
    }

    // Generate unique storage path
    const storagePath = this.getStoragePath(metadata.agencyId, file.name);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Extract metadata
    const extractedMetadata = await this.extractMetadata(file);

    // Create document record
    const document = await supabase
      .from('documents')
      .insert({
        ...metadata,
        ...extractedMetadata,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        index_status: 'pending'
      })
      .select()
      .single();

    // Queue for indexing
    await this.queueForIndexing(document.data.id);

    return { document: document.data, storagePath };
  }
}
```

### Gemini File Search Integration
```typescript
interface GeminiIndexingConfig {
  corpusId: string;
  apiKey: string;
  chunkSize: number;
  overlapSize: number;
}

class GeminiIndexingService {
  private getCorpusId(agencyId: string): string {
    return `audienceos-${agencyId}`;
  }

  async indexDocument(documentId: string): Promise<IndexingResult> {
    const document = await this.getDocument(documentId);

    try {
      // Update status to indexing
      await this.updateIndexStatus(documentId, 'indexing');

      // Download file content
      const content = await this.downloadDocumentContent(document.storage_path);

      // Chunk document for optimal retrieval
      const chunks = await this.chunkDocument(content, document.mime_type);

      // Create Gemini file
      const geminiFile = await this.createGeminiFile({
        displayName: document.title,
        mimeType: document.mime_type
      });

      // Upload chunks to Gemini
      for (const chunk of chunks) {
        await this.uploadChunk(geminiFile.name, chunk);
      }

      // Wait for processing
      await this.waitForProcessing(geminiFile.name);

      // Update document with Gemini file ID
      await supabase
        .from('documents')
        .update({
          gemini_file_id: geminiFile.name,
          index_status: 'indexed',
          indexed_at: new Date().toISOString()
        })
        .eq('id', documentId);

      return { success: true, geminiFileId: geminiFile.name, chunks: chunks.length };

    } catch (error) {
      await this.updateIndexStatus(documentId, 'failed');
      throw error;
    }
  }

  async chunkDocument(content: string, mimeType: string): Promise<DocumentChunk[]> {
    const { chunkSize, overlapSize } = this.config;
    const chunks: DocumentChunk[] = [];

    // Handle different content types
    const text = await this.extractText(content, mimeType);

    // Split into overlapping chunks
    for (let i = 0; i < text.length; i += chunkSize - overlapSize) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push({
        content: chunk,
        startIndex: i,
        endIndex: Math.min(i + chunkSize, text.length)
      });
    }

    return chunks;
  }

  async searchDocuments(query: string, agencyId: string): Promise<SearchResult[]> {
    const corpusId = this.getCorpusId(agencyId);

    const response = await this.geminiClient.search({
      query,
      corpusId,
      resultCount: 10
    });

    return response.results.map(result => ({
      documentId: result.document.displayName,
      relevanceScore: result.relevanceScore,
      excerpts: result.chunks.map(chunk => ({
        content: chunk.content,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex
      }))
    }));
  }
}
```

### Document Preview System
```typescript
interface PreviewConfig {
  maxPreviewSize: number;
  supportedTypes: string[];
  pdfWorkerUrl: string;
}

class DocumentPreviewService {
  async generatePreview(document: Document): Promise<PreviewData> {
    switch (document.mime_type) {
      case 'application/pdf':
        return this.generatePDFPreview(document);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.generateDOCXPreview(document);
      case 'text/markdown':
        return this.generateMarkdownPreview(document);
      case 'text/plain':
        return this.generateTextPreview(document);
      default:
        throw new Error(`Preview not supported for ${document.mime_type}`);
    }
  }

  private async generatePDFPreview(document: Document): Promise<PDFPreviewData> {
    const pdfData = await this.downloadDocument(document.storage_path);
    const pdf = await pdfjsLib.getDocument(pdfData).promise;

    const pages: PDFPageData[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;

      pages.push({
        pageNumber: i,
        imageUrl: canvas.toDataURL(),
        text: await this.extractPageText(page)
      });
    }

    return {
      type: 'pdf',
      pages,
      totalPages: pdf.numPages,
      searchableText: pages.map(p => p.text).join('\n')
    };
  }

  async jumpToSection(documentId: string, sectionQuery: string): Promise<JumpTarget> {
    const document = await this.getDocument(documentId);
    const preview = await this.generatePreview(document);

    // Use fuzzy search to find matching section
    const matches = this.fuzzySearch(sectionQuery, preview.searchableText);

    if (matches.length === 0) {
      throw new Error('Section not found in document');
    }

    const bestMatch = matches[0];
    return {
      pageNumber: this.getPageNumber(bestMatch.index, preview),
      highlightText: bestMatch.text,
      scrollPosition: this.getScrollPosition(bestMatch.index, preview)
    };
  }
}
```

### Search and Discovery
```typescript
interface SearchConfig {
  maxResults: number;
  highlightLength: number;
  fuzzyThreshold: number;
}

class DocumentSearchService {
  async searchDocuments(query: string, filters: SearchFilters): Promise<SearchResults> {
    // Combine full-text search with semantic search
    const [fullTextResults, semanticResults] = await Promise.all([
      this.fullTextSearch(query, filters),
      this.semanticSearch(query, filters)
    ]);

    // Merge and rank results
    const mergedResults = this.mergeResults(fullTextResults, semanticResults);

    // Apply highlighting
    const highlightedResults = await this.addHighlighting(mergedResults, query);

    return {
      results: highlightedResults,
      totalCount: mergedResults.length,
      facets: await this.generateFacets(query, filters),
      suggestions: await this.generateSuggestions(query, highlightedResults)
    };
  }

  private async fullTextSearch(query: string, filters: SearchFilters): Promise<Document[]> {
    let queryBuilder = supabase
      .from('documents')
      .select('*, client(*)')
      .eq('agency_id', filters.agencyId)
      .eq('is_active', true);

    // Full-text search using PostgreSQL
    if (query) {
      queryBuilder = queryBuilder.textSearch('search_vector', query);
    }

    // Apply filters
    if (filters.category) {
      queryBuilder = queryBuilder.eq('category', filters.category);
    }
    if (filters.clientId) {
      queryBuilder = queryBuilder.eq('client_id', filters.clientId);
    }
    if (filters.fileType) {
      queryBuilder = queryBuilder.ilike('mime_type', `${filters.fileType}%`);
    }

    const { data, error } = await queryBuilder
      .order('rank', { ascending: false })
      .limit(this.config.maxResults);

    if (error) throw error;
    return data || [];
  }

  private async semanticSearch(query: string, filters: SearchFilters): Promise<SemanticResult[]> {
    if (!query || query.length < 3) return [];

    const geminiResults = await this.geminiService.searchDocuments(
      query,
      filters.agencyId
    );

    return geminiResults.map(result => ({
      documentId: result.documentId,
      relevanceScore: result.relevanceScore,
      excerpts: result.excerpts
    }));
  }

  private addHighlighting(results: Document[], query: string): HighlightedResult[] {
    const highlightTerms = this.extractSearchTerms(query);

    return results.map(doc => ({
      ...doc,
      highlights: {
        title: this.highlightText(doc.title, highlightTerms),
        description: this.highlightText(doc.description, highlightTerms),
        content: this.generateContentHighlight(doc, highlightTerms)
      }
    }));
  }

  private highlightText(text: string, terms: string[]): string {
    if (!text) return '';

    let highlighted = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    });

    return highlighted;
  }
}
```

### Document Analytics
```typescript
class DocumentAnalyticsService {
  async trackDocumentUsage(documentId: string, chatMessageId: string, relevanceScore: number) {
    await supabase
      .from('document_usage')
      .insert({
        document_id: documentId,
        chat_message_id: chatMessageId,
        relevance_score: relevanceScore,
        created_at: new Date().toISOString()
      });

    // Update document usage count
    await supabase.rpc('increment_usage_count', { doc_id: documentId });
  }

  async getDocumentAnalytics(agencyId: string): Promise<AnalyticsData> {
    const [usageStats, popularDocs, categoryStats] = await Promise.all([
      this.getUsageStatistics(agencyId),
      this.getPopularDocuments(agencyId),
      this.getCategoryStatistics(agencyId)
    ]);

    return {
      totalDocuments: usageStats.totalDocuments,
      totalUsage: usageStats.totalUsage,
      avgRelevanceScore: usageStats.avgRelevanceScore,
      popularDocuments: popularDocs,
      categoryBreakdown: categoryStats,
      usageTrend: await this.getUsageTrend(agencyId, 30)
    };
  }

  async getUnusedDocuments(agencyId: string, daysSinceUpload: number): Promise<Document[]> {
    const cutoffDate = new Date(Date.now() - daysSinceUpload * 24 * 60 * 60 * 1000);

    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('agency_id', agencyId)
      .lt('created_at', cutoffDate.toISOString())
      .is('usage_count', null)
      .or('usage_count.eq.0');

    return data || [];
  }
}
```

---

## Testing Checklist

- [ ] Happy path: Upload PDF, index successfully, find via search
- [ ] File validation: Reject files >10MB, unsupported formats
- [ ] Multi-tenant isolation: Users only see their agency's documents
- [ ] Search accuracy: Full-text and semantic search return relevant results
- [ ] Document preview: PDF, DOCX, Markdown render correctly
- [ ] Citation navigation: Jump to specific sections from AI chat
- [ ] Bulk upload: Multiple files process correctly with progress
- [ ] Index recovery: Failed indexing retries and succeeds
- [ ] Permission control: Client-specific docs restricted appropriately
- [ ] Analytics tracking: Document usage recorded accurately
- [ ] Mobile experience: Upload and preview work on mobile devices
- [ ] Performance: Search returns results in <500ms for 1000+ documents
- [ ] Error handling: Network failures, API errors show proper states
- [ ] Content extraction: Text extraction works for all supported formats
- [ ] Storage management: Files clean up properly when documents deleted

---

## Performance Considerations

### Upload Optimization
- Implement chunked file uploads for large documents
- Use background processing for metadata extraction
- Add upload progress tracking with resumable uploads
- Implement file deduplication using content hashing

### Search Performance
```sql
-- Essential indexes for knowledge base performance
CREATE INDEX idx_documents_agency_category ON documents(agency_id, category, created_at DESC);
CREATE INDEX idx_documents_search ON documents USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_documents_client ON documents(agency_id, client_id, is_active);
CREATE INDEX idx_document_usage_doc ON document_usage(document_id, created_at DESC);
```

### Caching Strategy
- Cache document metadata with React Query (15-minute TTL)
- Use CDN for document previews and thumbnails
- Implement search result caching for common queries
- Cache category counts and facet data

### Indexing Efficiency
- Queue indexing jobs with Redis or similar
- Batch process multiple documents for efficiency
- Implement incremental indexing for document updates
- Use background workers for heavy processing tasks

---

## Dependencies

### Required for Implementation
- @pdfjsLib/pdfjs-dist (PDF preview)
- mammoth (DOCX preview)
- react-markdown (Markdown rendering)
- fuse.js (fuzzy search)

### Blocked By
- DOCUMENT table with proper indexes
- Supabase Storage configuration
- Gemini File Search API access
- AI chat integration endpoints

### Enables
- AI Intelligence Layer (RAG document retrieval)
- Support Tickets (solution suggestions)
- Communications Hub (context-aware responses)
- Dashboard Overview (knowledge utilization metrics)

---

## Security & Privacy

### Document Access Control
- All documents isolated by agency_id with RLS
- Client-specific documents restricted to authorized users
- Upload permissions limited to admin and account manager roles
- Document deletion creates audit trail

### Content Security
- Virus scanning for all uploaded files
- Content sanitization for preview generation
- Secure storage with encryption at rest
- Access logging for compliance requirements

### Data Protection
```typescript
// Document access validation
async function validateDocumentAccess(userId: string, documentId: string): Promise<boolean> {
  const user = await getCurrentUser(userId);
  const document = await getDocument(documentId);

  // Agency isolation check
  if (user.agency_id !== document.agency_id) {
    return false;
  }

  // Client-specific document check
  if (document.client_id && !userHasClientAccess(user, document.client_id)) {
    return false;
  }

  return true;
}
```

---

## Success Metrics

- **Indexing Success Rate:** 99.5% of documents indexed within 5 minutes
- **Search Relevance:** 85% of searches find intended document in top 3 results
- **AI Utilization:** 70% of AI responses include document citations
- **Upload Success Rate:** 99% upload success rate across all file types
- **User Adoption:** 80% of account managers use knowledge base weekly
- **Search Performance:** Average search response time <300ms

---

## Monitoring & Alerts

### Key Metrics to Track
- Document upload success/failure rates
- Indexing queue length and processing times
- Search query performance and result relevance
- Document usage patterns and popular content
- Storage usage and quota management

### Alerting Rules
```yaml
indexing_failures:
  condition: failed_index_rate > 5%
  window: 15m
  alert: Slack

storage_quota:
  condition: storage_usage > 90%
  window: 1h
  alert: Email

search_performance:
  condition: avg(search_time) > 1s
  window: 5m
  alert: Dashboard
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-02 | Added accessibility and master-detail UI implementation |
| 2025-12-31 | Enhanced spec with complete implementation details, corrected user story numbers |
| 2025-12-31 | Created initial spec from MVP-PRD |

---

## 2026-01-02 Update

**What was done:**
- Added keyboard navigation to DocumentCard component (Tab, Enter, Space keys)
- Added ARIA attributes: `role="button"`, `tabIndex={0}`, `aria-selected`
- Implemented compact viewMode for master-detail pattern (280px shrinking list)
- Added compact skeleton variants for loading states
- Removed "Shared" filter from Knowledge Base (simplified to All/Starred/Recent)
- Fixed TypeScript inference issues with renderDocumentCard helper function

**Files changed:**
- components/linear/document-card.tsx - Added accessibility + compact mode + skeleton
- components/views/knowledge-base.tsx - Removed "Shared" filter, fixed TypeScript

**Testing:**
- Full QA stress test with browser verification
- Keyboard navigation tested (Tab through items, Enter to select)
- Master-detail pattern verified (list shrinks to 280px when item selected)
- No console errors
- Gate 01 + Gate 02 validation passed

**Status:** ✅ Complete - Deployed to linear-rebuild branch

**Next:**
- Await PR approval for merge to main
- Continue with automations UI refinements

---

*Living Document - Located at features/knowledge-base.md*