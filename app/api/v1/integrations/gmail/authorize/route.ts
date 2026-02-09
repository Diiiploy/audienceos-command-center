import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit } from '@/lib/security'
import { integrationLogger } from '@/lib/logger'

// Strict rate limit for OAuth initiations: 3 per minute per IP
const OAUTH_RATE_LIMIT = { maxRequests: 3, windowMs: 60000 }

/**
 * GET /api/v1/integrations/gmail/authorize
 * Redirects to diiiploy-gateway OAuth flow.
 *
 * The gateway handles the full Google OAuth lifecycle:
 * 1. Redirects user to Google consent screen
 * 2. Receives callback and exchanges code for tokens
 * 3. Stores encrypted tokens in KV (gateway is source of truth)
 * 4. Redirects back to command center settings page
 */
export async function GET(request: NextRequest) {
  // Rate limit check (3 per minute per IP)
  const rateLimitResponse = withRateLimit(request, OAUTH_RATE_LIMIT)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      integrationLogger.warn({ provider: 'gmail' }, 'Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to authorize Gmail' },
        { status: 401 }
      )
    }

    // Redirect to diiiploy-gateway OAuth endpoint
    const gatewayUrl = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev'
    const tenantId = process.env.DIIIPLOY_TENANT_ID

    if (!tenantId) {
      integrationLogger.error({}, 'DIIIPLOY_TENANT_ID not configured')
      return NextResponse.json(
        { error: 'Gateway not configured', message: 'DIIIPLOY_TENANT_ID is not set' },
        { status: 500 }
      )
    }

    const authorizeUrl = `${gatewayUrl}/oauth/google/authorize?tenant_id=${tenantId}`
    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    integrationLogger.error({ err: error, provider: 'gmail' }, 'OAuth authorization failed')
    return NextResponse.json(
      {
        error: 'Authorization initiation failed',
        message: 'An unexpected error occurred while initiating Gmail authorization',
      },
      { status: 500 }
    )
  }
}
