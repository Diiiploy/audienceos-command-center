/**
 * Client Slack Channel API
 * GET /api/v1/clients/[id]/slack-channel - Get linked Slack channel info
 * POST /api/v1/clients/[id]/slack-channel - Create or link a Slack channel for this client
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { createSlackChannelForClient } from '@/lib/integrations/slack-channel-service'

// GET /api/v1/clients/[id]/slack-channel
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id: clientId } = await params
      const supabase = await createRouteHandlerClient(cookies)

      // Note: client_slack_channel not yet in generated types — will be after migration + type regen
      const { data, error } = await (supabase as any)
        .from('client_slack_channel')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle()

      if (error) {
        return createErrorResponse(500, 'Failed to fetch Slack channel')
      }

      return NextResponse.json({ data })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/clients/[id]/slack-channel
export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: clientId } = await params
      const agencyId = request.user.agencyId
      const supabase = await createRouteHandlerClient(cookies)

      // Check if channel already exists
      const { data: existing } = await (supabase as any)
        .from('client_slack_channel')
        .select('id, slack_channel_id, slack_channel_name, is_active')
        .eq('client_id', clientId)
        .maybeSingle() as { data: { id: string; slack_channel_id: string; slack_channel_name: string; is_active: boolean } | null }

      if (existing?.is_active) {
        return NextResponse.json(
          { error: 'Client already has an active Slack channel', data: existing },
          { status: 409 }
        )
      }

      // Get client name for channel naming
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('name')
        .eq('id', clientId)
        .single()

      if (clientError || !client) {
        return createErrorResponse(404, 'Client not found')
      }

      // Get optional config from request body
      let body: Record<string, unknown> = {}
      try {
        body = await request.json()
      } catch {
        // No body is fine — use defaults
      }

      const isPrivate = body.is_private === true
      const channelNameOverride = typeof body.channel_name === 'string' ? body.channel_name : undefined

      const result = await createSlackChannelForClient({
        agencyId,
        clientId,
        clientName: client.name,
        channelNameOverride,
        isPrivate,
        supabase,
      })

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status || 500 })
      }

      return NextResponse.json({ data: result.data }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
