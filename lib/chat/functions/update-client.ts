/**
 * Update Client Function Executor
 *
 * Modifies client details: stage, health_status, contact info, notes, tags.
 * Accepts client_id or client_name for lookup.
 * RBAC-checked via verifyClientAccess.
 */

import type { ExecutorContext } from './types';
import { verifyClientAccess } from '@/lib/rbac/client-access';

interface UpdateClientArgs {
  client_id?: string;
  client_name?: string;
  stage?: string;
  health_status?: string;
  contact_name?: string;
  contact_email?: string;
  notes?: string;
  industry?: string;
}

export async function updateClient(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const args = rawArgs as unknown as UpdateClientArgs;
  const { agencyId, userId, supabase } = context;

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] Supabase client is required in production.');
    }
    return { error: 'Supabase not available in standalone mode' };
  }

  try {
    // Resolve client_id from client_name if needed
    let clientId = args.client_id;

    if (!clientId && args.client_name) {
      const { data: clientData } = await supabase
        .from('client')
        .select('id, name')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .ilike('name', `%${args.client_name}%`)
        .limit(1)
        .single();

      if (!clientData) {
        return { error: `Client "${args.client_name}" not found` };
      }
      clientId = clientData.id;
    }

    if (!clientId) {
      return { error: 'Either client_id or client_name is required' };
    }

    // Verify member access
    const hasAccess = await verifyClientAccess(userId, agencyId, clientId, supabase);
    if (!hasAccess) {
      return { error: 'You do not have access to this client' };
    }

    // Build update payload — only include fields that were provided
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (args.stage !== undefined) updates.stage = args.stage;
    if (args.health_status !== undefined) updates.health_status = args.health_status;
    if (args.contact_name !== undefined) updates.contact_name = args.contact_name;
    if (args.contact_email !== undefined) updates.contact_email = args.contact_email;
    if (args.notes !== undefined) updates.notes = args.notes;

    // Check that we have something to update beyond just updated_at
    if (Object.keys(updates).length <= 1) {
      return { error: 'No fields to update. Provide at least one of: stage, health_status, contact_name, contact_email, notes' };
    }

    const { data, error } = await supabase
      .from('client')
      .update(updates)
      .eq('id', clientId)
      .eq('agency_id', agencyId)
      .select('id, name, stage, health_status, contact_name, contact_email, notes')
      .single();

    if (error) {
      console.error('[ERROR] update_client failed:', error);
      throw new Error(`Failed to update client: ${error.message}`);
    }

    const updatedFields = Object.keys(updates).filter(k => k !== 'updated_at');
    return {
      success: true,
      message: `Updated ${data.name}: ${updatedFields.join(', ')}`,
      client: {
        id: data.id,
        name: data.name,
        stage: data.stage,
        healthStatus: data.health_status,
        contactName: data.contact_name,
        contactEmail: data.contact_email,
        notes: data.notes,
      },
    };
  } catch (error) {
    console.error('[ERROR] update_client failed:', error);
    throw new Error(`Failed to update client: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
