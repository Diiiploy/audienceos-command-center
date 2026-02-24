/**
 * Get Client Emails Function Executor
 *
 * Retrieves emails associated with a specific client by querying both:
 *   - communication table (agency-scoped, client-matched emails)
 *   - user_communication table (personal inbox, matched by sender email)
 *
 * Supports lookup by client_id or client_name, with lookback period filter.
 */

import type { ExecutorContext } from './types';
import { verifyClientAccess } from '@/lib/rbac/client-access';

interface GetClientEmailsArgs {
  client_id?: string;
  client_name?: string;
  limit?: number;
  days?: number;
}

interface ClientEmail {
  id: string;
  senderName: string | null;
  senderEmail: string | null;
  subject: string | null;
  content: string;
  receivedAt: string;
  isInbound: boolean;
  needsReply: boolean;
  source: 'communication' | 'user_communication';
}

export async function getClientEmails(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<ClientEmail[]> {
  const args = rawArgs as unknown as GetClientEmailsArgs;
  const { agencyId, userId, supabase } = context;
  const limit = args.limit ?? 20;
  const days = args.days ?? 30;

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] Supabase client is required in production.');
    }
    return [];
  }

  try {
    // Resolve client_id from client_name if needed
    let clientId = args.client_id;

    if (!clientId && args.client_name) {
      const { data: clientData } = await supabase
        .from('client')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .ilike('name', `%${args.client_name}%`)
        .limit(1)
        .single();

      if (!clientData) {
        return [];
      }
      clientId = clientData.id;
    }

    if (!clientId) {
      return [];
    }

    // Verify member access
    const hasAccess = await verifyClientAccess(userId, agencyId, clientId, supabase);
    if (!hasAccess) {
      return [];
    }

    // Calculate cutoff date
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Query 1: Client-scoped communication table (already matched)
    const { data: commData } = await supabase
      .from('communication')
      .select('id, sender_name, sender_email, subject, content, received_at, is_inbound, needs_reply')
      .eq('agency_id', agencyId)
      .eq('client_id', clientId)
      .eq('platform', 'gmail')
      .gte('received_at', cutoffDate)
      .order('received_at', { ascending: false })
      .limit(limit);

    const emails: ClientEmail[] = (commData || []).map((r) => ({
      id: r.id,
      senderName: r.sender_name,
      senderEmail: r.sender_email,
      subject: r.subject,
      content: r.content,
      receivedAt: r.received_at,
      isInbound: r.is_inbound,
      needsReply: r.needs_reply,
      source: 'communication' as const,
    }));

    // Query 2: If we didn't get enough from communication table,
    // also check user_communication for emails from known client contacts.
    if (emails.length < limit) {
      // Get client's known email addresses
      const contactEmails: string[] = [];

      // From client_contact table
      const { data: contacts } = await (supabase as any)
        .from('client_contact')
        .select('email')
        .eq('agency_id', agencyId)
        .eq('client_id', clientId);

      for (const c of (contacts || [])) {
        contactEmails.push(c.email.toLowerCase());
      }

      // From legacy client.contact_email
      const { data: clientRecord } = await supabase
        .from('client')
        .select('contact_email')
        .eq('id', clientId)
        .single();

      if (clientRecord?.contact_email) {
        contactEmails.push(clientRecord.contact_email.toLowerCase());
      }

      // Search user_communication for emails from these contacts
      if (contactEmails.length > 0) {
        const existingMessageIds = new Set(emails.map((e) => e.id));
        const remaining = limit - emails.length;

        const { data: userCommData } = await (supabase as any)
          .from('user_communication')
          .select('id, sender_name, sender_email, subject, content, created_at, is_inbound')
          .eq('agency_id', agencyId)
          .eq('platform', 'gmail')
          .in('sender_email', contactEmails)
          .gte('created_at', cutoffDate)
          .order('created_at', { ascending: false })
          .limit(remaining);

        for (const r of (userCommData || [])) {
          if (!existingMessageIds.has(r.id)) {
            emails.push({
              id: r.id,
              senderName: r.sender_name,
              senderEmail: r.sender_email,
              subject: r.subject,
              content: r.content,
              receivedAt: r.created_at,
              isInbound: r.is_inbound ?? true,
              needsReply: false,
              source: 'user_communication' as const,
            });
          }
        }
      }
    }

    // Sort by date descending
    emails.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    return emails.slice(0, limit);
  } catch (error) {
    console.error('[ERROR] get_client_emails failed:', error);
    throw new Error(`Failed to fetch client emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
