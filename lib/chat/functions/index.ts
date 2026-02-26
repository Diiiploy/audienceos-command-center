/**
 * HGC Function Calling Module
 *
 * Provides Gemini function calling capabilities for the dashboard route.
 *
 * Ported from Holy Grail Chat (HGC) with 9.5/10 confidence.
 * Part of: 3-System Consolidation
 */

import type { ExecutorContext, FunctionExecutor } from './types';
import { getClients, getClientDetails } from './get-clients';
import { getAlerts } from './get-alerts';
import { getAgencyStats } from './get-agency-stats';
import { getRecentCommunications } from './get-recent-communications';
import { navigateTo } from './navigate-to';
import { getTickets } from './get-tickets';
import { createTicket } from './create-ticket';
import { createClient } from './create-client';
import { getClientEmails } from './get-client-emails';
import { updateClient } from './update-client';
import { assignTicket } from './assign-ticket';
import { searchKnowledgeBase } from './search-knowledge-base';
import { validateFunctionArgs } from './schemas';
import {
  getEmails,
  getCalendarEvents,
  getDriveFiles,
  checkGoogleConnection,
} from './google-workspace';
import { initializeMem0Service } from '@/lib/memory/mem0-service';

// Re-export types
export type { ExecutorContext } from './types';
export type {
  ClientSummary,
  ClientDetails,
  AlertSummary,
  CommunicationSummary,
  AgencyStats,
  NavigationAction,
} from './types';

/**
 * Function declarations for Gemini
 */
