/**
 * Slack Channel Service
 *
 * Handles creating, linking, and managing Slack channels for sub-clients.
 * All Slack API calls route through the diiiploy-gateway.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const GATEWAY_URL = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev'
const GATEWAY_API_KEY = process.env.DIIIPLOY_GATEWAY_API_KEY || ''
const TENANT_ID = process.env.DIIIPLOY_TENANT_ID || ''

interface CreateChannelParams {
  agencyId: string
  clientId: string
  clientName: string
  channelNameOverride?: string
  isPrivate?: boolean
  supabase: SupabaseClient
}

interface CreateChannelResult {
  ok: boolean
  data?: {
    id: string
    slack_channel_id: string
    slack_channel_name: string
  }
  error?: string
  status?: number
}

/**
 * Create a Slack channel for a client via the Gateway and record the mapping.
 */
export async function createSlackChannelForClient(params: CreateChannelParams): Promise<CreateChannelResult> {
  const { agencyId, clientId, clientName, channelNameOverride, isPrivate, supabase } = params

  // Check if Slack is connected for this tenant
  if (!GATEWAY_API_KEY || !TENANT_ID) {
    return { ok: false, error: 'Gateway not configured', status: 500 }
  }

  // Build channel name from client name (or override)
  const channelName = channelNameOverride || clientName

  try {
    // Call Gateway to create the channel
    const response = await fetch(`${GATEWAY_URL}/slack/channels/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: channelName,
        is_private: isPrivate || false,
      }),
      signal: AbortSignal.timeout(15000),
    })

    const result = await response.json() as {
      ok: boolean
      channel?: { id: string; name: string }
      error?: string
    }

    if (!result.ok || !result.channel) {
      return {
        ok: false,
        error: result.error || 'Failed to create Slack channel',
        status: response.status === 409 ? 409 : 500,
      }
    }

    // Invite the bot to the channel
    try {
      await fetch(`${GATEWAY_URL}/slack/channels/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GATEWAY_API_KEY}`,
          'X-Tenant-ID': TENANT_ID,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: result.channel.id }),
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      // Non-fatal: bot invite failure shouldn't block channel creation
      console.warn(`[slack-channel-service] Bot invite failed for channel ${result.channel.id}`)
    }

    // Store the mapping in Supabase
    // Note: client_slack_channel not yet in generated types — will be after migration + type regen
    const { data: record, error: dbError } = await (supabase as any)
      .from('client_slack_channel')
      .upsert(
        {
          agency_id: agencyId,
          client_id: clientId,
          slack_channel_id: result.channel.id,
          slack_channel_name: result.channel.name,
          is_active: true,
        },
        { onConflict: 'agency_id,client_id' }
      )
      .select('id, slack_channel_id, slack_channel_name')
      .single()

    if (dbError) {
      console.error('[slack-channel-service] DB insert error:', dbError)
      return { ok: false, error: 'Channel created in Slack but failed to save mapping', status: 500 }
    }

    return { ok: true, data: record }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[slack-channel-service] Error:', message)
    return { ok: false, error: message, status: 500 }
  }
}

/**
 * Archive a client's Slack channel via the Gateway and mark it inactive.
 */
export async function archiveSlackChannelForClient(
  clientId: string,
  supabase: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  // Get existing channel mapping
  const { data: mapping } = await (supabase as any)
    .from('client_slack_channel')
    .select('id, slack_channel_id')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .maybeSingle() as { data: { id: string; slack_channel_id: string } | null }

  if (!mapping) {
    return { ok: true } // No channel to archive
  }

  // Archive in Slack via Gateway
  try {
    await fetch(`${GATEWAY_URL}/slack/channels/archive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_API_KEY}`,
        'X-Tenant-ID': TENANT_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: mapping.slack_channel_id }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    console.warn(`[slack-channel-service] Gateway archive failed for ${mapping.slack_channel_id}`)
  }

  // Mark inactive in DB regardless (preserve historical data)
  await (supabase as any)
    .from('client_slack_channel')
    .update({ is_active: false })
    .eq('id', mapping.id)

  return { ok: true }
}
