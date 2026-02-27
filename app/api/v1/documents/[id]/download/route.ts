/**
 * POST /api/v1/documents/[id]/download
 * Generate a signed download URL for a document from Supabase Storage
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'

export const POST = withPermission({ resource: 'knowledge-base', action: 'read' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Fetch document record (verify ownership)
      const { data: doc, error: fetchError } = await supabase
        .from('document')
        .select('id, storage_path, file_name')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .single()

      if (fetchError || !doc) {
        return createErrorResponse(404, 'Document not found')
      }

      // Generate a signed URL (valid for 60 seconds)
      const { data: signedData, error: signError } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 60)

      if (signError || !signedData?.signedUrl) {
        console.error('Signed URL error:', signError)
        return createErrorResponse(500, 'Failed to generate download URL')
      }

      // Fire-and-forget: increment download count (new column, use any cast until types regenerated)
      ;(async () => {
        try {
          const { data: current } = await (supabase as any)
            .from('document')
            .select('download_count')
            .eq('id', id)
            .single()
          await (supabase as any)
            .from('document')
            .update({ download_count: ((current?.download_count ?? 0) + 1) })
            .eq('id', id)
        } catch { /* non-critical */ }
      })()

      return NextResponse.json({
        data: {
          url: signedData.signedUrl,
          file_name: doc.file_name,
        },
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
