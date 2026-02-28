/**
 * Airbyte Cloud API Client
 * Wraps the Airbyte v1 REST API for source/connection/sync management.
 *
 * @see https://reference.airbyte.com/reference/start
 */

import { serverEnv } from '@/lib/env'
import type {
  AirbyteSource,
  AirbyteSourceCreate,
  AirbyteConnection,
  AirbyteConnectionCreate,
  AirbyteJob,
  AirbyteJobCreate,
  AirbyteJobList,
  AirbyteApiError,
} from './types'

// =============================================================================
// CONFIG
// =============================================================================

const AIRBYTE_API_BASE = 'https://api.airbyte.com/v1'
const REQUEST_TIMEOUT_MS = 15_000

// =============================================================================
// CLIENT CLASS
// =============================================================================

export class AirbyteClient {
  private apiKey: string
  private workspaceId: string
  private destinationId: string

  constructor(config?: {
    apiKey?: string
    workspaceId?: string
    destinationId?: string
  }) {
    this.apiKey = config?.apiKey || serverEnv.airbyte.apiKey
    this.workspaceId = config?.workspaceId || serverEnv.airbyte.workspaceId
    this.destinationId = config?.destinationId || serverEnv.airbyte.destinationId
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ data: T | null; error: AirbyteApiError | null }> {
    if (!this.apiKey) {
      return {
        data: null,
        error: {
          type: 'config_error',
          title: 'Airbyte API key not configured',
          status: 0,
          detail: 'AIRBYTE_API_KEY environment variable is not set',
        },
      }
    }

    try {
      const response = await fetch(`${AIRBYTE_API_BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        return {
          data: null,
          error: {
            type: 'api_error',
            title: `Airbyte API error: ${response.status}`,
            status: response.status,
            detail: errorData?.detail || errorData?.message || response.statusText,
          },
        }
      }

      // DELETE returns 204 No Content
      if (response.status === 204) {
        return { data: null, error: null }
      }

      const data = (await response.json()) as T
      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return {
        data: null,
        error: {
          type: 'network_error',
          title: 'Failed to reach Airbyte API',
          status: 0,
          detail: message,
        },
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SOURCES
  // ---------------------------------------------------------------------------

  async createSource(params: Omit<AirbyteSourceCreate, 'workspaceId'>): Promise<{
    data: AirbyteSource | null
    error: AirbyteApiError | null
  }> {
    return this.request<AirbyteSource>('POST', '/sources', {
      ...params,
      workspaceId: this.workspaceId,
    })
  }

  async getSource(sourceId: string): Promise<{
    data: AirbyteSource | null
    error: AirbyteApiError | null
  }> {
    return this.request<AirbyteSource>('GET', `/sources/${sourceId}`)
  }

  async deleteSource(sourceId: string): Promise<{
    error: AirbyteApiError | null
  }> {
    const result = await this.request<void>('DELETE', `/sources/${sourceId}`)
    return { error: result.error }
  }

  // ---------------------------------------------------------------------------
  // CONNECTIONS
  // ---------------------------------------------------------------------------

  async createConnection(params: Omit<AirbyteConnectionCreate, 'destinationId'>): Promise<{
    data: AirbyteConnection | null
    error: AirbyteApiError | null
  }> {
    return this.request<AirbyteConnection>('POST', '/connections', {
      ...params,
      destinationId: this.destinationId,
    })
  }

  async getConnection(connectionId: string): Promise<{
    data: AirbyteConnection | null
    error: AirbyteApiError | null
  }> {
    return this.request<AirbyteConnection>('GET', `/connections/${connectionId}`)
  }

  async getConnectionStatus(connectionId: string): Promise<{
    data: { status: string; lastSync?: string } | null
    error: AirbyteApiError | null
  }> {
    // Get recent jobs for this connection
    const result = await this.request<AirbyteJobList>(
      'GET',
      `/jobs?connectionId=${connectionId}&limit=1&orderBy=createdAt%7Cdesc`
    )

    if (result.error) return { data: null, error: result.error }

    const latestJob = result.data?.data?.[0]
    return {
      data: {
        status: latestJob?.status || 'unknown',
        lastSync: latestJob?.startTime,
      },
      error: null,
    }
  }

  async deleteConnection(connectionId: string): Promise<{
    error: AirbyteApiError | null
  }> {
    const result = await this.request<void>('DELETE', `/connections/${connectionId}`)
    return { error: result.error }
  }

  // ---------------------------------------------------------------------------
  // SYNC JOBS
  // ---------------------------------------------------------------------------

  async triggerSync(connectionId: string): Promise<{
    data: AirbyteJob | null
    error: AirbyteApiError | null
  }> {
    const body: AirbyteJobCreate = {
      connectionId,
      jobType: 'sync',
    }
    return this.request<AirbyteJob>('POST', '/jobs', body)
  }

  async getJob(jobId: number): Promise<{
    data: AirbyteJob | null
    error: AirbyteApiError | null
  }> {
    return this.request<AirbyteJob>('GET', `/jobs/${jobId}`)
  }

  async listJobs(connectionId: string, limit: number = 10): Promise<{
    data: AirbyteJobList | null
    error: AirbyteApiError | null
  }> {
    return this.request<AirbyteJobList>(
      'GET',
      `/jobs?connectionId=${connectionId}&limit=${limit}&orderBy=createdAt%7Cdesc`
    )
  }

  // ---------------------------------------------------------------------------
  // WORKSPACE
  // ---------------------------------------------------------------------------

  get currentWorkspaceId(): string {
    return this.workspaceId
  }

  get currentDestinationId(): string {
    return this.destinationId
  }
}

/**
 * Singleton client instance (uses env vars)
 */
let _client: AirbyteClient | null = null

export function getAirbyteClient(): AirbyteClient {
  if (!_client) {
    _client = new AirbyteClient()
  }
  return _client
}
