/**
 * Airbyte Webhook Handler
 * POST /api/v1/webhooks/airbyte
 *
 * Receives sync completion events from Airbyte Cloud notifications.
 * Auth: URL token (?token=AIRBYTE_WEBHOOK_SECRET) — Airbyte Cloud
 *       notifications don't support HMAC signing.
 * On success: runs transform_airbyte_ads_data() RPC
 * Updates integration.last_sync_at (preserving existing config)
 * Logs to airbyte_sync_log
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual, createHmac } from 'crypto'
import { serverEnv } from '@/lib/env'
import { createServiceRoleClient } from '@/lib/supabase'

// =============================================================================
// AUTH VALIDATION
// =============================================================================

/**
 * Validate the webhook request via URL token.
 * Airbyte Cloud notifications don't support HMAC signing or custom headers,
 * so we use a secret token in the URL query string.
 * URL: /api/v1/webhooks/airbyte?token=SECRET
 */
function validateWebhookToken(request: NextRequest): boolean {
  const secret = serverEnv.airbyte.webhookSecret
  if (!secret) return false

  const token = request.nextUrl.searchParams.get('token')
  if (!token) return false

  try {
    // Use HMAC comparison to avoid length oracle attacks.
    // Both sides produce fixed-length hashes regardless of input length.
    const key = 'airbyte-webhook-token-compare'
    const tokenHash = createHmac('sha256', key).update(token).digest()
    const secretHash = createHmac('sha256', key).update(secret).digest()
    return timingSafeEqual(tokenHash, secretHash)
  } catch {
    return false
  }
}

// =============================================================================
// PAYLOAD NORMALIZATION
// =============================================================================

/**
 * Airbyte Cloud notification payloads differ from the API webhook format.
 * Cloud sends: { connection: {id, name, url}, success: true, jobId: 123, ... }
 * We normalize both formats into a common shape.
 */
interface NormalizedPayload {
  webhookType: 'connection.sync.succeeded' | 'connection.sync.failed'
  connectionId: string
  jobId: string | null
  recordsSynced: number
  startTime: string | null
  endTime: string | null
  errorMessage: string | null
}

function normalizePayload(raw: Record<string, unknown>): NormalizedPayload | null {
  // Format 1: Airbyte Cloud notifications
  // { connection: {id: "..."}, success: true/false, jobId: 123, ... }
  if (raw.connection && typeof raw.connection === 'object') {
    const conn = raw.connection as Record<string, unknown>
    const connectionId = conn.id as string
    if (!connectionId) return null

    return {
      webhookType: raw.success === true
        ? 'connection.sync.succeeded'
        : 'connection.sync.failed',
      connectionId,
      jobId: raw.jobId != null ? String(raw.jobId) : null,
      recordsSynced: (raw.recordsCommitted as number) || (raw.recordsEmitted as number) || 0,
      startTime: (raw.startedAt as string) || null,
      endTime: (raw.finishedAt as string) || null,
      errorMessage: (raw.errorMessage as string) || null,
    }
  }

  // Format 2: Original API webhook format (future-proofing)
  // { webhook_type: "connection.sync.succeeded", data: { connection_id: "..." } }
  if (raw.webhook_type && raw.data && typeof raw.data === 'object') {
    const data = raw.data as Record<string, unknown>
    const connectionId = data.connection_id as string
    if (!connectionId) return null

    return {
      webhookType: raw.webhook_type as NormalizedPayload['webhookType'],
      connectionId,
      jobId: data.job_id != null ? String(data.job_id) : null,
      recordsSynced: (data.records_synced as number) || 0,
      startTime: (data.start_time as string) || null,
      endTime: (data.end_time as string) || null,
      errorMessage: (data.error_message as string) || null,
    }
  }

  return null
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  // Validate token auth
  if (!validateWebhookToken(request)) {
    console.error('[airbyte-webhook] Invalid or missing token')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawBody = await request.text()

  let rawPayload: Record<string, unknown>
  try {
    rawPayload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payload = normalizePayload(rawPayload)
  if (!payload) {
    // Airbyte Cloud test webhooks send minimal/empty payloads — return 200 so the test passes
    console.log('[airbyte-webhook] Test/ping received:', Object.keys(rawPayload))
    return NextResponse.json({ received: true, test: true })
  }

  const { webhookType, connectionId } = payload

  console.log(`[airbyte-webhook] Received ${webhookType} for connection ${connectionId}`)

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
      status: webhookType === 'connection.sync.succeeded' ? 'succeeded' : 'failed',
      records_extracted: payload.recordsSynced,
      airbyte_job_id: payload.jobId,
      started_at: payload.startTime || new Date().toISOString(),
      completed_at: payload.endTime || new Date().toISOString(),
      error_message: payload.errorMessage,
    })
  }

  // Handle sync completion
  if (webhookType === 'connection.sync.succeeded') {
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

    // Preserve existing config when updating integration
    if (agencyId) {
      const { data: existingIntegrations } = await supabase
        .from('integration')
        .select('id, config')
        .eq('agency_id', agencyId)
        .in('provider', ['google_ads', 'meta_ads'])

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
                jobId: payload.jobId,
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
        records_extracted: payload.recordsSynced,
        records_transformed: recordsTransformed,
        airbyte_job_id: payload.jobId,
        started_at: payload.startTime || new Date().toISOString(),
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
  if (webhookType === 'connection.sync.failed') {
    console.error(`[airbyte-webhook] Sync failed for ${connectionId}: ${payload.errorMessage}`)
    return NextResponse.json({ received: true, status: 'failure_logged' })
  }

  // Other event types
  return NextResponse.json({ received: true })
}
