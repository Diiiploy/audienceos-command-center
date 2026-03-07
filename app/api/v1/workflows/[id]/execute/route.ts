/**
 * POST /api/v1/workflows/[id]/execute - Manually execute a workflow ("Run Now")
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withCsrfProtection, isValidUUID, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { WorkflowEngine } from '@/lib/workflows/execution-engine'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const POST = withPermission({ resource: 'automations', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params

      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid workflow ID')
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const userId = request.user.id

      // Parse optional body for trigger data and client ID
      let triggerData: Record<string, unknown> = { manual: true, triggeredBy: userId }
      let clientId: string | undefined

      try {
        const body = await request.json()
        if (body.triggerData) triggerData = { ...triggerData, ...body.triggerData }
        if (body.clientId && isValidUUID(body.clientId)) clientId = body.clientId
      } catch {
        // No body is fine — manual triggers don't require one
      }

      const engine = new WorkflowEngine(supabase, agencyId, userId)
      const result = await engine.executeWorkflow(id, triggerData, clientId)

      return NextResponse.json({ data: result })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed'
      console.error('[workflows/execute] Error:', message)
      return createErrorResponse(500, message)
    }
  }
)
