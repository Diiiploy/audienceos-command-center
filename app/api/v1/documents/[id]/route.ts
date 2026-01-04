import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'
import type { DocumentCategory } from '@/types/database'

// Valid categories for updates
const VALID_CATEGORIES: DocumentCategory[] = ['installation', 'tech', 'support', 'process', 'client_specific']

interface DocumentUpdateBody {
  title?: string
  category?: DocumentCategory
  is_starred?: boolean
  use_for_training?: boolean
  is_active?: boolean
}

/**
 * GET /api/v1/documents/[id]
 * Get a single document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const supabase = await createRouteHandlerClient(cookies)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    const { data: document, error } = await supabase
      .from('document')
      .select('*')
      .eq('id', id)
      .eq('agency_id', agencyId)
      .single()

    if (error || !document) {
      return createErrorResponse(404, 'Document not found')
    }

    return NextResponse.json({ data: document })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

/**
 * PATCH /api/v1/documents/[id]
 * Update a document (title, category, starred, training status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const { id } = await params
    const supabase = await createRouteHandlerClient(cookies)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Parse request body
    const body: DocumentUpdateBody = await request.json()

    // Validate category if provided
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return createErrorResponse(400, 'Invalid category')
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.title !== undefined) {
      updates.title = body.title.trim()
    }
    if (body.category !== undefined) {
      updates.category = body.category
    }
    if (body.is_starred !== undefined) {
      updates.is_starred = body.is_starred
    }
    if (body.use_for_training !== undefined) {
      updates.use_for_training = body.use_for_training
    }
    if (body.is_active !== undefined) {
      updates.is_active = body.is_active
    }

    // Verify document belongs to this agency before updating
    const { data: existing, error: fetchError } = await supabase
      .from('document')
      .select('id')
      .eq('id', id)
      .eq('agency_id', agencyId)
      .single()

    if (fetchError || !existing) {
      return createErrorResponse(404, 'Document not found')
    }

    // Perform update
    const { data: updated, error: updateError } = await supabase
      .from('document')
      .update(updates)
      .eq('id', id)
      .eq('agency_id', agencyId)
      .select()
      .single()

    if (updateError) {
      console.error('Document update error:', updateError)
      return createErrorResponse(500, 'Failed to update document')
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Document PATCH error:', error)
    return createErrorResponse(500, 'Internal server error')
  }
}

/**
 * DELETE /api/v1/documents/[id]
 * Delete a document (soft delete by setting is_active = false)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const { id } = await params
    const supabase = await createRouteHandlerClient(cookies)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Verify document belongs to this agency
    const { data: existing, error: fetchError } = await supabase
      .from('document')
      .select('id, storage_path')
      .eq('id', id)
      .eq('agency_id', agencyId)
      .single()

    if (fetchError || !existing) {
      return createErrorResponse(404, 'Document not found')
    }

    // Soft delete by setting is_active = false
    const { error: updateError } = await supabase
      .from('document')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('agency_id', agencyId)

    if (updateError) {
      return createErrorResponse(500, 'Failed to delete document')
    }

    return NextResponse.json({ success: true })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}
