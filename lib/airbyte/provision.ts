/**
 * Airbyte Connection Provisioning
 *
 * Called after OAuth success for google_ads or meta_ads.
 * Creates an Airbyte source + connection, stores IDs in integration config,
 * and creates an airbyte_account_mapping record.
 */

import { getAirbyteClient } from './client'
import { serverEnv } from '@/lib/env'
import {
  AIRBYTE_SOURCE_DEFINITIONS,
  type AirbytePlatform,
  type AirbyteProvisionConfig,
  type AirbyteProvisionResult,
  type AirbyteStreamConfiguration,
} from './types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

// =============================================================================
// STREAM CONFIGURATIONS PER PLATFORM
// =============================================================================

const GOOGLE_ADS_STREAMS: AirbyteStreamConfiguration[] = [
  {
    name: 'campaigns',
    syncMode: 'incremental_append',
    cursorField: ['segments.date'],
  },
  {
    name: 'campaign_stats',
    syncMode: 'incremental_append',
    cursorField: ['segments.date'],
  },
  {
    name: 'ad_groups',
    syncMode: 'incremental_append',
    cursorField: ['segments.date'],
  },
]

const META_ADS_STREAMS: AirbyteStreamConfiguration[] = [
  {
    name: 'campaigns',
    syncMode: 'incremental_append',
    cursorField: ['date_start'],
  },
  {
    name: 'ads_insights',
    syncMode: 'incremental_append',
    cursorField: ['date_start'],
  },
  {
    name: 'ads_insights_action_type',
    syncMode: 'incremental_append',
    cursorField: ['date_start'],
  },
]

// =============================================================================
// PROVISIONING
// =============================================================================

/**
 * Generate a table prefix for multi-tenant isolation in airbyte_staging
 * Format: agency_{short_uuid}_ (e.g., "agency_a1b2c3d4_")
 */
function generateTablePrefix(agencyId: string): string {
  const shortId = agencyId.replace(/-/g, '').substring(0, 8)
  return `agency_${shortId}_`
}

/**
 * Build source configuration for the given platform
 * Bug 7 fix: Uses serverEnv instead of process.env directly
 */
function buildSourceConfig(config: AirbyteProvisionConfig): Record<string, unknown> {
  if (config.platform === 'google_ads') {
    return {
      credentials: {
        developer_token: config.googleAds?.developerToken || '',
        client_id: serverEnv.googleAds.clientId,
        client_secret: serverEnv.googleAds.clientSecret,
        refresh_token: config.refreshToken || '',
        access_token: config.accessToken,
      },
      customer_id: config.googleAds?.customerId || config.externalAccountId,
      login_customer_id: config.googleAds?.loginCustomerId,
      start_date: getDefaultStartDate(),
    }
  }

  if (config.platform === 'meta_ads') {
    return {
      access_token: config.accessToken,
      account_ids: [config.metaAds?.accountId || config.externalAccountId],
      start_date: getDefaultStartDate(),
      end_date: new Date().toISOString().split('T')[0],
      insights_lookback_window: 28,
    }
  }

  return {}
}

/**
 * Default start date for syncs: 90 days ago
 */
function getDefaultStartDate(): string {
  const date = new Date()
  date.setDate(date.getDate() - 90)
  return date.toISOString().split('T')[0]
}

/**
 * Provision a full Airbyte pipeline for an ad platform integration.
 *
 * Steps:
 * 1. Create Airbyte Source with OAuth credentials
 * 2. Create Airbyte Connection (source -> shared Supabase destination)
 * 3. Store source/connection IDs in integration.config
 * 4. Create airbyte_account_mapping record
 */
