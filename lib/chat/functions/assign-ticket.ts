/**
 * Assign Ticket Function Executor
 *
 * Assigns a ticket to a team member by name or ID.
 * Resolves team member name to user_id via agency user lookup.
 * Can also update ticket status and priority.
 */

import type { ExecutorContext } from './types';
import { verifyClientAccess } from '@/lib/rbac/client-access';

interface AssignTicketArgs {
  ticket_id?: string;
  ticket_number?: number;
  assignee_name?: string;
  assignee_id?: string;
  status?: string;
  priority?: string;
}

export async function assignTicket(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const args = rawArgs as unknown as AssignTicketArgs;
  const { agencyId, userId, supabase } = context;

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] Supabase client is required in production.');
    }
    return { error: 'Supabase not available in standalone mode' };
  }

  try {
    // Step 1: Find the ticket
    let ticketQuery = supabase
      .from('ticket')
      .select('id, number, title, client_id, status, priority, assignee_id')
      .eq('agency_id', agencyId);

    if (args.ticket_id) {
      ticketQuery = ticketQuery.eq('id', args.ticket_id);
    } else if (args.ticket_number) {
      ticketQuery = ticketQuery.eq('number', args.ticket_number);
    } else {
      return { error: 'Either ticket_id or ticket_number is required' };
    }

    const { data: ticket, error: ticketError } = await ticketQuery.single();

    if (ticketError || !ticket) {
      return { error: 'Ticket not found' };
    }

    // Verify member has access to this ticket's client
    if (ticket.client_id) {
      const hasAccess = await verifyClientAccess(userId, agencyId, ticket.client_id, supabase);
      if (!hasAccess) {
        return { error: 'You do not have access to this ticket' };
      }
    }

    // Step 2: Resolve assignee
    let assigneeId = args.assignee_id;
    let assigneeName: string | null = null;

    if (!assigneeId && args.assignee_name) {
      // Search for team member by name within the same agency
      const { data: users } = await supabase
        .from('user')
        .select('id, name, email')
        .eq('agency_id', agencyId)
        .or(`name.ilike.%${args.assignee_name}%,email.ilike.%${args.assignee_name}%`)
        .limit(5);

      if (!users || users.length === 0) {
        return { error: `No team member found matching "${args.assignee_name}"` };
      }

      if (users.length > 1) {
        const matches = users.map(u => `${u.name} (${u.email})`).join(', ');
        return { error: `Multiple matches found: ${matches}. Please be more specific.` };
      }

      assigneeId = users[0].id;
      assigneeName = users[0].name;
    }

    // Step 3: Build update
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (assigneeId) updates.assignee_id = assigneeId;
    if (args.status) updates.status = args.status;
    if (args.priority) updates.priority = args.priority;

    if (Object.keys(updates).length <= 1) {
      return { error: 'Nothing to update. Provide assignee_name/assignee_id, status, or priority.' };
    }

    const { data: updated, error: updateError } = await supabase
      .from('ticket')
      .update(updates)
      .eq('id', ticket.id)
      .eq('agency_id', agencyId)
      .select('id, number, title, status, priority, assignee_id')
      .single();

    if (updateError) {
      console.error('[ERROR] assign_ticket failed:', updateError);
      throw new Error(`Failed to assign ticket: ${updateError.message}`);
    }

    // Build response summary
    const changes: string[] = [];
    if (assigneeId) changes.push(`assigned to ${assigneeName || assigneeId}`);
    if (args.status) changes.push(`status → ${args.status}`);
    if (args.priority) changes.push(`priority → ${args.priority}`);

    return {
      success: true,
      message: `Ticket #${updated.number} "${updated.title}": ${changes.join(', ')}`,
      ticket: {
        id: updated.id,
        number: updated.number,
        title: updated.title,
        status: updated.status,
        priority: updated.priority,
        assigneeId: updated.assignee_id,
        assigneeName,
      },
    };
  } catch (error) {
    console.error('[ERROR] assign_ticket failed:', error);
    throw new Error(`Failed to assign ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
