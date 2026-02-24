/**
 * Cron: Gmail Sync
 * GET /api/cron/gmail-sync
 *
 * Triggered by Vercel cron every 15 minutes.
 * Iterates all users with active Gmail connections and syncs their emails.
 *
 * Pattern follows: app/api/cron/slack-sync/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncGmail } from '@/lib/sync/gmail-sync'
import { getOAuthCredentials, markIntegrationDisconnected } from '@/lib/chat/functions/oauth-provider'
import { refreshGoogleAccessToken } from '@/lib/integrations/google-token-refresh'
import { storeGmailRecords } from '@/lib/sync/gmail-store'
import type { SyncJobConfig } from '@/lib/sync/types'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service-role client for cross-user access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Find all users with active Gmail connections
    const { data: gmailCredentials, error } = await supabase
      .from('user_oauth_credential')
      .select('user_id')
      .eq('type', 'gmail')
      .eq('is_connected', true)

    if (error || !gmailCredentials?.length) {
      return NextResponse.json({ synced: 0, message: 'No active Gmail connections' })
    }

    const results: Array<{
      userId: string
      recordsProcessed: number
      recordsCreated: number
      clientMatched?: number
      error?: string
    }> = []

    for (const cred of gmailCredentials) {
      try {
        // Look up user's agency_id
        const { data: userData } = await supabase
          .from('user')
          .select('agency_id')
          .eq('id', cred.user_id)
          .single()

        if (!userData) {
          results.push({ userId: cred.user_id, recordsProcessed: 0, recordsCreated: 0, error: 'User not found' })
          continue
        }

        // Get decrypted credentials
        const credentials = await getOAuthCredentials(supabase, cred.user_id, 'gmail')
        if (!credentials) {
          results.push({ userId: cred.user_id, recordsProcessed: 0, recordsCreated: 0, error: 'No credentials' })
          continue
        }

        // Build sync config
        const buildConfig = (accessToken: string): SyncJobConfig => ({
          integrationId: `gmail_${cred.user_id}`,
          agencyId: userData.agency_id,
          provider: 'gmail' as SyncJobConfig['provider'],
          accessToken,
          refreshToken: credentials.refreshToken,
        })

        // Attempt sync
        let { records, result } = await syncGmail(buildConfig(credentials.accessToken))

        // Token expired? Try refresh and retry
        if (!result.success && result.errors.some(e => e.includes('401') || e.includes('token'))) {
          if (credentials.refreshToken) {
            const newAccessToken = await refreshGoogleAccessToken(supabase, cred.user_id, credentials.refreshToken)
            if (newAccessToken) {
              const retryResult = await syncGmail(buildConfig(newAccessToken))
              records = retryResult.records
              result = retryResult.result
            } else {
              await markIntegrationDisconnected(supabase, cred.user_id, 'gmail', 'Token refresh failed during cron sync.')
              results.push({ userId: cred.user_id, recordsProcessed: 0, recordsCreated: 0, error: 'Token refresh failed' })
              continue
            }
          } else {
            await markIntegrationDisconnected(supabase, cred.user_id, 'gmail', 'Access token expired with no refresh token.')
            results.push({ userId: cred.user_id, recordsProcessed: 0, recordsCreated: 0, error: 'No refresh token' })
            continue
          }
        }

        // Store records (user_communication + email-to-client matching → communication)
        const storeResult = await storeGmailRecords(supabase, userData.agency_id, cred.user_id, records)

        // Update last_sync_at
        await supabase
          .from('user_oauth_credential')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', cred.user_id)
          .eq('type', 'gmail')

        results.push({
          userId: cred.user_id,
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          clientMatched: storeResult.matched,
          error: result.errors.length > 0 ? result.errors[0] : undefined,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[cron/gmail-sync] User ${cred.user_id} failed:`, message)
        results.push({ userId: cred.user_id, recordsProcessed: 0, recordsCreated: 0, error: message })
      }
    }

    const totalRecords = results.reduce((sum, r) => sum + r.recordsCreated, 0)

    return NextResponse.json({
      synced: results.length,
      totalRecords,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/gmail-sync] Fatal error:', err)
    return NextResponse.json({ error: 'Gmail sync cron failed' }, { status: 500 })
  }
}
