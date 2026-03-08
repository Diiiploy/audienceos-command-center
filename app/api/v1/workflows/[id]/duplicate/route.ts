/**
 * Duplicate Workflow API
 * POST /api/v1/workflows/{id}/duplicate - Create a copy of an existing workflow
 *
 * RBAC: Requires automations:manage
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { getWorkflow, createWorkflow } from '@/lib/workflows'
import type { WorkflowTrigger, WorkflowAction } from '@/types/workflow'

type RouteContext = { params: Promise<{ id: string }> }

export const POST = withPermission({ resource: 'automations', action: 'manage' })(
  async (request: AuthenticatedRequest, context: RouteContext) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await context.params

      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid workflow ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Fetch the source workflow
      const { data: source, error: fetchError } = await getWorkflow(supabase, id, agencyId)

      if (fetchError || !source) {
        return createErrorResponse(404, 'Workflow not found')
      }

      // Deep clone triggers and actions, assigning new IDs
      const triggers = (source.triggers as unknown as WorkflowTrigger[]).map(t => ({
        ...t,
        id: `trigger-${crypto.randomUUID().slice(0, 8)}`,
      }))
      const actions = (source.actions as unknown as WorkflowAction[]).map(a => ({
        ...a,
        id: `action-${crypto.randomUUID().slice(0, 8)}`,
      }))

      // Create duplicate with "Copy of" prefix
      const { data: duplicate, error: createError } = await createWorkflow(
        supabase,
        agencyId,
        request.user.id,
        {
          name: `Copy of ${source.name}`.slice(0, 200),
          description: source.description || undefined,
          triggers,
          actions,
          isActive: false, // Duplicates start inactive
        }
      )

      if (createError || !duplicate) {
        return createErrorResponse(500, 'Failed to duplicate workflow')
      }

      return NextResponse.json(duplicate, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
