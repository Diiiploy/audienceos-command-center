/**
 * POST /api/v1/integrations/gmail/sync
 * Triggers Gmail sync for a user using the real Gmail API.
 *
 * Called:
 * 1. Automatically after successful OAuth callback (fire-and-forget)
 * 2. Manually by users via UI button
 * 3. By cron job for periodic sync
 *
 * SECURITY:
 * - Requires INTERNAL_API_KEY in Authorization header
 * - Uses service-role Supabase client (no user session needed)
 * - Tokens decrypted only when needed, never logged
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncGmail } from '@/lib/sync/gmail-sync'
import { getOAuthCredentials, markIntegrationDisconnected } from '@/lib/chat/functions/oauth-provider'
import { refreshGoogleAccessToken } from '@/lib/integrations/google-token-refresh'
import { storeGmailRecords } from '@/lib/sync/gmail-store'
import type { SyncJobConfig } from '@/lib/sync/types'

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate INTERNAL_API_KEY
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.INTERNAL_API_KEY}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', timestamp: new Date().toISOString() },
        { status: 401 }
      )
    }

    // Step 2: Extract and validate userId
    const body = await request.json()
    const { userId } = body

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid userId', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    // Step 3: Create service-role client (bypasses RLS for internal operations)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Step 4: Look up user's agency_id
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

    // Step 5: Get decrypted Gmail credentials
    let credentials = await getOAuthCredentials(supabase, userId, 'gmail')
    if (!credentials) {
      return NextResponse.json(
        { success: false, error: 'Gmail not connected for user', timestamp: new Date().toISOString() },
        { status: 400 }
      )
    }

    // Step 6: Build SyncJobConfig and call syncGmail
    const buildConfig = (accessToken: string): SyncJobConfig => ({
      integrationId: `gmail_${userId}`,
      agencyId: userData.agency_id,
      provider: 'gmail' as SyncJobConfig['provider'],
      accessToken,
      refreshToken: credentials!.refreshToken,
    })

    let { records, result } = await syncGmail(buildConfig(credentials.accessToken))

    // Step 6b: If sync failed with token error, attempt refresh and retry
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

    // Step 7: Store records (user_communication + email-to-client matching → communication)
    const storeResult = await storeGmailRecords(supabase, userData.agency_id, userId, records)

    // Step 8: Update last_sync_at on credential
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
