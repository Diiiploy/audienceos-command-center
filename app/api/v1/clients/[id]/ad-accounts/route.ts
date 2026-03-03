/**
 * Client Ad Accounts API
 * GET    /api/v1/clients/[id]/ad-accounts - List linked ad accounts
 * POST   /api/v1/clients/[id]/ad-accounts - Link a new ad account
 * DELETE /api/v1/clients/[id]/ad-accounts - Unlink an ad account
 *
 * RBAC: withPermission('clients', 'read'|'write'|'manage')
 * Pattern: Follows /api/v1/clients/[id]/route.ts
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/clients/[id]/ad-accounts
 * List all ad account mappings for this client
 */
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id } = await params

      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid client ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // Verify client belongs to user's agency
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('id')
        .eq('id', id)
        .single()

      if (clientError || !client) {
        return createErrorResponse(404, 'Client not found')
      }

      const { data: mappings, error } = await (supabase as any)
        .from('airbyte_account_mapping')
        .select('id, platform, external_account_id, is_active, created_at')
        .eq('client_id', id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[ad-accounts] GET error:', error)
        return createErrorResponse(500, 'Failed to fetch ad accounts')
      }

      return NextResponse.json({ data: mappings || [] })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * POST /api/v1/clients/[id]/ad-accounts
 * Link a new ad account to this client
 * Body: { platform: 'google_ads' | 'meta_ads', external_account_id: string }
 */
export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params

      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid client ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Verify client belongs to user's agency
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('id')
        .eq('id', id)
        .single()

      if (clientError || !client) {
        return createErrorResponse(404, 'Client not found')
      }

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { platform, external_account_id } = body

      // Validate platform
      if (!platform || !['google_ads', 'meta_ads'].includes(platform as string)) {
        return createErrorResponse(400, 'Platform must be "google_ads" or "meta_ads"')
      }

      // Validate account ID
      if (!external_account_id || typeof external_account_id !== 'string' || external_account_id.trim().length === 0) {
        return createErrorResponse(400, 'external_account_id is required')
      }

      const accountId = (external_account_id as string).trim()

      const { data: mapping, error } = await (supabase as any)
        .from('airbyte_account_mapping')
        .insert({
          agency_id: agencyId,
          client_id: id,
          platform: platform as string,
          external_account_id: accountId,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          return createErrorResponse(409, 'This ad account is already linked to this client')
        }
        console.error('[ad-accounts] POST error:', error)
        return createErrorResponse(500, 'Failed to link ad account')
      }

      return NextResponse.json({ data: mapping }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * DELETE /api/v1/clients/[id]/ad-accounts
 * Unlink an ad account (soft delete: sets is_active = false)
 * Body: { mapping_id: string }
 */
export const DELETE = withPermission({ resource: 'clients', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params

      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid client ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { mapping_id } = body

      if (!mapping_id || typeof mapping_id !== 'string') {
        return createErrorResponse(400, 'mapping_id is required')
      }

      // Soft delete — set is_active to false
      const { data: mapping, error } = await (supabase as any)
        .from('airbyte_account_mapping')
        .update({ is_active: false })
        .eq('id', mapping_id)
        .eq('client_id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return createErrorResponse(404, 'Mapping not found')
        }
        console.error('[ad-accounts] DELETE error:', error)
        return createErrorResponse(500, 'Failed to unlink ad account')
      }

      return NextResponse.json({ data: mapping, message: 'Ad account unlinked' })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
