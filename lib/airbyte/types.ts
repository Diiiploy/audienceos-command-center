/**
 * Airbyte Cloud API Types
 * TypeScript definitions for Airbyte v1 API requests and responses
 *
 * @see https://reference.airbyte.com/reference/start
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type AirbytePlatform = 'google_ads' | 'meta_ads'

export interface AirbyteApiError {
  type: string
  title: string
  status: number
  detail: string
}

// =============================================================================
// SOURCE TYPES
// =============================================================================

export interface AirbyteSourceCreate {
  name: string
  workspaceId: string
  definitionId: string // Connector definition ID
  configuration: Record<string, unknown>
}

export interface AirbyteSource {
  sourceId: string
  name: string
  sourceDefinitionId: string
  workspaceId: string
  configuration: Record<string, unknown>
  connectionConfiguration?: Record<string, unknown>
}

// Known source definition IDs for ad platforms
export const AIRBYTE_SOURCE_DEFINITIONS = {
  google_ads: '253487c0-2246-43ba-a21f-5116b20a2c50',
  meta_ads: 'e7778cfc-e97c-4458-9ecb-b4f2bba8946c',
} as const

// =============================================================================
// CONNECTION TYPES
// =============================================================================

export type AirbyteConnectionStatus = 'active' | 'inactive' | 'deprecated'
export type AirbyteScheduleType = 'manual' | 'cron' | 'basic'
export type AirbyteNamespaceType = 'source' | 'destination' | 'custom'

export interface AirbyteConnectionCreate {
  name: string
  sourceId: string
  destinationId: string
  schedule?: {
    scheduleType: AirbyteScheduleType
    cronExpression?: string // e.g., "0 6 * * *" for daily at 6 AM UTC
    basicTiming?: string
  }
  namespaceDefinition?: AirbyteNamespaceType
  namespaceFormat?: string // e.g., "airbyte_staging"
  prefix?: string // Table prefix
  nonBreakingSchemaUpdatesBehavior?: 'ignore' | 'disable_connection' | 'propagate_columns' | 'propagate_fully'
  configurations?: {
    streams?: AirbyteStreamConfiguration[]
  }
}

export interface AirbyteStreamConfiguration {
  name: string
  syncMode?: 'full_refresh_overwrite' | 'full_refresh_append' | 'incremental_append' | 'incremental_deduped_history'
  cursorField?: string[]
  primaryKey?: string[][]
}

export interface AirbyteConnection {
  connectionId: string
  name: string
  sourceId: string
  destinationId: string
  status: AirbyteConnectionStatus
  schedule?: {
    scheduleType: AirbyteScheduleType
    cronExpression?: string
    basicTiming?: string
  }
  namespaceDefinition?: AirbyteNamespaceType
  namespaceFormat?: string
  prefix?: string
  configurations?: {
    streams?: AirbyteStreamConfiguration[]
  }
}

// =============================================================================
// SYNC / JOB TYPES
// =============================================================================

export type AirbyteJobStatus = 'pending' | 'running' | 'incomplete' | 'failed' | 'succeeded' | 'cancelled'
export type AirbyteJobType = 'sync' | 'reset' | 'refresh' | 'clear'

export interface AirbyteJobCreate {
  connectionId: string
  jobType: AirbyteJobType
}

export interface AirbyteJob {
  jobId: number
  status: AirbyteJobStatus
  jobType: AirbyteJobType
  startTime: string
  connectionId: string
  lastUpdatedAt?: string
  duration?: string
  bytesSynced?: number
  rowsSynced?: number
}

export interface AirbyteJobList {
  data: AirbyteJob[]
  next?: string
  previous?: string
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

export type AirbyteWebhookEventType =
  | 'connection.sync.started'
  | 'connection.sync.succeeded'
  | 'connection.sync.failed'
  | 'connection.sync.incomplete'

export interface AirbyteWebhookPayload {
  webhook_type: AirbyteWebhookEventType
  timestamp: string
  data: {
    connection_id: string
    job_id: number
    workspace_id: string
    source?: {
      id: string
      name: string
    }
    destination?: {
      id: string
      name: string
    }
    bytes_synced?: number
    records_synced?: number
    start_time?: string
    end_time?: string
    error_message?: string
  }
}

// =============================================================================
// PROVISIONING TYPES
// =============================================================================

export interface AirbyteProvisionConfig {
  agencyId: string
  clientId: string
  platform: AirbytePlatform
  externalAccountId: string
  accessToken: string
  refreshToken?: string
  // Platform-specific config
  googleAds?: {
    customerId: string
    developerToken?: string
    loginCustomerId?: string
  }
  metaAds?: {
    accountId: string
  }
}

export interface AirbyteProvisionResult {
  success: boolean
  sourceId?: string
  connectionId?: string
  tablePrefix?: string
  error?: string
}

// =============================================================================
// INTEGRATION CONFIG EXTENSIONS
// =============================================================================

export interface AirbyteIntegrationConfig {
  airbyte_source_id?: string
  airbyte_connection_id?: string
  airbyte_table_prefix?: string
  airbyte_provisioned_at?: string
  connected_at?: string
  scope?: string
  expires_at?: string | null
}
