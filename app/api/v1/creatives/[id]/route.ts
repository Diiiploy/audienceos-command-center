import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, isValidUUID, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import type { CreativeStatus, CreativeFormat } from '@/types/creative'

const VALID_STATUSES: CreativeStatus[] = ['concept', 'in_production', 'review', 'approved', 'live']
const VALID_FORMATS: CreativeFormat[] = ['image', 'video', 'carousel', 'collection']

// GET /api/v1/creatives/:id
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id } = await params
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid creative ID')
      }

      const supabase = await createRouteHandlerClient(cookies)
      const { data, error } = await (supabase as any)
        .from('creative')
        .select(`
          *,
          client:client_id (id, name)
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        return createErrorResponse(404, 'Creative not found')
      }

      return NextResponse.json({ data })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// PATCH /api/v1/creatives/:id
export const PATCH = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid creative ID')
      }

      const supabase = await createRouteHandlerClient(cookies)

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

      if (body.title && typeof body.title === 'string') {
        updateData.title = sanitizeString(body.title).slice(0, 300)
      }
      if (body.description !== undefined) {
        updateData.description = body.description ? sanitizeString(body.description as string).slice(0, 5000) : null
      }
      if (body.format && VALID_FORMATS.includes(body.format as CreativeFormat)) {
        updateData.format = body.format
      }
      if (body.status && VALID_STATUSES.includes(body.status as CreativeStatus)) {
        updateData.status = body.status
      }
      if (body.hook !== undefined) {
        updateData.hook = body.hook ? sanitizeString(body.hook as string).slice(0, 2000) : null
      }
      if (body.body_copy !== undefined) {
        updateData.body_copy = body.body_copy ? sanitizeString(body.body_copy as string).slice(0, 5000) : null
      }
      if (body.cta_text !== undefined) {
        updateData.cta_text = body.cta_text ? sanitizeString(body.cta_text as string).slice(0, 100) : null
      }
      if (body.target_audience !== undefined) {
        updateData.target_audience = body.target_audience ? sanitizeString(body.target_audience as string).slice(0, 2000) : null
      }
      if (body.campaign_id !== undefined) {
        updateData.campaign_id = body.campaign_id ? String(body.campaign_id).slice(0, 100) : null
      }

      const { data, error } = await (supabase as any)
        .from('creative')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          client:client_id (id, name)
        `)
        .single()

      if (error || !data) {
        return createErrorResponse(500, 'Failed to update creative')
      }

      return NextResponse.json({ data })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/creatives/:id
export const DELETE = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid creative ID')
      }

      const supabase = await createRouteHandlerClient(cookies)
      const { error } = await (supabase as any)
        .from('creative')
        .delete()
        .eq('id', id)

      if (error) {
        return createErrorResponse(500, 'Failed to delete creative')
      }

      return NextResponse.json({ success: true })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
