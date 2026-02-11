/**
 * Client Slack Channel API (multi-channel)
 * GET /api/v1/clients/[id]/slack-channel - Get all linked Slack channels (array)
 * POST /api/v1/clients/[id]/slack-channel - Link a Slack channel to this client
 * DELETE /api/v1/clients/[id]/slack-channel?linkId=uuid - Unlink a specific channel
 */

import { NextResponse, after } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { createSlackChannelForClient } from '@/lib/integrations/slack-channel-service'
import { syncChannel } from '@/lib/integrations/slack-channel-sync-service'

const GATEWAY_URL = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev'
const GATEWAY_API_KEY = process.env.DIIIPLOY_GATEWAY_API_KEY || ''
const TENANT_ID = process.env.DIIIPLOY_TENANT_ID || ''

// DELETE /api/v1/clients/[id]/slack-channel?linkId=uuid
export const DELETE = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: clientId } = await params
      const agencyId = request.user.agencyId
      const supabase = await createRouteHandlerClient(cookies)

      // Require linkId query parameter for targeted unlink
      const { searchParams } = new URL(request.url)
      const linkId = searchParams.get('linkId')

      if (!linkId) {
        return createErrorResponse(400, 'Missing required query parameter: linkId')
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(linkId)) {
        return createErrorResponse(400, 'Invalid linkId format')
      }

      const { data, error } = await supabase
        .from('client_slack_channel')
        .update({ is_active: false })
        .eq('id', linkId)
        .eq('client_id', clientId)
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .select('id')

      if (error) {
        console.error('[slack-channel] Unlink error:', error)
        return createErrorResponse(500, 'Failed to unlink channel')
      }

      if (!data || data.length === 0) {
        return createErrorResponse(404, 'No matching active channel link found')
      }

      return NextResponse.json({ data: null, message: 'Channel unlinked' })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// GET /api/v1/clients/[id]/slack-channel
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id: clientId } = await params
      const supabase = await createRouteHandlerClient(cookies)

      const { data, error } = await supabase
        .from('client_slack_channel')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        return createErrorResponse(500, 'Failed to fetch Slack channels')
      }

      return NextResponse.json({ data: data || [] })
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

      // Mode 1: Link an EXISTING Slack channel (skip gateway create)
      if (typeof body.slack_channel_id === 'string' && body.slack_channel_id) {
        const slackChannelId = body.slack_channel_id as string
        const slackChannelName = (typeof body.slack_channel_name === 'string' && body.slack_channel_name)
          ? body.slack_channel_name
          : slackChannelId // Use ID as fallback name
        const label = (typeof body.label === 'string' && body.label.length <= 50)
          ? body.label
          : null

        // Invite bot to the channel so it can read history
        try {
          await fetch(`${GATEWAY_URL}/slack/channels/invite`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GATEWAY_API_KEY}`,
              'X-Tenant-ID': TENANT_ID,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ channel: slackChannelId }),
            signal: AbortSignal.timeout(5000),
          })
        } catch {
          // Non-fatal: bot may already be in channel, or channel may be public
          console.warn(`[slack-channel] Bot invite failed for ${slackChannelId} (non-fatal)`)
        }

        // Check for duplicate: same channel already linked to THIS client
        const { data: existingLink } = await supabase
          .from('client_slack_channel')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('client_id', clientId)
          .eq('slack_channel_id', slackChannelId)
          .eq('is_active', true)

        if (existingLink && existingLink.length > 0) {
          return NextResponse.json(
            { error: 'This channel is already linked to this client' },
            { status: 409 }
          )
        }

        const { data: record, error: dbError } = await supabase
          .from('client_slack_channel')
          .insert({
            agency_id: agencyId,
            client_id: clientId,
            slack_channel_id: slackChannelId,
            slack_channel_name: slackChannelName,
            label,
            is_active: true,
          })
          .select('id, slack_channel_id, slack_channel_name, label, message_count')
          .single()

        if (dbError) {
          // Handle unique violation (channel linked to another client)
          if (dbError.code === '23505') {
            return NextResponse.json(
              { error: 'This channel is already linked to another client' },
              { status: 409 }
            )
          }
          console.error('[slack-channel] Link existing channel DB error:', dbError)
          return createErrorResponse(500, 'Failed to save channel mapping')
        }

        // Sync messages after response is sent (survives Vercel serverless lifecycle)
        after(async () => {
          try {
            const serviceSupabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            )
            await syncChannel(agencyId, clientId, slackChannelId, null, serviceSupabase)
          } catch (err) {
            console.error('[slack-channel] Auto-sync after link failed:', err)
          }
        })

        return NextResponse.json({ data: record }, { status: 201 })
      }

      // Mode 2: Create a NEW Slack channel via Gateway
      const isPrivate = body.is_private === true
      const channelNameOverride = typeof body.channel_name === 'string' ? body.channel_name : undefined
      const label = (typeof body.label === 'string' && body.label.length <= 50) ? body.label : undefined

      const result = await createSlackChannelForClient({
        agencyId,
        clientId,
        clientName: client.name,
        channelNameOverride,
        isPrivate,
        label,
        supabase,
      })

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status || 500 })
      }

      // Sync messages after response is sent (survives Vercel serverless lifecycle)
      if (result.data?.slack_channel_id) {
        const channelIdToSync = result.data.slack_channel_id
        after(async () => {
          try {
            const serviceSupabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            )
            await syncChannel(agencyId, clientId, channelIdToSync, null, serviceSupabase)
          } catch (err) {
            console.error('[slack-channel] Auto-sync after create failed:', err)
          }
        })
      }

      return NextResponse.json({ data: result.data }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
