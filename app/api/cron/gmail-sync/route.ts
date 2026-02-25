/**
 * Cron: Gmail Sync
 * GET /api/cron/gmail-sync
 *
 * Triggered by Vercel cron every 15 minutes.
 * Syncs Gmail for all agencies with an active Gmail integration.
 *
 * Architecture: Gateway-proxied — tokens live in diiiploy-gateway KV,
 * all Gmail API calls route through the gateway automatically.
 * Since the gateway is tenant-scoped (not user-scoped), this syncs
 * once per agency, not once per user.
 *
 * Pattern follows: app/api/cron/slack-sync/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncGmail } from '@/lib/sync/gmail-sync'
import { storeGmailRecords } from '@/lib/sync/gmail-store'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service-role client for cross-agency access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Find all agencies with active Gmail integrations
    const { data: gmailIntegrations, error } = await supabase
      .from('integration')
      .select('agency_id')
      .eq('provider', 'gmail')
      .eq('is_connected', true)

    if (error || !gmailIntegrations?.length) {
      return NextResponse.json({ synced: 0, message: 'No active Gmail connections' })
    }

    const results: Array<{
      agencyId: string
      recordsProcessed: number
      recordsCreated: number
      clientMatched?: number
      error?: string
    }> = []

    for (const integration of gmailIntegrations) {
      try {
        // Find the agency owner (first user) for storing user_communication records
        const { data: owner } = await supabase
          .from('user')
          .select('id')
          .eq('agency_id', integration.agency_id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single()

        if (!owner) {
          results.push({ agencyId: integration.agency_id, recordsProcessed: 0, recordsCreated: 0, error: 'No agency owner found' })
          continue
        }

        // Sync via gateway proxy — gateway handles token management
        const { records, result } = await syncGmail({
          agencyId: integration.agency_id,
          userId: owner.id,
        })

        // Store records (user_communication + email-to-client matching → communication)
        const storeResult = await storeGmailRecords(supabase, integration.agency_id, owner.id, records)

        // Update last_sync_at on integration record
        await supabase
          .from('integration')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('agency_id', integration.agency_id)
          .eq('provider', 'gmail')

        results.push({
          agencyId: integration.agency_id,
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          clientMatched: storeResult.matched,
          error: result.errors.length > 0 ? result.errors[0] : undefined,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[cron/gmail-sync] Agency ${integration.agency_id} failed:`, message)
        results.push({ agencyId: integration.agency_id, recordsProcessed: 0, recordsCreated: 0, error: message })
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
