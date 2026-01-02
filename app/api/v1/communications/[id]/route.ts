import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, isValidUUID, createErrorResponse } from '@/lib/security'
import type { Database } from '@/types/database'

type CommunicationUpdate = Database['public']['Tables']['communication']['Update']

/**
 * GET /api/v1/communications/[id]
 * Get a single communication with thread context
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createErrorResponse(400, 'Invalid communication ID format')
    }

    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, error: authError } = await getAuthenticatedUser(supabase)

    if (!user) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    const { data, error } = await supabase
      .from('communication')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(404, 'Communication not found')
      }
      return createErrorResponse(500, 'Failed to fetch communication')
    }

    return NextResponse.json(data)
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

/**
 * PATCH /api/v1/communications/[id]
 * Update communication (mark as read, needs_reply flag, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 50 updates per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 50, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    // Validate UUID format
    if (!isValidUUID(id)) {
      return createErrorResponse(400, 'Invalid communication ID format')
    }

    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, error: authError } = await getAuthenticatedUser(supabase)

    if (!user) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    // Allowed update fields
    const allowedFields: (keyof CommunicationUpdate)[] = ['needs_reply', 'replied_at', 'replied_by']
    const updates: CommunicationUpdate = {}

    for (const field of allowedFields) {
      if (field in body) {
        // Validate specific fields
        if (field === 'needs_reply' && typeof body[field] !== 'boolean') {
          return createErrorResponse(400, 'needs_reply must be a boolean')
        }
        if (field === 'replied_at' && body[field] !== null && typeof body[field] !== 'string') {
          return createErrorResponse(400, 'replied_at must be a string or null')
        }
        if (field === 'replied_by' && body[field] !== null && !isValidUUID(body[field])) {
          return createErrorResponse(400, 'replied_by must be a valid UUID or null')
        }
        (updates as Record<string, unknown>)[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse(400, 'No valid fields to update')
    }

    const { data, error } = await supabase
      .from('communication')
      .update(updates as never)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return createErrorResponse(404, 'Communication not found')
      }
      return createErrorResponse(500, 'Failed to update communication')
    }

    return NextResponse.json(data)
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}
