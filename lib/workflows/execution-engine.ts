/**
 * Workflow Execution Engine
 * Core engine for executing workflow triggers and actions
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type {
  WorkflowTrigger,
  WorkflowAction,
  WorkflowExecutionContext,
  ClientSnapshot,
  ActionResult,
  WorkflowExecutionResult,
} from '@/types/workflow'
import { substituteVariables } from './action-registry'
import { createWorkflowRun, completeWorkflowRun, getWorkflow } from './workflow-queries'

type SupabaseClientType = SupabaseClient<Database>

// ============================================================================
// WORKFLOW ENGINE
// ============================================================================

export class WorkflowEngine {
  private supabase: SupabaseClientType
  private agencyId: string
  private userId: string

  constructor(supabase: SupabaseClientType, agencyId: string, userId: string) {
    this.supabase = supabase
    this.agencyId = agencyId
    this.userId = userId
  }

  /**
   * Execute a workflow with given trigger data
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: Record<string, unknown>,
    clientId?: string
  ): Promise<WorkflowExecutionResult> {
    // Get workflow
    const { data: workflow, error: workflowError } = await getWorkflow(
      this.supabase,
      workflowId,
      this.agencyId
    )

    if (workflowError || !workflow) {
      throw new Error(workflowError?.message || 'Workflow not found')
    }

    if (!workflow.is_active) {
      throw new Error('Workflow is disabled')
    }

    // Create run record
    const { data: run, error: runError } = await createWorkflowRun(this.supabase, this.agencyId, {
      workflowId,
      triggerData,
    })

    if (runError || !run) {
      throw new Error(runError?.message || 'Failed to create workflow run')
    }

    // Get client snapshot if applicable
    let clientSnapshot: ClientSnapshot | undefined
    if (clientId) {
      clientSnapshot = await this.getClientSnapshot(clientId)
    }

    // Build execution context
    const context: WorkflowExecutionContext = {
      workflowId,
      runId: run.id,
      agencyId: this.agencyId,
      userId: this.userId,
      triggerData,
      clientSnapshot,
      variables: {},
    }

    try {
      // Validate triggers are still met (for condition-based triggers)
      const triggersValid = await this.validateTriggers(
        workflow.triggers as unknown as WorkflowTrigger[],
        context
      )

      if (!triggersValid) {
        await completeWorkflowRun(
          this.supabase,
          run.id,
          this.agencyId,
          workflowId,
          false,
          [],
          'Trigger conditions no longer met'
        )

        return {
          runId: run.id,
          workflowId,
          status: 'skipped',
          triggerData,
          actionResults: [],
          startedAt: run.started_at,
          completedAt: new Date().toISOString(),
          error: 'Trigger conditions no longer met',
        }
      }

      // Execute action chain
      const actionResults = await this.executeActionChain(
        workflow.actions as unknown as WorkflowAction[],
        context
      )

      // Determine overall success
      const hasFailures = actionResults.some((r) => r.status === 'failed')
      const success = !hasFailures

      // Complete the run
      await completeWorkflowRun(
        this.supabase,
        run.id,
        this.agencyId,
        workflowId,
        success,
        actionResults,
        hasFailures ? 'One or more actions failed' : undefined
      )

      return {
        runId: run.id,
        workflowId,
        status: success ? 'completed' : 'failed',
        triggerData,
        actionResults,
        startedAt: run.started_at,
        completedAt: new Date().toISOString(),
        error: hasFailures ? 'One or more actions failed' : undefined,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await completeWorkflowRun(
        this.supabase,
        run.id,
        this.agencyId,
        workflowId,
        false,
        [],
        errorMessage
      )

      return {
        runId: run.id,
        workflowId,
        status: 'failed',
        triggerData,
        actionResults: [],
        startedAt: run.started_at,
        completedAt: new Date().toISOString(),
        error: errorMessage,
      }
    }
  }

  /**
   * Execute action chain with conditions and delays
   */
  private async executeActionChain(
    actions: WorkflowAction[],
    context: WorkflowExecutionContext
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = []

    for (const action of actions) {
      const startTime = Date.now()

      // Handle delays (in real implementation, this would schedule for later)
      if (action.delayMinutes && action.delayMinutes > 0) {
        // For now, we'll skip delayed actions and log them
        // In production, these would be scheduled via a job queue
        results.push({
          actionId: action.id,
          actionType: action.type,
          status: 'pending_approval', // Using this status to indicate scheduled
          result: { scheduled: true, delayMinutes: action.delayMinutes },
          executedAt: new Date().toISOString(),
        })
        continue
      }

      // Check conditions
      if (action.condition) {
        const conditionMet = await this.evaluateCondition(action.condition, context)
        if (!conditionMet) {
          results.push({
            actionId: action.id,
            actionType: action.type,
            status: 'skipped',
            result: { reason: 'Condition not met' },
            executedAt: new Date().toISOString(),
          })
          continue
        }
      }

      // Check if requires approval
      if (action.requiresApproval) {
        // Queue for approval instead of executing
        // In production, this would create an approval record
        results.push({
          actionId: action.id,
          actionType: action.type,
          status: 'pending_approval',
          result: { awaitingApproval: true },
          executedAt: new Date().toISOString(),
        })
        continue
      }

      // Execute the action
      try {
        const result = await this.executeAction(action, context)
        results.push({
          ...result,
          durationMs: Date.now() - startTime,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          actionId: action.id,
          actionType: action.type,
          status: 'failed',
          error: errorMessage,
          executedAt: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        })

        // Stop chain on failure unless configured to continue
        if (!action.continueOnFailure) {
          break
        }
      }
    }

    return results
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: WorkflowAction,
    context: WorkflowExecutionContext
  ): Promise<ActionResult> {
    switch (action.type) {
      case 'create_task':
        return this.executeCreateTask(action, context)
      case 'send_notification':
        return this.executeSendNotification(action, context)
      case 'draft_communication':
        return this.executeDraftCommunication(action, context)
      case 'create_ticket':
        return this.executeCreateTicket(action, context)
      case 'update_client':
        return this.executeUpdateClient(action, context)
      case 'create_alert':
        return this.executeCreateAlert(action, context)
      default:
        throw new Error(`Unknown action type: ${(action as WorkflowAction).type}`)
    }
  }

  // ============================================================================
  // ACTION EXECUTORS
  // ============================================================================

  private async executeCreateTask(
    action: WorkflowAction & { type: 'create_task' },
    context: WorkflowExecutionContext
  ): Promise<ActionResult> {
    const { title, description, priority: _priority, dueInDays, assignToTriggeredUser } = action.config

    // Substitute variables
    const processedTitle = substituteVariables(title, {
      client: context.clientSnapshot,
      trigger: context.triggerData,
    })
    const processedDescription = description
      ? substituteVariables(description, {
          client: context.clientSnapshot,
          trigger: context.triggerData,
        })
      : undefined

    // Calculate due date
    let dueDate: string | undefined
    if (dueInDays) {
      const due = new Date()
      due.setDate(due.getDate() + dueInDays)
      dueDate = due.toISOString().split('T')[0]
    }

    // Determine assignee
    let assignedTo: string | undefined
    if (assignToTriggeredUser && context.clientSnapshot) {
      // Get client owner
      const { data: assignments } = await this.supabase
        .from('client_assignment')
        .select('user_id')
        .eq('client_id', context.clientSnapshot.id)
        .eq('role', 'owner')
        .limit(1)
        .single()

      assignedTo = assignments?.user_id
    }

    if (!context.clientSnapshot) {
      throw new Error('Create task action requires a client context')
    }

    const { data, error } = await this.supabase
      .from('task')
      .insert({
        agency_id: context.agencyId,
        client_id: context.clientSnapshot.id,
        name: processedTitle,
        description: processedDescription,
        due_date: dueDate,
        assigned_to: assignedTo,
        sort_order: 0,
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`)
    }

    return {
      actionId: action.id,
      actionType: 'create_task',
      status: 'completed',
      result: { taskId: data.id, title: processedTitle },
      executedAt: new Date().toISOString(),
    }
  }

  private async executeSendNotification(
    action: WorkflowAction & { type: 'send_notification' },
    context: WorkflowExecutionContext
  ): Promise<ActionResult> {
    const { channel, message, recipients } = action.config

    const processedMessage = substituteVariables(message, {
      client: context.clientSnapshot,
      trigger: context.triggerData,
    })

    if (channel === 'slack') {
      return this.sendSlackNotification(action, processedMessage, recipients)
    } else if (channel === 'email') {
      return this.sendEmailNotification(action, processedMessage, recipients, context)
    }

    // Unknown channel — log and return completed (backwards compat)
    console.warn(`[execution-engine] Unknown notification channel: ${channel}`)
    return {
      actionId: action.id,
      actionType: 'send_notification',
      status: 'completed',
      result: { channel, recipientCount: recipients.length, message: processedMessage },
      executedAt: new Date().toISOString(),
    }
  }

  private async sendSlackNotification(
    action: WorkflowAction & { type: 'send_notification' },
    message: string,
    recipients: string[]
  ): Promise<ActionResult> {
    const gatewayUrl = process.env.DIIIPLOY_GATEWAY_URL
    const gatewayKey = process.env.DIIIPLOY_GATEWAY_API_KEY
    const tenantId = process.env.DIIIPLOY_TENANT_ID

    if (!gatewayUrl || !gatewayKey) {
      throw new Error('Slack gateway not configured (DIIIPLOY_GATEWAY_URL + DIIIPLOY_GATEWAY_API_KEY)')
    }

    const results: { recipient: string; ok: boolean; error?: string }[] = []

    for (const recipient of recipients) {
      try {
        const response = await fetch(`${gatewayUrl}/slack/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gatewayKey}`,
            ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ channel: recipient, text: message }),
          signal: AbortSignal.timeout(10000),
        })

        const data = await response.json() as { ok?: boolean; error?: string }
        results.push({ recipient, ok: data.ok ?? response.ok, error: data.error })

        if (!data.ok && !response.ok) {
          console.error(`[execution-engine] Slack post failed for ${recipient}:`, data.error)
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        results.push({ recipient, ok: false, error: errMsg })
        console.error(`[execution-engine] Slack post error for ${recipient}:`, errMsg)
      }
    }

    const allOk = results.every((r) => r.ok)
    const anyOk = results.some((r) => r.ok)

    return {
      actionId: action.id,
      actionType: 'send_notification',
      status: anyOk ? 'completed' : 'failed',
      result: {
        channel: 'slack',
        recipientCount: recipients.length,
        successCount: results.filter((r) => r.ok).length,
        results,
      },
      error: allOk ? undefined : `${results.filter((r) => !r.ok).length} of ${results.length} Slack messages failed`,
      executedAt: new Date().toISOString(),
    }
  }

  private async sendEmailNotification(
    action: WorkflowAction & { type: 'send_notification' },
    message: string,
    recipients: string[],
    context: WorkflowExecutionContext
  ): Promise<ActionResult> {
    const resendApiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@audienceos.io'

    if (!resendApiKey) {
      throw new Error('Email not configured (RESEND_API_KEY missing)')
    }

    const subject = context.clientSnapshot
      ? `[AudienceOS] Automation: ${context.clientSnapshot.name}`
      : '[AudienceOS] Workflow Notification'

    const results: { recipient: string; ok: boolean; messageId?: string; error?: string }[] = []

    for (const recipient of recipients) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: recipient,
            subject,
            text: message,
            html: `<div style="font-family: sans-serif; padding: 20px;">${message.replace(/\n/g, '<br>')}</div>`,
          }),
          signal: AbortSignal.timeout(10000),
        })

        const data = await response.json() as { id?: string; message?: string }
        const ok = response.ok
        results.push({ recipient, ok, messageId: data.id, error: ok ? undefined : data.message })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        results.push({ recipient, ok: false, error: errMsg })
        console.error(`[execution-engine] Email send error for ${recipient}:`, errMsg)
      }
    }

    const anyOk = results.some((r) => r.ok)

    return {
      actionId: action.id,
      actionType: 'send_notification',
      status: anyOk ? 'completed' : 'failed',
      result: {
        channel: 'email',
        recipientCount: recipients.length,
        successCount: results.filter((r) => r.ok).length,
        results,
      },
      error: anyOk ? undefined : 'All email sends failed',
      executedAt: new Date().toISOString(),
    }
  }

  private async executeDraftCommunication(
    action: WorkflowAction & { type: 'draft_communication' },
    context: WorkflowExecutionContext
  ): Promise<ActionResult> {
    const { platform, template, tone, instructions } = action.config

    // Substitute variables in template
    const processedTemplate = substituteVariables(template, {
      client: context.clientSnapshot,
      trigger: context.triggerData,
    })

    // Try Gemini AI draft, fall back to template string
    let draftContent: string
    try {
      draftContent = await this.generateGeminiDraft(
        processedTemplate,
        tone || 'professional',
        instructions,
        context
      )
    } catch (err) {
      console.warn(
        '[execution-engine] Gemini draft failed, using template fallback:',
        err instanceof Error ? err.message : err
      )
      draftContent = processedTemplate
    }

    return {
      actionId: action.id,
      actionType: 'draft_communication',
      status: 'completed',
      result: {
        platform,
        template,
        tone,
        draft: draftContent,
        preview: draftContent.slice(0, 500),
        aiGenerated: draftContent !== processedTemplate,
      },
      executedAt: new Date().toISOString(),
    }
  }

  private async generateGeminiDraft(
    template: string,
    tone: string,
    instructions: string | undefined,
    context: WorkflowExecutionContext
  ): Promise<string> {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured')
    }

    const { GoogleGenAI } = await import('@google/genai')
    const genai = new GoogleGenAI({ apiKey })

    const clientContext = context.clientSnapshot
      ? `Client: ${context.clientSnapshot.name}, Stage: ${context.clientSnapshot.stage}, Health: ${context.clientSnapshot.healthStatus}`
      : 'No client context available'

    const prompt = [
      `You are a professional agency communication writer. Draft a ${tone} message.`,
      '',
      `Template/Base: ${template}`,
      `Client Context: ${clientContext}`,
      `Trigger Data: ${JSON.stringify(context.triggerData)}`,
      instructions ? `Additional Instructions: ${instructions}` : '',
      '',
      'Write the message directly — no preamble, no "Here is the draft", just the message content.',
    ]
      .filter(Boolean)
      .join('\n')

    const result = await genai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    })

    const text = result.text?.trim()
    if (!text) {
      throw new Error('Empty response from Gemini')
    }

    return text
  }

  private async executeCreateTicket(
    action: WorkflowAction & { type: 'create_ticket' },
    context: WorkflowExecutionContext
  ): Promise<ActionResult> {
    const { title, description, category, priority, assigneeId } = action.config

    if (!context.clientSnapshot) {
      throw new Error('Create ticket action requires a client context')
    }

    const processedTitle = substituteVariables(title, {
      client: context.clientSnapshot,
      trigger: context.triggerData,
    })

    const processedDescription = description
      ? substituteVariables(description, {
          client: context.clientSnapshot,
          trigger: context.triggerData,
        })
      : `Auto-generated by automation: ${context.workflowId}`

    // number is auto-generated by DB but typed as required in generated types
    const { data, error } = await (this.supabase as unknown as import('@supabase/supabase-js').SupabaseClient)
      .from('ticket')
      .insert({
        agency_id: context.agencyId,
        client_id: context.clientSnapshot.id,
        title: processedTitle,
        description: processedDescription,
        category,
        priority,
        assignee_id: assigneeId,
        created_by: context.userId,
      })
      .select('id, number')
      .single()

    if (error) {
      throw new Error(`Failed to create ticket: ${error.message}`)
    }

    return {
      actionId: action.id,
      actionType: 'create_ticket',
      status: 'completed',
      result: { ticketId: data.id, ticketNumber: data.number, title: processedTitle },
      executedAt: new Date().toISOString(),
    }
  }

  private async executeUpdateClient(
    action: WorkflowAction & { type: 'update_client' },
    context: WorkflowExecutionContext
  ): Promise<ActionResult> {
    const { updates } = action.config

    if (!context.clientSnapshot) {
      throw new Error('Update client action requires a client context')
    }

    const updateData: Record<string, unknown> = {}

    if (updates.stage) updateData.stage = updates.stage
    if (updates.healthStatus) updateData.health_status = updates.healthStatus
    if (updates.notes) {
      // Append to existing notes
      const existingNotes = context.clientSnapshot.notes || ''
      updateData.notes = existingNotes
        ? `${existingNotes}\n\n[${new Date().toISOString()}] ${updates.notes}`
        : updates.notes
    }

    // Handle tags separately if needed
    if (updates.tags) {
      const currentTags = context.clientSnapshot.tags || []
      let newTags = [...currentTags]

      if (updates.tags?.add) {
        newTags = [...new Set([...newTags, ...updates.tags.add])]
      }
      if (updates.tags?.remove) {
        newTags = newTags.filter((t) => !updates.tags?.remove?.includes(t))
      }

      updateData.tags = newTags
    }

    if (Object.keys(updateData).length === 0) {
      return {
        actionId: action.id,
        actionType: 'update_client',
        status: 'skipped',
        result: { reason: 'No updates to apply' },
        executedAt: new Date().toISOString(),
      }
    }

    const { error } = await this.supabase
      .from('client')
      .update(updateData)
      .eq('id', context.clientSnapshot.id)
      .eq('agency_id', context.agencyId)

    if (error) {
      throw new Error(`Failed to update client: ${error.message}`)
    }

    // If stage changed, create stage event
    if (updates.stage && updates.stage !== context.clientSnapshot.stage) {
      await this.supabase.from('stage_event').insert({
        agency_id: context.agencyId,
        client_id: context.clientSnapshot.id,
        from_stage: context.clientSnapshot.stage,
        to_stage: updates.stage,
        moved_by: context.userId,
        notes: `Automated stage change by workflow: ${context.workflowId}`,
      })
    }

    return {
      actionId: action.id,
      actionType: 'update_client',
      status: 'completed',
      result: { updates: Object.keys(updateData) },
      executedAt: new Date().toISOString(),
    }
  }

  private async executeCreateAlert(
    action: WorkflowAction & { type: 'create_alert' },
    context: WorkflowExecutionContext
  ): Promise<ActionResult> {
    const { title, description, type, severity } = action.config

    const processedTitle = substituteVariables(title, {
      client: context.clientSnapshot,
      trigger: context.triggerData,
    })

    const processedDescription = description
      ? substituteVariables(description, {
          client: context.clientSnapshot,
          trigger: context.triggerData,
        })
      : `Auto-generated alert from workflow: ${context.workflowId}`

    const { data, error } = await this.supabase
      .from('alert')
      .insert({
        agency_id: context.agencyId,
        client_id: context.clientSnapshot?.id,
        type,
        severity,
        title: processedTitle,
        description: processedDescription,
        confidence: 1.0, // Automated alerts have full confidence
        metadata: {
          source: 'workflow',
          workflowId: context.workflowId,
          runId: context.runId,
          triggerData: context.triggerData,
        } as Json,
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create alert: ${error.message}`)
    }

    return {
      actionId: action.id,
      actionType: 'create_alert',
      status: 'completed',
      result: { alertId: data.id, title: processedTitle, severity },
      executedAt: new Date().toISOString(),
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async getClientSnapshot(clientId: string): Promise<ClientSnapshot | undefined> {
    const { data } = await this.supabase
      .from('client')
      .select('*')
      .eq('id', clientId)
      .eq('agency_id', this.agencyId)
      .single()

    if (!data) return undefined

    return {
      id: data.id,
      name: data.name,
      stage: data.stage,
      healthStatus: data.health_status,
      contactEmail: data.contact_email || undefined,
      contactName: data.contact_name || undefined,
      notes: data.notes || undefined,
      daysInStage: data.days_in_stage,
      tags: data.tags || [],
      totalSpend: data.total_spend || undefined,
    }
  }

  private async validateTriggers(
    triggers: WorkflowTrigger[],
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    // For event-based triggers (stage_change, new_message, ticket_created),
    // the trigger is already validated by the event that fired it

    // For condition-based triggers (inactivity, kpi_threshold),
    // we need to verify the condition is still true

    for (const trigger of triggers) {
      if (trigger.type === 'inactivity') {
        const isInactive = await this.checkInactivity(
          context.clientSnapshot?.id || '',
          trigger.config.days,
          trigger.config.activityTypes
        )
        if (!isInactive) return false
      }

      if (trigger.type === 'kpi_threshold') {
        const thresholdMet = await this.checkKPIThreshold(
          context.clientSnapshot?.id || '',
          trigger.config.metric,
          trigger.config.operator,
          trigger.config.value
        )
        if (!thresholdMet) return false
      }
    }

    return true
  }

  private async checkInactivity(
    clientId: string,
    days: number,
    activityTypes?: string[]
  ): Promise<boolean> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const types = activityTypes || ['communication', 'task', 'ticket']
    const checks: PromiseLike<boolean>[] = []

    if (types.includes('communication')) {
      checks.push(
        this.supabase
          .from('communication')
          .select('id')
          .eq('client_id', clientId)
          .gte('received_at', cutoffDate.toISOString())
          .limit(1)
          .then(({ data }) => (data?.length ?? 0) === 0)
      )
    }

    if (types.includes('task')) {
      checks.push(
        this.supabase
          .from('task')
          .select('id')
          .eq('client_id', clientId)
          .gte('updated_at', cutoffDate.toISOString())
          .limit(1)
          .then(({ data }) => (data?.length ?? 0) === 0)
      )
    }

    if (types.includes('ticket')) {
      checks.push(
        this.supabase
          .from('ticket')
          .select('id')
          .eq('client_id', clientId)
          .gte('updated_at', cutoffDate.toISOString())
          .limit(1)
          .then(({ data }) => (data?.length ?? 0) === 0)
      )
    }

    const results = await Promise.all(checks)
    return results.every((isInactive) => isInactive)
  }

  private async checkKPIThreshold(
    clientId: string,
    metric: string,
    operator: 'above' | 'below' | 'equals',
    value: number
  ): Promise<boolean> {
    // Get the client data
    const { data: client } = await this.supabase
      .from('client')
      .select('*')
      .eq('id', clientId)
      .single()

    if (!client) return false

    // Map metric name to field
    let currentValue: number | undefined
    switch (metric) {
      case 'total_spend':
        currentValue = client.total_spend || 0
        break
      case 'days_in_stage':
        currentValue = client.days_in_stage
        break
      default:
        // For other metrics, would need to query kpi_snapshot or ad_performance
        return false
    }

    if (currentValue === undefined) return false

    switch (operator) {
      case 'above':
        return currentValue > value
      case 'below':
        return currentValue < value
      case 'equals':
        return Math.abs(currentValue - value) < 0.01
      default:
        return false
    }
  }

  private async evaluateCondition(
    condition: { field: string; operator: string; value?: unknown },
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    const { field, operator, value } = condition

    // Get field value from context
    const fieldValue = this.getFieldValue(field, context)

    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'greater_than':
        return Number(fieldValue) > Number(value)
      case 'less_than':
        return Number(fieldValue) < Number(value)
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase())
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase())
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null
      default:
        return false
    }
  }

  private getFieldValue(field: string, context: WorkflowExecutionContext): unknown {
    const parts = field.split('.')

    switch (parts[0]) {
      case 'client':
        if (!context.clientSnapshot) return undefined
        return this.getNestedValue(context.clientSnapshot as unknown as Record<string, unknown>, parts.slice(1))
      case 'trigger':
        return this.getNestedValue(context.triggerData, parts.slice(1))
      case 'time':
        return this.getTimeValue(parts[1])
      default:
        return undefined
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = obj
    for (const key of path) {
      if (current === null || current === undefined) return undefined
      current = (current as Record<string, unknown>)[key]
    }
    return current
  }

  private getTimeValue(field: string): unknown {
    const now = new Date()
    switch (field) {
      case 'hour':
        return now.getHours()
      case 'dayOfWeek':
        return now.getDay()
      case 'date':
        return now.toISOString().split('T')[0]
      default:
        return undefined
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createWorkflowEngine(
  supabase: SupabaseClientType,
  agencyId: string,
  userId: string
): WorkflowEngine {
  return new WorkflowEngine(supabase, agencyId, userId)
}
