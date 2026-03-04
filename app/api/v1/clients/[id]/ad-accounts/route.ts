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
import { provisionAirbyteConnection } from '@/lib/airbyte/provision'
import type { AirbytePlatform } from '@/lib/airbyte/types'

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

      // Auto-provision Airbyte connection if agency has platform credentials
      let provisioning: { status: string; connectionId?: string; error?: string } = {
        status: 'skipped',
      }

      const { data: integration } = await supabase
        .from('integration')
        .select('id, access_token, refresh_token, config')
        .eq('agency_id', agencyId)
        .eq('provider', platform as 'google_ads' | 'meta_ads')
        .eq('is_connected', true)
        .single()

      if (integration) {
        const creds = (integration.config as Record<string, unknown>)?.credentials as Record<string, string> | undefined
        const accessToken = integration.access_token || creds?.access_token
        const refreshToken = integration.refresh_token || undefined

        if (accessToken) {
          const result = await provisionAirbyteConnection(
            {
              agencyId,
              clientId: id,
              platform: platform as AirbytePlatform,
              externalAccountId: accountId,
              accessToken,
              refreshToken,
              ...(platform === 'google_ads' && creds && {
                googleAds: {
                  customerId: accountId,
                  developerToken: creds.developer_token,
                  loginCustomerId: creds.login_customer_id,
                },
              }),
              ...(platform === 'meta_ads' && {
                metaAds: { accountId },
              }),
            },
            supabase,
            integration.id
          )

          if (result.success) {
            // Update mapping with Airbyte IDs
            await (supabase as any)
              .from('airbyte_account_mapping')
              .update({
                airbyte_source_id: result.sourceId,
                airbyte_connection_id: result.connectionId,
                table_prefix: result.tablePrefix,
              })
              .eq('id', mapping.id)

            provisioning = { status: 'provisioned', connectionId: result.connectionId }
          } else {
            provisioning = { status: 'failed', error: result.error }
          }
        } else {
          provisioning = { status: 'pending', error: 'No access token found for this platform integration' }
        }
      } else {
        provisioning = { status: 'pending', error: 'Connect the platform integration first to enable auto-provisioning' }
      }

      return NextResponse.json({ data: mapping, provisioning }, { status: 201 })
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
