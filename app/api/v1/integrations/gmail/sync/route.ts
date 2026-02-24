/**
 * POST /api/v1/integrations/gmail/sync
 * Triggers Gmail sync for a user using the real Gmail API.
 *
 * Called:
 * 1. Automatically after successful OAuth callback (fire-and-forget) — uses INTERNAL_API_KEY
 * 2. Manually by users via UI button or browser console — uses session cookie
 * 3. By cron job for periodic sync — uses INTERNAL_API_KEY
 *
 * AUTH: Accepts EITHER:
 *   - INTERNAL_API_KEY bearer token (cron/internal) with userId in body
 *   - User session cookie (browser/UI) — userId extracted from session
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { syncGmail } from '@/lib/sync/gmail-sync'
import { getOAuthCredentials, markIntegrationDisconnected } from '@/lib/chat/functions/oauth-provider'
import { refreshGoogleAccessToken } from '@/lib/integrations/google-token-refresh'
import { storeGmailRecords } from '@/lib/sync/gmail-store'
import type { SyncJobConfig } from '@/lib/sync/types'

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

    // Step 4: Get decrypted Gmail credentials
    let credentials = await getOAuthCredentials(supabase, userId, 'gmail')
    if (!credentials) {
      return NextResponse.json(
        { success: false, error: 'Gmail not connected for user', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    // Step 5: Build SyncJobConfig and call syncGmail
    const buildConfig = (accessToken: string): SyncJobConfig => ({
      integrationId: `gmail_${userId}`,
      agencyId: userData.agency_id,
      provider: 'gmail' as SyncJobConfig['provider'],
      accessToken,
      refreshToken: credentials!.refreshToken,
    })

    let { records, result } = await syncGmail(buildConfig(credentials.accessToken))

    // Step 5b: If sync failed with token error, attempt refresh and retry
    if (!result.success && result.errors.some(e => e.includes('401') || e.includes('token'))) {
      if (credentials.refreshToken) {
        console.log('[Gmail Sync] Token expired, attempting refresh...')
        const newAccessToken = await refreshGoogleAccessToken(supabase, userId, credentials.refreshToken)

        if (newAccessToken) {
          // Retry sync with refreshed token
          const retryResult = await syncGmail(buildConfig(newAccessToken))
          records = retryResult.records
          result = retryResult.result
        } else {
          // Refresh failed — mark disconnected
          await markIntegrationDisconnected(supabase, userId, 'gmail', 'Token refresh failed. Please reconnect Gmail.')
          return NextResponse.json(
            { success: false, error: 'Gmail token expired and refresh failed. Please reconnect.', timestamp: new Date().toISOString() },
            { status: 401 }
          )
        }
      } else {
        await markIntegrationDisconnected(supabase, userId, 'gmail', 'Access token expired with no refresh token.')
        return NextResponse.json(
          { success: false, error: 'Gmail token expired with no refresh token. Please reconnect.', timestamp: new Date().toISOString() },
          { status: 401 }
        )
      }
    }

    // Step 6: Store records (user_communication + email-to-client matching → communication)
    const storeResult = await storeGmailRecords(supabase, userData.agency_id, userId, records)

    // Step 7: Update last_sync_at on credential
    await supabase
      .from('user_oauth_credential')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('type', 'gmail')

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