export const hgcFunctions = [
  {
    name: 'get_clients',
    description: 'Get list of clients for the agency. Use when user asks about client health, client stages, or wants to see the client list. Do NOT use this when user asks about emails, gmails, or messages from a client — use get_client_emails instead.',
    parameters: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          description: 'Filter by client lifecycle stage',
          enum: ['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding'],
        },
        health_status: {
          type: 'string',
          description: 'Filter by health status (risk level)',
          enum: ['green', 'yellow', 'red'],
        },
        limit: {
          type: 'number',
          description: 'Maximum clients to return (default: 10)',
        },
        search: {
          type: 'string',
          description: 'Search by client name',
        },
      },
    },
  },
  {
    name: 'get_client_details',
    description: 'Get detailed information about a specific client including contacts, integrations, and recent activity.',
    parameters: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          description: 'The UUID of the client',
        },
        client_name: {
          type: 'string',
          description: 'The name of the client (will search if ID not provided)',
        },
      },
    },
  },
  {
    name: 'get_alerts',
    description: 'Get active alerts for the agency. Use when user asks about risks, warnings, or issues.',
    parameters: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          description: 'Filter by severity level',
          enum: ['critical', 'high', 'medium', 'low'],
        },
        status: {
          type: 'string',
          description: 'Filter by alert status',
          enum: ['active', 'snoozed', 'resolved', 'dismissed'],
        },
        client_id: {
          type: 'string',
          description: 'Filter alerts for a specific client',
        },
        limit: {
          type: 'number',
          description: 'Maximum alerts to return (default: 10)',
        },
      },
    },
  },
  {
    name: 'get_recent_communications',
    description: 'Get recent synced communications (Gmail emails, Slack messages) with a client or across all clients. Use when user asks about messages, communications, or recent activity with clients.',
    parameters: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          description: 'The client UUID. If omitted, returns communications across all clients.',
        },
        type: {
          type: 'string',
          description: 'Filter by communication type',
          enum: ['email', 'call', 'meeting', 'note', 'slack'],
        },
        limit: {
          type: 'number',
          description: 'Maximum communications to return (default: 10)',
        },
      },
    },
  },
  {
    name: 'get_agency_stats',
    description: 'Get high-level agency statistics and KPIs.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period for stats',
          enum: ['today', 'week', 'month', 'quarter'],
        },
      },
    },
  },
  {
    name: 'navigate_to',
    description: 'Generate a navigation action to a specific page or view. Returns a URL for the frontend to navigate to.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'Where to navigate',
          enum: ['clients', 'client_detail', 'alerts', 'intelligence', 'documents', 'settings', 'integrations'],
        },
        client_id: {
          type: 'string',
          description: 'Client ID (required for client_detail)',
        },
        filters: {
          type: 'object',
          description: 'Optional filters to apply to the destination',
        },
      },
      required: ['destination'],
    },
  },
  {
    name: 'get_tickets',
    description: 'Get support tickets. Use when user asks about tickets, tasks, support issues, or open requests.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by ticket status',
          enum: ['new', 'in_progress', 'waiting_client', 'resolved'],
        },
        priority: {
          type: 'string',
          description: 'Filter by priority level',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        client_id: {
          type: 'string',
          description: 'Filter tickets for a specific client',
        },
        assignee_id: {
          type: 'string',
          description: 'Filter by assigned team member',
        },
        search: {
          type: 'string',
          description: 'Search ticket titles and descriptions',
        },
        limit: {
          type: 'number',
          description: 'Maximum tickets to return (default: 10)',
        },
      },
    },
  },
  {
    name: 'create_ticket',
    description: 'Create a new support ticket for a client. Use when user wants to file a ticket, create a task, or report an issue for a client.',
    parameters: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          description: 'The UUID of the client',
        },
        client_name: {
          type: 'string',
          description: 'The name of the client (will search if ID not provided)',
        },
        title: {
          type: 'string',
          description: 'Ticket title (required)',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the issue',
        },
        category: {
          type: 'string',
          description: 'Ticket category',
          enum: ['technical', 'billing', 'campaign', 'general', 'escalation'],
        },
        priority: {
          type: 'string',
          description: 'Ticket priority level',
          enum: ['low', 'medium', 'high', 'critical'],
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_client',
    description: 'Create a new client record. Use when user wants to add a new client to the system.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Client name (required)',
        },
        contact_name: {
          type: 'string',
          description: 'Primary contact person name',
        },
        contact_email: {
          type: 'string',
          description: 'Primary contact email address',
        },
        stage: {
          type: 'string',
          description: 'Client lifecycle stage (default: Lead)',
          enum: ['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-boarding'],
        },
        industry: {
          type: 'string',
          description: 'Client industry',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_client_emails',
    description: 'Get synced emails for a specific client. ALWAYS use this when the user mentions both emails/gmails/messages AND a client name (e.g., "emails from Acme", "gmails from Test Client", "what has Agro Bros sent me", "summarize emails from [client]"). This is the PREFERRED function for any email query that references a specific client. Looks up client by name and returns their email history.',
    parameters: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          description: 'The UUID of the client',
        },
        client_name: {
          type: 'string',
          description: 'The name of the client (will search if ID not provided)',
        },
        limit: {
          type: 'number',
          description: 'Maximum emails to return (default: 20)',
        },
        days: {
          type: 'number',
          description: 'Lookback period in days (default: 30)',
        },
      },
    },
  },
  {
    name: 'update_client',
    description: 'Update a client record. Use when user wants to change client stage, health status, contact info, or notes.',
    parameters: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          description: 'The UUID of the client',
        },
        client_name: {
          type: 'string',
          description: 'The name of the client (will search if ID not provided)',
        },
        stage: {
          type: 'string',
          description: 'New lifecycle stage',
          enum: ['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-boarding'],
        },
        health_status: {
          type: 'string',
          description: 'New health status',
          enum: ['green', 'yellow', 'red'],
        },
        contact_name: {
          type: 'string',
          description: 'Updated primary contact name',
        },
        contact_email: {
          type: 'string',
          description: 'Updated primary contact email',
        },
        notes: {
          type: 'string',
          description: 'Updated client notes',
        },
      },
    },
  },
  {
    name: 'assign_ticket',
    description: 'Assign a ticket to a team member, or update ticket status/priority. Use when user wants to assign, reassign, or update a ticket.',
    parameters: {
      type: 'object',
      properties: {
        ticket_id: {
          type: 'string',
          description: 'The UUID of the ticket',
        },
        ticket_number: {
          type: 'number',
          description: 'The ticket number (e.g., 42)',
        },
        assignee_name: {
          type: 'string',
          description: 'Name of the team member to assign to',
        },
        assignee_id: {
          type: 'string',
          description: 'UUID of the team member to assign to',
        },
        status: {
          type: 'string',
          description: 'New ticket status',
          enum: ['new', 'in_progress', 'waiting_client', 'resolved'],
        },
        priority: {
          type: 'string',
          description: 'New ticket priority',
          enum: ['low', 'medium', 'high', 'critical'],
        },
      },
    },
  },
  {
    name: 'search_knowledge_base',
    description: 'Search the knowledge base for documents. Use when user asks about documentation, SOPs, guides, or wants to find a specific document.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term to find in document titles and file names',
        },
        category: {
          type: 'string',
          description: 'Filter by document category',
          enum: ['installation', 'tech', 'support', 'process', 'client_specific'],
        },
        client_id: {
          type: 'string',
          description: 'Filter documents for a specific client',
        },
        limit: {
          type: 'number',
          description: 'Maximum documents to return (default: 10)',
        },
      },
    },
  },
  // Google Workspace functions
  {
    name: 'get_emails',
    description: 'Get synced emails from the connected Gmail inbox. Use when user asks about emails, messages, inbox, or wants to see recent emails. Emails are already synced — call this immediately without checking connection first.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to filter emails by subject, content, or sender (e.g., "invoice", "john@example.com")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum emails to return (default: 10)',
        },
        unreadOnly: {
          type: 'boolean',
          description: 'Only return unread emails',
        },
      },
    },
  },
  {
    name: 'get_calendar_events',
    description: 'Get calendar events. Use when user asks about meetings, schedule, or calendar.',
    parameters: {
      type: 'object',
      properties: {
        timeMin: {
          type: 'string',
          description: 'Start time in ISO format (default: now)',
        },
        timeMax: {
          type: 'string',
          description: 'End time in ISO format (default: 7 days from now)',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum events to return (default: 10)',
        },
      },
    },
  },
  {
    name: 'get_drive_files',
    description: 'Search Google Drive files. Use when user asks about documents, files, or wants to find a file.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search term to find in file names',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum files to return (default: 10)',
        },
        mimeType: {
          type: 'string',
          description: 'Filter by file type (e.g., "application/pdf", "application/vnd.google-apps.document")',
        },
      },
    },
  },
  {
    name: 'check_google_connection',
    description: 'Check which Google services are connected (Gmail, Calendar, Drive). Only use this if the user explicitly asks about connection status — do NOT call this before fetching emails.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  // Memory store function
  {
    name: 'store_memory',
    description: 'Remember information the user asks you to store. Use this when the user says "remember that...", "note that...", "keep in mind...", or shares a preference, decision, or important fact they want remembered.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The fact or preference to remember (clean, concise statement)',
        },
        type: {
          type: 'string',
          enum: ['preference', 'decision', 'task', 'insight'],
          description: 'Memory category',
        },
        importance: {
          type: 'string',
          enum: ['high', 'medium'],
          description: 'How important this is to remember',
        },
        clientName: {
          type: 'string',
          description: 'Client name if this memory is about a specific client (optional)',
        },
      },
      required: ['content', 'type'],
    },
  },
];

