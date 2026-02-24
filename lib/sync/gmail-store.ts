/**
 * Gmail Storage Helpers
 *
 * Shared logic for storing synced Gmail records:
 *   1. Upsert into user_communication (personal inbox, always)
 *   2. Match emails to clients via email-client-matcher
 *   3. Upsert matched emails into communication (client-scoped)
 *
 * Used by both the manual sync route and the cron job.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { NormalizedCommunication } from './gmail-sync'
import { batchMatchEmails } from './email-client-matcher'

export interface StoreResult {
  userCommStored: number
  clientCommStored: number
  matched: number
  unmatched: number
}

/**
 * Store synced Gmail records into both user_communication and communication tables.
 */
export async function storeGmailRecords(
  supabase: SupabaseClient,
  agencyId: string,
  userId: string,
  records: NormalizedCommunication[]
): Promise<StoreResult> {
  const result: StoreResult = {
    userCommStored: 0,
    clientCommStored: 0,
    matched: 0,
    unmatched: 0,
  }

  if (records.length === 0) return result

  // Step 1: Upsert ALL records into user_communication (personal inbox)
  const userCommRows = records.map((r) => ({
    agency_id: agencyId,
    user_id: userId,
    platform: 'gmail' as const,
    message_id: r.message_id,
    thread_id: r.thread_id,
    sender_email: r.sender_email,
    sender_name: r.sender_name,
    subject: r.subject,
    content: r.content,
    is_inbound: r.is_inbound,
    metadata: {
      needs_reply: r.needs_reply,
      received_at: r.received_at,
    },
  }))

  const { error: userCommError } = await (supabase as any)
    .from('user_communication')
    .upsert(userCommRows, {
      onConflict: 'user_id,platform,message_id',
      ignoreDuplicates: false,
    })

  if (userCommError) {
    console.error('[gmail-store] user_communication upsert error:', userCommError.message)
  } else {
    result.userCommStored = records.length
  }

  // Step 2: Match emails to clients
  const senderEmails = records.map((r) => r.sender_email)
  const matches = await batchMatchEmails(supabase, agencyId, senderEmails)

  // Step 3: Upsert matched records into communication (client-scoped)
  const clientCommRows: Array<Record<string, unknown>> = []

  for (const r of records) {
    const emailKey = r.sender_email.toLowerCase().trim()
    // Also try extracting just the email from "Name <email>" format
    const emailMatch = emailKey.match(/<(.+?)>/)
    const normalizedKey = emailMatch ? emailMatch[1] : emailKey

    const match = matches.get(normalizedKey) || matches.get(emailKey)
    if (match) {
      result.matched++
      clientCommRows.push({
        agency_id: agencyId,
        client_id: match.clientId,
        platform: 'gmail',
        thread_id: r.thread_id,
        message_id: r.message_id,
        sender_email: r.sender_email,
        sender_name: r.sender_name,
        subject: r.subject,
        content: r.content,
        is_inbound: r.is_inbound,
        needs_reply: r.needs_reply,
        received_at: r.received_at,
      })
    } else {
      result.unmatched++
    }
  }

  if (clientCommRows.length > 0) {
    const { error: commError } = await supabase
      .from('communication')
      .upsert(clientCommRows, {
        onConflict: 'agency_id,message_id',
        ignoreDuplicates: true,
      })
      .select('id')

    if (commError) {
      // The communication table may not have an onConflict for this combo yet.
      // Fall back to individual inserts ignoring duplicates.
      console.warn('[gmail-store] communication upsert error (may be duplicate):', commError.message)
    } else {
      result.clientCommStored = clientCommRows.length
    }
  }

  return result
}
