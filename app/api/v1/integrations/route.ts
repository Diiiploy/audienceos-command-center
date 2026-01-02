import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/security'
import { signOAuthState } from '@/lib/crypto'
import type { IntegrationProvider } from '@/types/database'

const VALID_PROVIDERS: IntegrationProvider[] = ['slack', 'gmail', 'google_ads', 'meta_ads']

// GET /api/v1/integrations - List all integrations for the agency
export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, error: authError } = await getAuthenticatedUser(supabase)

    if (!user) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Fetch integrations - RLS will filter by agency_id
    const { data: integrations, error } = await supabase
      .from('integration')
      .select('*')
      .order('provider', { ascending: true })

    if (error) {
      return createErrorResponse(500, 'Failed to fetch integrations')
    }

    // Return integrations without exposing tokens
    const safeIntegrations = integrations.map(({ access_token: _at, refresh_token: _rt, ...rest }) => rest)

    return NextResponse.json({ data: safeIntegrations })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

// POST /api/v1/integrations - Initiate OAuth flow or create integration record
export async function POST(request: NextRequest) {
  // Rate limit: 30 creates per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Note: Auth check and agencyId lookup done later via getAuthenticatedUser (SEC-006)
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { provider } = body

    // Validate provider
    if (typeof provider !== 'string' || !VALID_PROVIDERS.includes(provider as IntegrationProvider)) {
      return createErrorResponse(
        400,
        `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`
      )
    }

    // Get agency_id from database (SEC-003)
    const { agencyId, error: agencyError } = await getAuthenticatedUser(supabase)

    if (!agencyId) {
      return createErrorResponse(400, agencyError || 'Agency not found')
    }

    // Check if integration already exists for this provider
    const { data: existing } = await supabase
      .from('integration')
      .select('id')
      .eq('provider', provider as IntegrationProvider)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Integration already exists for this provider' },
        { status: 409 }
      )
    }

    // Create integration record (disconnected state initially)
    const { data: integration, error } = await supabase
      .from('integration')
      .insert({
        agency_id: agencyId,
        provider: provider as IntegrationProvider,
        is_connected: false,
        config: {},
      })
      .select()
      .single()

    if (error) {
      return createErrorResponse(500, 'Failed to create integration')
    }

    // Generate OAuth URL based on provider
    const oauthUrl = generateOAuthUrl(provider as IntegrationProvider, integration.id)

    return NextResponse.json({
      data: {
        id: integration.id,
        provider: integration.provider,
        oauthUrl,
      },
    })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}

// Generate OAuth authorization URL for each provider
function generateOAuthUrl(provider: IntegrationProvider, integrationId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/v1/oauth/callback`

  // State includes integration ID for tracking, signed with HMAC to prevent CSRF
  const state = signOAuthState({
    integrationId,
    provider,
    timestamp: Date.now(),
  })

  switch (provider) {
    case 'slack':
      return `https://slack.com/oauth/v2/authorize?${new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '',
        scope: 'channels:read,channels:history,chat:write,users:read,team:read',
        redirect_uri: redirectUri,
        state,
      })}`

    case 'gmail':
      return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        scope:
          'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify',
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
      })}`

    case 'google_ads':
      return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
        scope: 'https://www.googleapis.com/auth/adwords',
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
        access_type: 'offline',
        include_granted_scopes: 'true',
      })}`

    case 'meta_ads':
      return `https://www.facebook.com/v18.0/dialog/oauth?${new URLSearchParams({
        client_id: process.env.META_APP_ID || '',
        scope: 'ads_read,business_management,ads_management',
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
      })}`

    default:
      return ''
  }
}
