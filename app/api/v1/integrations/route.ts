import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import type { IntegrationProvider } from '@/types/database'

// GET /api/v1/integrations - List all integrations for the agency
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch integrations - RLS will filter by agency_id
    const { data: integrations, error } = await supabase
      .from('integration')
      .select('*')
      .order('provider', { ascending: true })

    if (error) {
      console.error('Error fetching integrations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch integrations' },
        { status: 500 }
      )
    }

    // Return integrations without exposing tokens
    const safeIntegrations = integrations.map(({ access_token, refresh_token, ...rest }) => rest)

    return NextResponse.json({ data: safeIntegrations })
  } catch (error) {
    console.error('Integrations GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/integrations - Initiate OAuth flow or create integration record
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(cookies)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { provider } = body as { provider: IntegrationProvider }

    if (!provider || !['slack', 'gmail', 'google_ads', 'meta_ads'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be one of: slack, gmail, google_ads, meta_ads' },
        { status: 400 }
      )
    }

    // Get agency_id from user's JWT claims
    const agencyId = session.user.user_metadata?.agency_id

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency not found in user session' },
        { status: 400 }
      )
    }

    // Check if integration already exists for this provider
    const { data: existing } = await supabase
      .from('integration')
      .select('id')
      .eq('provider', provider)
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
        provider,
        is_connected: false,
        config: {},
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating integration:', error)
      return NextResponse.json(
        { error: 'Failed to create integration' },
        { status: 500 }
      )
    }

    // Generate OAuth URL based on provider
    const oauthUrl = generateOAuthUrl(provider, integration.id)

    return NextResponse.json({
      data: {
        id: integration.id,
        provider: integration.provider,
        oauthUrl,
      },
    })
  } catch (error) {
    console.error('Integrations POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Generate OAuth authorization URL for each provider
function generateOAuthUrl(provider: IntegrationProvider, integrationId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/v1/oauth/callback`

  // State includes integration ID for tracking
  const state = Buffer.from(
    JSON.stringify({
      integrationId,
      provider,
      timestamp: Date.now(),
    })
  ).toString('base64')

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
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify',
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
