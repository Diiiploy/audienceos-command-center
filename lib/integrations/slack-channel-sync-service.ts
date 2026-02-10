/**
 * Slack Channel Sync Service
 *
 * Syncs messages from per-client Slack channels into the `communication` table,
 * making them available as AI context automatically (via get-communications.ts).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const GATEWAY_URL = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev'
const GATEWAY_API_KEY = process.env.DIIIPLOY_GATEWAY_API_KEY || ''
const TENANT_ID = process.env.DIIIPLOY_TENANT_ID || ''

interface SlackMessage {
  type: string
  user?: string
  text: string
  ts: string
  thread_ts?: string
}

interface SyncResult {
  channelId: string
  clientId: string
  messagesAdded: number
  error?: string
}

/**
 * Sync all active client Slack channels for an agency.
 * Returns per-channel sync results.
 */
export async function syncAllChannels(
  agencyId: string,
  supabase: SupabaseClient
): Promise<SyncResult[]> {
  // Get all active channel mappings for this agency
const { data: channels, error } = await supabase
    .from('client_slack_channel')
    .select('client_id, slack_channel_id, slack_channel_name, last_sync_at')
    .eq('agency_id', agencyId)
    .eq('is_active', true)

  if (error || !channels?.length) {
    return []
  }

  const results: SyncResult[] = []

  for (const channel of channels) {
    const result = await syncChannel(
      agencyId,
      channel.client_id,
      channel.slack_channel_id,
      channel.last_sync_at,
      supabase
    )
    results.push(result)
  }

  return results
}

/**
 * Sync messages from a single Slack channel into the communication table.
 * Uses `oldest` parameter for incremental sync (only new messages since last sync).
 */
export async function syncChannel(
  agencyId: string,
  clientId: string,
  channelId: string,
  lastSyncAt: string | null,
  supabase: SupabaseClient
): Promise<SyncResult> {
  try {
    // Build Gateway URL with optional oldest timestamp for incremental sync
    let url = `${GATEWAY_URL}/slack/history?channel=${channelId}&limit=100`
    if (lastSyncAt) {
      // Convert ISO timestamp to Unix epoch for Slack API
      const unixTimestamp = (new Date(lastSyncAt).getTime() / 1000).toString()
      url += `&oldest=${unixTimestamp}`
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GATEWAY_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
      },
      signal: AbortSignal.timeout(30000),
    })

    const data = await response.json() as {
      ok: boolean
      messages?: SlackMessage[]
      error?: string
    }

    if (!data.ok || !data.messages) {
      return { channelId, clientId, messagesAdded: 0, error: data.error || 'Failed to fetch messages' }
    }

    // Filter to actual user messages (skip system messages, bot messages etc.)
    const userMessages = data.messages.filter(
      (m) => m.type === 'message' && m.text && !m.text.startsWith('<@') // skip bot pings
    )

    if (userMessages.length === 0) {
      // Update sync timestamp even if no new messages
      await supabase
        .from('client_slack_channel')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('agency_id', agencyId)
        .eq('slack_channel_id', channelId)

      return { channelId, clientId, messagesAdded: 0 }
    }

    // Build communication records
    const records = userMessages.map((msg) => ({
      agency_id: agencyId,
      client_id: clientId,
      platform: 'slack' as const,
      message_id: `slack-${channelId}-${msg.ts}`,
      subject: null,
      content: msg.text,
      sender_name: msg.user || 'unknown',
      sender_email: null,
      is_inbound: true,
      received_at: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      thread_id: msg.thread_ts || null,
    }))

    // Deduplicate: fetch existing message_ids for this channel, filter to new only
    const messageIds = records.map((r) => r.message_id)
    const { data: existing } = await supabase
      .from('communication')
      .select('message_id')
      .eq('agency_id', agencyId)
      .in('message_id', messageIds)

    const existingIds = new Set((existing || []).map((e: { message_id: string }) => e.message_id))
    const newRecords = records.filter((r) => !existingIds.has(r.message_id))

    if (newRecords.length === 0) {
      // All messages already synced — just update timestamp
      await supabase
        .from('client_slack_channel')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('agency_id', agencyId)
        .eq('slack_channel_id', channelId)

      return { channelId, clientId, messagesAdded: 0 }
    }

    const { error: insertError } = await supabase
      .from('communication')
      .insert(newRecords)

    if (insertError) {
      console.error(`[slack-sync] Insert error for channel ${channelId}:`, insertError)
      return { channelId, clientId, messagesAdded: 0, error: insertError.message }
    }

    // Update sync metadata and message count
    // Get total message count for this channel from communication table
    const { count: totalMessages } = await supabase
      .from('communication')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('platform', 'slack')

    await supabase
      .from('client_slack_channel')
      .update({
        last_sync_at: new Date().toISOString(),
        message_count: totalMessages || records.length,
      })
      .eq('agency_id', agencyId)
      .eq('slack_channel_id', channelId)

    return { channelId, clientId, messagesAdded: newRecords.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[slack-sync] Error syncing channel ${channelId}:`, message)
    return { channelId, clientId, messagesAdded: 0, error: message }
  }
}
