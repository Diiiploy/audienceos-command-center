/**
 * Ticket Function Executors
 *
 * Handles get_tickets function calls.
 * All queries are scoped to agency via ExecutorContext.
 * Member-role users only see tickets for their accessible clients.
 */

import type { ExecutorContext } from './types';
import { getAccessibleClientIds } from '@/lib/rbac/client-access';

export interface TicketSummary {
  id: string;
  number: number;
  clientId?: string;
  clientName?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt?: string;
}

interface GetTicketsArgs {
  status?: string;
  priority?: string;
  client_id?: string;
  assignee_id?: string;
  search?: string;
  limit?: number;
}

/**
 * Get tickets with optional filters
 * Scoped to agency + member-accessible clients
 */
export async function getTickets(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<TicketSummary[]> {
  const args = rawArgs as GetTicketsArgs;
  const { agencyId, userId, supabase } = context;
  const limit = args.limit ?? 10;

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] Supabase client is required in production.');
    }
    return [];
  }

  try {
    // Member-scoped access: filter tickets to only accessible clients
    const accessibleClientIds = await getAccessibleClientIds(userId, agencyId, supabase);

    let query = supabase
      .from('ticket')
      .select(`
        id, number, client_id, title, description, status, priority, category,
        created_at, updated_at,
        client:client_id(name),
        assignee:assignee_id(first_name, last_name)
      `)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Restrict to accessible clients for Member-role users
    if (accessibleClientIds.length > 0) {
      query = query.in('client_id', accessibleClientIds);
    }

    // Apply filters
    if (args.status) {
      query = query.eq('status', args.status);
    }

    if (args.priority) {
      query = query.eq('priority', args.priority);
    }

    if (args.client_id) {
      query = query.eq('client_id', args.client_id);
    }

    if (args.assignee_id) {
      query = query.eq('assignee_id', args.assignee_id);
    }

    if (args.search) {
      query = query.or(`title.ilike.%${args.search}%,description.ilike.%${args.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn(`[Supabase] get_tickets error: ${error.message}`);
      throw error;
    }

    return (data || []).map((row) => {
      // Handle joined client data
      const clientData = row.client as unknown;
      let clientName: string | undefined;
      if (clientData && typeof clientData === 'object') {
        if (Array.isArray(clientData) && clientData.length > 0) {
          clientName = (clientData[0] as { name?: string })?.name;
        } else {
          clientName = (clientData as { name?: string })?.name;
        }
      }

      // Handle joined assignee data
      const assigneeData = row.assignee as unknown;
      let assigneeName: string | undefined;
      if (assigneeData && typeof assigneeData === 'object') {
        const a = Array.isArray(assigneeData) ? assigneeData[0] : assigneeData;
        if (a) {
          const first = (a as { first_name?: string })?.first_name || '';
          const last = (a as { last_name?: string })?.last_name || '';
          assigneeName = `${first} ${last}`.trim() || undefined;
        }
      }

      return {
        id: row.id,
        number: row.number,
        clientId: row.client_id || undefined,
        clientName,
        title: row.title,
        description: row.description?.substring(0, 200) || undefined,
        status: row.status,
        priority: row.priority,
        category: row.category || undefined,
        assigneeName,
        createdAt: row.created_at,
        updatedAt: row.updated_at || undefined,
      };
    });
  } catch (error) {
    console.error('[ERROR] get_tickets failed:', error);
    throw new Error(`Failed to fetch tickets: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
