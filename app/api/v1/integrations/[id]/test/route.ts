/**
 * Integration Test API
 * POST /api/v1/integrations/[id]/test - Test connection to provider
 *
 * RBAC: Requires integrations:manage permission
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withCsrfProtection } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import type { IntegrationProvider } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface TestResult {
  status: 'healthy' | 'unhealthy'
  responseTime: number
  lastChecked: string
  details?: Record<string, unknown>
  error?: string
  suggestedAction?: string
}

// POST /api/v1/integrations/[id]/test - Test connection to provider
export const POST = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

    // Fetch integration with tokens
    const { data: integration, error } = await supabase
      .from('integration')
      .select('*')
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .single()

    if (error || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    if (!integration.is_connected) {
      return NextResponse.json({
        data: {
          status: 'unhealthy',
          responseTime: 0,
          lastChecked: new Date().toISOString(),
          error: 'Integration not connected',
          suggestedAction: 'Please connect the integration first',
        } as TestResult,
      })
    }

    // Check if this integration is gateway-proxied (tokens in gateway KV, not DB)
    const integrationConfig = (integration.config as Record<string, unknown>) || {}
    const isGatewayProvider = integrationConfig.connected_via === 'diiiploy-gateway'

    let result: TestResult

    if (isGatewayProvider) {
      // Gateway providers: test via gateway status endpoint
      result = await testGatewayConnection(integration.provider as IntegrationProvider)
    } else if (!integration.access_token) {
      return NextResponse.json({
        data: {
          status: 'unhealthy',
          responseTime: 0,
          lastChecked: new Date().toISOString(),
          error: 'No access token available',
          suggestedAction: 'Please reconnect the integration',
        } as TestResult,
      })
    } else {
      // Non-gateway providers: test directly with local token
      result = await testProviderConnection(
        integration.provider as IntegrationProvider,
        integration.access_token
      )
    }

    // Update last sync time on success
    if (result.status === 'healthy') {
      await supabase
        .from('integration')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', id)
        .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
    }

      return NextResponse.json({ data: result })
    } catch (error) {
      console.error('Test connection error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
)

async function testProviderConnection(
  provider: IntegrationProvider,
  accessToken: string
): Promise<TestResult> {
  const startTime = Date.now()

  try {
    let response: Response
    let details: Record<string, unknown> = {}

    switch (provider) {
      case 'slack': {
        response = await fetch('https://slack.com/api/auth.test', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
        const slackData = await response.json()
        if (!slackData.ok) {
          return {
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            error: slackData.error,
            suggestedAction: getSlackSuggestion(slackData.error),
          }
        }
        details = { team: slackData.team, user: slackData.user }
        break
      }

      case 'gmail': {
        response = await fetch(
          'https://www.googleapis.com/gmail/v1/users/me/profile',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )
        if (!response.ok) {
          const gmailError = await response.json()
          return {
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            error: gmailError.error?.message || 'Gmail API error',
            suggestedAction: 'Token may have expired. Try reconnecting.',
          }
        }
        const gmailData = await response.json()
        details = { email: gmailData.emailAddress }
        break
      }

      case 'google_ads': {
        // Google Ads requires a developer token and additional setup
        // For MVP, we use chi-gateway MCP instead
        response = await fetch(
          'https://googleads.googleapis.com/v14/customers:listAccessibleCustomers',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        )
        if (!response.ok) {
          return {
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            error: 'Google Ads connection failed',
            suggestedAction: 'Use MCP fallback for Google Ads data',
          }
        }
        const adsData = await response.json()
        details = { customerIds: adsData.resourceNames?.length || 0 }
        break
      }

      case 'meta_ads': {
        response = await fetch(
          `https://graph.facebook.com/v18.0/me?access_token=${accessToken}&fields=id,name`
        )
        if (!response.ok) {
          return {
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            lastChecked: new Date().toISOString(),
            error: 'Meta API connection failed',
            suggestedAction: 'Token may have expired or permissions revoked',
          }
        }
        const metaData = await response.json()
        details = { userId: metaData.id, name: metaData.name }
        break
      }

      default:
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastChecked: new Date().toISOString(),
          error: `Unknown provider: ${provider}`,
        }
    }

    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      details,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Connection failed',
      suggestedAction: 'Check network connectivity and try again',
    }
  }
}

const GATEWAY_URL = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev'
const GATEWAY_API_KEY = process.env.DIIIPLOY_GATEWAY_API_KEY || ''
const TENANT_ID = process.env.DIIIPLOY_TENANT_ID || ''

async function testGatewayConnection(provider: IntegrationProvider): Promise<TestResult> {
  const startTime = Date.now()

  const gatewayStatusEndpoints: Record<string, string> = {
    slack: '/oauth/slack/status',
    gmail: '/oauth/google/status',
  }

  const statusEndpoint = gatewayStatusEndpoints[provider]
  if (!statusEndpoint) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: `No gateway status endpoint for provider: ${provider}`,
    }
  }

  if (!GATEWAY_API_KEY || !TENANT_ID) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: 'Gateway configuration missing',
      suggestedAction: 'Check DIIIPLOY_GATEWAY_API_KEY and DIIIPLOY_TENANT_ID environment variables',
    }
  }

  try {
    const response = await fetch(`${GATEWAY_URL}${statusEndpoint}`, {
      headers: {
        'Authorization': `Bearer ${GATEWAY_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
      },
      signal: AbortSignal.timeout(10000),
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      return {
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: `Gateway returned ${response.status}`,
        suggestedAction: 'Check gateway configuration or try reconnecting',
      }
    }

    const status = await response.json() as { connected?: boolean; status?: string; team?: string; user?: string; email?: string }

    if (status.connected || status.status === 'connected') {
      return {
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          connectedVia: 'diiiploy-gateway',
          ...(status.team ? { team: status.team } : {}),
          ...(status.user ? { user: status.user } : {}),
          ...(status.email ? { email: status.email } : {}),
        },
      }
    }

    return {
      status: 'unhealthy',
      responseTime,
      lastChecked: new Date().toISOString(),
      error: 'Provider reports not connected via gateway',
      suggestedAction: 'Try reconnecting the integration',
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Gateway connection failed',
      suggestedAction: 'Check network connectivity and try again',
    }
  }
}

function getSlackSuggestion(error: string): string {
  switch (error) {
    case 'invalid_auth':
      return 'Token is invalid. Please reconnect the integration.'
    case 'token_expired':
      return 'Token has expired. Click refresh to get a new token.'
    case 'token_revoked':
      return 'Token was revoked. Please reconnect the integration.'
    case 'missing_scope':
      return 'Missing required permissions. Reconnect with all scopes.'
    default:
      return 'Unknown Slack error. Try reconnecting.'
  }
}
