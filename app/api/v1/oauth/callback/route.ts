import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import type { IntegrationProvider } from '@/types/database'

interface OAuthState {
  integrationId: string
  provider: IntegrationProvider
  timestamp: number
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  scope?: string
}

// GET /api/v1/oauth/callback - Handle OAuth callback from providers
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Handle OAuth errors from provider
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=missing_params`
    )
  }

  // Decode and validate state
  let oauthState: OAuthState
  try {
    oauthState = JSON.parse(Buffer.from(state, 'base64').toString())
  } catch {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=invalid_state`
    )
  }

  // Check state expiry (10 minutes)
  if (Date.now() - oauthState.timestamp > 10 * 60 * 1000) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=state_expired`
    )
  }

  const { integrationId, provider } = oauthState

  try {
    // Exchange code for tokens based on provider
    const tokens = await exchangeCodeForTokens(code, provider)

    if (!tokens) {
      return NextResponse.redirect(
        `${baseUrl}/settings/integrations?error=token_exchange_failed`
      )
    }

    // Update integration with tokens
    const supabase = await createRouteHandlerClient(cookies)

    const updateData: Record<string, unknown> = {
      is_connected: true,
      access_token: tokens.access_token,
      last_sync_at: new Date().toISOString(),
    }

    if (tokens.refresh_token) {
      updateData.refresh_token = tokens.refresh_token
    }

    if (tokens.expires_in) {
      updateData.token_expires_at = new Date(
        Date.now() + tokens.expires_in * 1000
      ).toISOString()
    }

    const { error: updateError } = await supabase
      .from('integration')
      .update(updateData)
      .eq('id', integrationId)

    if (updateError) {
      console.error('Error updating integration:', updateError)
      return NextResponse.redirect(
        `${baseUrl}/settings/integrations?error=update_failed`
      )
    }

    // Success - redirect to integrations page
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?success=${provider}`
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=callback_failed`
    )
  }
}

// Exchange authorization code for access tokens
async function exchangeCodeForTokens(
  code: string,
  provider: IntegrationProvider
): Promise<TokenResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/v1/oauth/callback`

  const configs: Record<IntegrationProvider, {
    tokenUrl: string
    clientId: string
    clientSecret: string
    extraParams?: Record<string, string>
  }> = {
    slack: {
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    },
    gmail: {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      extraParams: { grant_type: 'authorization_code' },
    },
    google_ads: {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      extraParams: { grant_type: 'authorization_code' },
    },
    meta_ads: {
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      clientId: process.env.META_APP_ID || '',
      clientSecret: process.env.META_APP_SECRET || '',
    },
  }

  const config = configs[provider]

  if (!config.clientId || !config.clientSecret) {
    console.error(`Missing OAuth credentials for ${provider}`)
    return null
  }

  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        ...config.extraParams,
      }),
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      console.error(`Token exchange error for ${provider}:`, data)
      return null
    }

    // Slack returns tokens differently
    if (provider === 'slack') {
      return {
        access_token: data.access_token || data.authed_user?.access_token,
        refresh_token: data.refresh_token,
        token_type: 'Bearer',
      }
    }

    return data as TokenResponse
  } catch (error) {
    console.error(`Token exchange failed for ${provider}:`, error)
    return null
  }
}
