import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { getFileSearchStoreService } from '@/lib/gemini/file-search-store-service'

interface SearchResult {
  answer: string
  documentsSearched: Array<{
    id: string
    title: string
    category: string
  }>
  citations: Array<{
    documentName: string
    snippet: string
    confidence: number
  }>
  isGrounded: boolean
  query: string
  timestamp: string
}

/**
 * POST /api/v1/documents/search
 * Search across indexed documents using Gemini File Search Store
 *
 * Instead of manually passing file references to generateContent,
 * this now uses the `fileSearch` tool for true semantic search with
 * auto-chunking, embeddings, and citation grounding.
 */
export const POST = withPermission({ resource: 'knowledge-base', action: 'read' })(
  async (request: AuthenticatedRequest) => {
  const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { agencyId } = request.user

    // Parse request body
    const body = await request.json()
    const { query, client_id } = body

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return createErrorResponse(400, 'Search query is required')
    }

    if (query.length > 500) {
      return createErrorResponse(400, 'Search query too long (max 500 characters)')
    }

    // Look up the agency's File Search Store
    const { data: store } = await (supabase as any)
      .from('file_search_store')
      .select('store_name')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .single()

    if (!store?.store_name) {
      return NextResponse.json({
        answer: "No knowledge base has been set up yet. Upload documents first — the search index will be created automatically.",
        documentsSearched: [],
        citations: [],
        isGrounded: false,
        query: query.trim(),
        timestamp: new Date().toISOString()
      })
    }

    // Also get a count of indexed docs for the response
    const { data: indexedDocs } = await (supabase as any)
      .from('document')
      .select('id, title, category')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .eq('use_for_training', true)
      .not('gemini_document_name', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (!indexedDocs || indexedDocs.length === 0) {
      return NextResponse.json({
        answer: "No documents are currently indexed for search. Please upload documents and wait for processing to complete.",
        documentsSearched: [],
        citations: [],
        isGrounded: false,
        query: query.trim(),
        timestamp: new Date().toISOString()
      })
    }

    // Perform semantic search via File Search Store
    const service = getFileSearchStoreService()
    const searchResult = await service.search(
      store.store_name,
      query.trim(),
      {
        agencyId,
        clientId: client_id || undefined,
        useForTrainingOnly: true,
      }
    )

    const result: SearchResult = {
      answer: searchResult.content,
      documentsSearched: indexedDocs.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        category: doc.category,
      })),
      citations: searchResult.citations.map(c => ({
        documentName: c.documentName,
        snippet: c.text,
        confidence: c.confidence,
      })),
      isGrounded: searchResult.isGrounded,
      query: query.trim(),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Document search error:', error)
    return createErrorResponse(500, 'Internal server error during search')
  }
})
