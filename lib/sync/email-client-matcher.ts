/**
 * Email-to-Client Matching
 *
 * Three-tier strategy to map inbound emails to clients:
 *   1. Exact match: sender email against client_contact.email + client.contact_email
 *   2. Domain match: extract domain, find single-client domain matches
 *   3. Unmatched: returns null — email stays in user_communication only
 *
 * When matched, the email should also be written to the agency-scoped
 * `communication` table with the resolved client_id.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface MatchResult {
  clientId: string
  clientName: string
  matchType: 'exact' | 'domain'
}

/**
 * Match a sender email to a client within an agency.
 * Returns the matched client info or null if no match found.
 */
export async function matchEmailToClient(
  supabase: SupabaseClient,
  agencyId: string,
  senderEmail: string
): Promise<MatchResult | null> {
  const normalizedEmail = senderEmail.toLowerCase().trim()

  // Extract just the email address if it includes a display name
  // e.g., "John Doe <john@acme.com>" → "john@acme.com"
  const emailOnly = extractEmailAddress(normalizedEmail)

  // Tier 1: Exact match against client_contact table
  const exactMatch = await matchExact(supabase, agencyId, emailOnly)
  if (exactMatch) return exactMatch

  // Tier 1b: Exact match against client.contact_email (legacy single-email field)
  const legacyMatch = await matchLegacyContactEmail(supabase, agencyId, emailOnly)
  if (legacyMatch) return legacyMatch

  // Tier 2: Domain match — only when domain maps to exactly one client
  const domainMatch = await matchByDomain(supabase, agencyId, emailOnly)
  if (domainMatch) return domainMatch

  // Tier 3: No match
  return null
}

/**
 * Batch match multiple emails at once for efficiency during sync.
 * Returns a map of sender_email → MatchResult.
 */
