import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/security'
import { geminiFileService } from '@/lib/gemini/file-service'
import type { DocumentCategory } from '@/types/database'

interface SearchResult {
  answer: string
  documentsSearched: Array<{
    id: string
    title: string
    category: string
    gemini_file_id: string
  }>
  query: string
  timestamp: string
}

/**
 * POST /api/v1/documents/search
 * Search across indexed documents using Gemini File API
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Parse request body
    const body = await request.json()
    const { query, categories, client_id } = body

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return createErrorResponse(400, 'Search query is required')
    }

    if (query.length > 500) {
      return createErrorResponse(400, 'Search query too long (max 500 characters)')
    }

    // Build document filter query
    let docQuery = supabase
      .from('document')
      .select('id, title, category, gemini_file_id, file_name')
      .eq('agency_id', agencyId)
      .eq('index_status', 'indexed')
      .eq('is_active', true)
      .not('gemini_file_id', 'is', null)

    // Filter by categories if provided
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const validCategories = categories.filter(cat =>
        ['installation', 'tech', 'support', 'process', 'client_specific'].includes(cat)
      )
      if (validCategories.length > 0) {
        docQuery = docQuery.in('category', validCategories)
      }
    }

    // Filter by client if provided
    if (client_id) {
      docQuery = docQuery.eq('client_id', client_id)
    }

    const { data: documents, error: fetchError } = await docQuery
      .order('updated_at', { ascending: false })
      .limit(20) // Limit to avoid too many file references

    if (fetchError) {
      return createErrorResponse(500, 'Failed to fetch indexed documents')
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any indexed documents to search. Please make sure you have uploaded and processed documents first.",
        documentsSearched: [],
        query: query.trim(),
        timestamp: new Date().toISOString()
      })
    }

    // Extract Gemini file IDs
    const fileIds = documents
      .filter(doc => doc.gemini_file_id)
      .map(doc => doc.gemini_file_id!)

    if (fileIds.length === 0) {
      return NextResponse.json({
        answer: "No documents are currently available for search. Please wait for document processing to complete.",
        documentsSearched: [],
        query: query.trim(),
        timestamp: new Date().toISOString()
      })
    }

    // Perform search using Gemini File API
    try {
      const searchAnswer = await geminiFileService.searchDocuments(query.trim(), fileIds)

      const result: SearchResult = {
        answer: searchAnswer,
        documentsSearched: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          gemini_file_id: doc.gemini_file_id!
        })),
        query: query.trim(),
        timestamp: new Date().toISOString()
      }

      return NextResponse.json(result)

    } catch (searchError) {
      console.error('Gemini search error:', searchError)
      return createErrorResponse(500, 'Search operation failed. Please try again.')
    }

  } catch (error) {
    console.error('Document search error:', error)
    return createErrorResponse(500, 'Internal server error during search')
  }
}