/**
 * Create Client Function Executor
 *
 * Handles create_client function calls from AI chat.
 * Defaults: stage='Lead', health_status='green'.
 * Scoped to agency via ExecutorContext.
 */

import type { ExecutorContext } from './types';

interface CreateClientArgs {
  name: string;
  contact_name?: string;
  contact_email?: string;
  stage?: string;
  industry?: string;
  notes?: string;
}

interface CreatedClient {
  id: string;
  name: string;
  stage: string;
  healthStatus: string;
  contactName?: string;
  contactEmail?: string;
  message: string;
}

const VALID_STAGES = ['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-boarding'];

/**
 * Create a new client record
 */
export async function createClient(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<CreatedClient> {
  const args = rawArgs as unknown as CreateClientArgs;
  const { agencyId, supabase } = context;

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] Supabase client is required in production.');
    }
    throw new Error('Cannot create clients without database connection.');
  }

  if (!args.name) {
    throw new Error('Client name is required.');
  }

  // Check for duplicate name
  const { data: existing } = await supabase
    .from('client')
    .select('id')
    .eq('agency_id', agencyId)
    .ilike('name', args.name)
    .eq('is_active', true)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error(`A client named "${args.name}" already exists. Use a different name or update the existing client.`);
  }

  // Validate stage
  const stage = args.stage && VALID_STAGES.includes(args.stage) ? args.stage : 'Lead';

  // Create the client
  const { data: client, error } = await supabase
    .from('client')
    .insert({
      agency_id: agencyId,
      name: args.name.slice(0, 200),
      contact_name: args.contact_name?.slice(0, 200) || null,
      contact_email: args.contact_email?.slice(0, 100) || null,
      stage,
      health_status: 'green',
      notes: args.notes?.slice(0, 5000) || null,
      tags: [],
    })
    .select('id, name, stage, health_status, contact_name, contact_email')
    .single();

  if (error) {
    console.error('[ERROR] create_client insert failed:', error);
    throw new Error(`Failed to create client: ${error.message}`);
  }

  return {
    id: client.id,
    name: client.name,
    stage: client.stage,
    healthStatus: client.health_status,
    contactName: client.contact_name || undefined,
    contactEmail: client.contact_email || undefined,
    message: `Client "${client.name}" created successfully in the ${client.stage} stage.`,
  };
}