/**
 * Registry of all function executors
 */
export const executors: Record<string, FunctionExecutor> = {
  get_clients: getClients,
  get_client_details: getClientDetails,
  get_alerts: getAlerts,
  get_recent_communications: getRecentCommunications,
  get_agency_stats: getAgencyStats,
  navigate_to: navigateTo,
  get_tickets: getTickets,
  create_ticket: createTicket,
  create_client: createClient,
  get_client_emails: getClientEmails,
  update_client: updateClient,
  assign_ticket: assignTicket,
  search_knowledge_base: searchKnowledgeBase,
  // Google Workspace functions
  get_emails: getEmails,
  get_calendar_events: getCalendarEvents,
  get_drive_files: getDriveFiles,
  check_google_connection: checkGoogleConnection,
  // Memory store function
  store_memory: async (context, args) => {
    const mem0 = initializeMem0Service();

    // Optionally resolve clientName → clientId
    let clientId: string | undefined;
    if (args.clientName && context.supabase) {
      const { data: clients } = await context.supabase
        .from('client')
        .select('id, name')
        .eq('agency_id', context.agencyId)
        .ilike('name', `%${args.clientName}%`)
        .limit(1);
      clientId = (clients as Array<{ id: string; name: string }> | null)?.[0]?.id;
    }

    const result = await mem0.addMemory({
      content: args.content as string,
      agencyId: context.agencyId,
      userId: context.userId,
      clientId,
      type: (args.type as 'preference' | 'decision' | 'task' | 'insight') || 'preference',
      importance: (args.importance as 'high' | 'medium') || 'high',
    });

    return {
      stored: true,
      memoryId: result?.id,
      content: args.content,
      clientResolved: !!clientId,
    };
  },
};

/**
 * Execute a function by name with context and args
 * Arguments are validated against Zod schemas
 */
export async function executeFunction(
  name: string,
  context: ExecutorContext,
  args: Record<string, unknown>
): Promise<unknown> {
  const executor = executors[name];

  if (!executor) {
    throw new Error(`Unknown function: ${name}`);
  }

  // Validate arguments against schema
  const validatedArgs = validateFunctionArgs(name, args);

  return executor(context, validatedArgs);
}

/**
 * Check if a function name is valid
 */
export function isValidFunction(name: string): boolean {
  return name in executors;
}
