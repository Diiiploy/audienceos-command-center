/**
 * OAuth Callback Handler
 * GET /api/v1/oauth/callback
 *
 * Handles the OAuth redirect from providers (Google, Slack, etc.)
 * - Verifies state parameter (CSRF protection)
 * - Exchanges authorization code for tokens
 * - Encrypts and stores tokens in database
 * - Redirects to integrations page
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { verifyOAuthState, encryptToken, serializeEncryptedToken } from '@/lib/crypto'
import { withRateLimit, getClientIp } from '@/lib/security'
import { integrationLogger } from '@/lib/logger'
import type { IntegrationProvider } from '@/types/database'

// Strict rate limit for OAuth callbacks: 5 per minute per IP
const OAUTH_RATE_LIMIT = { maxRequests: 5, windowMs: 60000 }

// Token exchange endpoints for each provider
const TOKEN_ENDPOINTS: Record<string, string> = {
  gmail: 'https://oauth2.googleapis.com/token',
  google_ads: 'https://oauth2.googleapis.com/token',
  slack: 'https://slack.com/api/oauth.v2.access',
  meta_ads: 'https://graph.facebook.com/v18.0/oauth/access_token',
}

// Client credentials for each provider
function getClientCredentials(provider: IntegrationProvider): { clientId: string; clientSecret: string } {
  switch (provider) {
    case 'gmail':
      return {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      }
    case 'google_ads':
      return {
        clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      }
    case 'slack':
      return {
        clientId: process.env.SLACK_CLIENT_ID || '',
        clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      }
    case 'meta_ads':
      return {
        clientId: process.env.META_APP_ID || '',
        clientSecret: process.env.META_APP_SECRET || '',
      }
    default:
      return { clientId: '', clientSecret: '' }
  }
}

export async function GET(request: NextRequest) {
  // Rate limit check (5 per minute per IP)
  const rateLimitResponse = withRateLimit(request, OAUTH_RATE_LIMIT)
  if (rateLimitResponse) return rateLimitResponse

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/v1/oauth/callback`

  // Handle OAuth errors from provider
  if (error) {
    integrationLogger.error({ error, errorDescription }, 'Provider OAuth error')
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  // Validate required parameters
  if (!code || !state) {
    integrationLogger.warn('Missing code or state parameter in OAuth callback')
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent('Missing authorization parameters')}`
    )
  }

  // Verify state parameter (CSRF protection)
  const statePayload = verifyOAuthState(state)
  if (!statePayload) {
    integrationLogger.warn('Invalid state parameter - possible CSRF attack')
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent('Invalid state - please try again')}`
    )
  }

  // Check state freshness (10 minute window)
  const stateAge = Date.now() - statePayload.timestamp
  const maxAge = 10 * 60 * 1000 // 10 minutes
  if (stateAge > maxAge) {
    integrationLogger.warn({ stateAge }, 'OAuth state expired')
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent('Authorization expired - please try again')}`
    )
  }

  const { integrationId, provider } = statePayload

  try {
    // Get client credentials for this provider
    const { clientId, clientSecret } = getClientCredentials(provider as IntegrationProvider)

    if (!clientId || !clientSecret) {
      integrationLogger.error({ provider }, 'Missing client credentials for provider')
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('OAuth not configured for this provider')}`
      )
    }

    // Exchange authorization code for tokens
    const tokenEndpoint = TOKEN_ENDPOINTS[provider]
    if (!tokenEndpoint) {
      integrationLogger.error({ provider }, 'Unknown OAuth provider')
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Unknown provider')}`
      )
    }

    // Build token exchange request
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      integrationLogger.error({ status: tokenResponse.status, error: errorData }, 'Token exchange failed')
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Failed to complete authorization')}`
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in, scope } = tokenData

    if (!access_token) {
      integrationLogger.error({ provider }, 'No access token in response')
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('No access token received')}`
      )
    }

    // Encrypt tokens for storage
    const encryptedAccessToken = encryptToken(access_token)
    const encryptedRefreshToken = refresh_token ? encryptToken(refresh_token) : null

    // Calculate token expiration
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null

    // Update integration in database
    const supabase = await createRouteHandlerClient(cookies)

    const updateData: Record<string, unknown> = {
      is_connected: true,
      config: {
        connected_at: new Date().toISOString(),
        scope: scope || null,
        expires_at: expiresAt,
      },
    }

    // Store encrypted tokens or raw if encryption not configured
    if (encryptedAccessToken) {
      updateData.access_token = serializeEncryptedToken(encryptedAccessToken)
    } else {
      updateData.access_token = access_token
    }

    if (encryptedRefreshToken) {
      updateData.refresh_token = serializeEncryptedToken(encryptedRefreshToken)
    } else if (refresh_token) {
      updateData.refresh_token = refresh_token
    }

    const { error: updateError } = await supabase
      .from('integration')
      .update(updateData)
      .eq('id', integrationId)

    if (updateError) {
      integrationLogger.error({ err: updateError, integrationId }, 'Database update failed')
      return NextResponse.redirect(
        `${baseUrl}/integrations?error=${encodeURIComponent('Failed to save credentials')}`
      )
    }

    // Airbyte provisioning for ad platforms (non-blocking)
    // Creates Airbyte source + connection after successful OAuth
    if (provider === 'google_ads' || provider === 'meta_ads') {
      try {
        const { provisionAirbyteConnection } = await import('@/lib/airbyte/provision')
        const integrationConfig = (updateData.config as Record<string, unknown>) || {}

        // Fetch agency_id from integration record (not in state payload)
        const { data: integrationRecord } = await supabase
          .from('integration')
          .select('agency_id')
          .eq('id', integrationId)
          .single()

        const agencyId = integrationRecord?.agency_id || ''

        // Fire-and-forget: don't block the OAuth redirect
        provisionAirbyteConnection(
          {
            agencyId,
            clientId: (integrationConfig.clientId as string) || agencyId,
            platform: provider as 'google_ads' | 'meta_ads',
            externalAccountId: (integrationConfig.accountId as string) || '',
            accessToken: access_token,
            refreshToken: refresh_token,
            googleAds: provider === 'google_ads' ? {
              customerId: (integrationConfig.customerId as string) || '',
            } : undefined,
            metaAds: provider === 'meta_ads' ? {
              accountId: (integrationConfig.accountId as string) || '',
            } : undefined,
          },
          supabase,
          integrationId
        ).catch((err: unknown) => {
          integrationLogger.error({ err, integrationId, provider }, 'Airbyte provisioning failed (non-fatal)')
        })
      } catch (err) {
        integrationLogger.warn({ err, provider }, 'Airbyte module not available - skipping provisioning')
      }
    }

    // Redirect to integrations page with success message
    return NextResponse.redirect(
      `${baseUrl}/integrations?success=${encodeURIComponent(`${getProviderDisplayName(provider)} connected successfully`)}`
    )
  } catch (error) {
    integrationLogger.error({ err: error }, 'OAuth callback unexpected error')
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=${encodeURIComponent('An unexpected error occurred')}`
    )
  }
}

function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = {
    gmail: 'Google Workspace',
    google_ads: 'Google Ads',
    slack: 'Slack',
    meta_ads: 'Meta Ads',
  }
  return names[provider] || provider
}