export async function batchMatchEmails(
  supabase: SupabaseClient,
  agencyId: string,
  senderEmails: string[]
): Promise<Map<string, MatchResult>> {
  const results = new Map<string, MatchResult>()
  const uniqueEmails = [...new Set(senderEmails.map(e => extractEmailAddress(e.toLowerCase().trim())))]

  // Batch query: all client_contact emails for this agency
  const { data: contacts } = await (supabase as any)
    .from('client_contact')
    .select('email, client_id, client:client_id(name)')
    .eq('agency_id', agencyId)

  // Build lookup map from contacts
  const contactMap = new Map<string, { clientId: string; clientName: string }>()
  for (const c of (contacts || [])) {
    const clientData = c.client as unknown
    let clientName = 'Unknown'
    if (clientData && typeof clientData === 'object') {
      if (Array.isArray(clientData) && clientData.length > 0) {
        clientName = (clientData[0] as { name?: string })?.name || 'Unknown'
      } else {
        clientName = (clientData as { name?: string })?.name || 'Unknown'
      }
    }
    contactMap.set(c.email.toLowerCase(), { clientId: c.client_id, clientName })
  }

  // Also fetch legacy client.contact_email values
  const { data: clients } = await supabase
    .from('client')
    .select('id, name, contact_email')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .not('contact_email', 'is', null)

  for (const client of (clients || [])) {
    if (client.contact_email) {
      const email = client.contact_email.toLowerCase().trim()
      if (!contactMap.has(email)) {
        contactMap.set(email, { clientId: client.id, clientName: client.name })
      }
    }
  }

  // Build domain → client mapping for Tier 2
  const domainToClients = new Map<string, Set<string>>()
  const domainClientNames = new Map<string, { clientId: string; clientName: string }>()

  for (const [email, client] of contactMap) {
    const domain = email.split('@')[1]
    if (domain && !isCommonDomain(domain)) {
      if (!domainToClients.has(domain)) {
        domainToClients.set(domain, new Set())
      }
      domainToClients.get(domain)!.add(client.clientId)
      domainClientNames.set(domain, client)
    }
  }

  // Match each email
  for (const email of uniqueEmails) {
    // Tier 1: Exact match
    const exactMatch = contactMap.get(email)
    if (exactMatch) {
      results.set(email, { clientId: exactMatch.clientId, clientName: exactMatch.clientName, matchType: 'exact' })
      continue
    }

    // Tier 2: Domain match (only if domain maps to exactly one client)
    const domain = email.split('@')[1]
    if (domain) {
      const clientsForDomain = domainToClients.get(domain)
      if (clientsForDomain && clientsForDomain.size === 1) {
        const client = domainClientNames.get(domain)!
        results.set(email, { clientId: client.clientId, clientName: client.clientName, matchType: 'domain' })
      }
    }
  }

  return results
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Extract email address from "Name <email>" format
 */
function extractEmailAddress(input: string): string {
  const match = input.match(/<(.+?)>/)
  return match ? match[1].toLowerCase().trim() : input
}

/**
 * Tier 1: Exact email match against client_contact table
 */
async function matchExact(
  supabase: SupabaseClient,
  agencyId: string,
  email: string
): Promise<MatchResult | null> {
  const { data } = await (supabase as any)
    .from('client_contact')
    .select('client_id, client:client_id(name)')
    .eq('agency_id', agencyId)
    .eq('email', email)
    .limit(1)

  if (!data || data.length === 0) return null

  const row = data[0]
  const clientData = row.client as unknown
  let clientName = 'Unknown'
  if (clientData && typeof clientData === 'object') {
    if (Array.isArray(clientData) && clientData.length > 0) {
      clientName = (clientData[0] as { name?: string })?.name || 'Unknown'
    } else {
      clientName = (clientData as { name?: string })?.name || 'Unknown'
    }
  }

  return { clientId: row.client_id, clientName, matchType: 'exact' }
}

/**
 * Tier 1b: Match against legacy client.contact_email field
 */
async function matchLegacyContactEmail(
  supabase: SupabaseClient,
  agencyId: string,
  email: string
): Promise<MatchResult | null> {
  const { data } = await supabase
    .from('client')
    .select('id, name')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .ilike('contact_email', email)
    .limit(1)

  if (!data || data.length === 0) return null

  return { clientId: data[0].id, clientName: data[0].name, matchType: 'exact' }
}

/**
 * Tier 2: Domain-based match
 * Only matches when a domain belongs to exactly one client in the agency.
 * Excludes common email providers (gmail.com, outlook.com, etc.)
 */
async function matchByDomain(
  supabase: SupabaseClient,
  agencyId: string,
  email: string
): Promise<MatchResult | null> {
  const domain = email.split('@')[1]
  if (!domain || isCommonDomain(domain)) return null

  // Find all client_contacts with this domain
  const { data: contacts } = await (supabase as any)
    .from('client_contact')
    .select('client_id')
    .eq('agency_id', agencyId)
    .ilike('email', `%@${domain}`)

  // Also check legacy client.contact_email
  const { data: clients } = await supabase
    .from('client')
    .select('id, name')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .ilike('contact_email', `%@${domain}`)

  // Collect unique client IDs
  const clientIds = new Set<string>()
  let matchedClient: { id: string; name: string } | null = null

  for (const c of (contacts || [])) {
    clientIds.add(c.client_id)
  }
  for (const c of (clients || [])) {
    clientIds.add(c.id)
    matchedClient = c
  }

  // Only match if exactly one client owns this domain
  if (clientIds.size !== 1) return null

  // If we got the match from legacy field, we already have the name
  if (matchedClient) {
    return { clientId: matchedClient.id, clientName: matchedClient.name, matchType: 'domain' }
  }

  // Otherwise look up the name from client_contact match
  const clientId = [...clientIds][0]
  const { data: clientData } = await supabase
    .from('client')
    .select('name')
    .eq('id', clientId)
    .single()

  return {
    clientId,
    clientName: clientData?.name || 'Unknown',
    matchType: 'domain',
  }
}

/**
 * Common email domains that should NOT be used for domain matching.
 * An email from gmail.com could be any client.
 */
const COMMON_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com',
  'live.com', 'msn.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com',
  'aol.com', 'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'zoho.com', 'zohomail.com',
  'mail.com', 'email.com', 'fastmail.com',
  'hey.com', 'tutanota.com', 'gmx.com', 'gmx.net',
])

function isCommonDomain(domain: string): boolean {
  return COMMON_DOMAINS.has(domain.toLowerCase())
}
