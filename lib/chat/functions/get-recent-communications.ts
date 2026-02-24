/**
 * Communication Function Executors
 *
 * Handles get_recent_communications function calls.
 * Uses Supabase when available, falls back to mock data for standalone mode.
 *
 * Ported from Holy Grail Chat (HGC).
 * Part of: 3-System Consolidation
 */

import type {
  ExecutorContext,
  GetRecentCommunicationsArgs,
  CommunicationSummary,
} from './types';
import { createClient } from '@/lib/supabase';
import { getAccessibleClientIds, verifyClientAccess } from '@/lib/rbac/client-access';

/**
 * Mock data for standalone testing (fallback when Supabase unavailable)
 */
const MOCK_COMMUNICATIONS: Record<string, CommunicationSummary[]> = {
  'client-001': [
    {
      id: 'comm-001',
      type: 'email',
      subject: 'Q4 Campaign Performance Review',
      summary: 'Discussed declining ROAS and proposed optimization strategies.',
      from: 'john@acme.com',
      to: 'team@agency.com',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comm-002',
      type: 'meeting',
      subject: 'Weekly Sync',
      summary: 'Reviewed campaign metrics and upcoming creative deadlines.',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comm-003',
      type: 'email',
      subject: 'Meta Ads Disconnection Notice',
      summary: 'Notified client about Meta Ads integration issue.',
      from: 'team@agency.com',
      to: 'john@acme.com',
      date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'client-002': [
    {
      id: 'comm-004',
      type: 'call',
      subject: 'Strategy Discussion',
      summary: 'Discussed Q1 budget allocation and new targeting options.',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'comm-005',
      type: 'note',
      subject: 'Internal Note',
      summary: 'Client requested pause on Meta campaigns during product launch.',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'client-003': [
    {
      id: 'comm-006',
      type: 'meeting',
      subject: 'Onboarding Kickoff',
      summary: 'Completed initial onboarding meeting. Next: asset collection.',
      date: new Date().toISOString(),
    },
  ],
  'client-004': [
    {
      id: 'comm-007',
      type: 'email',
      subject: 'Follow-up: Integration Issues',
      summary: 'Sent instructions for reconnecting Google Ads.',
      from: 'team@agency.com',
      to: 'emily@delta.com',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

/**
 * Map platform enum to CommunicationSummary type
 */
function mapPlatformToType(platform: string): 'email' | 'call' | 'meeting' | 'note' | 'slack' {
  switch (platform) {
    case 'gmail':
      return 'email';
    case 'slack':
      return 'slack';
    default:
      return 'email';
  }
}

/**
 * Get recent communications for a client
 * Dual-query: reads from both client-scoped `communication` table
 * and user-scoped `user_communication` table (synced Gmail/Slack messages),
 * bridging them by matching the client's contact_email against sender_email.
 * Falls back to mock data when Supabase is unavailable.
 */
export async function getRecentCommunications(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<CommunicationSummary[]> {
  const args = rawArgs as unknown as GetRecentCommunicationsArgs;
  const { agencyId, userId, supabase } = context;

  const days = args.days ?? 30;
  const limit = args.limit ?? 10;

  // If Supabase is available, use real queries
  if (supabase) {
    try {
      // Member-scoped access: filter communications to only accessible clients
      const accessibleClientIds = await getAccessibleClientIds(userId, agencyId, supabase);

      // If a specific client_id was requested, verify access first
      if (args.client_id && accessibleClientIds.length > 0) {
        if (!accessibleClientIds.includes(args.client_id)) {
          return []; // Member doesn't have access to this client
        }
      }

      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // --- Query 1: Client-scoped communications (original table) ---
      let clientQuery = supabase
        .from('communication')
        .select(`
          id, platform, subject, content, sender_email, sender_name,
          is_inbound, received_at
        `)
        .eq('agency_id', agencyId)
        .gte('received_at', cutoffDate)
        .order('received_at', { ascending: false })
        .limit(limit);

      // Scope to client if provided, or restrict to accessible clients for Members
      if (args.client_id) {
        clientQuery = clientQuery.eq('client_id', args.client_id);
      } else if (accessibleClientIds.length > 0) {
        clientQuery = clientQuery.in('client_id', accessibleClientIds);
      }

      // Platform filter maps to type
      if (args.type) {
        if (args.type === 'slack') {
          clientQuery = clientQuery.eq('platform', 'slack');
        } else if (args.type === 'email') {
          clientQuery = clientQuery.eq('platform', 'gmail');
        } else if (args.type === 'meeting' || args.type === 'call') {
          clientQuery = clientQuery.eq('platform', 'slack');
        }
      }

      // --- Query 2: User-scoped communications (only if client_id provided) ---
      // Bridge: look up client's contact_email, then match in user_communication
      let clientEmail: string | null = null;
      if (args.client_id) {
        const { data: clientData } = await supabase
          .from('client')
          .select('contact_email')
          .eq('id', args.client_id)
          .single();
        clientEmail = clientData?.contact_email ?? null;
      }

      // Run both queries in parallel
      const [clientResult, userResult] = await Promise.all([
        clientQuery,
        clientEmail
          ? supabase
              .from('user_communication')
              .select('id, platform, subject, content, sender_email, sender_name, is_inbound, created_at')
              .eq('agency_id', agencyId)
              .eq('sender_email', clientEmail)
              .gte('created_at', cutoffDate)
              .order('created_at', { ascending: false })
              .limit(limit)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (clientResult.error) {
        console.warn(`[Supabase] communication query error: ${clientResult.error.message}`);
        throw clientResult.error;
      }
      if (userResult.error) {
        console.warn(`[Supabase] user_communication query error: ${userResult.error.message}`);
      }

      // Map client-scoped results
      const clientComms: CommunicationSummary[] = (clientResult.data || []).map((row) => ({
        id: row.id,
        type: mapPlatformToType(row.platform),
        subject: row.subject || undefined,
        summary: row.content?.substring(0, 200) || undefined,
        from: row.is_inbound ? row.sender_email : undefined,
        to: !row.is_inbound ? row.sender_email : undefined,
        date: row.received_at,
      }));

      // Map user-scoped results (synced inbox messages)
      const userComms: CommunicationSummary[] = (userResult.data || []).map((row) => ({
        id: row.id,
        type: mapPlatformToType(row.platform),
        subject: row.subject || undefined,
        summary: row.content?.substring(0, 200) || undefined,
        from: row.is_inbound ? row.sender_email : undefined,
        to: !row.is_inbound ? row.sender_email : undefined,
        date: row.created_at,
      }));

      // Merge, deduplicate by id, sort by date descending
      const seen = new Set<string>();
      const merged = [...clientComms, ...userComms]
        .filter((c) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      return merged;
    } catch (error) {
      console.error(`[ERROR] get_recent_communications failed:`, error);
      throw new Error(`Failed to fetch communications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Only use mock data when Supabase client is NOT provided (true standalone/dev mode)
  // In production, this should NEVER happen - fail loud if it does
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY] Supabase client is required in production. Mock data is disabled.');
  }
  // Fallback: Use mock data for standalone mode
  let communications: CommunicationSummary[] = args.client_id
    ? (MOCK_COMMUNICATIONS[args.client_id] || [])
    : Object.values(MOCK_COMMUNICATIONS).flat();

  // Filter by type if specified
  if (args.type) {
    communications = communications.filter((c: CommunicationSummary) => c.type === args.type);
  }

  // Filter by date range
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  communications = communications.filter(
    (c: CommunicationSummary) => new Date(c.date) >= cutoffDate
  );

  // Sort by date (newest first)
  communications.sort(
    (a: CommunicationSummary, b: CommunicationSummary) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return communications.slice(0, limit);
}
