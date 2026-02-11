/**
 * Manual Slack Channel Sync (diagnostic)
 * GET /api/v1/clients/[id]/slack-channel/sync
 *
 * Triggers a synchronous sync for all active channels of a client.
 * Returns full diagnostic info for debugging.
 * Uses GET for easy browser testing — just navigate to the URL.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { syncChannel } from '@/lib/integrations/slack-channel-sync-service'

export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id: clientId } = await params
      const agencyId = request.user.agencyId
      const supabase = await createRouteHandlerClient(cookies)

      // Get all active channels for this client
      const { data: channels, error: chError } = await supabase
        .from('client_slack_channel')
        .select('slack_channel_id, slack_channel_name, last_sync_at, message_count')
        .eq('client_id', clientId)
        .eq('agency_id', agencyId)
        .eq('is_active', true)

      if (chError) {
        return NextResponse.json({ error: 'Failed to fetch channels', detail: chError.message }, { status: 500 })
      }

      if (!channels || channels.length === 0) {
        return NextResponse.json({ error: 'No active channels linked to this client' }, { status: 404 })
      }

      // Check env vars
      const envCheck = {
        hasGatewayUrl: !!process.env.DIIIPLOY_GATEWAY_URL,
        hasGatewayApiKey: !!process.env.DIIIPLOY_GATEWAY_API_KEY,
        hasTenantId: !!process.env.DIIIPLOY_TENANT_ID,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      }

      // Use service role client for sync (same as cron job)
      const serviceSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Sync each channel synchronously and collect results
      const results = []
      for (const ch of channels) {
        const result = await syncChannel(
          agencyId,
          clientId,
          ch.slack_channel_id,
          ch.last_sync_at,
          serviceSupabase
        )
        results.push({
          ...result,
          channel: ch.slack_channel_name,
          previousMessageCount: ch.message_count,
        })
      }

      return NextResponse.json({
        envCheck,
        channelsFound: channels.length,
        results,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
)
