/**
 * Workflow Templates API
 *
 * GET /api/v1/workflows/templates - List available templates
 * POST /api/v1/workflows/templates - Create workflow from template
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withCsrfProtection, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { SEED_TEMPLATES, getTemplateKeys } from '@/lib/workflows/seed-templates'
import { createWorkflow } from '@/lib/workflows/workflow-queries'

// GET - List available templates
export const GET = withPermission({ resource: 'automations', action: 'read' })(
  async () => {
    const templates = getTemplateKeys().map((key) => ({
      key,
      ...SEED_TEMPLATES[key],
      // Strip action/trigger IDs for the listing
      triggerCount: SEED_TEMPLATES[key].triggers.length,
      actionCount: SEED_TEMPLATES[key].actions.length,
    }))

    return NextResponse.json({ data: templates })
  }
)

// POST - Create a real workflow from a template
export const POST = withPermission({ resource: 'automations', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const userId = request.user.id

      const body = await request.json()
      const { templateKey, slackChannelId, customName } = body as {
        templateKey: string
        slackChannelId?: string
        customName?: string
      }

      const template = SEED_TEMPLATES[templateKey]
      if (!template) {
        return createErrorResponse(400, `Unknown template: ${templateKey}`)
      }

      // Deep-clone and customize the template
      const triggers = JSON.parse(JSON.stringify(template.triggers))
      const actions = JSON.parse(JSON.stringify(template.actions))

      // If a Slack channel ID was provided, set it on all Slack notification actions
      if (slackChannelId) {
        for (const action of actions) {
          if (
            action.type === 'send_notification' &&
            action.config.channel === 'slack' &&
            action.config.recipients.length === 0
          ) {
            action.config.recipients = [slackChannelId]
          }
        }
      }

      const { data: workflow, error } = await createWorkflow(
        supabase,
        agencyId,
        userId,
        {
          name: customName || template.name,
          description: template.description,
          triggers,
          actions,
          isActive: true,
        }
      )

      if (error || !workflow) {
        return createErrorResponse(500, error?.message || 'Failed to create workflow')
      }

      return NextResponse.json({ data: workflow }, { status: 201 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create from template'
      return createErrorResponse(500, message)
    }
  }
)