export async function provisionAirbyteConnection(
  config: AirbyteProvisionConfig,
  supabase: SupabaseClient<Database>,
  integrationId: string
): Promise<AirbyteProvisionResult> {
  const client = getAirbyteClient()
  const tablePrefix = generateTablePrefix(config.agencyId)

  try {
    // Step 1: Create Airbyte Source
    const definitionId = AIRBYTE_SOURCE_DEFINITIONS[config.platform]
    const sourceConfig = buildSourceConfig(config)

    const { data: source, error: sourceError } = await client.createSource({
      name: `${config.platform}_${config.agencyId.substring(0, 8)}`,
      definitionId,
      configuration: sourceConfig,
    })

    if (sourceError || !source) {
      console.error('[airbyte-provision] Failed to create source:', sourceError)
      return {
        success: false,
        error: sourceError?.detail || 'Failed to create Airbyte source',
      }
    }

    // Step 2: Create Airbyte Connection
    const streams = config.platform === 'google_ads' ? GOOGLE_ADS_STREAMS : META_ADS_STREAMS

    const { data: connection, error: connectionError } = await client.createConnection({
      name: `${config.platform}_${config.agencyId.substring(0, 8)}_to_supabase`,
      sourceId: source.sourceId,
      schedule: {
        scheduleType: 'cron',
        cronExpression: '0 6 * * *', // Daily at 6 AM UTC
      },
      namespaceDefinition: 'custom',
      namespaceFormat: 'airbyte_staging',
      prefix: tablePrefix,
      nonBreakingSchemaUpdatesBehavior: 'propagate_columns',
      configurations: { streams },
    })

    if (connectionError || !connection) {
      // Cleanup: delete the source we just created
      console.error('[airbyte-provision] Failed to create connection:', connectionError)
      await client.deleteSource(source.sourceId)
      return {
        success: false,
        error: connectionError?.detail || 'Failed to create Airbyte connection',
      }
    }

    // Step 3: Update integration record with Airbyte IDs
    // Preserve existing config keys (connected_at, scope, etc.)
    const { data: existing } = await supabase
      .from('integration')
      .select('config')
      .eq('id', integrationId)
      .single()

    const existingConfig = (existing?.config as Record<string, unknown>) || {}

    const { error: updateError } = await supabase
      .from('integration')
      .update({
        config: {
          ...existingConfig,
          airbyte_source_id: source.sourceId,
          airbyte_connection_id: connection.connectionId,
          airbyte_table_prefix: tablePrefix,
          airbyte_provisioned_at: new Date().toISOString(),
        },
      })
      .eq('id', integrationId)

    if (updateError) {
      console.error('[airbyte-provision] Failed to update integration config:', updateError)
      // Non-fatal - Airbyte resources were created successfully
    }

    // Step 4: Create account mapping record
    const { error: mappingError } = await supabase
      .from('airbyte_account_mapping')
      .insert({
        agency_id: config.agencyId,
        client_id: config.clientId,
        platform: config.platform,
        external_account_id: config.externalAccountId,
        airbyte_source_id: source.sourceId,
        airbyte_connection_id: connection.connectionId,
        table_prefix: tablePrefix,
        is_active: true,
      })

    if (mappingError) {
      console.error('[airbyte-provision] Failed to create mapping:', mappingError)
      // Non-fatal - Airbyte resources were created successfully
    }

    return {
      success: true,
      sourceId: source.sourceId,
      connectionId: connection.connectionId,
      tablePrefix,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[airbyte-provision] Unexpected error:', err)
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Deprovision an Airbyte connection (disconnect)
 * Deletes the Airbyte source + connection and deactivates the mapping
 */
export async function deprovisionAirbyteConnection(
  integrationId: string,
  agencyId: string,
  supabase: SupabaseClient<Database>
): Promise<{ success: boolean; error?: string }> {
  const client = getAirbyteClient()

  try {
    // Get integration to find Airbyte IDs
    const { data: integration, error } = await supabase
      .from('integration')
      .select('config')
      .eq('id', integrationId)
      .eq('agency_id', agencyId)
      .single()

    if (error || !integration) {
      return { success: false, error: 'Integration not found' }
    }

    const config = (integration.config as Record<string, unknown>) || {}
    const sourceId = config.airbyte_source_id as string | undefined
    const connectionId = config.airbyte_connection_id as string | undefined

    // Delete connection first, then source
    if (connectionId) {
      const { error: connErr } = await client.deleteConnection(connectionId)
      if (connErr) {
        console.error('[airbyte-deprovision] Failed to delete connection:', connErr)
      }
    }

    if (sourceId) {
      const { error: srcErr } = await client.deleteSource(sourceId)
      if (srcErr) {
        console.error('[airbyte-deprovision] Failed to delete source:', srcErr)
      }
    }

    // Deactivate mapping
    if (connectionId) {
      await supabase
        .from('airbyte_account_mapping')
        .update({ is_active: false })
        .eq('airbyte_connection_id', connectionId)
    }

    // Clear Airbyte config from integration, preserve other keys
    const { airbyte_source_id: _s, airbyte_connection_id: _c, airbyte_table_prefix: _t, airbyte_provisioned_at: _p, ...cleanConfig } = config

    await supabase
      .from('integration')
      .update({ config: cleanConfig as unknown as Json })
      .eq('id', integrationId)

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[airbyte-deprovision] Unexpected error:', err)
    return { success: false, error: message }
  }
}
