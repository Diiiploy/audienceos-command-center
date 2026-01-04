import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/security'
import { geminiFileService } from '@/lib/gemini/file-service'
import type { IndexStatus } from '@/types/database'

/**
 * POST /api/v1/documents/process
 * Process pending documents by uploading them to Gemini File API for indexing
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

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

        // Convert to buffer
        const buffer = Buffer.from(await fileData.arrayBuffer())

        // Upload to Gemini File API
        const displayName = `${doc.title} (${doc.file_name})`
        const geminiFileId = await geminiFileService.uploadFile(
          buffer,
          doc.mime_type,
          displayName
        )

        // Wait a moment for Gemini to process
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Check file status
        const fileStatus = await geminiFileService.getFileStatus(geminiFileId)

        let finalStatus: IndexStatus = 'indexed'
        if (fileStatus.state === 'PROCESSING') {
          finalStatus = 'indexing'
        } else if (fileStatus.state === 'FAILED' || fileStatus.error) {
          finalStatus = 'failed'
        }

        // Update document with Gemini file ID and status
        const { error: finalUpdateError } = await supabase
          .from('document')
          .update({
            gemini_file_id: geminiFileId,
            index_status: finalStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.id)

        if (finalUpdateError) {
          console.error(`Failed to update document ${doc.id} with Gemini ID:`, finalUpdateError)
          // Try to clean up the Gemini file
          try {
            await geminiFileService.deleteFile(geminiFileId)
          } catch (cleanupError) {
            console.error(`Failed to cleanup Gemini file ${geminiFileId}:`, cleanupError)
          }

          results.failed++
          results.details.push({
            id: doc.id,
            status: 'failed',
            error: 'Failed to save Gemini file ID'
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
}

/**
 * GET /api/v1/documents/process
 * Get processing status for documents
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

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
}