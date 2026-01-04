import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withCsrfProtection } from '@/lib/security'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/integrations/[id]/sync - Trigger manual sync
export async function POST(request: NextRequest, { params }: RouteParams) {
  // CSRF protection (TD-005)
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  try {
    const { id } = await params
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    // Fetch integration
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
      return NextResponse.json(
        { error: 'Integration not connected' },
        { status: 400 }
      )
    }

    // In a real implementation, this would queue a sync job
    // For MVP, we'll simulate a sync by updating last_sync_at
    // Future: Use background jobs (Supabase Edge Functions, Inngest, etc.)

    // Simulate sync delay (in production, this would be a queue)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Update last sync time
    const { error: updateError } = await supabase
      .from('integration')
      .update({
        last_sync_at: new Date().toISOString(),
        config: {
          ...((integration.config as object) || {}),
          lastManualSync: new Date().toISOString(),
          syncTrigger: 'manual',
        },
      })
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)

    if (updateError) {
      console.error('Error updating sync status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update sync status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        status: 'completed',
        syncedAt: new Date().toISOString(),
        provider: integration.provider,
        message: `${integration.provider} sync completed successfully`,
      },
    })
  } catch (error) {
    console.error('Sync trigger error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/v1/integrations/[id]/sync - Check sync status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const { data: integration, error } = await supabase
      .from('integration')
      .select('last_sync_at, config, provider, is_connected')
      .eq('id', id)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .single()

    if (error || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    return NextResponse.json({
      data: {
        provider: integration.provider,
        isConnected: integration.is_connected,
        lastSyncAt: integration.last_sync_at,
        status: integration.is_connected ? 'idle' : 'disconnected',
      },
    })
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
