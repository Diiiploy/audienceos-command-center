/**
 * Airbyte Webhook Handler
 * POST /api/v1/webhooks/airbyte
 *
 * Receives sync completion events from Airbyte Cloud.
 * - Validates HMAC signature (AIRBYTE_WEBHOOK_SECRET)
 * - On success: runs transform_airbyte_ads_data() RPC
 * - Updates integration.last_sync_at (preserving existing config)
 * - Logs to airbyte_sync_log
 *
 * NO user auth required — secured via webhook secret.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { serverEnv } from '@/lib/env'
import { createServiceRoleClient } from '@/lib/supabase'
import type { AirbyteWebhookPayload } from '@/lib/airbyte/types'

// =============================================================================
// HMAC VALIDATION
// =============================================================================

function validateWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  const secret = serverEnv.airbyte.webhookSecret
  if (!secret || !signature) return false

  try {
    const hmac = createHmac('sha256', secret)
    hmac.update(body)
    const expected = hmac.digest('hex')

    // Constant-time comparison
    const sigBuffer = Buffer.from(signature, 'utf8')
    const expectedBuffer = Buffer.from(expected, 'utf8')

    if (sigBuffer.length !== expectedBuffer.length) return false
    return timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Validate HMAC signature
  const signature = request.headers.get('x-airbyte-signature') ||
    request.headers.get('x-webhook-signature')

  if (!validateWebhookSignature(rawBody, signature)) {
    console.error('[airbyte-webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: AirbyteWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { webhook_type, data } = payload
  const connectionId = data.connection_id

  console.log(`[airbyte-webhook] Received ${webhook_type} for connection ${connectionId}`)

  // Use service client for writes (no user context needed)
  const supabase = createServiceRoleClient()
  if (!supabase) {
    console.error('[airbyte-webhook] Service role client not configured')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  // Look up the connection mapping to get agency info
  const { data: mapping } = await supabase
    .from('airbyte_account_mapping')
    .select('*')
    .eq('airbyte_connection_id', connectionId)
    .eq('is_active', true)
    .single()

  const agencyId = mapping?.agency_id as string | undefined
  const platform = mapping?.platform as string | undefined

  // Helper to insert sync log entries
  async function logSyncEvent(logData: {
    agency_id: string
    connection_id: string
    platform: string
    status: string
    records_extracted: number
    records_transformed?: number | null
    airbyte_job_id?: string | null
    started_at: string
    completed_at: string
    error_message?: string | null
  }) {
    try {
      await supabase!.from('airbyte_sync_log').insert(logData)
    } catch (err) {
      console.error('[airbyte-webhook] Failed to write sync log:', err)
    }
  }

  // Log the sync event
  if (agencyId) {
    await logSyncEvent({
      agency_id: agencyId,
      connection_id: connectionId,
      platform: platform || 'unknown',
      status: webhook_type === 'connection.sync.succeeded' ? 'succeeded' : 'failed',
      records_extracted: data.records_synced || 0,
      airbyte_job_id: data.job_id?.toString(),
      started_at: data.start_time || new Date().toISOString(),
      completed_at: data.end_time || new Date().toISOString(),
      error_message: data.error_message || null,
    })
  }

  // Handle sync completion
  if (webhook_type === 'connection.sync.succeeded') {
    // Run the transform function to move data from staging to ad_performance
    const { data: transformResult, error: transformError } = await supabase.rpc(
      'transform_airbyte_ads_data',
      {
        p_connection_id: connectionId,
        p_agency_id: agencyId || undefined,
      }
    )

    if (transformError) {
      console.error('[airbyte-webhook] Transform error:', transformError)

      if (agencyId) {
        await logSyncEvent({
          agency_id: agencyId,
          connection_id: connectionId,
          platform: platform || 'unknown',
          status: 'failed',
          records_extracted: 0,
          error_message: `Transform failed: ${transformError.message}`,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
      }

      return NextResponse.json({
        received: true,
        transform: 'failed',
        error: transformError.message,
      })
    }

    const result = transformResult as Record<string, unknown> | null
    const recordsTransformed = (result?.records_transformed as number) || 0

    console.log(`[airbyte-webhook] Transform complete: ${recordsTransformed} records`)

    // Bug 1 fix: Preserve existing config when updating integration
    if (agencyId) {
      // Fetch existing config to spread into update
      const { data: existingIntegrations } = await supabase
        .from('integration')
        .select('id, config')
        .eq('agency_id', agencyId)
        .in('provider', ['google_ads', 'meta_ads'])

      // Update each matching integration, preserving its config
      for (const integration of existingIntegrations || []) {
        const existingConfig = (integration.config as Record<string, unknown>) || {}
        await supabase
          .from('integration')
          .update({
            last_sync_at: new Date().toISOString(),
            config: {
              ...existingConfig,
              lastAirbyteSync: new Date().toISOString(),
              lastSyncResult: {
                success: true,
                recordsTransformed,
                jobId: data.job_id,
              },
            },
          })
          .eq('id', integration.id)
      }

      await logSyncEvent({
        agency_id: agencyId,
        connection_id: connectionId,
        platform: platform || 'unknown',
        status: 'transformed',
        records_extracted: data.records_synced || 0,
        records_transformed: recordsTransformed,
        airbyte_job_id: data.job_id?.toString(),
        started_at: data.start_time || new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      received: true,
      transform: 'success',
      recordsTransformed,
    })
  }

  // Handle sync failure
  if (webhook_type === 'connection.sync.failed') {
    console.error(`[airbyte-webhook] Sync failed for ${connectionId}: ${data.error_message}`)
    return NextResponse.json({ received: true, status: 'failure_logged' })
  }

  // Other event types (started, incomplete)
  return NextResponse.json({ received: true })
}
