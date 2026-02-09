/**
 * Gateway OAuth Callback Sync
 * POST /api/v1/integrations/gateway-callback
 *
 * Called by the frontend after the gateway redirects back with ?connected=<provider>.
 * Verifies the connection with the gateway, then updates the Supabase integration record.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import type { IntegrationProvider } from '@/types/database'

const GATEWAY_URL = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev'
const GATEWAY_API_KEY = process.env.DIIIPLOY_GATEWAY_API_KEY || ''
const TENANT_ID = process.env.DIIIPLOY_TENANT_ID || ''

export const POST = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json() as { provider?: string; email?: string }
      const { provider, email } = body

      if (!provider) {
        return NextResponse.json({ error: 'provider is required' }, { status: 400 })
      }

      // Map gateway provider names to Supabase provider enum
      const providerMap: Record<string, IntegrationProvider> = {
        google: 'gmail',
        gmail: 'gmail',
        slack: 'slack',
      }
      const dbProvider = providerMap[provider] || provider as IntegrationProvider

      // Verify with gateway that the connection actually exists
      // Route to the correct gateway status endpoint per provider
      const gatewayStatusEndpoints: Record<string, string> = {
        gmail: '/oauth/google/status',
        google: '/oauth/google/status',
        slack: '/oauth/slack/status',
      }
      const statusEndpoint = gatewayStatusEndpoints[provider] || gatewayStatusEndpoints[dbProvider]

      if (TENANT_ID && GATEWAY_API_KEY && statusEndpoint) {
        try {
          const statusRes = await fetch(`${GATEWAY_URL}${statusEndpoint}`, {
            headers: {
              'Authorization': `Bearer ${GATEWAY_API_KEY}`,
              'X-Tenant-ID': TENANT_ID,
            },
            signal: AbortSignal.timeout(5000),
          })

          if (statusRes.ok) {
            const status = await statusRes.json() as { connected?: boolean; status?: string }
            if (!status.connected && status.status !== 'connected') {
              return NextResponse.json(
                { error: 'Gateway reports provider is not connected' },
                { status: 400 }
              )
            }
          }
        } catch {
          // Gateway verification failed — still proceed since the redirect had valid params
          console.warn('[gateway-callback] Could not verify with gateway, proceeding with update')
        }
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Upsert integration record as connected
      const { error: upsertError } = await supabase
        .from('integration')
        .upsert(
          {
            agency_id: agencyId,
            provider: dbProvider,
            is_connected: true,
            config: {
              connected_via: 'diiiploy-gateway',
              connected_at: new Date().toISOString(),
              connected_email: email || null,
            },
          },
          { onConflict: 'agency_id,provider' }
        )

      if (upsertError) {
        console.error('[gateway-callback] Supabase upsert error:', upsertError)
        return NextResponse.json({ error: 'Failed to update integration status' }, { status: 500 })
      }

      return NextResponse.json({ success: true, provider: dbProvider })
    } catch (error) {
      console.error('[gateway-callback] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)
