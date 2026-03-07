/**
 * Workflow Event Router
 *
 * Dispatches workflow events to matching active workflows.
 * This is the "nervous system" — it connects user actions (stage changes,
 * ticket creation, etc.) to the workflow execution engine.
 *
 * Design:
 * - Fire-and-forget: callers don't wait for workflow execution
 * - Deduplication: prevents same workflow+client from running within 5 min
 * - Trigger matching: filters workflows by trigger config (e.g., specific stage)
 * - Rate limiting: max 10 runs per workflow per hour
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { TriggerType, WorkflowTrigger, Workflow } from '@/types/workflow'
import { getActiveWorkflowsByTriggerType } from './workflow-queries'
import { WorkflowEngine } from './execution-engine'

type SupabaseClientType = SupabaseClient<Database>

export interface WorkflowEvent {
  type: TriggerType
  data: Record<string, unknown>
  clientId?: string
}

export interface DispatchResult {
  dispatched: number
  skipped: number
  errors: string[]
}

/**
 * Dispatch a workflow event to all matching active workflows.
 * This is the main entry point for the event router.
 *
 * Fire-and-forget by default — call with await if you need the result.
 */
export async function dispatchWorkflowEvent(
  supabase: SupabaseClientType,
  agencyId: string,
  userId: string,
  event: WorkflowEvent
): Promise<DispatchResult> {
  const result: DispatchResult = { dispatched: 0, skipped: 0, errors: [] }

  try {
    // 1. Get active workflows matching this trigger type
    const { data: workflows, error } = await getActiveWorkflowsByTriggerType(
      supabase,
      agencyId,
      event.type
    )

    if (error || !workflows?.length) {
      return result
    }

    // 2. Filter workflows whose trigger config matches the event data
    const matchingWorkflows = workflows.filter((workflow) =>
      matchesTriggerConfig(workflow, event)
    )

    if (!matchingWorkflows.length) {
      return result
    }

    // 3. Execute each matching workflow
    const engine = new WorkflowEngine(supabase, agencyId, userId)

    for (const workflow of matchingWorkflows) {
      try {
        // Dedup check: skip if same workflow+client ran in last 5 min
        const isDuplicate = await checkDuplicate(
          supabase,
          agencyId,
          workflow.id,
          event.clientId
        )
        if (isDuplicate) {
          result.skipped++
          continue
        }

        // Rate limit: max 10 runs per workflow per hour
        const isRateLimited = await checkRateLimit(supabase, agencyId, workflow.id)
        if (isRateLimited) {
          result.skipped++
          console.warn(
            `[event-router] Rate limited workflow ${workflow.id} (${workflow.name})`
          )
          continue
        }

        // Fire the workflow — don't await, fire-and-forget
        engine
          .executeWorkflow(workflow.id, event.data, event.clientId)
          .catch((err) => {
            console.error(
              `[event-router] Workflow ${workflow.id} (${workflow.name}) failed:`,
              err instanceof Error ? err.message : err
            )
          })

        result.dispatched++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        result.errors.push(`Workflow ${workflow.id}: ${msg}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    result.errors.push(`Event dispatch failed: ${msg}`)
    console.error('[event-router] Fatal dispatch error:', msg)
  }

  if (result.dispatched > 0) {
    console.log(
      `[event-router] Dispatched ${result.dispatched} workflow(s) for ${event.type}` +
        (event.clientId ? ` (client: ${event.clientId})` : '')
    )
  }

  return result
}

/**
 * Check if a workflow's trigger config matches the event data.
 * Each trigger type has its own matching logic.
 */
function matchesTriggerConfig(workflow: Workflow, event: WorkflowEvent): boolean {
  const triggers = workflow.triggers as unknown as WorkflowTrigger[]

  return triggers.some((trigger) => {
    if (trigger.type !== event.type) return false

    switch (trigger.type) {
      case 'stage_change': {
        const config = trigger.config as { fromStage?: string; toStage: string }
        const toStage = event.data.toStage as string | undefined
        const fromStage = event.data.fromStage as string | undefined

        // Must match target stage
        if (toStage && config.toStage !== toStage) return false
        // If fromStage is specified in config, must match
        if (config.fromStage && fromStage && config.fromStage !== fromStage) return false

        return true
      }

      case 'ticket_created': {
        const config = trigger.config as {
          categories?: string[]
          priorities?: string[]
        }
        const category = event.data.category as string | undefined
        const priority = event.data.priority as string | undefined

        // If categories specified, ticket must match one
        if (config.categories?.length && category) {
          if (!config.categories.includes(category)) return false
        }
        // If priorities specified, ticket must match one
        if (config.priorities?.length && priority) {
          if (!config.priorities.includes(priority)) return false
        }

        return true
      }

      case 'inactivity':
      case 'scheduled':
        // These are handled by the cron scheduler, not event dispatch
        return true

      case 'kpi_threshold':
      case 'new_message':
        // Match all — config filtering happens in the engine
        return true

      default:
        return false
    }
  })
}

/**
 * Check if same workflow+client ran in last 5 minutes (deduplication).
 */
async function checkDuplicate(
  supabase: SupabaseClientType,
  agencyId: string,
  workflowId: string,
  clientId?: string
): Promise<boolean> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  let query = supabase
    .from('workflow_run')
    .select('id')
    .eq('workflow_id', workflowId)
    .eq('agency_id', agencyId)
    .gte('started_at', fiveMinAgo)
    .limit(1)

  // If there's a client ID, check trigger_data for it
  if (clientId) {
    query = query.contains('trigger_data', { clientId })
  }

  const { data } = await query

  return (data?.length ?? 0) > 0
}

/**
 * Rate limit: max 10 runs per workflow per hour.
 */
async function checkRateLimit(
  supabase: SupabaseClientType,
  agencyId: string,
  workflowId: string
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await supabase
    .from('workflow_run')
    .select('id', { count: 'exact', head: true })
    .eq('workflow_id', workflowId)
    .eq('agency_id', agencyId)
    .gte('started_at', oneHourAgo)

  return (count ?? 0) >= 10
}
