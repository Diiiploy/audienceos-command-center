/**
 * Cron: Workflow Scheduler
 * GET /api/cron/workflow-scheduler
 *
 * Triggered by Vercel cron every 15 minutes.
 * Handles two trigger types that can't be event-driven:
 * 1. Inactivity triggers — scans for clients with no recent activity
 * 2. Scheduled triggers — checks cron expressions against current time
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { WorkflowTrigger, InactivityTrigger, ScheduledTrigger } from '@/types/workflow'
import { WorkflowEngine } from '@/lib/workflows/execution-engine'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results: {
    agencyId: string
    inactivityChecks: number
    scheduledChecks: number
    dispatched: number
    errors: string[]
  }[] = []

  try {
    // Get all agencies that have active workflows with inactivity or scheduled triggers
    const { data: workflows, error: wfError } = await supabase
      .from('workflow')
      .select('*')
      .eq('is_active', true)

    if (wfError || !workflows?.length) {
      return NextResponse.json({
        checked: 0,
        message: 'No active workflows',
        timestamp: new Date().toISOString(),
      })
    }

    // Group workflows by agency
    const byAgency = new Map<string, typeof workflows>()
    for (const wf of workflows) {
      const triggers = wf.triggers as unknown as WorkflowTrigger[]
      const hasRelevantTrigger = triggers.some(
        (t) => t.type === 'inactivity' || t.type === 'scheduled'
      )
      if (!hasRelevantTrigger) continue

      const list = byAgency.get(wf.agency_id) || []
      list.push(wf)
      byAgency.set(wf.agency_id, list)
    }

    // Process each agency
    for (const [agencyId, agencyWorkflows] of byAgency) {
      const agencyResult = {
        agencyId,
        inactivityChecks: 0,
        scheduledChecks: 0,
        dispatched: 0,
        errors: [] as string[],
      }

      // We need a userId for the engine — use the workflow creator as fallback
      const systemUserId = agencyWorkflows[0].created_by
      const engine = new WorkflowEngine(supabase, agencyId, systemUserId)

      for (const workflow of agencyWorkflows) {
        const triggers = workflow.triggers as unknown as WorkflowTrigger[]

        for (const trigger of triggers) {
          try {
            if (trigger.type === 'inactivity') {
              await processInactivityTrigger(
                supabase,
                engine,
                workflow,
                trigger as InactivityTrigger,
                agencyId,
                agencyResult
              )
            } else if (trigger.type === 'scheduled') {
              await processScheduledTrigger(
                engine,
                workflow,
                trigger as ScheduledTrigger,
                agencyResult
              )
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            agencyResult.errors.push(`Workflow ${workflow.id}: ${msg}`)
            console.error(
              `[cron/workflow-scheduler] Error processing ${trigger.type} for workflow ${workflow.id}:`,
              msg
            )
          }
        }
      }

      results.push(agencyResult)
    }

    const totalDispatched = results.reduce((sum, r) => sum + r.dispatched, 0)

    return NextResponse.json({
      checked: results.length,
      dispatched: totalDispatched,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[cron/workflow-scheduler] Fatal error:', err)
    return NextResponse.json({ error: 'Scheduler failed' }, { status: 500 })
  }
}

/**
 * Process inactivity trigger: find clients with no activity for N days.
 */
async function processInactivityTrigger(
  supabase: ReturnType<typeof createClient<Database>>,
  engine: WorkflowEngine,
  workflow: Database['public']['Tables']['workflow']['Row'],
  trigger: InactivityTrigger,
  agencyId: string,
  result: { inactivityChecks: number; dispatched: number; errors: string[] }
) {
  const { days, activityTypes } = trigger.config
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  // Get all clients for this agency
  const { data: clients } = await supabase
    .from('client')
    .select('id, name, stage')
    .eq('agency_id', agencyId)

  if (!clients?.length) return

  for (const client of clients) {
    result.inactivityChecks++

    // Check if this workflow already ran for this client in the last hour (dedup)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentRuns } = await supabase
      .from('workflow_run')
      .select('id')
      .eq('workflow_id', workflow.id)
      .eq('agency_id', agencyId)
      .gte('started_at', oneHourAgo)
      .limit(1)

    if (recentRuns?.length) continue

    // Check inactivity for this client
    const types = activityTypes || ['communication', 'task', 'ticket']
    let isInactive = true

    for (const type of types) {
      const table = type === 'communication' ? 'communication' : type
      const dateCol = type === 'communication' ? 'received_at' : 'updated_at'

      const { data: activity } = await supabase
        .from(table)
        .select('id')
        .eq('client_id', client.id)
        .gte(dateCol, cutoffDate.toISOString())
        .limit(1)

      if (activity?.length) {
        isInactive = false
        break
      }
    }

    if (isInactive) {
      engine
        .executeWorkflow(workflow.id, {
          type: 'inactivity',
          clientId: client.id,
          clientName: client.name,
          inactiveDays: days,
        }, client.id)
        .catch((err) => {
          console.error(
            `[cron/workflow-scheduler] Inactivity workflow ${workflow.id} failed for client ${client.id}:`,
            err instanceof Error ? err.message : err
          )
        })

      result.dispatched++
    }
  }
}

