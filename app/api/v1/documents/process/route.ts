/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { getFileSearchStoreService } from '@/lib/gemini/file-search-store-service'
import { getOrCreateAgencyStore } from '@/lib/gemini/store-provisioner'
import type { IndexStatus } from '@/types/database'

/**
 * POST /api/v1/documents/process
 * Process pending documents by uploading them to Gemini File API for indexing
 */
export const POST = withPermission({ resource: 'knowledge-base', action: 'write' })(
  async (request: AuthenticatedRequest) => {
  const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { agencyId } = request.user

    // Get pending documents for this agency
    const { data: pendingDocs, error: fetchError } = await supabase
      .from('document')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('index_status', 'pending' as IndexStatus)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(10) // Process in batches to avoid timeout

    if (fetchError) {
      return createErrorResponse(500, 'Failed to fetch pending documents')
    }

    if (!pendingDocs || pendingDocs.length === 0) {
      return NextResponse.json({
        message: 'No pending documents to process',
        processed: 0,
        skipped: 0,
        failed: 0
      })
    }

    const results = {
      processed: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{ id: string; status: string; error?: string }>
    }

    for (const doc of pendingDocs) {
      try {
        // Update status to 'indexing'
        const { error: updateError } = await supabase
          .from('document')
          .update({
            index_status: 'indexing' as IndexStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id)

        if (updateError) {
          console.error(`Failed to update document ${doc.id} status:`, updateError)
          results.failed++
          results.details.push({
            id: doc.id,
            status: 'failed',
            error: 'Failed to update status'
          })
          continue
        }

        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(doc.storage_path)

        if (downloadError || !fileData) {
          console.error(`Failed to download document ${doc.id}:`, downloadError)

          // Mark as failed
          await supabase
            .from('document')
            .update({
              index_status: 'failed' as IndexStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', doc.id)

          results.failed++
          results.details.push({
            id: doc.id,
            status: 'failed',
            error: 'Failed to download file'
          })
          continue
        }

        // Convert to buffer and upload to File Search Store
        const buffer = Buffer.from(await fileData.arrayBuffer())
        const scope: 'global' | 'client' = doc.client_id ? 'client' : 'global'

        // Get or create the agency's File Search Store
        const { storeName, storeId } = await getOrCreateAgencyStore(supabase, agencyId)

        const service = getFileSearchStoreService()
        const uploadResult = await service.uploadDocument(
          storeName,
          new Blob([buffer], { type: doc.mime_type }),
          {
            displayName: doc.title,
            mimeType: doc.mime_type,
            agencyId,
            scope,
            clientId: doc.client_id || undefined,
            category: doc.category || undefined,
            useForTraining: true,
          }
        )

        if (uploadResult.status === 'failed') {
          throw new Error(uploadResult.errorMessage || 'File Search Store upload failed')
        }

        const finalStatus: IndexStatus = uploadResult.status === 'active' ? 'indexed' : 'indexing'

        // Update document with File Search Store references
        const { error: finalUpdateError } = await (supabase as any)
          .from('document')
          .update({
            gemini_document_name: uploadResult.documentName || null,
            file_search_store_id: storeId,
            index_status: finalStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id)

        if (finalUpdateError) {
          console.error(`Failed to update document ${doc.id} with store refs:`, finalUpdateError)

          // Try to clean up from the store
          if (uploadResult.documentName) {
            try {
              await service.deleteDocument(uploadResult.documentName)
            } catch (cleanupError) {
              console.error(`Failed to cleanup document ${uploadResult.documentName}:`, cleanupError)
            }
          }

          results.failed++
          results.details.push({
            id: doc.id,
            status: 'failed',
            error: 'Failed to save store references'
          })
          continue
        }

        results.processed++
        results.details.push({
          id: doc.id,
          status: finalStatus,
        })

      } catch (error) {
        console.error(`Error processing document ${doc.id}:`, error)

        // Mark document as failed
        try {
          await supabase
            .from('document')
            .update({
              index_status: 'failed' as IndexStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', doc.id)
        } catch (updateError) {
          console.error(`Failed to mark document ${doc.id} as failed:`, updateError)
        }

        results.failed++
        results.details.push({
          id: doc.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: `Processing complete: ${results.processed} processed, ${results.failed} failed`,
      ...results
    })

  } catch (error) {
    console.error('Document processing error:', error)
    return createErrorResponse(500, 'Internal server error during document processing')
  }
})

/**
 * GET /api/v1/documents/process
 * Get processing status for documents
 */
export const GET = withPermission({ resource: 'knowledge-base', action: 'read' })(
  async (request: AuthenticatedRequest) => {
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { agencyId } = request.user

    // Get document counts by status
    const { data: statusCounts, error } = await supabase
      .from('document')
      .select('index_status')
      .eq('agency_id', agencyId)
      .eq('is_active', true)

    if (error) {
      return createErrorResponse(500, 'Failed to fetch document status')
    }

    const counts = statusCounts?.reduce((acc, doc) => {
      acc[doc.index_status] = (acc[doc.index_status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return NextResponse.json({
      counts: {
        pending: counts.pending || 0,
        indexing: counts.indexing || 0,
        indexed: counts.indexed || 0,
        failed: counts.failed || 0,
      },
      total: statusCounts?.length || 0
    })

  } catch (error) {
    console.error('Status fetch error:', error)
    return createErrorResponse(500, 'Internal server error')
  }
})