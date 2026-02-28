/**
 * Airbyte Integration Management
 * /api/v1/integrations/[id]/airbyte
 *
 * GET  - Check Airbyte connection status
 * POST - Trigger manual sync via Airbyte
 * DELETE - Disconnect (delete Airbyte source + connection)
 *
 * RBAC: Requires integrations:manage permission
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { getAirbyteClient } from '@/lib/airbyte/client'
import { deprovisionAirbyteConnection } from '@/lib/airbyte/provision'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/integrations/[id]/airbyte - Check connection status
export const GET = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Fetch integration with Airbyte config
      const { data: integration, error } = await supabase
        .from('integration')
        .select('config, provider, is_connected')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (error || !integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
      }

      const config = (integration.config as Record<string, unknown>) || {}
      const connectionId = config.airbyte_connection_id as string | undefined

      if (!connectionId) {
        return NextResponse.json({
          data: {
            airbyteManaged: false,
            provider: integration.provider,
            isConnected: integration.is_connected,
          },
        })
      }

      // Fetch status from Airbyte API
      const client = getAirbyteClient()
      const { data: status, error: airbyteError } = await client.getConnectionStatus(connectionId)

      return NextResponse.json({
        data: {
          airbyteManaged: true,
          provider: integration.provider,
          isConnected: integration.is_connected,
          connectionId,
          sourceId: config.airbyte_source_id,
          tablePrefix: config.airbyte_table_prefix,
          provisionedAt: config.airbyte_provisioned_at,
          syncStatus: status?.status || 'unknown',
          lastSync: status?.lastSync || null,
          error: airbyteError?.detail || null,
        },
      })
    } catch (error) {
      console.error('[airbyte-status] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// POST /api/v1/integrations/[id]/airbyte - Trigger manual sync
export const POST = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Fetch integration
      const { data: integration, error } = await supabase
        .from('integration')
        .select('config, provider, is_connected')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (error || !integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
      }

      if (!integration.is_connected) {
        return NextResponse.json({ error: 'Integration not connected' }, { status: 400 })
      }

      const config = (integration.config as Record<string, unknown>) || {}
      const connectionId = config.airbyte_connection_id as string | undefined

      if (!connectionId) {
        return NextResponse.json(
          { error: 'No Airbyte connection configured. Please reconnect.' },
          { status: 400 }
        )
      }

      // Trigger sync via Airbyte API
      const client = getAirbyteClient()
      const { data: job, error: syncError } = await client.triggerSync(connectionId)

      if (syncError) {
        return NextResponse.json(
          { error: `Failed to trigger sync: ${syncError.detail}` },
          { status: 502 }
        )
      }

      return NextResponse.json({
        data: {
          status: 'sync_triggered',
          jobId: job?.jobId,
          connectionId,
          message: `Airbyte sync triggered for ${integration.provider}`,
        },
      })
    } catch (error) {
      console.error('[airbyte-sync] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

// DELETE /api/v1/integrations/[id]/airbyte - Disconnect Airbyte
export const DELETE = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const result = await deprovisionAirbyteConnection(id, agencyId, supabase)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json({
        data: {
          status: 'disconnected',
          message: 'Airbyte connection removed successfully',
        },
      })
    } catch (error) {
      console.error('[airbyte-disconnect] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)