/**
 * Process scheduled trigger: check if cron expression matches current 15-min window.
 */
async function processScheduledTrigger(
  engine: WorkflowEngine,
  workflow: Database['public']['Tables']['workflow']['Row'],
  trigger: ScheduledTrigger,
  result: { scheduledChecks: number; dispatched: number; errors: string[] }
) {
  result.scheduledChecks++

  const { schedule, timezone } = trigger.config

  // Check if the cron expression matches the current 15-minute window
  if (!matchesCronWindow(schedule, timezone)) {
    return
  }

  engine
    .executeWorkflow(workflow.id, {
      type: 'scheduled',
      schedule,
      triggeredAt: new Date().toISOString(),
    })
    .catch((err) => {
      console.error(
        `[cron/workflow-scheduler] Scheduled workflow ${workflow.id} failed:`,
        err instanceof Error ? err.message : err
      )
    })

  result.dispatched++
}

// Simple cron matching for the current 15-minute window.
// Supports: minute, hour, day-of-month, month, day-of-week.
// Uses timezone from trigger config.
function matchesCronWindow(cronExpression: string, timezone: string): boolean {
  const parts = cronExpression.trim().split(/\s+/)
  if (parts.length !== 5) return false

  const [minutePart, hourPart, dayOfMonthPart, monthPart, dayOfWeekPart] = parts

  // Get current time in the specified timezone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC',
    hour: 'numeric',
    minute: 'numeric',
    day: 'numeric',
    month: 'numeric',
    weekday: 'short',
    hour12: false,
  })
  const formatted = formatter.formatToParts(now)

  const currentMinute = parseInt(formatted.find((p) => p.type === 'minute')?.value || '0')
  const currentHour = parseInt(formatted.find((p) => p.type === 'hour')?.value || '0')
  const currentDay = parseInt(formatted.find((p) => p.type === 'day')?.value || '1')
  const currentMonth = parseInt(formatted.find((p) => p.type === 'month')?.value || '1')
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const currentDow = dayNames.indexOf(
    formatted.find((p) => p.type === 'weekday')?.value || 'Sun'
  )

  // Check each field — within the 15-min window for minutes
  if (!matchesCronField(minutePart, currentMinute, 0, 59, 15)) return false
  if (!matchesCronField(hourPart, currentHour, 0, 23)) return false
  if (!matchesCronField(dayOfMonthPart, currentDay, 1, 31)) return false
  if (!matchesCronField(monthPart, currentMonth, 1, 12)) return false
  if (!matchesCronField(dayOfWeekPart, currentDow, 0, 6)) return false

  return true
}

// Match a single cron field against a value.
// Supports: *, step (star/N), N, N-M, comma-separated values.
// windowMinutes: for minute field, accept if value is within windowMinutes of target.
function matchesCronField(
  field: string,
  value: number,
  min: number,
  max: number,
  windowMinutes?: number
): boolean {
  if (field === '*') return true

  // Handle step: */N
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2))
    if (isNaN(step) || step <= 0) return false
    // For minute field with window, check if any step value falls in window
    if (windowMinutes) {
      for (let v = min; v <= max; v += step) {
        if (Math.abs(v - value) < windowMinutes) return true
      }
      return false
    }
    return value % step === 0
  }

  // Handle comma-separated
  const values = field.split(',')
  for (const part of values) {
    // Handle range: N-M
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-')
      const start = parseInt(startStr)
      const end = parseInt(endStr)
      if (!isNaN(start) && !isNaN(end)) {
        if (windowMinutes) {
          for (let v = start; v <= end; v++) {
            if (Math.abs(v - value) < windowMinutes) return true
          }
        } else if (value >= start && value <= end) {
          return true
        }
      }
    } else {
      const target = parseInt(part)
      if (!isNaN(target)) {
        if (windowMinutes) {
          if (Math.abs(target - value) < windowMinutes) return true
        } else if (target === value) {
          return true
        }
      }
    }
  }

  return false
}
