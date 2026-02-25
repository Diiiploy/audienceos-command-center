/**
 * POST /api/v1/integrations/gmail/sync
 * Triggers Gmail sync for a user via diiiploy-gateway proxy.
 *
 * Called:
 * 1. Manually by users via UI button or browser console — uses session cookie
 * 2. By cron job for periodic sync — uses INTERNAL_API_KEY
 *
 * AUTH: Accepts EITHER:
 *   - INTERNAL_API_KEY bearer token (cron/internal) with userId in body
 *   - User session cookie (browser/UI) — userId extracted from session
 *
 * TOKEN MANAGEMENT:
 *   Gmail OAuth tokens live in the diiiploy-gateway KV store (not in Supabase).
 *   All Gmail API calls are proxied through the gateway, which handles token
 *   refresh, expiry, and service-account delegation automatically.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { syncGmail } from '@/lib/sync/gmail-sync'
import { storeGmailRecords } from '@/lib/sync/gmail-store'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Authenticate — try INTERNAL_API_KEY first, then session cookie
    let userId: string

    const authHeader = request.headers.get('authorization')
    const isInternalAuth = authHeader === `Bearer ${process.env.INTERNAL_API_KEY}`

    if (isInternalAuth) {
      // Internal auth: userId comes from request body
      const body = await request.json()
      if (!body.userId || typeof body.userId !== 'string' || body.userId.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid userId', timestamp: new Date().toISOString() },
          { status: 400 }
        )
      }
      userId = body.userId
    } else {
      // Session auth: userId comes from cookie/session
      const sessionSupabase = await createRouteHandlerClient(cookies)
      const { user, error } = await getAuthenticatedUser(sessionSupabase)

      if (!user || error) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', timestamp: new Date().toISOString() },
          { status: 401 }
        )
      }
      userId = user.id
    }

    // Step 2: Create service-role client (bypasses RLS for internal operations)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Step 3: Look up user's agency_id
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('agency_id')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User not found', timestamp: new Date().toISOString() },
        { status: 404 }
      )
    }

    // Step 4: Verify Gmail is connected via integration table
    // (Tokens live in gateway KV — we just check the connection status here)
    const { data: integration } = await supabase
      .from('integration')
      .select('is_connected')
      .eq('agency_id', userData.agency_id)
      .eq('provider', 'gmail')
      .single()

    if (!integration?.is_connected) {
      return NextResponse.json(
        { success: false, error: 'Gmail not connected. Please connect Gmail in Settings > Integrations.', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    // Step 5: Sync via gateway proxy (gateway handles token management)
    const { records, result } = await syncGmail({
      agencyId: userData.agency_id,
      userId,
    })

    // Step 6: Store records (user_communication + email-to-client matching → communication)
    const storeResult = await storeGmailRecords(supabase, userData.agency_id, userId, records)

    // Step 7: Update last_sync_at on integration record
    await supabase
      .from('integration')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('agency_id', userData.agency_id)
      .eq('provider', 'gmail')

    return NextResponse.json({
      success: result.success,
      recordsProcessed: result.recordsProcessed,
      recordsCreated: result.recordsCreated,
      clientMatched: storeResult.matched,
      clientUnmatched: storeResult.unmatched,
      errors: result.errors.length > 0 ? result.errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Gmail Sync] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during sync',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
