/**
 * Create Ticket Function Executor
 *
 * Handles create_ticket function calls from AI chat.
 * Resolves client_name to client_id when needed.
 * Scoped to agency via ExecutorContext.
 */

import type { ExecutorContext } from './types';
import { verifyClientAccess } from '@/lib/rbac/client-access';

interface CreateTicketArgs {
  client_id?: string;
  client_name?: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
}

interface CreatedTicket {
  id: string;
  number?: number;
  title: string;
  clientName?: string;
  status: string;
  priority: string;
  category: string;
  message: string;
}

const VALID_CATEGORIES = ['technical', 'billing', 'campaign', 'general', 'escalation'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

/**
 * Create a new support ticket
 * Accepts client_name as alternative to client_id (AI often passes names)
 */
export async function createTicket(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<CreatedTicket> {
  const args = rawArgs as unknown as CreateTicketArgs;
  const { agencyId, userId, supabase } = context;

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] Supabase client is required in production.');
    }
    throw new Error('Cannot create tickets without database connection.');
  }

  if (!args.title) {
    throw new Error('Ticket title is required.');
  }

  // Resolve client_id from client_name if needed
  let clientId = args.client_id;
  let clientName = args.client_name;

  if (!clientId && clientName) {
    const { data: clientMatch, error } = await supabase
      .from('client')
      .select('id, name')
      .eq('agency_id', agencyId)
      .ilike('name', `%${clientName}%`)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !clientMatch) {
      throw new Error(`Could not find a client matching "${clientName}". Please provide the exact client name.`);
    }
    clientId = clientMatch.id;
    clientName = clientMatch.name;
  }

  if (!clientId) {
    throw new Error('Either client_id or client_name is required to create a ticket.');
  }

  // Verify member has access to this client
  const hasAccess = await verifyClientAccess(userId, agencyId, clientId, supabase);
  if (!hasAccess) {
    throw new Error('You do not have access to create tickets for this client.');
  }

  // Validate and default category/priority
  const category = args.category && VALID_CATEGORIES.includes(args.category) ? args.category : 'general';
  const priority = args.priority && VALID_PRIORITIES.includes(args.priority) ? args.priority : 'medium';

  // Create the ticket
  const { data: ticket, error } = await supabase
    .from('ticket')
    .insert({
      agency_id: agencyId,
      client_id: clientId,
      title: args.title.slice(0, 500),
      description: args.description?.slice(0, 10000) || '',
      category,
      priority,
      status: 'new',
      created_by: userId,
    })
    .select('id, number, title, status, priority, category')
    .single();

  if (error) {
    console.error('[ERROR] create_ticket insert failed:', error);
    throw new Error(`Failed to create ticket: ${error.message}`);
  }

  return {
    id: ticket.id,
    number: ticket.number,
    title: ticket.title,
    clientName: clientName || undefined,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    message: `Ticket #${ticket.number || ''} "${ticket.title}" created successfully for ${clientName || 'the client'}.`,
  };
}
