/**
 * Cron: Slack Channel Sync
 * GET /api/cron/slack-sync
 *
 * Triggered by Vercel cron every 30 minutes.
 * Iterates all agencies with active Slack integrations and syncs their channels.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncAllChannels } from '@/lib/integrations/slack-channel-sync-service'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret (prevents unauthorized access)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role client for cross-agency access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Find all agencies with active Slack integrations
    const { data: integrations, error } = await supabase
      .from('integration')
      .select('agency_id')
      .eq('provider', 'slack')
      .eq('is_connected', true)

    if (error || !integrations?.length) {
      return NextResponse.json({ synced: 0, message: 'No active Slack integrations' })
    }

    const agencyIds = [...new Set(integrations.map((i) => i.agency_id))]
    const results = []

    for (const agencyId of agencyIds) {
      try {
        const channelResults = await syncAllChannels(agencyId, supabase)
        const totalMessages = channelResults.reduce((sum, r) => sum + r.messagesAdded, 0)

        // Update integration.last_sync_at (mirrors gmail cron pattern)
        await supabase
          .from('integration')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('agency_id', agencyId)
          .eq('provider', 'slack')

        results.push({ agencyId, channels: channelResults.length, messages: totalMessages })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[cron/slack-sync] Agency ${agencyId} failed:`, message)
        results.push({ agencyId, channels: 0, messages: 0, error: message })
      }
    }

    return NextResponse.json({
      synced: results.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/slack-sync] Fatal error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
