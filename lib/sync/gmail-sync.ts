/**
 * Gmail Sync Worker
 *
 * Fetches emails via diiiploy-gateway proxy (which handles OAuth token management)
 * Normalizes to AudienceOS communication schema
 * Stores in multi-tenant database
 *
 * Architecture: Gateway-proxied — tokens live in gateway KV, all Gmail API calls
 * route through the gateway which handles auth, refresh, and expiry automatically.
 */

import type { SyncResult } from './types'

const GATEWAY_URL = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev'
const GATEWAY_API_KEY = process.env.DIIIPLOY_GATEWAY_API_KEY || ''
const TENANT_ID = process.env.DIIIPLOY_TENANT_ID || ''

export interface GmailSyncConfig {
  agencyId: string
  userId: string
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload?: {
    headers: Array<{ name: string; value: string }>
    parts?: unknown[]
    body?: { data?: string }
  }
  internalDate: string
}

export interface NormalizedCommunication {
  id: string
  agency_id: string
  client_id: string
  platform: 'gmail'
  message_id: string
  sender_name: string | null
  sender_email: string
  subject: string | null
  content: string
  created_at: string
  received_at: string
  thread_id: string | null
  is_inbound: boolean
  needs_reply: boolean
  replied_at: string | null
  replied_by: string | null
}

/**
 * Sync Gmail via diiiploy-gateway proxy.
 * Gateway handles OAuth tokens (stored in its KV), auto-refresh, and expiry.
 * Returns normalized communications ready to store in DB.
 */
export async function syncGmail(config: GmailSyncConfig): Promise<{
  records: NormalizedCommunication[]
  result: SyncResult
}> {
  const startTime = Date.now()
  const result: SyncResult = {
    success: true,
    provider: 'gmail',
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    errors: [],
    syncedAt: new Date().toISOString(),
  }

  const records: NormalizedCommunication[] = []

  try {
    if (!GATEWAY_URL || !GATEWAY_API_KEY || !TENANT_ID) {
      throw new Error('Gateway not configured (DIIIPLOY_GATEWAY_URL, DIIIPLOY_GATEWAY_API_KEY, DIIIPLOY_TENANT_ID required)')
    }

    // Fetch messages via gateway proxy — gateway handles token management
    const gmailMessages = await fetchGmailMessages()

    result.recordsProcessed = gmailMessages.length

    // Normalize each message
    for (const message of gmailMessages) {
      try {
        const normalized = normalizeGmailMessage(
          message,
          config.agencyId,
          config.agencyId // client_id resolved later by email-client-matcher
        )
        records.push(normalized)
      } catch (e) {
        console.error('[gmail-sync] Error normalizing message:', e)
        result.errors.push(`Failed to normalize message ${message.id}`)
      }
    }

    result.recordsCreated = records.length
    result.success = result.errors.length === 0 || result.errors.length < result.recordsProcessed / 2

    console.log('[gmail-sync] Sync completed:', {
      duration: Date.now() - startTime,
      processed: result.recordsProcessed,
      created: result.recordsCreated,
      errors: result.errors.length,
    })
  } catch (error) {
    result.success = false
    result.errors.push(`Gmail sync failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error('[gmail-sync] Sync error:', error)
  }

  return { records, result }
}

/**
 * Fetch Gmail messages via diiiploy-gateway proxy.
 * Gateway routes: GET /gmail/inbox (list) and GET /gmail/message/:id (details)
 * Authentication handled by gateway via X-Tenant-ID header.
 */
async function fetchGmailMessages(): Promise<GmailMessage[]> {
  // Query: unread messages or messages from the last 7 days
  const query = 'is:unread OR newer_than:7d'
  const maxResults = 50

  const gatewayHeaders = {
    'Authorization': `Bearer ${GATEWAY_API_KEY}`,
    'X-Tenant-ID': TENANT_ID,
  }

  try {
    // Step 1: Get message IDs via gateway
    const listResponse = await fetch(
      `${GATEWAY_URL}/gmail/inbox?maxResults=${maxResults}&q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: gatewayHeaders,
        signal: AbortSignal.timeout(30000),
      }
    )

    if (!listResponse.ok) {
      const errorText = await listResponse.text()
      throw new Error(`Gateway Gmail list failed: ${listResponse.status} - ${errorText}`)
    }

    const listData = (await listResponse.json()) as {
      messages?: Array<{ id: string; threadId: string }>
      nextPageToken?: string
    }

    if (!listData.messages || listData.messages.length === 0) {
      console.log('[gmail-sync] No messages found matching query')
      return []
    }

    console.log(`[gmail-sync] Found ${listData.messages.length} message IDs`)

    // Step 2: Fetch full message details via gateway (batch in parallel, max 10 concurrent)
    const messages: GmailMessage[] = []
    const batchSize = 10

    for (let i = 0; i < listData.messages.length; i += batchSize) {
      const batch = listData.messages.slice(i, i + batchSize)
      const batchPromises = batch.map(async (msg) => {
        try {
          const msgResponse = await fetch(
            `${GATEWAY_URL}/gmail/message/${msg.id}?format=metadata`,
            {
              method: 'GET',
              headers: gatewayHeaders,
              signal: AbortSignal.timeout(15000),
            }
          )

          if (!msgResponse.ok) {
            console.warn(`[gmail-sync] Failed to fetch message ${msg.id}: ${msgResponse.status}`)
            return null
          }

          return (await msgResponse.json()) as GmailMessage
        } catch (e) {
          console.error(`[gmail-sync] Error fetching message ${msg.id}:`, e)
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      messages.push(...batchResults.filter((m): m is GmailMessage => m !== null))
    }

    console.log(`[gmail-sync] Fetched ${messages.length} full message details`)
    return messages
  } catch (error) {
    console.error('[gmail-sync] Gateway Gmail API error:', error)
    throw error
  }
}

/**
 * Normalize Gmail message to AudienceOS communication schema
 */
function normalizeGmailMessage(
  message: GmailMessage,
  agencyId: string,
  clientId: string
): NormalizedCommunication {
  const headers = message.payload?.headers || []
  const headerMap = new Map(headers.map((h) => [h.name.toLowerCase(), h.value]))

  const fromEmail = headerMap.get('from') || 'unknown@unknown.com'
  const fromName = extractNameFromEmail(fromEmail)
  const subject = headerMap.get('subject') || null
  const timestamp = new Date(parseInt(message.internalDate)).toISOString()

  return {
    id: `gmail_${message.id}`,
    agency_id: agencyId,
    client_id: clientId,
    platform: 'gmail',
    message_id: message.id,
    sender_name: fromName,
    sender_email: fromEmail,
    subject: subject ? decodeHtmlEntities(subject) : null,
    content: decodeHtmlEntities(message.snippet || '(empty message)'),
    created_at: timestamp,
    received_at: timestamp,
    thread_id: message.threadId || null,
    is_inbound: true,
    needs_reply: !message.labelIds?.includes('ANSWERED'),
    replied_at: null,
    replied_by: null,
  }
}

/**
 * Decode HTML entities from Gmail API snippet text.
 * Gmail returns snippets with entities like &#39; &amp; &quot; &lt; &gt;
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

/**
 * Extract display name from email header
 * Handles formats like: "John Doe <john@example.com>"
 */
function extractNameFromEmail(email: string): string | null {
  const match = email.match(/^(.+?)\s*<(.+?)>$/)
  if (match) {
    return match[1].trim() || null
  }
  return null
}
